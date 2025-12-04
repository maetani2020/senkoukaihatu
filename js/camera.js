// --- 要素取得 ---
const sceneSelect = document.getElementById('sceneSelect');
const attireSelect = document.getElementById('attireSelect'); // 新規追加
const btnUseCamera = document.getElementById('btnUseCamera');
const btnUseUpload = document.getElementById('btnUseUpload');
const cameraUi = document.getElementById('cameraUi');
const uploadUi = document.getElementById('uploadUi');
const videoEl = document.getElementById('cameraStream');
const captureCanvas = document.getElementById('captureCanvas');
const captureButton = document.getElementById('captureButton');
const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const analyzeButton = document.getElementById('analyzeButton');
const loadingSpinner = document.getElementById('loadingSpinner');
const analysisResultContainer = document.getElementById('analysisResultContainer');
const analysisResult = document.getElementById('analysisResult');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const guideMessageEl = document.getElementById('guideMessage');
const overallScoreEl = document.getElementById('overallScore');
const sceneForScoreEl = document.getElementById('sceneForScore');
const timerButtons = document.querySelectorAll('.timer-btn');
const areaButtons = document.querySelectorAll('.area-btn');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownText = document.getElementById('countdownText');
const retakeButton = document.getElementById('retakeButton');
const scoreBenchmarkEl = document.getElementById('scoreBenchmark');

// --- 状態管理 ---
let selectedScene = "";
let selectedAttire = ""; // 新規追加
let selectedArea = "";
let base64Image = null;
let mimeType = null;
let cameraStream = null;
let myRadarChart;
let selectedTimer = 0; 
let countdownInterval = null;
let lastInputMethod = 'upload';

// --- JSON スキーマ定義 ---
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
    },
    required: ["scene", "evaluation", "overallScore", "overallComment"]
};

// --- イベントリスナー ---
sceneSelect.addEventListener('change', (e) => {
    selectedScene = e.target.value;
    checkAnalyzeButtonState();
});

// 服装選択のイベントリスナー（新規追加）
attireSelect.addEventListener('change', (e) => {
    selectedAttire = e.target.value;
    checkAnalyzeButtonState();
});

// エリア選択
areaButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        areaButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedArea = btn.dataset.area;
        checkAnalyzeButtonState();
    });
});

// タイマー選択
timerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        timerButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTimer = parseInt(btn.dataset.timer, 10);
    });
});

btnUseCamera.addEventListener('click', () => { selectInputMethod('camera'); startCamera(); });
btnUseUpload.addEventListener('click', () => { selectInputMethod('upload'); stopCamera(); });
captureButton.addEventListener('click', handleCaptureClick);
retakeButton.addEventListener('click', handleRetake);

// --- アップロード処理 ---
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
});
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
});
dropZone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]), false);
imageInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

function handleFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError("ファイルサイズが5MBを超えています。"); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { showError("PNG, JPG, WEBP 形式の画像を選択してください。"); return; }
    mimeType = file.type;
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreviewContainer.classList.remove('hidden');
        base64Image = e.target.result.split(',')[1];
        checkAnalyzeButtonState();
        hideError();
        uploadUi.classList.add('hidden'); 
    };
    reader.readAsDataURL(file);
}

// --- カメラ処理 ---
function selectInputMethod(method) {
    lastInputMethod = method;
    if (method === 'camera') {
        cameraUi.classList.remove('hidden');
        uploadUi.classList.add('hidden');
        btnUseCamera.classList.add('bg-indigo-100', 'border-indigo-500', 'text-indigo-700');
        btnUseUpload.classList.remove('bg-indigo-100', 'border-indigo-500', 'text-indigo-700');
    } else {
        cameraUi.classList.add('hidden');
        uploadUi.classList.remove('hidden');
        btnUseUpload.classList.add('bg-indigo-100', 'border-indigo-500', 'text-indigo-700');
        btnUseCamera.classList.remove('bg-indigo-100', 'border-indigo-500', 'text-indigo-700');
    }
}

async function startCamera() {
    try {
        if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        videoEl.srcObject = cameraStream;
        hideError();
    } catch (err) {
        console.error("Camera error:", err);
        showError("カメラへのアクセスが許可されませんでした。");
        selectInputMethod('upload'); 
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        videoEl.srcObject = null;
    }
}

function handleCaptureClick() {
    if (countdownInterval) return;
    if (selectedTimer > 0) startCountdown(selectedTimer);
    else takePicture(); 
}

