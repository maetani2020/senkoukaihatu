// --- 診断アプリのスクリプト ---
const bunsekiContent = document.getElementById('bunsekiContent');
let radarChartInstance = null; 

// --- 質問データ (全20問) ---
const stage1Questions = [
    { text: "新しいプロジェクトに取り組む時、あなたが最も重視するのは？", options: [{ text: "まず行動し、試行錯誤する", value: "action" }, { text: "リスクを分析し、計画を立てる", value: "think" }, { text: "チームメンバーと役割分担する", value: "team" }] },
    { text: "意見が対立した時、あなたはどうする？", options: [{ text: "自分の意見を主張し、議論を主導する", value: "action" }, { text: "相手の意見の背景を分析する", value: "think" }, { text: "共通点を見つけ、合意形成を図る", value: "team" }] },
    { text: "困難な課題に直面した時、最初にすることは？", options: [{ text: "とにかく手を動かして解決策を探る", value: "action" }, { text: "課題を分解し、原因を特定する", value: "think" }, { text: "周りの人に助けを求め、協力する", value: "team" }] },
    { text: "あなたの学習スタイルに最も近いのは？", options: [{ text: "実践しながら学ぶ", value: "action" }, { text: "本や資料を読み込んでから始める", value: "think" }, { text: "勉強会を開き、仲間と学ぶ", value: "team" }] },
    { text: "プレゼンテーションの準備で大事なことは？", options: [{ text: "情熱を込めて、聴衆を惹きつける", value: "action" }, { text: "論理的な構成とデータ", value: "think" }, { text: "聴衆の反応を予測し、質疑応答に備える", value: "team" }] },
    { text: "休日の過ごし方でしっくりくるのは？", options: [{ text: "アクティブに外出し、新しい体験をする", value: "action" }, { text: "じっくりと趣味や研究に没頭する", value: "think" }, { text: "友人や家族と予定を合わせて過ごす", value: "team" }] },
    { text: "問題が発生した時、どう感じる？", options: [{ text: "「どう動くか」を考え、すぐに行動に移す", value: "action" }, { text: "「なぜ起きたか」を分析し、冷静になる", value: "think" }, { text: "「誰に影響が出るか」を心配し、情報共有する", value: "team" }] },
    { text: "チームに貢献する上で、あなたの強みは？", options: [{ text: "ムードメーカーとして場を盛り上げる", value: "action" }, { text: "データに基づいた的確な分析", value: "think" }, { text: "メンバー間の調整役・サポーター", value: "team" }] }
];
const stage2Questions = {
    action: [
        { text: "目標達成のために？", options: [{ text: "失敗を恐れず挑戦する", value: "a" }, { text: "新しい方法を試す", value: "b" }] },
        { text: "より重視するのは？", options: [{ text: "粘り強くやり遂げる", value: "a" }, { text: "周りを巻き込む", value: "b" }] },
        { text: "どちらかというと？", options: [{ text: "決めたことはすぐ実行", value: "a" }, { text: "実行する前に仲間を探す", value: "b" }] },
        { text: "人を動かすには？", options: [{ text: "まず自分が背中を見せる", value: "a" }, { text: "目的やビジョンを共有する", value: "b" }] },
        { text: "リーダーシップとは？", options: [{ text: "先頭に立って引っ張ること", value: "a" }, { text: "周りの意見を引き出し、まとめること", value: "b" }] },
        { text: "新しいアイデアを？", options: [{ text: "まず自分で試してみる", value: "a" }, { text: "まず人に話して反応を見る", value: "b" }] },
        { text: "評価されたいのは？", options: [{ text: "行動の早さと結果", value: "a" }, { text: "チームへの影響力", value: "b" }] },
        { text: "物事が進まない時？", options: [{ text: "自分が率先して進める", value: "a" }, { text: "進まない理由を皆で議論するよう促す", value: "b" }] },
        { text: "あなたの原動力は？", options: [{ text: "達成感", value: "a" }, { text: "共感", value: "b" }] },
        { text: "仕事で重要なのは？", options: [{ text: "スピード感", value: "a" }, { text: "一体感", value: "b" }] },
        { text: "初めての場所でも？", options: [{ text: "臆せず飛び込める", value: "a" }, { text: "まず周りに話しかける", value: "b" }] },
        { text: "周りからは...？", options: [{ text: "「行動力がある」と言われる", value: "a" }, { text: "「影響力がある」と言われる", value: "b" }] }
    ],
    think: [
        { text: "問題解決において得意なのは？", options: [{ text: "現状の問題点を見つけること", value: "a" }, { text: "未来を予測し、計画を立てること", value: "b" }] },
        { text: "物事を進める時？", options: [{ text: "「なぜ」を深掘りする", value: "a" }, { text: "ダンドリを組む", value: "b" }] },
        { text: "得意なのは？", options: [{ text: "間違い探し（アラ探し）", value: "a" }, { text: "旅行のしおり作り", value: "b" }] },
        { text: "物事を？", options: [{ text: "深く掘り下げたい", value: "a" }, { text: "広く見渡したい", value: "b" }] },
        { text: "思考のクセは？", options: [{ text: "「本当にそうか？」と疑う", value: "a" }, { text: "「次は何をすべきか？」と考える", value: "b" }] },
        { text: "情報収集では？", options: [{ text: "一つの情報を深掘りする", value: "a" }, { text: "複数の情報を整理・分類する", value: "b" }] },
        { text: "会話では？", options: [{ text: "相手の話の矛盾に気づきやすい", value: "a" }, { text: "話のゴールを先に決めたがる", value: "b" }] },
        { text: "より避けたいのは？", options: [{ text: "根本的な問題を見逃すこと", value: "a" }, { text: "締め切りに間に合わないこと", value: "b" }] },
        { text: "あなたの役割は？", options: [{ text: "問題提起する人", value: "a" }, { text: "スケジュールを管理する人", value: "b" }] },
        { text: "安心するのは？", options: [{ text: "原因が特定できた時", value: "a" }, { text: "やるべき事がリスト化できた時", value: "b" }] },
        { text: "よりワクワクするのは？", options: [{ text: "誰も気づかなかった真実を見つけた時", value: "a" }, { text: "完璧なプランが完成した時", value: "b" }] },
        { text: "周りからは...？", options: [{ text: "「分析力がある」と言われる", value: "a" }, { text: "「計画性がある」と言われる", value: "b" }] }
    ],
    team: [
        { text: "チームでの役割は？", options: [{ text: "相手の意見を注意深く聞く", value: "a" }, { text: "自分の意見を分かりやすく伝える", value: "b" }] },
        { text: "議論の場で？", options: [{ text: "全体の雰囲気や相手の感情を察する", value: "a" }, { text: "論理的に自分の考えを述べる", value: "b" }] },
        { text: "会議中、あなたは？", options: [{ text: "頷きや相槌が多い", value: "a" }, { text: "発言や質問が多い", value: "b" }] },
        { text: "友人からよく？", options: [{ text: "相談事を持ちかけられる", value: "a" }, { text: "意見を求められる", value: "b" }] },
        { text: "得意なのは？", options: [{ text: "相手に共感すること", value: "a" }, { text: "相手を説得すること", value: "b" }] },
        { text: "コミュニケーションで大事なのは？", options: [{ text: "相手が話しやすい雰囲気", value: "a" }, { text: "分かりやすい言葉選び", value: "b" }] },
        { text: "グループワークでは？", options: [{ text: "まず全員の意見を聞きたい", value: "a" }, { text: "まず自分の意見を言いたい", value: "b" }] },
        { text: "より避けたいのは？", options: [{ text: "相手の本音を聞き出せないこと", value: "a" }, { text: "自分の意図が誤解されること", value: "b" }] },
        { text: "あなたの役割は？", options: [{ text: "カウンセラー役", value: "a" }, { text: "プレゼンター役", value: "b" }] },
        { text: "議論が白熱した時？", options: [{ text: "一旦、冷静に話を聞く側に回る", value: "a" }, { text: "論点を整理し、自分の考えを述べる", value: "b" }] },
        { text: "人との関わりで？", options: [{ text: "信頼関係を築くのが得意", value: "a" }, { text: "物事を明確にするのが得意", value: "b" }] },
        { text: "周りからは...？", options: [{ text: "「聞き上手」と言われる", value: "a" }, { text: "「説明がうまい」と言われる", value: "b" }] }
    ]
};
const resultsData = {
    '課題発見力': { category: '考え抜く力', element: '課題発見力', direction: '「現状を分析し、隠れた問題点や本質的な課題を見抜く力」をアピールしましょう。データや事象から「なぜ」を追求し、改善に繋げた経験が有効です。', example: '<p><strong>[強み]</strong> 私の強みは、現状を分析し本質的な課題を発見する力です。</p><p><strong>[エピソード]</strong>（例：アルバイト先の売上低迷に対し、単なる人手不足ではなく「時間帯による客層のズレ」が問題であるとデータから特定したエピソード）</p><p><strong>[貢献]</strong> この「課題発見力」を活かし、貴社の事業においても表面的な事象に捉われず、真の課題解決に貢献したいと考えております。</p>', advice: '課題を発見しただけでなく、「どのように分析したか（具体的手法）」と「発見した課題をどう解決に導いたか（行動）」までをセットで語れると説得力が増します。' },
    '計画力': { category: '考え抜く力', element: '計画力', direction: '「目標達成までのプロセスを逆算し、実現可能なダンドリを組む力」をアピールしましょう。タスクを分解し、優先順位をつけ、リスクを管理した経験が有効です。', example: '<p><strong>[強み]</strong> 私の強みは、目標達成から逆算して計画を立て、実行する力です。</p><p><strong>[エピソード]</strong>（例：サークルのイベント運営において、半年前からタスクを洗い出し、担当と期限を明確にしたスケジュール管理表を作成・運用し、成功に導いたエピソード）</p><p><strong>[貢献]</strong> この「計画力」を活かし、貴社のプロジェクトにおいても着実な業務遂行と目標達成に貢献したいと考えております。</p>', advice: '「計画倒れ」にならなかったことが重要です。計画の実行中に発生した「予期せぬトラブル」に対し、どのように計画を「修正」して対応したかも含めると、より評価が高くなります。' },
    '実行力': { category: '前に踏み出す力', element: '実行力 (主体性)', direction: '「目標達成のために主体的に行動し、粘り強くやり遂げる力」をアピールしましょう。困難な状況でも諦めず、自ら考え行動した経験が有効です。', example: '<p><strong>[強み]</strong> 私の強みは、目標達成のために主体的に行動し、最後までやり遂げる「実行力」です。</p><p><strong>[エピソード]</strong>（例：資格取得という目標に対し、1日3時間の学習を半年間継続。途中で点数が伸び悩んだ際も、学習方法を見直し、無事合格を勝ち取ったエピソード）</p><p><strong>[貢献]</strong> この「実行力」を活かし、貴社でも高い目標に挑戦し、粘り強く成果を追求したいと考えております。</p>', advice: '「言われたことをやった」だけでは主体性とは見なされません。「なぜそれに取り組んだのか（目的意識）」と「困難をどう乗り越えたか（粘り強さ）」を明確にしましょう。' },
    '働きかけ力': { category: '前に踏み出す力', element: '働きかけ力 (巻き込み力)', direction: '「目標達成のために、周りの人々を巻き込み、協力を引き出す力」をアピールしましょう。異なる意見を持つメンバーをまとめ、同じ方向に導いた経験が有効です。', example: '<p><strong>[強み]</strong> 私の強みは、周りの人々を巻き込み、目標達成に向かって働きかける力です。</p><p><strong>[エピソード]</strong>（例：文化祭の企画で、意見がバラバラだったチームに対し、個別にヒアリングを行い、全員が納得できる共通のビジョン（例：「来場者アンケート1位」）を設定し、チームを一つにしたエピソード）</p><p><strong>[貢献]</strong> この「働きかけ力」を活かし、チームの一員として、周囲と積極的に協働し、より大きな成果を生み出すことに貢献したいです。</p>', advice: '単なる「リーダー経験」ではなく、「なぜ周りがあなたに協力してくれたのか」が重要です。相手のメリットや想いを汲み取った上で「働きかけた」点を強調しましょう。' },
    '傾聴力': { category: 'チームで働く力', element: '傾聴力 (共感力)', direction: '「相手の意見や感情を深く理解し、信頼関係を築く力」をアピールしましょう。相手が話しやすい雰囲気を作り、言葉の裏にある真意を引き出した経験が有効です。', example: '<p><strong>[強み]</strong> 私の強みは、相手の立場に立って話を深く聴き、信頼関係を築く「傾聴力」です。</p><p><strong>[エピソード]</strong>（例：アルバイト先で、新人の定着率が悪いという課題に対し、新人一人ひとりと面談。不安や不満を丁寧にヒアリングし、教育マニュアルの改善を店長に提案・実行したエピソード）</p><p><strong>[貢献]</strong> この「傾聴力」を活かし、社内外の多様な関係者と円滑なコミュニケーションを図り、チームの潤滑油として貢献したいです。</p>', advice: '「ただ話を聞いた」だけではアピールになりません。「聞いた結果、相手や状況がどう変わったか（問題解決）」までをセットで示すことが重要です。' },
    '発信力': { category: 'チームで働く力', element: '発信力 (説明力)', direction: '「自分の考えや情報を、相手に分かりやすく論理的に伝える力」をアピールしましょう。専門的な内容を噛み砕いたり、複雑な状況を整理して説明した経験が有効です。', example: '<p><strong>[強み]</strong> 私の強みは、複雑な情報や自分の考えを、相手に合わせて分かりやすく伝える「発信力」です。</p><p><strong>[エピソード]</strong>（例：ゼミの研究発表で、専門外の学生にも興味を持ってもらえるよう、専門用語を日常の例えに置き換え、図やグラフを多用して説明し、高い評価を得たエピソード）</p><p><strong>[貢献]</strong> この「発信力」を活かし、貴社でもチーム内での正確な情報共有や、クライアントへの分かりやすい提案を行い、円滑なプロジェクト推進に貢献したいです。</p>', advice: '「一方的に話す」ことではありません。「相手の理解度（前提知識）」を常に意識し、「双方向のコミュニケーション」を心がけた点をアピールできると、より評価されます。' }
};

