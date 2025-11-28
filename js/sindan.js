const bunsekiContent = document.getElementById('bunsekiContent');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
let radarChartInstance = null; 

// --- 状態変数 ---
let selectedIndustry = ""; 
let stage1Scores = { 
    action: 0,      // 行動力
    logic: 0,       // 論理力
    team: 0,        // 協調性
    creative: 0,    // 創造性
    resilience: 0   // 精神力
};
let stage2Scores = {}; 
let topCategory = '';
let currentStage1Question = 0;
let currentStage2Question = 0;

// 履歴管理
let answerHistory = [];

// --- 画像のマッピング ---
const categoryImages = {
    action: 'koudou.jpg',
    logic: 'ronri.jpg',
    team: 'kyoutyou.jpg',
    creative: 'souzou.jpg',
    resilience: 'seisin.jpg'
};

// --- 業種リスト ---
const industries = [
    { id: 'maker', name: 'メーカー（製造業）' },
    { id: 'it', name: 'IT・通信・インターネット' },
    { id: 'service', name: 'サービス・流通・小売' },
    { id: 'finance', name: '金融・保険' },
    { id: 'trading', name: '商社' },
    { id: 'creative', name: '広告・出版・マスコミ' },
    { id: 'public', name: '公務員・官公庁' },
    { id: 'other', name: 'その他' }
];

// --- 質問データ (STEP1: 15問) ---
const stage1Questions = [
    // Action (行動力)
    { text: "失敗を恐れず、まずは行動してみることが大切だと思う", category: "action" },
    { text: "自ら率先してリーダーシップを発揮することが多い", category: "action" },
    { text: "高い目標に対しても、情熱を持って挑戦し続けられる", category: "action" },
    
    // Logic (論理力)
    { text: "物事を進める前に、計画や段取りをしっかり考える方だ", category: "logic" },
    { text: "現状を分析して、隠れた問題点を見つけるのが得意だ", category: "logic" },
    { text: "リスクを事前に予測し、回避策を準備して行動する", category: "logic" },
    
    // Team (協調性)
    { text: "自分の意見よりも、チーム全体の合意を重視する", category: "team" },
    { text: "初対面の人ともすぐに打ち解け、信頼関係を築ける", category: "team" },
    { text: "相手の話を親身になって聞くことができる", category: "team" },

    // Creative (創造性)
    { text: "既存のルールにとらわれず、新しい方法を考えるのが好きだ", category: "creative" },
    { text: "変化を楽しみ、臨機応変に対応できる", category: "creative" },
    { text: "独自の視点でアイデアを出すことがよくある", category: "creative" },

    // Resilience (精神力)
    { text: "困難な壁にぶつかっても、粘り強く取り組む自信がある", category: "resilience" },
    { text: "責任感が強く、任された仕事は最後までやり抜く", category: "resilience" },
    { text: "ストレスを感じる状況でも、冷静さを保つことができる", category: "resilience" }
];

// --- 質問データ (STEP2: 各カテゴリに対応) ---
const stage2QuestionsData = {
    action: [
        { text: "一度決めたことは、何があっても最後までやり抜く", element: "実行力" },
        { text: "目標達成のためなら、泥臭い努力もいとわない", element: "実行力" },
        { text: "自分から積極的に周囲に働きかけ、協力を仰ぐことができる", element: "働きかけ力" }
    ],
    logic: [
        { text: "「なぜ？」と疑問を持ち、根本的な原因を突き止めるのが好きだ", element: "課題発見力" },
        { text: "データや事実に基づいて、客観的に物事を判断する", element: "課題発見力" },
        { text: "ゴールから逆算して、無理のないスケジュールを立てることができる", element: "計画力" }
    ],
    team: [
        { text: "複雑な物事を、誰にでも分かる言葉で説明するのが得意だ", element: "発信力" },
        { text: "チームの雰囲気を盛り上げ、一体感を作るのが得意だ", element: "柔軟性" },
        { text: "相手の立場に立って物事を考え、共感することができる", element: "傾聴力" }
    ],
    creative: [
        { text: "誰も思いつかないような斬新なアイデアを出すのが得意だ", element: "創造力" },
        { text: "状況の変化に合わせて、柔軟にやり方を変えることができる", element: "柔軟性" },
        { text: "現状に満足せず、常により良い方法を探求している", element: "改善力" }
    ],
    resilience: [
        { text: "プレッシャーがかかる場面でも、実力を発揮できる", element: "ストレス耐性" },
        { text: "地味な作業でも、コツコツと真面目に取り組める", element: "継続力" },
        { text: "自分の役割を理解し、責任を持って全うする", element: "規律性" }
    ]
};

