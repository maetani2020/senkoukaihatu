const express = require("express");
const path = require("path");
// Node 18+ は global.fetch を持つため、node-fetch は必須ではありませんが
// 古い環境向けにフォールバックを用意しています。
const fetch = global.fetch || (() => {
  try {
    return require('node-fetch');
  } catch (e) {
    return null;
  }
})();

// dotenv を安全に読み込む（開発用）。未インストールでも動作する。
try {
  require('dotenv').config();
} catch (e) {
  console.warn('dotenv not available — continue using environment variables');
}

const app = express();
const PORT = process.env.PORT || 3000;

// 画像の base64 を受け取れるよう大きめに設定
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// 静的ファイル（プロジェクトルート）
app.use(express.static(__dirname));

// 簡易 CORS（必要に応じて本番では厳格化）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 環境変数から API キーを取得（.env では GEMINI_API_KEY=... を設定）
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. Set GEMINI_API_KEY in environment or .env (do not commit .env).');
}

// Helper: call Gemini (Generative Language) API with retries
async function callGeminiApi(apiUrl, payload, maxRetries = 3) {
  if (!fetch) throw new Error('fetch is not available in this environment. Install node-fetch or use Node 18+.');
  let attempt = 0;
  const headers = { 'Content-Type': 'application/json' };

  while (attempt < maxRetries) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        // node-fetch ignores timeout option; for production consider AbortController
      });

      if (res.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
        continue;
      }

      const json = await res.json();
      return { ok: res.ok, status: res.status, json };
    } catch (err) {
      if (attempt + 1 >= maxRetries) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
  throw new Error('Failed to call Gemini API after retries');
}

// POST /api/analyze-image
// body: { scene, area, mimeType, base64Image }
app.post('/api/analyze-image', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'Server not configured: GEMINI_API_KEY is missing.' });
    }

    const { scene, area, mimeType, base64Image } = req.body;
    if (!scene || !area || !mimeType || !base64Image) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: scene, area, mimeType, base64Image' });
    }

    // JSON schema same as client
    const responseSchema = {
      type: "OBJECT",
      properties: {
        "scene": { "type": "STRING" },
        "evaluation": {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              "item": { "type": "STRING" },
              "score": { "type": "NUMBER" },
              "comment": { "type": "STRING" }
            }
          }
        },
        "overallScore": { "type": "NUMBER" },
        "overallComment": {
          type: "OBJECT",
          properties: {
            "goodPoints": { "type": "STRING" },
            "suggestions": { "type": "STRING" },
            "summary": { "type": "STRING" }
          }
        }
      }
    };

    const systemPrompt = `（省略）`; // 実運用では長いプロンプトをここに入れる（不要にキーを出力しない）

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `この服装を「${scene}」の場面を想定して、「${area}」の範囲で評価してください。` },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    };

    const { ok, status, json } = await callGeminiApi(apiUrl, payload);

    if (!ok) {
      return res.status(status || 500).json({ success: false, error: 'Gemini API error', details: json });
    }

    const candidate = json.candidates && json.candidates[0];
    if (!candidate || !candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
      return res.status(500).json({ success: false, error: 'Unexpected Gemini response structure', details: json });
    }

    const textPart = candidate.content.parts[0].text;
    let parsed;
    try {
      parsed = JSON.parse(textPart);
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to parse JSON returned by Gemini', raw: textPart });
    }

    return res.json({ success: true, data: parsed });

  } catch (err) {
    console.error('Error /api/analyze-image:', err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// POST /api/generate-text
app.post('/api/generate-text', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'Server not configured: GEMINI_API_KEY is missing.' });
    }
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt in request body' });

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig: {
        responseMimeType: "text/plain"
      }
    };

    const { ok, status, json } = await callGeminiApi(apiUrl, payload);

    if (!ok) {
      return res.status(status || 500).json({ success: false, error: 'Gemini API error', details: json });
    }

    const candidate = json.candidates && json.candidates[0];
    if (!candidate || !candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
      return res.status(500).json({ success: false, error: 'Unexpected Gemini response structure', details: json });
    }

    const text = candidate.content.parts[0].text || '';
    return res.json({ success: true, text });
  } catch (err) {
    console.error('Error /api/generate-text:', err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Serve home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});