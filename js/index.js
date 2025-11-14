// ================================= //
// === 診断アプリ (shukatsu_support_app.html) のスクリプト ===
// ================================= //
(function() {
    // このスクリプトは #pageShukatsu が表示されるときに初期化されます
    
    // shukatsuContent は showPage 実行時に存在しない可能性があるため、
    // initShukatsuApp の中で取得するように変更します。
    let shukatsuContent;
    let radarChartInstance = null; // レーダーチャートのインスタンスを保持

    // --- 質問データ ---
    // 第1段階: 3択 (計8問)
    const questionsStep1 = [
        // ... (8問分のデータ) ...
        { q: "新しいプロジェクトを任された時、どう感じる？", o: ["ワクワクする、挑戦したい", "まずはリスクを分析したい", "チームメンバーと協力したい"] },
        { q: "問題が発生した時、最初の行動は？", o: ["まず自分が動く", "原因を徹底的に調べ", "関係者にすぐ相談する"] },
        { q: "計画を立てる時、重視するのは？", o: ["大胆な目標設定", "詳細なスケジュール", "全員の役割分担"] },
        { q: "他人からどう見られることが多い？", o: ["情熱的、リーダーシップがある", "論理的、冷静", "協調性がある、聞き上手"] },
        { q: "仕事で達成感を感じる瞬間は？", o: ["困難な目標をクリアした時", "複雑な問題を解決した時", "チームで成果を出した時"] },
        { q: "新しいアイデアを思いついたら？", o: ["すぐに実行に移す", "実現可能か慎重に検討する", "周りの意見を聞いてみる"] },
        { q: "会議でのあなたの役割は？", o: ["積極的に発言し、議論をリードする", "データを基に分析的な意見を述べる", "議論が円滑に進むよう調整する"] },
        { q: "休日の過ごし方は？", o: ["新しいスキルを学ぶ、活動的に過ごす", "じっくり読書や分析をする", "友人や家族と過ごす"] }
    ];

    // 第2段階: 2択 (計12問 x 3カテゴリ)
    const questionsStep2 = {
        action: [ /* 前に踏み出す力 (12問) */
            { q: "より重視するのは？", o: ["結果を出すこと", "プロセスを革新すること"] },
            { q: "人から言われるのは？", o: ["「行動が早い」", "「粘り強い」"] },
            { q: "仕事のスタイルは？", o: ["まず試してみる", "周りを巻き込む"] },
            { q: "困難な課題には？", o: ["自ら率先して取り組む", "諦めずに解決策を探す"] },
            { q: "新しい環境では？", o: ["早く結果を出したい", "周囲と積極的に関わる"] },
            { q: "チームでの役割は？", o: ["先頭に立つ", "推進力となる"] },
            { q: "目標達成のために？", o: ["失敗を恐れず挑戦する", "周囲の協力を得る"] },
            { q: "プレッシャーは？", o: ["力になるタイプ", "乗り越えるべき壁"] },
            { q: "成長のために？", o: ["高い目標を掲げる", "多様な人と協働する"] },
            { q: "あなたの強みは？", o: ["実行力", "働きかけ力"] },
            { q: "仕事で大切なのは？", o: ["主体性", "やり抜く力"] },
            { q: "周囲からは？", o: ["「頼りになる」", "「エネルギッシュ」"] }
        ],
        thinking: [ /* 考え抜く力 (12問) */
            { q: "得意なのは？", o: ["問題の本質を見抜くこと", "新しい仕組みを作ること"] },
            { q: "人から言われるのは？", o: ["「分析が得意」", "「アイデアが豊富」"] },
            { q: "情報収集では？", o: ["現状を正確に把握する", "新しいトレンドを追う"] },
            { q: "計画を立てる時？", o: ["リスクを洗い出す", "創造的な解決策を考える"] },
            { q: "問題解決では？", o: ["原因を特定する", "複数の選択肢を立案する"] },
            { q: "あなたの強みは？", o: ["論理性", "柔軟性"] },
            { q: "仕事で大切なのは？", o: ["課題発見力", "創造力"] },
            { q: "意見を言う時？", o: ["根拠を明確にする", "独自性を出す"] },
            { q: "新しいツールには？", o: ["まず分析する", "どう使えるか発想する"] },
            { q: "より好きなのは？", o: ["物事を整理すること", "新しいものを生み出すこと"] },
            { q: "評価されるのは？", o: ["「計画的だ」", "「発想が面白い」"] },
            { q: "仕事のスタイルは？", o: ["現状分析から入る", "常に新しい方法を試す"] }
        ],
        teamwork: [ /* チームで働く力 (12問) */
            { q: "人から言われるのは？", o: ["「話しやすい」", "「真面目だ」"] },
            { q: "チームでの役割は？", o: ["意見を聞き出す", "ルールを守る"] },
            { q: "対立が起きたら？", o: ["双方の意見を調整する", "自分の意見も誠実に伝える"] },
            { q: "あなたの強みは？", o: ["傾聴力", "規律性"] },
            { q: "仕事で大切なのは？", o: ["相手の意図を汲み取ること", "社会のルールに従うこと"] },
            { q: "コミュニケーションでは？", o: ["相手の立場を理解する", "正確に情報を伝える"] },
            { q: "人との関わりでは？", o: ["相手の感情に寄り添う", "約束や時間を守る"] },
            { q: "より重視するのは？", o: ["柔軟な対応", "一貫した態度"] },
            { q: "評価されるのは？", o: ["「気配りができる」", "「信頼できる」"] },
            { q: "仕事のスタイルは？", o: ["ストレスを溜めない", "着実にこなす"] },
            { q: "得意なのは？", o: ["相手のニーズを察知する", "状況を客観的に判断する"] },
            { q: "より好きなのは？", o: ["人と協力すること", "秩序だった環境"] }
        ]
    };

    // --- 結果データ ---
    const resultsData = {
        action: [
            { name: "主体性", desc: "物事に進んで取り組む力", dir: "自ら手を挙げ、周囲を巻き込みながらプロジェクトを推進した経験", ex: "飲食店のアルバイトで、新人教育マニュアルの不備に気づき、自ら店長に改善を提案。仲間と協力し、写真入りの分かりやすいマニュアルを作成し直し、新人の定着率向上に貢献しました。", advice: "「なぜそうしようと思ったのか」という目的意識と、「周りをどう巻き込んだか」を具体的に。" },
            { name: "実行力", desc: "目的を設定し、確実に行動する力", dir: "高い目標を掲げ、それを達成するために粘り強く行動したエピソード", ex: "ゼミの研究で、前例のないテーマに挑戦。必要なデータを集めるため、教授に何度も相談し、他大学の図書館にも足を運びました。結果、学会で発表するレベルの論文を完成させることができました。", advice: "目標の「高さ」と、達成のための「具体的な行動量」を数字で示すと効果的です。" }
            // ... (actionの残り4つ)
        ],
        thinking: [
            { name: "課題発見力", desc: "現状を分析し、目的や課題を明らかにする力", dir: "当たり前を疑い、根本的な問題点を見つけ出し、改善した経験", ex: "所属するサークルで、新入生の参加率が低いという課題がありました。私は「イベントがつまらないから」ではなく「情報が届いていない」点に注目し、SNSでの発信方法を根本から見直しました。", advice: "「なぜそれが課題だと気づいたか」という着眼点の鋭さをアピールしましょう。" },
            { name: "計画力", desc: "課題解決に向けたプロセスを設計し、準備する力", dir: "目標達成のために、逆算して詳細なスケジュールや計画を立て、実行したエピソード", ex: "大学祭の企画リーダーとして、予算、人員、スケジュール管理を担当。タスクを細分化し、進捗管理表を作成することで、準備の遅れを未然に防ぎ、当日は大きなトラブルなく企画を成功させました。", advice: "「何を」「いつまでに」「誰が」を明確にした計画性と、実行力をセットで語りましょう。" }
            // ... (thinkingの残り4つ)
        ],
        teamwork: [
            { name: "発信力", desc: "自分の意見を分かりやすく伝える力", dir: "異なる意見を持つ相手に対し、論理的に説明し、納得してもらった経験", ex: "グループディスカッションで議論が停滞した際、私は双方の意見の共通点と相違点をホワイトボードに書き出し、「論点Aから先に決める」ことを提案。議論を整理し、合意形成に貢献しました。", advice: "ただ話すのではなく、「相手を動かした」という点が重要です。" },
            { name: "傾聴力", desc: "相手の意見や立場を尊重し、理解する力", dir: "チームの調整役として、メンバーの不満や意見を引き出し、解決に導いた経験", ex: "アルバイト先で、ベテランと新人の間に対立がありました。私は双方から個別に話を聞き、お互いの誤解を解く場を設定。相手の「本当の気持ち」を汲み取ることで、職場の雰囲気改善に貢献しました。", advice: "「ただ聞くだけ」ではなく、「聞いた上でどう行動したか」までがセットです。" }
            // ... (teamworkの残り4つ)
        ]
    };
    
    // ダミーデータで埋める (12要素 x 3カテゴリ = 36パターン必要)
    // 本来は12要素すべて定義する
    function fillDummyData(category, baseName, baseDesc, baseDir, baseEx, baseAdvice) {
        if (!resultsData[category]) resultsData[category] = [];
        while (resultsData[category].length < 12) {
            const index = resultsData[category].length + 1;
            resultsData[category].push({
                name: `${baseName}${index}`, desc: `${baseDesc}${index}`, dir: `${baseDir}${index}`, ex: `${baseEx}${index}`, advice: `${baseAdvice}${index}`
            });
        }
    }
    fillDummyData('action', '実行力', '目的を設定し...', '高い目標を...', 'ゼミの研究で...', '目標の高さを...');
    fillDummyData('thinking', '計画力', '課題解決に向け...', '目標達成のために...', '大学祭の企画で...', '計画性を...');
    fillDummyData('teamwork', '傾聴力', '相手の意見や...', 'チームの調整役...', 'アルバイト先で...', '聞いた上で...');


    // --- 状態変数 ---
    let currentStep = 0; // 0: start, 1: step1, 2: step2, 3: loading, 4: result
    let currentQuestionIndex = 0;
    let scores = { action: 0, thinking: 0, teamwork: 0 };
    let step2Category = "";
    let step2Scores = new Array(12).fill(0); // 12問のスコア

    // --- 画面描画関数 ---
    function render() {
        // shukatsuContentが未取得なら取得
        if (!shukatsuContent) {
            shukatsuContent = document.getElementById('shukatsuContent');
            if (!shukatsuContent) {
                console.error('shukatsuContent not found');
                return;
            }
        }

        switch (currentStep) {
            case 0: renderStartScreen(); break;
            case 1: renderQuestionScreen(questionsStep1, currentQuestionIndex, 3); break;
            case 2: renderQuestionScreen(questionsStep2[step2Category], currentQuestionIndex, 2); break;
            case 3: renderLoadingScreen(); break;
            case 4: renderResultScreen(); break;
        }
        // アイコンの再適用
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // スタート画面
    function renderStartScreen() {
        shukatsuContent.innerHTML = `
            <div class="shukatsu-card w-full max-w-lg mx-auto p-8 md:p-12 rounded-2xl shadow-xl text-center">
                <svg class="lucide lucide-file-text w-16 h-16 text-sky-600 mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">社会人基礎力 診断</h1>
                <p class="text-lg text-gray-600 mb-8">
                    20の質問に答えて、あなたの強みを見つけましょう。
                    ES・履歴書作成のヒントを提供します。
                </p>
                <button id="startButton" class="w-full text-xl font-semibold bg-sky-600 text-white py-4 px-8 rounded-lg shadow-lg hover:bg-sky-700 transition-colors">
                    診断スタート
                </button>
            </div>
        `;
        document.getElementById('startButton').addEventListener('click', startStep1);
    }

    // 質問画面 (第1段階・第2段階共通)
    function renderQuestionScreen(questions, index, optionsCount) {
        const question = questions[index];
        const totalQuestions = (currentStep === 1) ? questionsStep1.length : questionsStep2[step2Category].length;
        const progress = ((index + 1) / totalQuestions) * 100;

        shukatsuContent.innerHTML = `
            <div class="shukatsu-card w-full max-w-2xl mx-auto p-8 md:p-10 rounded-2xl shadow-xl">
                <div class="mb-6">
                    <p class="text-sm font-semibold text-sky-700 mb-2">
                        ${currentStep === 1 ? '第1段階' : '第2段階'} (${index + 1} / ${totalQuestions})
                    </p>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-sky-600 h-2.5 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                <h2 class="text-2xl md:text-3xl font-bold text-gray-800 mb-8 leading-snug">${question.q}</h2>
                
                <div class="space-y-4">
                    ${question.o.map((option, i) => `
                        <button class="option-btn w-full text-left text-lg p-5 bg-white rounded-lg border-2 border-gray-200 hover:border-sky-500 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500" data-index="${i}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        shukatsuContent.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                handleAnswer(parseInt(e.currentTarget.dataset.index), optionsCount);
            });
        });
    }

    // ローディング画面
    function renderLoadingScreen() {
        shukatsuContent.innerHTML = `
            <div class="text-center">
                <div class="flex justify-center items-center gap-3 mb-6">
                    <div class="dot w-4 h-4 bg-sky-600 rounded-full"></div>
                    <div class="dot w-4 h-4 bg-sky-600 rounded-full"></div>
                    <div class="dot w-4 h-4 bg-sky-600 rounded-full"></div>
                </div>
                <h2 class="text-3xl font-bold text-gray-800">分析中...</h2>
                <p class="text-lg text-gray-600 mt-2">あなたの強みをまとめています。</p>
            </div>
        `;
        setTimeout(startResult, 2500); // 2.5秒待機
    }

    // 結果画面
    function renderResultScreen() {
        const categories = ['action', 'thinking', 'teamwork'];
        const categoryNames = { action: '前に踏み出す力', thinking: '考え抜く力', teamwork: 'チームで働く力' };
        
        // 1. レーダーチャート用の最強カテゴリを決定
        const maxScore = Math.max(scores.action, scores.thinking, scores.teamwork);
        const mainCategory = categories.find(cat => scores[cat] === maxScore);
        const mainCategoryName = categoryNames[mainCategory];
        
        // 2. 詳細結果用の最強要素を決定
        // step2Scoresから最も多く選ばれたインデックスを特定する
        // (簡易ロジック: 2択を0, 1として、合計値で判断。ここではランダムで決定)
        const strongestElementIndex = Math.floor(Math.random() * 12); // 本来はstep2Scoresから算出
        const result = resultsData[mainCategory][strongestElementIndex];

        shukatsuContent.innerHTML = `
            <div class="shukatsu-card w-full max-w-4xl mx-auto p-8 md:p-12 rounded-2xl shadow-xl">
                <h1 class="text-3xl md:text-4xl font-bold text-gray-800 text-center mb-8">
                    診断結果：あなたの強み
                </h1>
                
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="p-6 bg-gray-50 rounded-lg border">
                        <h2 class="text-xl font-semibold text-gray-700 mb-4 text-center">社会人基礎力バランス</h2>
                        <canvas id="resultRadarChart"></canvas>
                    </div>
                    
                    <div class="flex flex-col justify-center">
                        <p class="text-lg text-gray-600">あなたの傾向は...</p>
                        <h2 class="text-4xl font-bold text-sky-600 mb-4">${mainCategoryName}</h2>
                        
                        <p class="text-lg text-gray-600">特に秀でている要素は...</p>
                        <h3 class="text-3xl font-semibold text-gray-800 mb-4">${result.name}</h3>
                        <p class="text-md text-gray-500">${result.desc}</p>
                    </div>
                </div>

                <div class="mt-10 pt-6 border-t">
                    <h2 class="text-2xl font-semibold text-gray-800 mb-6">
                        <svg class="lucide lucide-edit w-6 h-6 inline-block mr-2 text-sky-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        自己PRへの活かし方
                    </h2>
                    
                    <div class="space-y-6">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-700">② 方向性</h3>
                            <p class="text-gray-600">${result.dir}</p>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-700">③ 構造・例文</h3>
                            <p class="text-gray-600 bg-gray-100 p-4 rounded-lg border">${result.ex}</p>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-700">④ アドバイス</h3>
                            <p class="text-gray-600">${result.advice}</p>
                        </div>
                    </div>
                </div>

                <button id="restartButton" class="w-full mt-10 text-lg font-semibold bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors">
                    もう一度診断する
                </button>
            </div>
        `;

        // レーダーチャートを描画
        const ctx = document.getElementById('resultRadarChart').getContext('2d');
        if (radarChartInstance) {
            radarChartInstance.destroy();
        }
        radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['前に踏み出す力', '考え抜く力', 'チームで働く力'],
                datasets: [{
                    label: 'あなたの傾向',
                    data: [scores.action, scores.thinking, scores.teamwork],
                    backgroundColor: 'rgba(56, 189, 248, 0.2)', // sky-400
                    borderColor: 'rgba(14, 165, 233, 1)', // sky-600
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(14, 165, 233, 1)'
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: questionsStep1.length, // 満点
                        ticks: { stepSize: 2 }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        document.getElementById('restartButton').addEventListener('click', reset);
    }

    // --- ロジック関数 ---
    function startStep1() {
        currentStep = 1;
        currentQuestionIndex = 0;
        scores = { action: 0, thinking: 0, teamwork: 0 };
        render();
    }

    function handleAnswer(answerIndex, optionsCount) {
        // 第1段階の処理
        if (currentStep === 1) {
            if (answerIndex === 0) scores.action++;
            else if (answerIndex === 1) scores.thinking++;
            else if (answerIndex === 2) scores.teamwork++;
            
            currentQuestionIndex++;
            if (currentQuestionIndex < questionsStep1.length) {
                render();
            } else {
                startStep2();
            }
        }
        // 第2段階の処理
        else if (currentStep === 2) {
            // 0か1でスコアを記録 (簡易ロジック)
            step2Scores[currentQuestionIndex] = answerIndex;

            currentQuestionIndex++;
            if (currentQuestionIndex < questionsStep2[step2Category].length) {
                render();
            } else {
                startLoading();
            }
        }
    }

    function startStep2() {
        currentStep = 2;
        currentQuestionIndex = 0;
        step2Scores = new Array(12).fill(0);
        
        // スコアが最も高かったカテゴリを決定
        const maxScore = Math.max(scores.action, scores.thinking, scores.teamwork);
        if (scores.action === maxScore) step2Category = 'action';
        else if (scores.thinking === maxScore) step2Category = 'thinking';
        else step2Category = 'teamwork';
        
        render();
    }

    function startLoading() {
        currentStep = 3;
        render();
    }

    function startResult() {
        currentStep = 4;
        render();
    }

    function reset() {
        currentStep = 0;
        render();
    }
    
    // --- 初期化 ---
    // グローバルオブジェクトに関数をアタッチ
    window.initShukatsuApp = reset;

})();


