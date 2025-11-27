// --- 要素取得 ---
const sceneSelect = document.getElementById('sceneSelect');
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
let selectedArea = "";
let base64Image = null;
let mimeType = null;
let cameraStream = null;
let myRadarChart;
let selectedTimer = 0; 
let countdownInterval = null;
let lastInputMethod = 'upload';

// --- JSON スキーマ定義 (v13準拠) ---
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


// --- イベントリスナー ---
sceneSelect.addEventListener('change', (e) => {
    selectedScene = e.target.value;
    checkAnalyzeButtonState();
});

// エリア選択ボタン
areaButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        areaButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedArea = btn.dataset.area;
        checkAnalyzeButtonState();
    });
});

// タイマー選択ボタン
timerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        timerButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTimer = parseInt(btn.dataset.timer, 10);
    });
});

btnUseCamera.addEventListener('click', () => {
    selectInputMethod('camera');
    startCamera();
});
btnUseUpload.addEventListener('click', () => {
    selectInputMethod('upload');
    stopCamera();
});

captureButton.addEventListener('click', handleCaptureClick);
retakeButton.addEventListener('click', handleRetake);

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
});
dropZone.addEventListener('drop', handleDrop, false);
imageInput.addEventListener('change', (e) => { handleFile(e.target.files[0]); });
function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
function handleDrop(e) { handleFile(e.dataTransfer.files[0]); }

function handleFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError("ファイルサイズが5MBを超えています。"); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { showError("PNG, JPG, WEBPのみ可"); return; }
    mimeType = file.type;
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        imagePreview.src = dataUrl;
        imagePreviewContainer.classList.remove('hidden');
        base64Image = dataUrl.split(',')[1];
        checkAnalyzeButtonState();
        hideError();
        uploadUi.classList.add('hidden'); 
    };
    reader.readAsDataURL(file);
}

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
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' }, 
            audio: false 
        });
        videoEl.srcObject = cameraStream;
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

    if (selectedTimer > 0) {
        startCountdown(selectedTimer);
    } else {
        takePicture(); 
    }
}

function startCountdown(seconds) {
    captureButton.disabled = true;
    captureButton.textContent = `${seconds}秒後に撮影します...`;
    
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
    
    // エリアとシーンは維持するが、画像関連の状態だけリセット
    imagePreviewContainer.classList.add('hidden');
    analyzeButton.disabled = true;
    hideError();
    analysisResultContainer.classList.add('hidden');
    
    selectInputMethod(lastInputMethod);
    if (lastInputMethod === 'camera') {
        startCamera(); 
    }
}


// --- 分析ボタンの制御 ---
function checkAnalyzeButtonState() {
    if (selectedScene && selectedArea && base64Image) {
        analyzeButton.disabled = false;
    } else {
        analyzeButton.disabled = true;
    }
}

analyzeButton.addEventListener('click', callGeminiApi);

// --- Gemini API 呼び出し (ダミー) ---
async function callGeminiApi() {
    loadingSpinner.classList.remove('hidden');
    analyzeButton.disabled = true;
    hideError();
    analysisResultContainer.classList.add('hidden');
    retakeButton.disabled = true; 

    const apiKey = ""; // Canvasが自動挿入
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // ★ 厳格な評価者プロンプト
    const systemPrompt = `
あなたはプロの就活アドバイザーであり、大手企業の人事部で最終面接官を長年務めた経験を持つ、非常に厳格な評価者です。
ユーザーは人生の重要な岐路である就職活動に臨んでいます。一切の妥協や甘い評価は許されません。
提供された画像を、ユーザーが選択した場面（シーン）と範囲に基づき、非常に厳格な基準で評価してください。

評価項目は「清潔感」「フォーマル度」「サイズ感」「髪型」「表情/姿勢」の5項目を各5点満点で採点してください。
少しでも懸念があれば減点し、その理由を「改善提案」で具体的に、厳しく指摘してください。

最後に総合点を100点満点で算出してください。
総合点の目安は以下の通りです。
- 80点以上：合格ライン。ただし、改善点があれば必ず指摘すること。
- 60-79点：要改善。面接官によっては不採用となるレベル。
- 59点以下：大幅改善が必要。このままでは面接通過は困難。

全体的なフィードバック（良い点、改善提案、総評）を提供してください。
「良い点」は当然できているべきこととして簡潔にし、「改善提案」を最も重視し、具体的かつ厳しく、どうすれば改善できるかを明確に指示してください。
必ず指定されたJSONスキーマに従って回答してください。
`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: `この服装を「${selectedScene}」の場面を想定して、「${selectedArea}」の範囲で評価してください。` },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Image
                        }
                    }
                ]
            }
        });
        loadingSpinner.classList.add('hidden');
        analyzeButton.disabled = false; 
        analyzeButton.querySelector('span').textContent = '再度分析する';
        retakeButton.disabled = false; 
        stopCamera();
    }
}

// --- 結果表示 ---
function displayResult(data) {
    analysisResultContainer.classList.remove('hidden');

    const score = data.overallScore || 0; 
    overallScoreEl.textContent = score;
    sceneForScoreEl.textContent = `（${data.scene || selectedScene} / ${selectedArea} での評価）`;

    scoreBenchmarkEl.classList.remove('bg-green-100', 'text-green-800', 'bg-yellow-100', 'text-yellow-800', 'bg-red-100', 'text-red-800'); 
    if (score >= 80) {
        scoreBenchmarkEl.textContent = '合格ライン (80点以上)';
        scoreBenchmarkEl.classList.add('bg-green-100', 'text-green-800');
    } else if (score >= 60) {
        scoreBenchmarkEl.textContent = '要改善 (合格ライン 80点)';
        scoreBenchmarkEl.classList.add('bg-yellow-100', 'text-yellow-800');
    } else {
        scoreBenchmarkEl.textContent = '大幅改善が必要 (合格ライン 80点)';
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
                label: '項目別評価',
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

function showError(msg) { errorMessage.textContent = msg; errorMessage.classList.remove('hidden'); }
function hideError() { errorMessage.textContent = ''; errorMessage.classList.add('hidden'); }

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    selectInputMethod('upload');
    lucide.createIcons();
    // デフォルトのタイマーボタン（なし）を選択状態にする
    timerButtons[0].classList.add('selected');
    // デフォルトのエリアボタン（全体）を選択状態にする
    areaButtons[0].classList.add('selected');
});