const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Gemini Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Serve static files
app.use(express.static('.'));

// --- Schemas ---

const sindanSchema = {
    type: SchemaType.OBJECT,
    properties: {
        industryFit: { type: SchemaType.STRING },
        direction: { type: SchemaType.STRING },
        example: { type: SchemaType.STRING },
        advice: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
        }
    },
    required: ["industryFit", "direction", "example", "advice"]
};

const mensetuSchema = {
    type: SchemaType.OBJECT,
    properties: {
        feedback: { type: SchemaType.STRING },
        nextQuestion: { type: SchemaType.STRING }
    },
    required: ["feedback", "nextQuestion"]
};

const cameraSchema = {
    type: SchemaType.OBJECT,
    properties: {
        overallScore: { type: SchemaType.INTEGER },
        evaluation: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    item: { type: SchemaType.STRING },
                    score: { type: SchemaType.INTEGER },
                    comment: { type: SchemaType.STRING }
                },
                required: ["item", "score", "comment"]
            }
        },
        overallComment: {
            type: SchemaType.OBJECT,
            properties: {
                goodPoints: { type: SchemaType.STRING },
                suggestions: { type: SchemaType.STRING },
                summary: { type: SchemaType.STRING }
            },
            required: ["goodPoints", "suggestions", "summary"]
        }
    },
    required: ["overallScore", "evaluation", "overallComment"]
};

const mensetuSummarySchema = {
    type: SchemaType.OBJECT,
    properties: {
        overallScore: { type: SchemaType.NUMBER },
        overallEvaluation: { type: SchemaType.STRING },
        strengths: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
        },
        weaknesses: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
        },
        radarChart: {
            type: SchemaType.OBJECT,
            properties: {
                skill: { type: SchemaType.NUMBER },
                logical: { type: SchemaType.NUMBER },
                enthusiasm: { type: SchemaType.NUMBER },
                flexibility: { type: SchemaType.NUMBER },
                knowledge: { type: SchemaType.NUMBER }
            },
            required: ["skill", "logical", "enthusiasm", "flexibility", "knowledge"]
        },
        interviewerComment: { type: SchemaType.STRING },
        advice: { type: SchemaType.STRING }
    },
    required: ["overallScore", "overallEvaluation", "strengths", "weaknesses", "radarChart", "interviewerComment", "advice"]
};

// ... (Existing endpoints) ...

