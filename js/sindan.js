// (ファイル冒頭は既存のまま：略)
// --- 省略せず既存の定義を残しますが、ここでは callGeminiApi をサーバ経由に差し替えます ---

async function callGeminiApi(finalElement) {
    bunsekiContent.innerHTML = `
        <div class="text-center p-12 fade-in">
            <div class="flex justify-center items-center gap-3 mb-6">
                <div class="dot w-4 h-4 bg-blue-600 rounded-full"></div>
                <div class="dot w-4 h-4 bg-indigo-600 rounded-full"></div>
                <div class="dot w-4 h-4 bg-sky-500 rounded-full"></div>
            </div>
            <h2 class="text-3xl font-bold text-slate-900">AI分析中...</h2>
            <p class="text-lg text-slate-500 mt-2">
                <span class="font-bold text-indigo-600">${selectedIndustry}</span> への適性を含めて分析しています
            </p>
        </div>
    `;

    // サーバ側の /api/generate-text を呼んで、JSON を返すようにしています
    const systemPrompt = `
あなたはプロの就活アドバイザーです。
ユーザーの強みと、志望する業界に基づいて、以下の形式（JSON）で出力してください。
出力スキーマ:
{
  "element": "string",
  "category": "string",
  "direction": "string",
  "example": "string",
  "advice": ["string", ...],
  "industryFit": "string"
}
値は日本語で、advice は配列で複数の実践的アドバイスを入れてください。
`;

    const prompt = `
ユーザーの最も強い要素は「${finalElement}」。志望業界は「${selectedIndustry}」です。
次の情報を元に、上記JSONスキーマに従って出力してください。
・要素: ${finalElement}
・志望業界: ${selectedIndustry}
（注意）余分な説明やメタ情報は書かず、純粋に JSON 文字列のみを返してください。
`;

    try {
        // サーバの /api/generate-text に投げる（サーバでAPIキーを使って外部呼び出しを行う）
        const resp = await fetch('/api/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, systemPrompt })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(()=>({}));
            throw new Error(err.error || `Server returned ${resp.status}`);
        }

        const payload = await resp.json();
        if (!payload.success) {
            throw new Error(payload.error || 'Unknown server error');
        }

        // server が返す payload.text はテキスト（ここで JSON 文字列が入る想定）
        let data;
        try {
            data = JSON.parse(payload.text);
        } catch (err) {
            console.error('Failed to parse JSON from server text:', payload.text, err);
            throw new Error('AIの返却形式が予期せぬ内容です');
        }

        // 結果を画面に反映する（既存の renderResult を再利用）
        // renderResult は元ファイルにあるためそのまま呼び出します
        renderResult(data);

    } catch (error) {
        console.error("API / server error:", error);
        showError("分析に失敗しました。しばらくしてからもう一度お試しください。");
        // 必要なら元の画面に戻す処理を追加
        renderStart();
    }
}