function startCountdown(seconds) {
    captureButton.disabled = true;
    captureButton.textContent = `${seconds}秒後に撮影...`;
    let count = seconds;
    countdownText.textContent = count;
    countdownOverlay.classList.add('visible');

    countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownText.textContent = count;
        } else {
            clearInterval(countdownInterval);
            countdownInterval = null; 
            countdownOverlay.classList.remove('visible');
            takePicture(); 
            captureButton.disabled = false;
            captureButton.innerHTML = '<i data-lucide="aperture" class="w-6 h-6"></i> 撮影する';
            lucide.createIcons();
        }
    }, 1000);
}

function takePicture() {
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
    stopCamera(); 
    cameraUi.classList.add('hidden'); 
}

function handleRetake() {
    base64Image = null;
    mimeType = null;
    imagePreview.src = "";
    imageInput.value = null; 
    imagePreviewContainer.classList.add('hidden');
    analyzeButton.disabled = true;
    hideError();
    analysisResultContainer.classList.add('hidden');
    
    checkAnalyzeButtonState();
    selectInputMethod(lastInputMethod);
    if (lastInputMethod === 'camera') startCamera(); 
}

// --- 分析ボタンの制御 ---
function checkAnalyzeButtonState() {
    let msg = "";
    if (!selectedScene) msg = "1. 分析したい場面を選択してください";
    else if (!selectedAttire) msg = "2. 分析したい服装を選択してください"; // 新規条件
    else if (!selectedArea) msg = "3. 分析する範囲を選択してください";
    else if (!base64Image) msg = "4. 写真を準備してください";
    
    if (msg) {
        analyzeButton.disabled = true;
        analyzeButton.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
        analyzeButton.classList.remove('bg-indigo-600', 'shadow-lg');
        guideMessageEl.textContent = msg;
        guideMessageEl.classList.remove('hidden');
    } else {
        analyzeButton.disabled = false;
        analyzeButton.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-400');
        analyzeButton.classList.add('bg-indigo-600', 'shadow-lg');
        guideMessageEl.textContent = "";
        guideMessageEl.classList.add('hidden');
    }
}
analyzeButton.addEventListener('click', callGeminiApi);

// --- Gemini API 呼び出し (クライアントサイド) ---
async function callGeminiApi() {
    loadingSpinner.classList.remove('hidden');
    analyzeButton.disabled = true;
    analyzeButton.querySelector('span').textContent = '分析中です...';
    hideError();
    analysisResultContainer.classList.add('hidden');
    retakeButton.disabled = true; 

    const apiKey = ""; // Canvasが自動挿入
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const systemPrompt = `
    あなたはプロの就活キャリアアドバイザーです。
    ユーザーから提供された画像（就活生の服装）を分析し、指定された場面と服装の種類にふさわしいか評価してください。
    
    評価対象場面: ${selectedScene}
    評価対象服装: ${selectedAttire}
    評価範囲: ${selectedArea}

    以下のJSON形式で結果を出力してください:
    {
        "scene": "評価した場面名",
        "overallScore": 0から100の整数,
        "evaluation": [
            { "item": "清潔感", "score": 1-5, "comment": "短いコメント" },
            { "item": "フォーマル度", "score": 1-5, "comment": "短いコメント" },
            { "item": "サイズ感", "score": 1-5, "comment": "短いコメント" },
            { "item": "髪型・表情", "score": 1-5, "comment": "短いコメント" },
            { "item": "姿勢・雰囲気", "score": 1-5, "comment": "短いコメント" }
        ],
        "overallComment": {
            "goodPoints": "良かった点",
            "suggestions": "具体的な改善点",
            "summary": "励ましの総評"
        }
    }
    80点以上を合格ラインとし、辛口すぎず、でも具体的なアドバイスを心がけてください。
    `;

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: systemPrompt },
                { inlineData: { mimeType: mimeType, data: base64Image } }
            ]
        }],
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
            
            // ★ 履歴保存処理を追加 ★
            saveHistory(data);

            displayResult(data);
        } else {
            throw new Error('No content in response');
        }
        
    } catch (error) {
        console.error("Fetch error:", error);
        showError("分析に失敗しました。しばらくしてからもう一度お試しください。");
    } finally {
        loadingSpinner.classList.add('hidden');
        analyzeButton.disabled = false; 
        analyzeButton.querySelector('span').textContent = '分析スタート';
        retakeButton.disabled = false; 
        stopCamera();
    }
}