// --- JSON スキーマ定義 ---
const responseSchema = {
    type: "OBJECT",
    properties: {
        "element": { "type": "STRING" },
        "category": { "type": "STRING" },
        "direction": { "type": "STRING" },
        "example": { "type": "STRING" },
        "advice": { "type": "ARRAY", "items": { "type": "STRING" } },
        "industryFit": { "type": "STRING" } 
    },
    required: ["element", "category", "direction", "example", "advice", "industryFit"]
};

// 戻るボタンのHTML生成
function getBackButtonHtml() {
    if (answerHistory.length === 0) return '';
    return `
        <button onclick="handleBack()" class="mt-8 mx-auto flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold gap-1 py-2 px-4 rounded-lg hover:bg-slate-50">
            <i data-lucide="arrow-left" class="w-4 h-4"></i>
            一つ前の質問に戻る
        </button>
    `;
}

// 戻る処理
window.handleBack = function() {
    if (answerHistory.length === 0) return;
    const lastAction = answerHistory.pop();
    
    if (lastAction.stage === 1) {
        stage1Scores[lastAction.key] -= lastAction.score;
        currentStage1Question--;
        renderStage1Question();
    } else if (lastAction.stage === 2) {
        stage2Scores[lastAction.key] -= lastAction.score;
        currentStage2Question--;
        
        if (currentStage2Question < 0) {
            currentStage2Question = 0;
            renderStage2Question(); 
        } else {
            renderStage2Question();
        }
    }
        };

// --- 画面描画関数 ---
function renderStart() {
    const optionsHtml = industries.map(ind => `<option value="${ind.name}">${ind.name}</option>`).join('');
    answerHistory = [];

    bunsekiContent.innerHTML = `
        <div class="bunseki-card w-full p-10 md:p-14 text-center fade-in">
            <div class="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 text-blue-600 shadow-sm mx-auto">
                <svg class="lucide lucide-file-text w-10 h-10" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-4">社会人基礎力 診断</h1>
            <p class="text-lg text-slate-500 mb-8 leading-relaxed">
                5つの観点からあなたの強みを分析します。<br>
                （行動力・論理力・協調性・創造性・精神力）
            </p>
            
            <div class="mb-10 text-left max-w-xs mx-auto">
                <label for="industrySelect" class="block text-sm font-bold text-slate-700 mb-2">志望する業種（任意）</label>
                <div class="relative">
                    <select id="industrySelect" class="w-full p-3 pl-4 pr-10 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer">
                        <option value="" disabled selected>選択してください</option>
                        ${optionsHtml}
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
            </div>

            <button id="startButton" class="w-full md:w-auto text-xl font-bold bg-blue-600 text-white py-4 px-12 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all active:scale-[0.98]">
                診断スタート
            </button>
        </div>
    `;
    
    bunsekiContent.querySelector('#startButton').addEventListener('click', () => {
        const select = document.getElementById('industrySelect');
        selectedIndustry = select.value || "特に決まっていない";
        startStage1();
    });
    lucide.createIcons();
}

function startStage1() {
    stage1Scores = { action: 0, logic: 0, team: 0, creative: 0, resilience: 0 };
    currentStage1Question = 0;
    renderStage1Question();
}

function renderStage1Question() {
    if (currentStage1Question >= stage1Questions.length) {
        calculateStage1Result();
        return;
    }
    const q = stage1Questions[currentStage1Question];
    const progress = ((currentStage1Question + 1) / stage1Questions.length) * 100;
    
    bunsekiContent.innerHTML = `
        <div class="bunseki-card p-8 md:p-12 fade-in">
            <div class="mb-8">
                <div class="flex justify-between items-end mb-2">
                    <span class="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">STEP 1</span>
                    <span class="text-xs font-mono text-slate-400">${currentStage1Question + 1} / ${stage1Questions.length}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="question-text-container mb-8">
                <h2 class="text-xl md:text-2xl font-bold text-slate-900 leading-snug text-center">${q.text}</h2>
            </div>

            <div class="flex flex-col items-center gap-4">
                    <div class="flex items-center justify-between w-full max-w-sm px-4">
                    <span class="text-sm font-bold text-emerald-600">そう思う</span>
                    <span class="text-sm font-bold text-violet-600">そう思わない</span>
                </div>
                <div class="flex items-center justify-center gap-2 sm:gap-4 w-full flex-wrap sm:flex-nowrap">
                    <div class="scale-option opt-7" onclick="handleStage1Answer(7)" role="button"></div>
                    <div class="scale-option opt-6" onclick="handleStage1Answer(6)" role="button"></div>
                    <div class="scale-option opt-5" onclick="handleStage1Answer(5)" role="button"></div>
                    <div class="scale-option opt-4" onclick="handleStage1Answer(4)" role="button"></div>
                    <div class="scale-option opt-3" onclick="handleStage1Answer(3)" role="button"></div>
                    <div class="scale-option opt-2" onclick="handleStage1Answer(2)" role="button"></div>
                    <div class="scale-option opt-1" onclick="handleStage1Answer(1)" role="button"></div>
                </div>
                <div class="text-xs text-slate-400 mt-2">直感でお答えください</div>
            </div>
            
            ${getBackButtonHtml()}
        </div>
    `;
    lucide.createIcons();
}