// 4. 模擬面接総評 (Mensetu Summary)
app.post('/api/mensetu/summary', async (req, res) => {
    try {
        const { history } = req.body;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite-001",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: mensetuSummarySchema
            }
        });

        const prompt = `
        あなたはプロの面接官です。
        以下の模擬面接の履歴全体を分析し、最終的な評価レポートを作成してください。

        会話履歴:
        ${JSON.stringify(history)}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("Mensetu Summary API Response:", text);

        try {
            let jsonResponse = JSON.parse(text);
            if (Array.isArray(jsonResponse)) {
                jsonResponse = jsonResponse[0];
            }
            res.json(jsonResponse);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            res.status(500).json({ error: 'Failed to parse AI response' });
        }

    } catch (error) {
        console.error('Error in /api/mensetu/summary:', error);

        if (error.message && (error.message.includes('429') || error.message.includes('Quota'))) {
            return res.status(429).json({
                error: 'Quota exceeded. improved error handling',
                message: 'アクセス集中等のため一時的に利用できません。少し時間を置いてから再度お試しください。',
                retryAfter: 60
            });
        }
        res.status(500).json({ error: error.message });
    }
});


app.post('/api/sindan', async (req, res) => {
    try {
        const { element, category, userProfile } = req.body;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite-001",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: sindanSchema
            }
        });

        let prompt = `
        あなたはプロのキャリアアドバイザーです。
        就活生の「${element}」（カテゴリ：${category}）という強みを分析し、
        志望企業へのアピール文とアドバイスを作成してください。

        ユーザー情報:
        ${userProfile ? JSON.stringify(userProfile) : '特になし'}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("Sindan API Response:", text);

        try {
            let jsonResponse = JSON.parse(text);
            // Handle array response if API wraps result
            if (Array.isArray(jsonResponse)) {
                jsonResponse = jsonResponse[0];
            }
            res.json(jsonResponse);
        } catch (e) {
            console.error("JSON Parse Error details:", text);
            res.status(500).json({ error: 'Failed to parse AI response' });
        }

    } catch (error) {
        console.error('Error in /api/sindan:', error);
        if (error.message && (error.message.includes('429') || error.message.includes('Quota'))) {
            return res.status(429).json({
                error: 'Quota exceeded. improved error handling',
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


        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite-001",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: mensetuSchema
            }
        });

        let systemPrompt = "あなたは面接官です。";
        if (interviewerType === 'strict') {
            systemPrompt += "厳しく、論理的な矛盾を指摘する圧迫面接気味のスタイルで話してください。";
        } else {
            systemPrompt += "優しく、相手の良さを引き出す穏やかなスタイルで話してください。";
        }
        systemPrompt += "ユーザーの回答に対し、フィードバック（感想）と、次の質問をJSON形式で返してください。";

        // History validation: Gemini requires history to start with 'user' role
        let validHistory = history || [];
        if (validHistory.length > 0 && validHistory[0].role !== 'user') {
            // If history starts with model, prepend a dummy user message or remove it. 
            // In this context, it's safer to pretend the user started the conversation.
            validHistory = [{ role: 'user', parts: [{ text: "面接を始めてください。" }] }, ...validHistory];

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
>>>
        }

        const chat = model.startChat({
            history: validHistory,
        });

        const msg = `${systemPrompt}\n\nユーザーの回答: ${userMessage}`;

        const result = await chat.sendMessage(msg);
        const response = await result.response;
        const text = response.text();

        console.log("Mensetu API Response:", text);

        try {
            let jsonResponse = JSON.parse(text);
            if (Array.isArray(jsonResponse)) {
                jsonResponse = jsonResponse[0];
            }
            res.json(jsonResponse);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            res.status(500).json({ error: 'Failed to parse AI response' });
        }

    } catch (error) {
        console.error('Error in /api/mensetu:', error);
        if (error.message && (error.message.includes('429') || error.message.includes('Quota'))) {
            return res.status(429).json({
                error: 'Quota exceeded. improved error handling',
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

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite-001",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: cameraSchema
            }
        });

        const prompt = `
        あなたはプロの面接官・イメージコンサルタントです。
        就活生の服装画像を分析し、評価してください。

        シチュエーション: ${scene}
        服装タイプ: ${attire}

        以下の5つの項目について、それぞれ1〜5点（5が良い）で評価し、コメントしてください。
        1. 清潔感
        2. TPO（場面）への適合度
        3. サイズ感・着こなし
        4. 身だしなみ（髪型・表情）
        5. 全体の雰囲気・姿勢

        出力はJSON形式で行ってください。
        `;

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: "image/jpeg"
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        console.log("Camera API Response:", text);

        try {
            let jsonResponse = JSON.parse(text);
            if (Array.isArray(jsonResponse)) {
                jsonResponse = jsonResponse[0];
            }

            // Calculate Overall Score based on evaluation items
            // Max score = 5 items * 5 points = 25
            // Convert to 100 scale: score * 4
            if (jsonResponse.evaluation && Array.isArray(jsonResponse.evaluation)) {
                let sum = 0;
                let max = 0;
                jsonResponse.evaluation.forEach(item => {
                    sum += item.score || 0;
                    max += 5;
                });
                // Avoid division by zero
                if (max > 0) {
                    jsonResponse.overallScore = Math.round((sum / max) * 100);
                }
            }

            res.json(jsonResponse);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            res.status(500).json({ error: 'Failed to parse AI response' });
        }

    } catch (error) {
        console.error('Error in /api/camera:', error);
        if (error.message && (error.message.includes('429') || error.message.includes('Quota'))) {
            return res.status(429).json({
                error: 'Quota exceeded. improved error handling',
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
