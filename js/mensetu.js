// --- 状態管理 ---
let selectedInterviewer = null;
let recognition = null;
let isRecording = false;
let conversationHistory = [];
let interviewCount = 0;
const MAX_QUESTIONS = 5; // 質問数

// --- 要素取得 ---
const setupScreen = document.getElementById('setupScreen');
const interviewScreen = document.getElementById('interviewScreen');
const resultScreen = document.getElementById('resultScreen');
const chatArea = document.getElementById('chatArea');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const startInterviewBtn = document.getElementById('startInterviewBtn');
const feedbackArea = document.getElementById('feedbackArea');
const feedbackText = document.getElementById('feedbackText');
const interviewerBtns = document.querySelectorAll('.interviewer-btn');

// --- 初期化 ---
lucide.createIcons();

// 面接官選択
interviewerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        interviewerBtns.forEach(b => {
            b.classList.remove('border-teal-500', 'bg-teal-50');
            b.classList.add('border-slate-200');
        });
        btn.classList.remove('border-slate-200');
        btn.classList.add('border-teal-500', 'bg-teal-50');

        selectedInterviewer = btn.dataset.type;
        startInterviewBtn.disabled = false;
        startInterviewBtn.classList.remove('bg-slate-300', 'cursor-not-allowed', 'shadow-none');
        startInterviewBtn.classList.add('bg-teal-600', 'hover:bg-teal-700', 'shadow-lg', 'shadow-teal-200');
    });
});

// スタートボタン
startInterviewBtn.addEventListener('click', () => {
    setupScreen.classList.add('hidden');
    interviewScreen.classList.remove('hidden');
    interviewScreen.classList.add('flex');

    // UI設定
    if (selectedInterviewer === 'strict') {
        document.getElementById('activeInterviewerIcon').textContent = '👨‍⚖️';
        document.getElementById('activeInterviewerIcon').className = 'w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xl';
        document.getElementById('activeInterviewerName').textContent = '厳しい面接官';
    } else {
        document.getElementById('activeInterviewerIcon').textContent = '👩‍💼';
        document.getElementById('activeInterviewerIcon').className = 'w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl';
        document.getElementById('activeInterviewerName').textContent = '優しい面接官';
    }

    startInterview();
});

// 送信ボタン
sendBtn.addEventListener('click', handleUserResponse);
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserResponse();
});

// 終了ボタン
document.getElementById('endInterviewBtn').addEventListener('click', () => {
    if (confirm('面接を終了して結果を表示しますか？')) {
        finishInterview();
    }
});

// --- Web Speech API (音声認識) ---
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('text-red-500', 'bg-red-50');
        document.getElementById('micRipple').classList.remove('hidden');
        document.getElementById('recordingIndicator').classList.remove('hidden');
        textInput.placeholder = "お話しください...";
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('text-red-500', 'bg-red-50');
        document.getElementById('micRipple').classList.add('hidden');
        document.getElementById('recordingIndicator').classList.add('hidden');
        textInput.placeholder = "回答を入力（マイクでも入力できます）";
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            textInput.value += finalTranscript;
        }
    };

    micBtn.addEventListener('click', () => {
        if (isRecording) recognition.stop();
        else recognition.start();
    });
} else {
    micBtn.style.display = 'none'; // 非対応ブラウザ
}

// --- 面接ロジック ---

async function startInterview() {
    const firstQuestion = "それでは面接を始めます。まずは簡単に自己紹介をお願いします。";
    addMessage('interviewer', firstQuestion);
    conversationHistory.push({ role: 'model', parts: [{ text: firstQuestion }] });
}