window.handleStage1Answer = function(score) {
    const btn = event.target;
    btn.classList.add('selected');
    setTimeout(() => {
        const category = stage1Questions[currentStage1Question].category;
        
        answerHistory.push({
            stage: 1,
            key: category,
            score: score
        });

        stage1Scores[category] += score;
        currentStage1Question++;
        renderStage1Question();
    }, 300);
};

function calculateStage1Result() {
    topCategory = Object.keys(stage1Scores).reduce((a, b) => stage1Scores[a] > stage1Scores[b] ? a : b);
    
    currentStage2Question = 0;
    stage2Scores = {};
    if(stage2QuestionsData[topCategory]) {
        stage2QuestionsData[topCategory].forEach(q => { stage2Scores[q.element] = 0; });
    } else {
        console.error("Category not found:", topCategory);
        topCategory = 'action';
        stage2QuestionsData['action'].forEach(q => { stage2Scores[q.element] = 0; });
    }
    renderStage2Question();
}

function renderStage2Question() {
    const questions = stage2QuestionsData[topCategory];
    if (currentStage2Question >= questions.length) {
        calculateStage2Result();
        return;
    }
    const q = questions[currentStage2Question];
    const progress = ((currentStage2Question + 1) / questions.length) * 100;
    
    const categoryNames = {
        action: '行動力',
        logic: '論理力',
        team: '協調性',
        creative: '創造性',
        resilience: '精神力'
    };
    const categoryName = categoryNames[topCategory];

    bunsekiContent.innerHTML = `
        <div class="bunseki-card p-8 md:p-12 fade-in border-t-4 border-t-indigo-500">
            <div class="mb-8">
                    <div class="flex justify-between items-end mb-2">
                    <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">STEP 2: ${categoryName}</span>
                    <span class="text-xs font-mono text-slate-400">${currentStage2Question + 1} / ${questions.length}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="question-text-container mb-8">
                <h2 class="text-xl md:text-2xl font-bold text-slate-900 leading-snug text-center">${q.text}</h2>
            </div>

            <div class="flex flex-col items-center gap-4">
                    <div class="flex items-center justify-between w-full max-w-sm px-4">
                    <span class="text-sm font-bold text-emerald-600">そう思う</span>
                    <span class="text-sm font-bold text-violet-600">そう思わない</span>
                </div>
                <div class="flex items-center justify-center gap-2 sm:gap-4 w-full flex-wrap sm:flex-nowrap">
                    <div class="scale-option opt-7" onclick="handleStage2Answer(7)" role="button"></div>
                    <div class="scale-option opt-6" onclick="handleStage2Answer(6)" role="button"></div>
                    <div class="scale-option opt-5" onclick="handleStage2Answer(5)" role="button"></div>
                    <div class="scale-option opt-4" onclick="handleStage2Answer(4)" role="button"></div>
                    <div class="scale-option opt-3" onclick="handleStage2Answer(3)" role="button"></div>
                    <div class="scale-option opt-2" onclick="handleStage2Answer(2)" role="button"></div>
                    <div class="scale-option opt-1" onclick="handleStage2Answer(1)" role="button"></div>
                </div>
                <div class="text-xs text-slate-400 mt-2">直感でお答えください</div>
            </div>

            ${getBackButtonHtml()}
        </div>
    `;
    lucide.createIcons();
}