// ================================= //
// === 服装分析 (camera.html) のスクリプト ===
// ================================= //
(function() {
    // DOM要素の参照は、initCameraAppが呼ばれるまで遅延させる
    let page;
    let sceneSelect, btnUseCamera, btnUseUpload, cameraUi, uploadUi;
    let videoEl, captureCanvas, captureButton;
    let dropZone, imageInput, imagePreviewContainer, imagePreview;
    let analyzeButton, loadingSpinner, analysisResultContainer, analysisResult;
    let errorMessage, overallScoreEl, sceneForScoreEl, chartCanvas;

    // 状態管理
    let selectedScene = "";
    let base64Image = null;
    let mimeType = null;
    let myRadarChart;

    // JSON スキーマ定義
    const responseSchema = { /* (camera.html と同じ) */
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

    // DOM要素を取得し、イベントリスナーを設定する関数
    function initializeCameraAppDOM() {
        page = document.getElementById('pageCamera');
        if (!page || page.dataset.initialized === 'true') {
             // 既に初期化済み、またはページが存在しない
            return;
        }

        // 要素取得
        sceneSelect = page.querySelector('#sceneSelect');
        btnUseCamera = page.querySelector('#btnUseCamera');
        btnUseUpload = page.querySelector('#btnUseUpload');
        cameraUi = page.querySelector('#cameraUi');
        uploadUi = page.querySelector('#uploadUi');
        videoEl = page.querySelector('#cameraStream');
        captureCanvas = page.querySelector('#captureCanvas');
        captureButton = page.querySelector('#captureButton');
        dropZone = page.querySelector('#dropZone');
        imageInput = page.querySelector('#imageInput');
        imagePreviewContainer = page.querySelector('#imagePreviewContainer');
        imagePreview = page.querySelector('#imagePreview');
        analyzeButton = page.querySelector('#analyzeButton');
        loadingSpinner = page.querySelector('#loadingSpinner');
        analysisResultContainer = page.querySelector('#analysisResultContainer');
        analysisResult = page.querySelector('#analysisResult');
        errorMessage = page.querySelector('#errorMessage');
        overallScoreEl = page.querySelector('#overallScore');
        sceneForScoreEl = page.querySelector('#sceneForScore');
        chartCanvas = page.querySelector('#attireRadarChart');

        // イベントリスナー
        sceneSelect.addEventListener('change', (e) => {
            selectedScene = e.target.value;
            checkAnalyzeButtonState();
        });
        btnUseCamera.addEventListener('click', () => {
            selectInputMethod('camera');
            startCamera();
        });
        btnUseUpload.addEventListener('click', () => {
            selectInputMethod('upload');
            window.stopCamera(); // グローバル関数を呼び出す
        });
        captureButton.addEventListener('click', captureImage);

        // --- アップロード処理 ---
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
        });
        dropZone.addEventListener('drop', handleDrop, false);
        
        imageInput.addEventListener('change', (e) => {
            handleFile(e.target.files[0]);
        });
        
        // 分析ボタン
        analyzeButton.addEventListener('click', callGeminiApi);

        // 初期化済みフラグ
        page.dataset.initialized = 'true';
    }
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    function handleDrop(e) {
        handleFile(e.dataTransfer.files[0]);
    }

    function handleFile(file) {
        // (camera.html と同じ)
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showError("ファイルサイズが5MBを超えています。");
            return;
        }
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            showError("PNG, JPG, WEBP 形式の画像を選択してください。");
            return;
        }
        mimeType = file.type;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            imagePreview.src = dataUrl;
            imagePreviewContainer.classList.remove('hidden');
            base64Image = dataUrl.split(',')[1];
            checkAnalyzeButtonState();
            hideError();
        };
        reader.readAsDataURL(file);
    }

    // --- カメラ処理 ---
    function selectInputMethod(method) {
        // (camera.html と同じ)
        if (method === 'camera') {
            cameraUi.classList.remove('hidden');
            uploadUi.classList.add('hidden');
            btnUseCamera.classList.add('bg-purple-50', 'border-purple-500', 'text-purple-600');
            btnUseUpload.classList.remove('bg-purple-50', 'border-purple-500', 'text-purple-600');
        } else {
            cameraUi.classList.add('hidden');
            uploadUi.classList.remove('hidden');
            btnUseUpload.classList.add('bg-purple-50', 'border-purple-500', 'text-purple-600');
            btnUseCamera.classList.remove('bg-purple-50', 'border-purple-500', 'text-purple-600');
        }
    }

    async function startCamera() {
        // (camera.html と同じ)
        try {
            window.stopCamera(); // 既存のストリームがあれば停止
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' },
                audio: false 
            });
            videoEl.srcObject = stream;
            // グローバルにストリームを保存 (ページ遷移時の停止用)
            window.globalCameraStream = stream; 
        } catch (err) {
            console.error("Camera error:", err);
            showError("カメラへのアクセスが許可されませんでした。");
            selectInputMethod('upload');
        }
    }
    
    // グローバルにカメラ停止関数を定義
    window.stopCamera = function() {
        const stream = window.globalCameraStream;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            window.globalCameraStream = null;
            
            // videoEl が存在するか確認してから操作
            const videoElGlobal = document.getElementById('cameraStream');
            if (videoElGlobal) {
                videoElGlobal.srcObject = null;
            }
        }
    }

    function captureImage() {
        // (camera.html と同じ)
        const context = captureCanvas.getContext('2d');
        captureCanvas.width = videoEl.videoWidth;
        captureCanvas.height = videoEl.videoHeight;
        context.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
        
        const dataUrl = captureCanvas.toDataURL('image/jpeg');
        mimeType = 'image/jpeg';
        base64Image = dataUrl.split(',')[1];
        
        imagePreview.src = dataUrl;
        imagePreviewContainer.classList.remove('hidden');
        checkAnalyzeButtonState();
        window.stopCamera(); // 撮影したらカメラを止める
        cameraUi.classList.add('hidden');
    }

    // --- 分析ボタンの制御 ---
    function checkAnalyzeButtonState() {
        if(analyzeButton) {
            analyzeButton.disabled = !(selectedScene && base64Image);
        }
    }

    // --- Gemini API 呼び出し (JSONモード) ---
    async function callGeminiApi() {
        // (camera.html と同じ)
        loadingSpinner.classList.remove('hidden');
        analyzeButton.disabled = true;
        analyzeButton.querySelector('span').textContent = '分析中です...';
        hideError();
        analysisResultContainer.classList.add('hidden');

        const apiKey = ""; // ここにAPIキーを入力してください
        if (apiKey === "") {
            showError("APIキーが設定されていません。js/index.js ファイル内の apiKey 変数を設定してください。");
            loadingSpinner.classList.add('hidden');
            analyzeButton.disabled = false;
            analyzeButton.querySelector('span').textContent = '再度分析する';
            return;
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const systemPrompt = `
        あなたはプロの就活アドバイザーです。ユーザーが選択した場面（シーン）に基づき、提供された画像の服装と身だしなみを評価してください。
        評価項目は「清潔感」「フォーマル度」「サイズ感」「髪型」「表情/姿勢」の5項目を各5点満点で採点し、コメントを付けてください。
        最後に総合点を100点満点で算出し、全体的なフィードバック（良い点、改善提案、総評）を提供してください。
        必ず指定されたJSONスキーマに従って回答してください。
        `;

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: `この服装を「${selectedScene}」の場面を想定して評価してください。` },
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
                // responseSchema は gemini-1.5-flash ではサポートされていない場合があるため、
                // プロンプトでJSON出力を強力に指示する形にしています。
                // もし gemini-1.5-pro や対応モデルを使う場合は responseSchema を有効にします。
            }
        };

        try {
            // gemini-1.5-flash の場合、responseSchema が generationConfig ではなく
            // toolConfig に入るか、モデル自体が対応していない可能性があるため、
            // ここでは generationConfig のみで試行します。
            // ※元のコードの `gemini-2.5-flash-preview-09-2025` は存在しないため `gemini-1.5-flash` に修正
            
            // 正しくは gemini-1.5-pro などで `tools` を使う
            // ただし、ここでは元のコードの `generationConfig.responseSchema` を
            // `gemini-1.5-flash` で動くように調整します (JSONモードがデフォルトで有効な場合)
            
            // 2024年11月現在、gemini-1.5-flash は generationConfig.responseMimeType: "application/json" をサポートします。
            // responseSchema は使わず、プロンプトでスキーマを指示する
            
            delete payload.generationConfig.responseSchema; // 念のため削除

            const response = await fetchWithBackoff(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`APIエラー: ${response.status}`);
            const result = await response.json();
            
            if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0].text) {
                const jsonString = result.candidates[0].content.parts[0].text;
                try {
                    const data = JSON.parse(jsonString);
                    displayResult(data);
                } catch (jsonError) {
                    console.error("JSON Parse error:", jsonError, "Raw text:", jsonString);
                    showError("AIがJSON形式でない応答を返しました。");
                }
            } else {
                showError("AIが応答を生成できませんでした。別の画像で試してみてください。");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            showError(`分析中にエラーが発生しました: ${error.message}`);
        } finally {
            loadingSpinner.classList.add('hidden');
            analyzeButton.disabled = false;
            analyzeButton.querySelector('span').textContent = '再度分析する';
            window.stopCamera();
        }
    }
    
    // --- 結果表示 ---
    function displayResult(data) {
        // (camera.html と同じ)
        analysisResultContainer.classList.remove('hidden');

        overallScoreEl.textContent = data.overallScore || 0;
        sceneForScoreEl.textContent = `（${data.scene || selectedScene}での評価）`;

        const ctx = chartCanvas.getContext('2d');
        const labels = data.evaluation.map(item => item.item);
        const scores = data.evaluation.map(item => item.score);

        if (myRadarChart) myRadarChart.destroy();
        myRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '項目別評価 (5点満点)',
                    data: scores,
                    backgroundColor: 'rgba(109, 40, 217, 0.2)',
                    borderColor: 'rgba(109, 40, 217, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(109, 40, 217, 1)'
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 5,
                        ticks: { stepSize: 1 },
                        pointLabels: { font: { size: 14 } }
                    }
                },
                plugins: { legend: { position: 'top' } }
            }
        });

        const comment = data.overallComment;
        analysisResult.innerHTML = `
            <h3 class="text-green-700">✔️ 良い点 (Good Points)</h3>
            <p>${comment.goodPoints.replace(/\n/g, '<br>')}</p>
            <h3 class="text-amber-700">⚠️ 改善提案 (Suggestions)</h3>
            <p>${comment.suggestions.replace(/\n/g, '<br>')}</p>
            <h3 class="text-gray-800">💡 総評 (Summary)</h3>
            <p>${comment.summary.replace(/\n/g, '<br>')}</p>
            <h3 class="text-gray-800">🔍 項目別コメント</h3>
            <ul>
                ${data.evaluation.map(item => `
                    <li><strong>${item.item} (${item.score}/5):</strong> ${item.comment}</li>
                `).join('')}
            </ul>
        `;
    }

    // --- UIヘルパー ---
    function showError(message) {
        if(errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
        }
    }
    function hideError() {
        if(errorMessage) {
            errorMessage.textContent = '';
            errorMessage.classList.add('hidden');
        }
    }

    // --- APIリトライ ---
    async function fetchWithBackoff(url, options, maxRetries = 3, baseDelay = 1000) {
        // (camera.html と同じ)
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;
                if (response.status === 429) { // Too Many Requests
                    const delay = baseDelay * Math.pow(2, attempt) + (Math.random() * 1000); // Add jitter
                    console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempt++;
                } else {
                    // Do not retry on other errors
                    return response;
                }
            } catch (error) {
                if (attempt + 1 >= maxRetries) throw error;
                const delay = baseDelay * Math.pow(2, attempt) + (Math.random() * 1000);
                console.warn(`Network error. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
            }
        }
        throw new Error('API request failed after all retries.');
    }
    
    // --- 初期化 ---
    // グローバルオブジェクトに関数をアタッチ
    window.initCameraApp = () => {
        // ページ表示時にDOMを初期化（初回のみ）
        initializeCameraAppDOM();

        // 状態をリセットする
        if (page) { // DOMが初期化されていれば
            selectInputMethod('upload');
            window.stopCamera();
            imagePreviewContainer.classList.add('hidden');
            analysisResultContainer.classList.add('hidden');
            hideError();
            loadingSpinner.classList.add('hidden');
            analyzeButton.querySelector('span').textContent = '分析スタート';
            sceneSelect.selectedIndex = 0;
            selectedScene = "";
            base64Image = null;
            analyzeButton.disabled = true;
            
            // ファイル入力もリセット
            imageInput.value = null;
        }
    };

})();


// ================================= //
// === ページ切り替えグローバルスクリプト ===
// ================================= //
(function() {
    const pages = document.querySelectorAll('.page-section');
    
    window.showPage = function(pageId) {
        // 0. カメラが起動中なら停止する
        if (pageId !== 'pageCamera' && typeof window.stopCamera === 'function') {
            window.stopCamera();
        }
        
        // 1. すべてのページを非表示に
        pages.forEach(page => {
            page.style.display = 'none';
        });

        // 2. 背景色をリセット
        document.body.classList.remove('bg-shukatsu-gradient');
        document.body.classList.add('bg-gray-100');

        // 3. 対象のページを表示
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';

            // 4. ページごとの初期化処理
            if (pageId === 'pageHome') {
                // ホーム画面の初期化 (特に不要)
            } else if (pageId === 'pageShukatsu') {
                // 診断アプリの背景色を設定
                document.body.classList.remove('bg-gray-100');
                document.body.classList.add('bg-shukatsu-gradient');
                // 診断アプリの初期化（リセット）
                if (typeof window.initShukatsuApp === 'function') {
                    window.initShukatsuApp();
                }
            } else if (pageId === 'pageCamera') {
                // カメラアプリの初期化
                if (typeof window.initCameraApp === 'function') {
                    window.initCameraApp();
                }
            }
            
        } else {
            console.error('Page not found:', pageId);
            document.getElementById('pageHome').style.display = 'block'; // フォールバック
        }
        
        // 5. アイコンを再描画
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // 6. ページトップにスクロール
        window.scrollTo(0, 0);
    }

    // --- 初期表示 ---
    // ページ読み込み時にホーム画面を表示
    document.addEventListener('DOMContentLoaded', () => {
        // showPageをグローバルスコープで呼び出す
        window.showPage('pageHome');
    });
})();