async function handleUserResponse() {
    const text = textInput.value.trim();
    if (!text) return;

    addMessage('user', text);
    textInput.value = '';
    feedbackArea.classList.add('hidden');

    // ローディング表示
    const loadingId = addLoadingMessage();

    conversationHistory.push({ role: 'user', parts: [{ text: text }] });
    interviewCount++;

    if (interviewCount >= MAX_QUESTIONS) {
        removeMessage(loadingId);
        finishInterview();
        return;
    }

    try {
        // Determine interviewer type
        const interviewerType = selectedInterviewer || 'gentle';

        const response = await fetch('http://localhost:3000/api/mensetu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: conversationHistory,
                interviewerType: interviewerType,
                userMessage: text
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 429) {
                throw new Error(errorData.message || "アクセス集中等のため一時的に利用できません。時間をおいて再度お試しください。");
            }
            throw new Error('API request failed');
        }
        const data = await response.json();

        removeMessage(loadingId);

        // Feedback
        if (data.feedback) {
            feedbackText.textContent = data.feedback;
            feedbackArea.classList.remove('hidden');
        }

        // Next question
        if (data.nextQuestion) {
            addMessage('interviewer', data.nextQuestion);
            conversationHistory.push({ role: 'model', parts: [{ text: data.nextQuestion }] });
        } else {
            addMessage('interviewer', "面接は以上です。お疲れ様でした。");
        }

    } catch (e) {
        console.error(e);
        removeMessage(loadingId);
        const msg = e.message.includes('アクセス集中') ? e.message : "申し訳ありません。エラーが発生しました。";
        addMessage('interviewer', msg);
    }
}