window.handleStage2Answer = function(score) {
    const btn = event.target;
    btn.classList.add('selected');
    setTimeout(() => {
        const q = stage2QuestionsData[topCategory][currentStage2Question];

        answerHistory.push({
            stage: 2,
            key: q.element,
            score: score
        });

        stage2Scores[q.element] += score;
        currentStage2Question++;
        renderStage2Question();
    }, 300);
};

function calculateStage2Result() {
    let maxScore = -1;
    let finalElement = "";
    for (const [element, score] of Object.entries(stage2Scores)) {
        if (score > maxScore) {
            maxScore = score;
            finalElement = element;
        }
    }
    callGeminiApi(finalElement);
}

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

    const apiKey = ""; // Canvasが自動挿入
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const systemPrompt = `
あなたはプロの就活アドバイザーです。
ユーザーの強みと、志望する業界に基づいて、具体的なアドバイスを作成してください。
ユーザーの最も強い要素は「${finalElement}」です。
志望業界は「${selectedIndustry}」です。
JSON形式で出力してください。
`;

    const payload = {
        contents: [{
            role: "user",
            parts: [{ text: `私の強みは「${finalElement}」です。志望している「${selectedIndustry}」業界において、この強みがどう活かせるか、その業界への適性（フィット感）やアピール方法を教えてください。` }]
        }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    };

    try {
        const response = await fetchWithBackoff(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('API Error');
        
        const result = await response.json();
        
        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0].text) {
            const data = JSON.parse(result.candidates[0].content.parts[0].text);
            const categoryNames = {
                action: '行動力',
                logic: '論理力',
                team: '協調性',
                creative: '創造性',
                resilience: '精神力'
            };
            data.category = categoryNames[topCategory]; 
            renderResult(data);
        } else {
            throw new Error('No content in response');
        }
        
    } catch (error) {
        console.error("Fetch error:", error);
        showError("分析に失敗しました。しばらくしてからもう一度お試しください。");
    }
}