// --- 状態変数 ---
let stage1Scores = { action: 0, think: 0, team: 0 };
let stage2Answers = {};
let topCategory = '';
let finalElement = '';
let currentStage1Question = 0;
let currentStage2Question = 0;

// --- 画面描画関数 ---
function renderStart() {
    bunsekiContent.innerHTML = `
        <div class="bunseki-card bg-white w-full max-w-lg mx-auto p-8 md:p-12 rounded-2xl shadow-xl text-center">
            <svg class="lucide lucide-file-text w-16 h-16 text-sky-600 mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">社会人基礎力 診断</h1>
            <p class="text-lg text-gray-600 mb-8">
                全20問の質問に答えて、あなたの強みを見つけましょう。
                ES・履歴書作成のヒントを提供します。
            </p>
            <button id="startButton" class="w-full text-xl font-semibold bg-sky-600 text-white py-4 px-8 rounded-lg shadow-lg hover:bg-sky-700 transition-colors active:scale-[0.98]">
                診断スタート
            </button>
        </div>
    `;
    bunsekiContent.querySelector('#startButton').addEventListener('click', startStage1);
}

function renderStage1Question() {
    if (currentStage1Question >= stage1Questions.length) {
        calculateStage1Result();
        return;
    }
    const q = stage1Questions[currentStage1Question];
    const progress = ((currentStage1Question + 1) / stage1Questions.length) * 100;
    bunsekiContent.innerHTML = `
        <div class="bunseki-card bg-white w-full max-w-2xl mx-auto p-8 md:p-10 rounded-2xl shadow-xl">
            <div class="mb-6">
                <p class="text-sm font-semibold text-sky-700 mb-2">
                    第1段階 (${currentStage1Question + 1} / ${stage1Questions.length})
                </p>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-sky-600 h-2.5 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="question-text-container mb-8">
                <h2 class="text-2xl md:text-3xl font-bold text-gray-800 leading-snug text-center">${q.text}</h2>
            </div>
            <div class="space-y-4">
                ${q.options.map((opt, index) => `
                    <button class="option-btn w-full text-left text-lg p-5 bg-white rounded-lg border-2 border-gray-200 hover:border-sky-500 hover:bg-sky-50 transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-[0.98]" data-value="${opt.value}">
                        ${opt.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    bunsekiContent.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            stage1Scores[e.currentTarget.dataset.value]++;
            currentStage1Question++;
            renderStage1Question();
        });
    });
}