async function finishInterview() {
    interviewScreen.classList.remove('flex');
    interviewScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    const resultContainer = document.getElementById('finalFeedback');
    resultContainer.innerHTML = '<div class="text-center py-20"><div class="spinner mx-auto mb-6"></div><h3 class="text-xl font-bold text-slate-700">面接結果を分析中...</h3><p class="text-slate-500 mt-2">あなたの回答内容から、強みや課題を抽出しています</p></div>';

    try {
        // Call Summary API
        const response = await fetch('http://localhost:3000/api/mensetu/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: conversationHistory })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 429) {
                throw new Error(errorData.message || "アクセス集中等のため一時的に利用できません。時間をおいて再度お試しください。");
            }
            throw new Error('API request failed');
        }
        const data = await response.json();

        // Render Result Layout
        const score = data.overallScore || 0;
        const scoreColor = score >= 4 ? 'bg-indigo-600' : (score >= 3 ? 'bg-yellow-500' : 'bg-red-500');
        const scoreText = score >= 4 ? '合格' : (score >= 3 ? 'あと一歩' : '要対策');

        const stars = (rating) => {
            const full = Math.floor(rating);
            const half = rating % 1 >= 0.5;
            let html = '';
            for (let i = 0; i < 5; i++) {
                if (i < full) html += '<span class="text-yellow-400">★</span>';
                else if (i === full && half) html += '<span class="text-yellow-400 opacity-50">★</span>';
                else html += '<span class="text-gray-300">★</span>';
            }
            return `<span class="text-lg mr-2">${html}</span><span class="font-bold text-slate-700">${rating}</span>`;
        };

        const resultHtml = `
                    <div class="max-w-6xl mx-auto">
                        <div class="flex flex-col lg:flex-row gap-8">
                            <!-- Left Column: Overview -->
                            <div class="lg:w-1/2 space-y-6">
                                <!-- Score Card -->
                                <div class="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-bold text-indigo-800 mb-1">総合評価</p>
                                        <div class="flex items-end gap-2">
                                            <span class="text-6xl font-black text-indigo-600 tracking-tighter">${score}</span>
                                            <span class="text-2xl font-bold text-indigo-400 mb-2">/ 5.0</span>
                                        </div>
                                    </div>
                                    <div class="${scoreColor} text-white px-6 py-3 rounded-xl text-2xl font-bold shadow-lg transform rotate-[-5deg]">
                                        ${scoreText}
                                    </div>
                                </div>

                                <!-- Evaluation Section -->
                                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 class="font-bold text-slate-900 text-lg mb-4 flex items-center"><i data-lucide="check-circle-2" class="w-5 h-5 text-green-500 mr-2"></i> 総合評価</h3>
                                    <div class="flex items-center mb-3">
                                        ${stars(score)}
                                    </div>
                                    <p class="text-slate-600 leading-relaxed text-sm">${data.overallEvaluation}</p>
                                </div>

                                <!-- Strengths -->
                                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 class="font-bold text-slate-900 text-lg mb-4 flex items-center"><i data-lucide="thumbs-up" class="w-5 h-5 text-blue-500 mr-2"></i> 強み (Strengths)</h3>
                                    <ul class="space-y-2">
                                        ${data.strengths.map(s => `<li class="flex items-start gap-2 text-slate-600 text-sm"><span class="text-blue-500 mt-1">•</span>${s}</li>`).join('')}
                                    </ul>
                                </div>

                                <!-- Weaknesses -->
                                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 class="font-bold text-slate-900 text-lg mb-4 flex items-center"><i data-lucide="alert-triangle" class="w-5 h-5 text-red-500 mr-2"></i> 課題 (Issues)</h3>
                                    <ul class="space-y-2">
                                        ${data.weaknesses.map(w => `<li class="flex items-start gap-2 text-slate-600 text-sm"><span class="text-red-500 mt-1">•</span>${w}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>

                            <!-- Right Column: Chart & Comments -->
                            <div class="lg:w-1/2 space-y-6">
                                <!-- Chart Card -->
                                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 class="font-bold text-slate-900 text-lg mb-4 text-center">スキル分析</h3>
                                    <div class="aspect-square max-w-md mx-auto relative">
                                        <canvas id="mensetuRadarChart"></canvas>
                                    </div>
                                </div>

                                <!-- Interviewer Comment -->
                                <div class="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 relative overflow-hidden">
                                     <div class="absolute top-0 right-0 p-4 opacity-10">
                                        <i data-lucide="message-circle" class="w-24 h-24 text-indigo-900"></i>
                                    </div>
                                    <h3 class="font-bold text-indigo-900 text-lg mb-3 flex items-center relative z-10"><i data-lucide="user-check" class="w-5 h-5 mr-2"></i> 面接官コメント</h3>
                                    <p class="text-indigo-800 leading-relaxed text-sm relative z-10 font-medium">
                                        "${data.interviewerComment}"
                                    </p>
                                </div>

                                <!-- Advice -->
                                <div class="bg-yellow-50 rounded-2xl p-6 border border-yellow-100">
                                    <h3 class="font-bold text-yellow-800 text-lg mb-3 flex items-center"><i data-lucide="lightbulb" class="w-5 h-5 mr-2"></i> 今後のアドバイス</h3>
                                    <p class="text-yellow-900 leading-relaxed text-sm">
                                        ${data.advice}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
        resultContainer.innerHTML = resultHtml;
        lucide.createIcons();

        // Render Chart
        const ctx = document.getElementById('mensetuRadarChart').getContext('2d');
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['スキル・能力', '論理性', '熱意', '柔軟性', '知識'],
                datasets: [{
                    label: '評価スコア',
                    data: [
                        data.radarChart.skill,
                        data.radarChart.logical,
                        data.radarChart.enthusiasm,
                        data.radarChart.flexibility,
                        data.radarChart.knowledge
                    ],
                    backgroundColor: 'rgba(79, 70, 229, 0.2)',
                    borderColor: '#4f46e5',
                    borderWidth: 2,
                    pointBackgroundColor: '#4f46e5',
                    pointHoverBorderColor: '#fff'
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: { display: true, color: '#e2e8f0' },
                        grid: { color: '#e2e8f0' },
                        suggestedMin: 0,
                        suggestedMax: 5,
                        ticks: { stepSize: 1, display: false },
                        pointLabels: {
                            font: { size: 12, family: 'Noto Sans JP', weight: 'bold' },
                            color: '#475569'
                        }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });

        // Save History
        saveHistory(`模擬面接結果: ${score}点`, `総合評価: ${scoreText} / ${data.overallEvaluation.substring(0, 30)}...`, data);

    } catch (e) {
        console.error(e);
        resultContainer.innerHTML = `<div class="bg-red-50 p-6 rounded-xl border border-red-200 text-center"><p class="text-red-600 font-bold mb-2">エラーが発生しました</p><p class="text-sm text-red-500">${e.message}</p></div>`;
    }
}

// --- UI ヘルパー ---
function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} message-bubble`;

    const bubble = document.createElement('div');
    bubble.className = `max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${role === 'user'
        ? 'bg-teal-600 text-white rounded-tr-none'
        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
        }`;
    bubble.textContent = text;

    div.appendChild(bubble);
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function addLoadingMessage() {
    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'flex justify-start message-bubble';
    div.innerHTML = `
                <div class="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                    <div class="flex gap-1">
                        <div class="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                        <div class="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>
                </div>
            `;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- 履歴保存 (home.htmlと共通ロジック) ---
// --- 履歴保存 (Auth経由) ---
async function saveHistory(title, summary, detail = null) {
    await Auth.addHistory('interview', title, summary, detail);
}