// ★ 履歴保存関数 ★
function saveHistory(data) {
    try {
        const SESSION_KEY = 'career_app_session';
        const HISTORY_KEY_PREFIX = 'career_app_history_';
        
        const user = JSON.parse(localStorage.getItem(SESSION_KEY));
        if (!user) return; // ログインしていなければ保存しない

        const key = HISTORY_KEY_PREFIX + user.id;
        const histories = JSON.parse(localStorage.getItem(key) || '[]');
        
        const now = new Date();
        const dateStr = now.getFullYear() + '/' + (now.getMonth()+1) + '/' + now.getDate() + ' ' + now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');

        const newHistory = {
            id: Date.now(),
            type: 'camera',
            date: dateStr,
            title: `総合評価: ${data.overallScore}点`,
            summary: `場面: ${selectedScene} / 服装: ${selectedAttire}`,
            details: data
        };
        
        histories.push(newHistory);
        localStorage.setItem(key, JSON.stringify(histories));

    } catch(e) {
        console.error("Save history failed", e);
    }
}

// --- 結果表示 ---
function displayResult(data) {
    analysisResultContainer.classList.remove('hidden');

    const score = data.overallScore || 0; 
    overallScoreEl.textContent = score;
    sceneForScoreEl.textContent = `（${selectedScene} / ${selectedAttire} での評価）`;

    scoreBenchmarkEl.classList.remove('bg-green-100', 'text-green-800', 'bg-yellow-100', 'text-yellow-800', 'bg-red-100', 'text-red-800'); 
    if (score >= 80) {
        scoreBenchmarkEl.textContent = '合格ライン (Excellent)';
        scoreBenchmarkEl.classList.add('bg-green-100', 'text-green-800');
    } else if (score >= 60) {
        scoreBenchmarkEl.textContent = '要改善 (Good)';
        scoreBenchmarkEl.classList.add('bg-yellow-100', 'text-yellow-800');
    } else {
        scoreBenchmarkEl.textContent = '大幅改善が必要 (Bad)';
        scoreBenchmarkEl.classList.add('bg-red-100', 'text-red-800');
    }

    const ctx = document.getElementById('attireRadarChart').getContext('2d');
    const labels = data.evaluation.map(item => item.item);
    const scores = data.evaluation.map(item => item.score);

    if (myRadarChart) {
        myRadarChart.destroy(); 
    }
    myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '評価 (5点満点)',
                data: scores,
                backgroundColor: 'rgba(79, 70, 229, 0.2)', // indigo-600
                borderColor: '#4f46e5',
                borderWidth: 2,
                pointBackgroundColor: '#4f46e5',
                pointBorderColor: '#fff'
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

    const comment = data.overallComment;
    analysisResult.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-2xl p-6">
            <h3 class="text-green-800 flex items-center gap-2 font-bold mb-2">
                <i data-lucide="check-circle" class="w-5 h-5"></i> 良い点 (Good Points)
            </h3>
            <p class="text-green-700 leading-relaxed">${comment.goodPoints.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div class="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
            <h3 class="text-yellow-800 flex items-center gap-2 font-bold mb-2">
                <i data-lucide="alert-triangle" class="w-5 h-5"></i> 改善提案 (Suggestions)
            </h3>
            <p class="text-yellow-700 leading-relaxed">${comment.suggestions.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div class="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 class="text-slate-800 flex items-center gap-2 font-bold mb-2">
                <i data-lucide="lightbulb" class="w-5 h-5"></i> 総評 (Summary)
            </h3>
            <p class="text-slate-600 leading-relaxed">${comment.summary.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div class="mt-8">
            <h3 class="text-slate-800 font-bold mb-4 flex items-center gap-2"><i data-lucide="list" class="w-5 h-5"></i> 項目別詳細</h3>
            <div class="space-y-3">
                ${data.evaluation.map(item => `
                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-slate-700">${item.item}</span>
                            <span class="font-bold text-indigo-600">${item.score}/5</span>
                        </div>
                        <p class="text-sm text-slate-600">${item.comment}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    lucide.createIcons();
}

// --- UIヘルパー ---
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
}
function hideError() {
    errorMessage.classList.add('hidden');
}

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

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    selectInputMethod('upload');
    lucide.createIcons();
    // タイマーのデフォルト選択
    timerButtons[0].classList.add('selected');
    checkAnalyzeButtonState();
});