function calculateStage1Result() {
    topCategory = Object.keys(stage1Scores).reduce((a, b) => stage1Scores[a] > stage1Scores[b] ? a : b);
    currentStage2Question = 0;
    stage2Answers = {};
    renderStage2Question();
}

function renderStage2Question() {
    const questionsForCategory = stage2Questions[topCategory];
    if (currentStage2Question >= questionsForCategory.length) {
        calculateStage2Result();
        return;
    }
    const q = questionsForCategory[currentStage2Question];
    const progress = ((currentStage2Question + 1) / questionsForCategory.length) * 100;
    const categoryName = {action: '前に踏み出す力', think: '考え抜く力', team: 'チームで働く力'}[topCategory];
    bunsekiContent.innerHTML = `
        <div class="bunseki-card bg-white w-full max-w-2xl mx-auto p-8 md:p-10 rounded-2xl shadow-xl">
            <div class="mb-6">
                <p class="text-sm font-semibold text-teal-700 mb-2">
                    第2段階 (${currentStage2Question + 1} / ${questionsForCategory.length}) - 【${categoryName}】
                </p>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-teal-600 h-2.5 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="question-text-container mb-8">
                <h2 class="text-2xl md:text-3xl font-bold text-gray-800 leading-snug text-center">${q.text}</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${q.options.map((opt, index) => `
                    <button class="option-btn w-full text-center text-lg p-8 bg-white rounded-lg border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-[0.98]" data-value="${opt.value}">
                        ${opt.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    bunsekiContent.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            stage2Answers[`q${currentStage2Question}`] = e.currentTarget.dataset.value;
            currentStage2Question++;
            renderStage2Question();
        });
    });
}

