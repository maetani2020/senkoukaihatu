// server.js (改良版)
// ☆ 注意: APIキーは .env に入れます。ここには値を直接書かないでください。

const express = require("express");
const path = require("path");

const fetch = global.fetch || (() => {
  try { return require('node-fetch'); } catch (e) { return null; }
})();

// dotenv を安全に読み込む（未インストールでも動く）
try { require('dotenv').config(); } catch (e) { console.warn('dotenv not available — continue using environment variables'); }

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(express.static(__dirname));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 環境変数（.env）
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
// GEMINI_API_USE_BEARER を true にすると Authorization: Bearer を使います（推奨: サーバ側でのBearer）
const USE_BEARER = (process.env.GEMINI_API_USE_BEARER === 'true' || process.env.GEMINI_API_USE_BEARER === '1');

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. Set GEMINI_API_KEY in environment or .env (do not commit .env).');
}

// 汎用呼び出し（URLはモデルの base URL を渡す。内部で key を付けるか Authorization を付ける）
async function callGeminiApi(apiUrlBase, payload, maxRetries = 3) {
  if (!fetch) throw new Error('fetch not available. Install node-fetch or use Node 18+');

  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      // ヘッダー組立て
      const headers = { 'Content-Type': 'application/json' };
      // URL 組立て（Bearer 方式か key パラメータ方式か）
      let finalUrl = apiUrlBase;
      if (USE_BEARER) {
        headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;
      } else {
        const sep = apiUrlBase.includes('?') ? '&' : '?';
        finalUrl = `${apiUrlBase}${sep}key=${GEMINI_API_KEY}`;
      }

      const res = await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        attempt++;
        continue;
      }

      const json = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, json };
    } catch (err) {
      if (attempt + 1 >= maxRetries) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, delay));
      attempt++;
    }
  }
  throw new Error('Failed to call Gemini API after retries');
}

/* ---------- エンドポイント: 画像分析 ---------- */
app.post('/api/analyze-image', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) return res.status(500).json({ success: false, error: 'Server not configured: GEMINI_API_KEY missing' });

    const { scene, area, mimeType, base64Image } = req.body;
    if (!scene || !area || !mimeType || !base64Image) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: scene, area, mimeType, base64Image' });
    }

    const responseSchema = {
      type: "OBJECT",
      properties: {
        scene: { type: "STRING" },
        evaluation: { type: "ARRAY", items: { type: "OBJECT", properties: { item: { type: "STRING" }, score: { type: "NUMBER" }, comment: { type: "STRING" } } } },
        overallScore: { type: "NUMBER" },
        overallComment: { type: "OBJECT", properties: { goodPoints: { type: "STRING" }, suggestions: { type: "STRING" }, summary: { type: "STRING" } } }
      }
    };

    const systemPrompt = `（ここに運用用の system prompt を入れてください。回答に API キーを出さないでください）`;

    const apiUrlBase = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `この服装を「${scene}」で、範囲「${area}」で評価してください。` },
            { inlineData: { mimeType: mimeType, data: base64Image } }
          ]
        }
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: 'application/json', responseSchema }
    };

    const { ok, status, json } = await callGeminiApi(apiUrlBase, payload);

    if (!ok) {
      return res.status(status || 500).json({ success: false, error: 'Gemini API error', details: json });
    }

    const candidate = json?.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;
    if (!textPart) return res.status(500).json({ success: false, error: 'Unexpected Gemini response', details: json });

    let parsed;
    try { parsed = JSON.parse(textPart); } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to parse JSON from Gemini', raw: textPart });
    }

    return res.json({ success: true, data: parsed });

  } catch (err) {
    console.error('Error /api/analyze-image:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

/* ---------- エンドポイント: テキスト生成 ---------- */
app.post('/api/generate-text', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) return res.status(500).json({ success: false, error: 'Server not configured: GEMINI_API_KEY missing' });
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt in request body' });

    const apiUrlBase = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig: { responseMimeType: 'text/plain' }
    };

    const { ok, status, json } = await callGeminiApi(apiUrlBase, payload);
    if (!ok) return res.status(status || 500).json({ success: false, error: 'Gemini API error', details: json });

    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ success: true, text });
  } catch (err) {
    console.error('Error /api/generate-text:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));