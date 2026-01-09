const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files
app.use(express.static('.'));

// Database Setup
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create Tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        profile_json TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        type TEXT,
        date TEXT,
        title TEXT,
        summary TEXT,
        detail_json TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});

// --- Auth APIs ---

// Register
app.post('/api/auth/register', (req, res) => {
    const { id, name, email, password } = req.body;
    db.run(`INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`,
        [id, name, email, password],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, userId: id });
        }
    );
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            // Remove password from response
            const user = { ...row };
            delete user.password;
            // Parse profile_json if exists
            if (user.profile_json) {
                user.profile = JSON.parse(user.profile_json);
                delete user.profile_json;
            }
            res.json({ success: true, user });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Verify/Get User (Simple session check by ID)
app.get('/api/auth/user/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            const user = { ...row };
            delete user.password;
            if (user.profile_json) {
                user.profile = JSON.parse(user.profile_json);
                delete user.profile_json;
            }
            res.json({ user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });
});

// --- Data APIs ---

// Update Profile
app.post('/api/user/profile', (req, res) => {
    const { userId, profile } = req.body;
    db.run(`UPDATE users SET profile_json = ? WHERE id = ?`, [JSON.stringify(profile), userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Get History
app.get('/api/user/history/:userId', (req, res) => {
    const { userId } = req.params;
    db.all(`SELECT * FROM history WHERE user_id = ? ORDER BY id DESC`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const history = rows.map(row => ({
            ...row,
            detail: JSON.parse(row.detail_json)
        }));
        res.json({ history });
    });
});

// Add History
app.post('/api/user/history', (req, res) => {
    const { userId, type, date, title, summary, detail } = req.body;
    db.run(`INSERT INTO history (user_id, type, date, title, summary, detail_json) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, type, date, title, summary, JSON.stringify(detail)],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Migrate Data
app.post('/api/migrate', (req, res) => {
    const { users, histories } = req.body;

    db.serialize(() => {
        const stmtUser = db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password, profile_json) VALUES (?, ?, ?, ?, ?)`);
        const stmtHistory = db.prepare(`INSERT INTO history (user_id, type, date, title, summary, detail_json) VALUES (?, ?, ?, ?, ?, ?)`);

        let userCount = 0;
        let historyCount = 0;

        if (users && Symbol.iterator in Object(users)) {
            users.forEach(u => {
                stmtUser.run(u.id, u.name, u.email, u.password, u.profile ? JSON.stringify(u.profile) : null);
                userCount++;
            });
        }

        // Note: Client history has 'id' but we use AUTOINCREMENT for DB 'id'. 
        // We might lose original history 'id' mapping but that's probably fine for display.
        // Or we can try to preserve it if it was numeric, but client used Date.now().

        if (histories && Symbol.iterator in Object(histories)) {
            histories.forEach(h => {
                // The client history structure needs to be mapped to DB
                // Need to find which user this history belongs to.
                // In localStorage 'career_app_history_USERID', we know the user ID.
                // So the client should send [ { userId: '...', data: [...] }, ... ]
                // Wait, the client Logic is: "histories" is a flat list? No.
                // Let's assume client sends { items: [ { ...historyItem, userId: ... } ] }
                // OR client sends a dump of all history keys?

                // Better approach: Client loops through its keys, finds user history, sends it relative to that user.
                // Let's assume request body has: entries: [ { userId: 'abc', type: '..', ... } ]

                // For now, let's let the client handle logic and call this 'migrate' endpoint likely per user or batch.
                // But wait, "users" array has passwords.

                // Let's assume this endpoint receives a bulk payload.
                stmtHistory.run(h.userId, h.type, h.date, h.title, h.summary, JSON.stringify(h.detail));
                historyCount++;
            });
        }

        stmtUser.finalize();
        stmtHistory.finalize();

        res.json({ success: true, migratedUsers: userCount, migratedHistory: historyCount });
    });
});

// Claude API呼び出し用のヘルパー関数
async function callClaudeAPI(prompt, systemPrompt = '') {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [
                { role: "user", content: prompt }
            ],
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Claude API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

// 1. 自己診断 (Sindan)
app.post('/api/sindan', async (req, res) => {
    try {
        const { element, category, userProfile } = req.body;

        const systemPrompt = `あなたはプロのキャリアアドバイザーです。
就活生の強みを分析し、志望企業へのアピール文とアドバイスを作成します。
必ずJSON形式で以下の構造で回答してください:
{
  "industryFit": "業界適性の説明",
  "direction": "方向性のアドバイス",
  "example": "具体例",
  "advice": ["アドバイス1", "アドバイス2", "アドバイス3"]
}`;

        const prompt = `
就活生の「${element}」(カテゴリ:${category})という強みを分析し、
志望企業へのアピール文とアドバイスを作成してください。

ユーザー情報:
${userProfile ? JSON.stringify(userProfile) : '特になし'}

JSON形式で回答してください。
`;

        const responseText = await callClaudeAPI(prompt, systemPrompt);

        // JSONの抽出(```json```で囲まれている場合に対応)
        let jsonText = responseText.trim();
        if (jsonText.includes('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }

        const jsonResponse = JSON.parse(jsonText);
        res.json(jsonResponse);

    } catch (error) {
        console.error('Error in /api/sindan:', error);
        if (error.message && error.message.includes('429')) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'アクセス集中等のため一時的に利用できません。少し時間を置いてから再度お試しください。',
                retryAfter: 60
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// 2. 模擬面接 (Mensetu)
app.post('/api/mensetu', async (req, res) => {
    try {
        const { history, interviewerType, userMessage } = req.body;

        let systemPrompt = "あなたは面接官です。";
        if (interviewerType === 'strict') {
            systemPrompt += "厳しく、論理的な矛盾を指摘する圧迫面接気味のスタイルで話してください。";
        } else {
            systemPrompt += "優しく、相手の良さを引き出す穏やかなスタイルで話してください。";
        }
        systemPrompt += `
ユーザーの回答に対して、フィードバック(感想)と、次の質問をJSON形式で返してください。
必ず以下の構造で回答してください:
{
  "feedback": "ユーザーの回答に対するフィードバック",
  "nextQuestion": "次の質問"
}`;

        // 履歴を文字列化
        let historyText = '';
        if (history && history.length > 0) {
            historyText = '過去の会話:\n';
            history.forEach(item => {
                if (item.role === 'user') {
                    historyText += `就活生: ${item.parts[0].text}\n`;
                } else {
                    historyText += `面接官: ${item.parts[0].text}\n`;
                }
            });
        }

        const prompt = `${historyText}

就活生の最新の回答: ${userMessage}

上記を踏まえて、フィードバックと次の質問をJSON形式で返してください。`;

        const responseText = await callClaudeAPI(prompt, systemPrompt);

        let jsonText = responseText.trim();
        if (jsonText.includes('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }

        const jsonResponse = JSON.parse(jsonText);
        res.json(jsonResponse);

    } catch (error) {
        console.error('Error in /api/mensetu:', error);
        if (error.message && error.message.includes('429')) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'アクセス集中等のため一時的に利用できません。少し時間を置いてから再度お試しください。',
                retryAfter: 60
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// 3. 服装分析 (Camera)
app.post('/api/camera', async (req, res) => {
    try {
        const { imageBase64, scene, attire } = req.body;

        const systemPrompt = `あなたはプロの面接官・イメージコンサルタントです。
就活生の服装画像を分析し、評価してください。
必ずJSON形式で以下の構造で回答してください:
{
  "overallScore": 0,
  "evaluation": [
    {"item": "清潔感", "score": 5, "comment": "コメント"},
    {"item": "TPO(場面)への適合度", "score": 5, "comment": "コメント"},
    {"item": "サイズ感・着こなし", "score": 5, "comment": "コメント"},
    {"item": "身だしなみ(髪型・表情)", "score": 5, "comment": "コメント"},
    {"item": "全体の雰囲気・姿勢", "score": 5, "comment": "コメント"}
  ],
  "overallComment": {
    "goodPoints": "良い点",
    "suggestions": "改善提案",
    "summary": "総評"
  }
}`;

        const prompt = `
シチュエーション: ${scene}
服装タイプ: ${attire}

添付された就活生の服装画像を、以下の5つの項目について1～5点(5が良い)で評価し、コメントしてください:
1. 清潔感
2. TPO(場面)への適合度
3. サイズ感・着こなし
4. 身だしなみ(髪型・表情)
5. 全体の雰囲気・姿勢

JSON形式で回答してください。
`;

        // Claude APIで画像を扱う場合
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4096,
                system: systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: "image/jpeg",
                                    data: imageBase64
                                }
                            },
                            {
                                type: "text",
                                text: prompt
                            }
                        ]
                    }
                ],
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Claude API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        let responseText = data.content[0].text;

        let jsonText = responseText.trim();
        if (jsonText.includes('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }

        let jsonResponse = JSON.parse(jsonText);

        // Overall Scoreの計算
        if (jsonResponse.evaluation && Array.isArray(jsonResponse.evaluation)) {
            let sum = 0;
            let max = 0;
            jsonResponse.evaluation.forEach(item => {
                sum += item.score || 0;
                max += 5;
            });
            if (max > 0) {
                jsonResponse.overallScore = Math.round((sum / max) * 100);
            }
        }

        res.json(jsonResponse);

    } catch (error) {
        console.error('Error in /api/camera:', error);
        if (error.message && error.message.includes('429')) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'アクセス集中等のため一時的に利用できません。少し時間を置いてから再度お試しください。',
                retryAfter: 60
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// 4. 模擬面接総評 (Mensetu Summary)
app.post('/api/mensetu/summary', async (req, res) => {
    try {
        const { history } = req.body;

        const systemPrompt = `あなたはプロの面接官です。
模擬面接の履歴全体を分析し、最終的な評価レポートを作成してください。
必ずJSON形式で以下の構造で回答してください:
{
  "overallScore": 85.5,
  "overallEvaluation": "総合評価",
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["弱み1", "弱み2"],
  "radarChart": {
    "skill": 4.5,
    "logical": 4.0,
    "enthusiasm": 5.0,
    "flexibility": 3.5,
    "knowledge": 4.0
  },
  "interviewerComment": "面接官からのコメント",
  "advice": "今後のアドバイス"
}`;

        const prompt = `
以下の模擬面接の会話履歴全体を分析し、最終的な評価レポートを作成してください。

会話履歴:
${JSON.stringify(history, null, 2)}

JSON形式で回答してください。
`;

        const responseText = await callClaudeAPI(prompt, systemPrompt);

        let jsonText = responseText.trim();
        if (jsonText.includes('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }

        const jsonResponse = JSON.parse(jsonText);
        res.json(jsonResponse);

    } catch (error) {
        console.error('Error in /api/mensetu/summary:', error);
        if (error.message && error.message.includes('429')) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'アクセス集中等のため一時的に利用できません。少し時間を置いてから再度お試しください。',
                retryAfter: 60
            });
        }
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});