function calculateStage2Result() {
    let countA = 0;
    Object.values(stage2Answers).forEach(val => { if (val === 'a') countA++; });
    const countB = stage2Questions[topCategory].length - countA;

    if (topCategory === 'think') finalElement = (countA >= countB) ? '課題発見力' : '計画力';
    else if (topCategory === 'action') finalElement = (countA >= countB) ? '実行力' : '働きかけ力';
    else if (topCategory === 'team') finalElement = (countA >= countB) ? '傾聴力' : '発信力';
    
    renderLoading();
}

function renderLoading() {
    bunsekiContent.innerHTML = `
        <div class="text-center p-12">
            <div class="flex justify-center items-center gap-3 mb-6">
                <div class="dot w-4 h-4 bg-sky-600 rounded-full"></div>
                <div class="dot w-4 h-4 bg-sky-600 rounded-full"></div>
                <div class="dot w-4 h-4 bg-sky-600 rounded-full"></div>
            </div>
            <h2 class="text-3xl font-bold text-gray-800">分析中...</h2>
            <p class="text-lg text-gray-600 mt-2">あなたの強みをまとめています。</p>
        </div>
    `;
    setTimeout(renderResult, 1500); // 1.5秒待つ
}

function renderResult() {
    const result = resultsData[finalElement];
    const categoryNames = { action: '前に踏み出す力', think: '考え抜く力', team: 'チームで働く力' };
    
    bunsekiContent.innerHTML = `
        <div class="bunseki-card bg-white w-full max-w-4xl mx-auto p-8 md:p-12 rounded-2xl shadow-xl">
            <h1 class="text-3xl md:text-4xl font-bold text-gray-800 text-center mb-8">
                診断結果：あなたの強み
            </h1>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="p-6 bg-gray-50/50 rounded-lg border">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4 text-center">社会人基礎力バランス</h2>
                    <canvas id="resultRadarChart"></canvas>
                </div>
                <div class="flex flex-col justify-center">
                    <p class="text-lg text-gray-600">あなたの傾向は...</p>
                    <h2 class="text-4xl font-bold text-sky-600 mb-4">${categoryNames[topCategory]}</h2>
                    <p class="text-lg text-gray-600">特に秀でている要素は...</p>
                    <h3 class="text-3xl font-semibold text-gray-800 mb-4">${result.element}</h3>
                    <p class="text-md text-gray-500">${result.direction}</p>
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
                        <p class="text-gray-600">${result.direction}</p>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-700">③ 構造・例文</h3>
                        <div class="text-gray-600 bg-gray-50/50 p-4 rounded-lg border">${result.example}</div>
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

    const ctx = bunsekiContent.querySelector('#resultRadarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['前に踏み出す力', '考え抜く力', 'チームで働く力'],
            datasets: [{
                label: 'あなたの傾向',
                data: [stage1Scores.action, stage1Scores.think, stage1Scores.team],
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                borderColor: 'rgba(14, 165, 233, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(14, 165, 233, 1)'
            }]
        },
        options: {
            scales: { r: { angleLines: { display: true }, suggestedMin: 0, suggestedMax: 8, ticks: { stepSize: 2 } } },
            plugins: { legend: { display: false } }
        }
    });
    bunsekiContent.querySelector('#restartButton').addEventListener('click', startStage1);
    // アイコンを再描画
    lucide.createIcons();
}

function startStage1() {
    stage1Scores = { action: 0, think: 0, team: 0 };
    currentStage1Question = 0;
    renderStage1Question();
}

// --- 初期化実行 ---
document.addEventListener('DOMContentLoaded', () => {
    renderStart();
    // アイコンを描画
    lucide.createIcons();
});