function renderResult(result) {
    // 画像パスの決定
    const imagePath = categoryImages[topCategory];

    bunsekiContent.innerHTML = `
        <div class="bunseki-card w-full max-w-4xl mx-auto p-8 md:p-12 fade-in">
            <div class="text-center mb-12">
                <p class="text-sm font-bold text-blue-600 tracking-widest uppercase mb-3">ANALYSIS RESULT</p>
                <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-6">あなたの最大の武器</h1>
                
                <div class="mb-8">
                    <img src="${imagePath}" alt="${result.category}" class="w-full max-w-md mx-auto rounded-3xl shadow-lg transform transition hover:scale-105 duration-500">
                </div>

                <div class="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-3xl md:text-5xl font-bold px-10 py-5 rounded-2xl shadow-xl shadow-blue-200 cursor-default">
                    ${result.element}
                </div>
                <p class="mt-6 text-slate-500 font-medium">カテゴリー：${result.category}</p>
            </div>

            <div class="bg-blue-50 border border-blue-100 rounded-3xl p-8 mb-12 text-center">
                <h3 class="text-lg font-bold text-blue-900 mb-3 flex items-center justify-center gap-2">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                    ${selectedIndustry}業界 への適性
                </h3>
                <p class="text-blue-800 leading-relaxed font-medium text-lg">
                    ${result.industryFit}
                </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                <div class="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                    <h2 class="text-xl font-bold text-slate-700 mb-6 text-center">基礎力バランス</h2>
                    <div class="aspect-square relative">
                        <canvas id="resultRadarChart"></canvas>
                    </div>
                </div>

                <div class="flex flex-col justify-center space-y-6">
                    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-blue-200 transition-colors">
                        <h3 class="font-bold text-slate-900 mb-3 flex items-center">
                            <div class="p-1.5 bg-blue-100 rounded-lg mr-3 text-blue-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
                            アピールの方向性
                        </h3>
                        <p class="text-slate-600 leading-relaxed">${result.direction}</p>
                    </div>
                    <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
                        <h3 class="font-bold text-slate-900 mb-3 flex items-center">
                            <div class="p-1.5 bg-indigo-100 rounded-lg mr-3 text-indigo-600"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                            プロのアドバイス
                        </h3>
                        <ul class="list-disc list-inside text-slate-600 leading-relaxed">
                            ${result.advice.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>

            <div class="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-8 md:p-10 border border-blue-100 relative overflow-hidden">
                <div class="absolute top-0 right-0 p-6 opacity-5">
                        <svg class="w-32 h-32 text-blue-900" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                </div>
                <h2 class="text-2xl font-bold text-slate-900 mb-6 flex items-center relative z-10">
                    <svg class="lucide lucide-edit w-6 h-6 inline-block mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    AI生成：自己PR例文
                </h2>
                <div class="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white shadow-sm text-slate-700 leading-relaxed relative z-10 text-lg" id="aiPRContent">
                    ${result.example}
                </div>
            </div>

            <button id="restartButton" class="w-full mt-12 text-lg font-semibold bg-slate-100 text-slate-700 py-4 px-8 rounded-xl hover:bg-slate-200 transition-colors">
                もう一度診断する
            </button>
        </div>
    `;

    // ★ ロジック変更: 7段階評価に対応 & 1.5乗計算でマイルドに ★
    
    // 1. STEP2の結果をトップカテゴリに合算 (トップを伸ばす)
    let step2Total = 0;
    Object.values(stage2Scores).forEach(val => step2Total += val);
    
    // 表示用のスコアコピーを作成
    let finalScores = { ...stage1Scores };
    finalScores[topCategory] += step2Total; // トップカテゴリにブースト

    // 2. 差分強調 (間を取って1.5乗)
    const emphasize = (val) => Math.pow(val, 1.5);

    const chartData = [
        emphasize(finalScores.action), 
        emphasize(finalScores.logic), 
        emphasize(finalScores.team), 
        emphasize(finalScores.creative), 
        emphasize(finalScores.resilience)
    ];

    const maxScore = Math.max(...chartData);
    
    // スケール調整
    const suggestedMax = Math.max(maxScore * 1.1, 100);

    const ctx = bunsekiContent.querySelector('#resultRadarChart').getContext('2d');
    if (radarChartInstance) radarChartInstance.destroy();
    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['行動力', '論理力', '協調性', '創造性', '精神力'],
            datasets: [{
                label: 'あなたの傾向',
                data: chartData,
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                borderColor: '#2563eb',
                borderWidth: 3,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#fff',
                pointRadius: 5
            }]
        },
        options: {
            scales: { r: { 
                angleLines: { display: true, color: '#e2e8f0' }, 
                grid: { color: '#e2e8f0' },
                suggestedMin: 0, 
                suggestedMax: suggestedMax, 
                ticks: { display: false }, 
                pointLabels: {
                    font: { size: 14, family: 'Noto Sans JP', weight: 'bold' },
                    color: '#475569'
                }
            } },
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
    bunsekiContent.querySelector('#restartButton').addEventListener('click', renderStart);
    lucide.createIcons();

    // 呼び出し：サーバ経由で AI に自己PRをさらにブラッシュアップしてもらう（非同期）
    try {
        generateAiPR(result).then(text => {
            if (!text) return;
            const container = document.getElementById('aiPRContent');
            // テキストを安全に挿入（プレーンテキスト）
            const el = document.createElement('div');
            el.className = 'prose text-slate-700';
            el.textContent = text;
            container.innerHTML = '';
            container.appendChild(el);
        }).catch(err => {
            // 失敗しても既存の example を表示したままにする
            console.error('AI PR generation failed:', err);
        });
    } catch (err) {
        console.error('generateAiPR error:', err);
    }
}

// --- UIヘルパー ---
function showError(message) { alert(message); }

// --- APIリトライ ---
async function fetchWithBackoff(url, options, maxRetries = 3, baseDelay = 1000) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            if (response.status === 429) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
            } else {
                return response;
            }
        } catch (error) {
            if (attempt + 1 >= maxRetries) throw error;
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
        }
    }
    throw new Error('API request failed after all retries.');
}

// --- サーバ経由で簡易テキスト生成（自己PRブラッシュアップ用） ---
async function generateAiPR(result) {
    try {
        // Build a concise prompt for the server
        const prompt = `
あなたはプロの就活アドバイザー兼コピーライターです。
以下の情報を元に、面接で使える自己PR文を日本語で200〜300文字程度で作成してください。
・要素: ${result.element}
・アピールの方向性: ${result.direction}
・プロのアドバイス: ${result.advice}

出力は文章のみで、箇条書きや余分な説明文は含めないでください。
`;
        const resp = await fetch('/api/generate-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(()=>({}));
            throw new Error(err.error || `Server returned ${resp.status}`);
        }
        const payload = await resp.json();
        if (!payload.success) {
            throw new Error(payload.error || 'Unknown server error');
        }
        return payload.text;
    } catch (err) {
        console.error('generateAiPR error', err);
        return null;
    }
}

// --- 初期化実行 ---
document.addEventListener('DOMContentLoaded', () => {
    renderStart();
    lucide.createIcons();
});