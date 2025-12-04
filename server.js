const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const fetch = global.fetch || (() => {
  try { return require('node-fetch'); } catch (e) { return null; }
})();

try {
  require('dotenv').config();
} catch (e) {
  console.warn('dotenv not available — continue using environment variables');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));
app.use(express.static(__dirname));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY not set. Set GEMINI_API_KEY in environment or .env (do not commit .env).');
}

// --- ユーザー管理：CSV認証 ---
const USERS_CSV = path.join(__dirname, "users.csv");

// パスワードをSHA-256ハッシュ化
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// CSV読み込み
function readUsersCSV() {
    if (!fs.existsSync(USERS_CSV)) return [];
    return fs.readFileSync(USERS_CSV, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
            const [name, email, password_hash] = line.split(',');
            return { name, email, password_hash };
        });
}

// CSV追記（新規登録）
// 末尾の改行が無い場合は明示的に追加する
function appendUserCSV(name, email, passwordHash) {
    let needNewLine = false;
    if (fs.existsSync(USERS_CSV)) {
        const stat = fs.statSync(USERS_CSV);
        if (stat.size > 0) {
            const fd = fs.openSync(USERS_CSV, 'r');
            const buf = Buffer.alloc(1);
            fs.readSync(fd, buf, 0, 1, stat.size - 1);
            fs.closeSync(fd);
            if (buf[0] !== 0x0a && buf[0] !== 0x0d) { // \n or \r
                needNewLine = true;
            }
        }
    }
    const line = `${needNewLine ? '\n' : ''}${name},${email},${passwordHash}\n`;
    fs.appendFileSync(USERS_CSV, line);
}

// 新規登録API
app.post("/api/register", (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    const users = readUsersCSV();
    if (users.find((u) => u.email === email)) {
        return res.status(409).json({ success: false, error: "Email already exists" });
    }
    const passwordHash = hashPassword(password);
    appendUserCSV(name, email, passwordHash);
    // セッション管理しない（JWT, Cookieなどは未実装）--簡易
    res.json({ success: true, user: { name, email } });
});

// ログインAPI
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, error: "Missing email or password" });
    }
    const users = readUsersCSV();
    const passwordHash = hashPassword(password);
    const user = users.find(
        (u) => u.email === email && u.password_hash === passwordHash
    );
    if (!user) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    res.json({ success: true, user: { name: user.name, email: user.email } });
});

// （必要に応じてログアウトAPIやセッションAPIを追加してください）

// --- Gemini/AI API連携 ---
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

    // 評価基準をプロンプトとして定義
    const systemPrompt = `
あなたはプロのビジネスファッションコンサルタントです。
ユーザーから提供された画像を分析し、指定された「ビジネスシーン」において、その服装が適切かどうかを厳しく評価してください。

以下の5つの具体的な評価項目について、それぞれ1点から5点の5段階で評価を行い（5が最高、1が最低）、その理由や改善点をコメントしてください。

【評価項目】
1. 清潔感: シワ、汚れ、サイズ感（大きすぎず小さすぎず）、着こなしの乱れがないか。
2. 服装の色: ビジネスシーンに相応しい落ち着いた色使いか、派手すぎないか、配色のバランスは適切か。
3. 基本ルール（ジャケット＋襟付きシャツ）: ビジネスの基本であるジャケットと襟付きシャツを着用しているか。あるいはシーンに応じた同等の正装か。
4. 季節感: 素材や色味、組み合わせが季節や指定されたシーンに適しているか。
5. 柄: ビジネスにふさわしい柄か（無地、ストライプ、チェックなど）。派手すぎたり、カジュアルすぎたりしないか。

【出力要件】
指定されたJSONスキーマに従って出力してください。
- overallScoreは100点満点で採点してください。
- evaluation配列には上記5項目の評価を順に格納してください。
- overallCommentには、良い点(goodPoints)、改善提案(suggestions)、総評(summary)を含めてください。
`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

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

    const { ok, status, json } = await callGeminiApi(apiUrl, payload);

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

app.post('/api/generate-text', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) return res.status(500).json({ success: false, error: 'Server not configured: GEMINI_API_KEY missing' });
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Missing prompt in request body' });

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig: { responseMimeType: 'text/plain' }
    };

    const { ok, status, json } = await callGeminiApi(apiUrl, payload);
    if (!ok) return res.status(status || 500).json({ success: false, error: 'Gemini API error', details: json });

    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ success: true, text });
  } catch (err) {
    console.error('Error /api/generate-text:', err);
    return res.status(500).json({ success: false, error: String(err) });
  }
});

// --- ルーティング ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));