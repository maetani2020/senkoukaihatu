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
const overallScoreEl = document.getElementById('overallScore');
const sceneForScoreEl = document.getElementById('sceneForScore');

// --- 状態管理 ---
let selectedScene = "";
let base64Image = null;
let mimeType = null;
let cameraStream = null;
let myRadarChart;

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
    stopCamera();
});
captureButton.addEventListener('click', captureImage);

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
    };
    reader.readAsDataURL(file);
}

function selectInputMethod(method) {
    if (method === 'camera') {
        cameraUi.classList.remove('hidden');
        uploadUi.classList.add('hidden');
        btnUseCamera.classList.add('active');
        btnUseUpload.classList.remove('active');
    } else {
        cameraUi.classList.add('hidden');
        uploadUi.classList.remove('hidden');
        btnUseUpload.classList.add('active');
        btnUseCamera.classList.remove('active');
    }
}
async function startCamera() {
    try {
        if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        videoEl.srcObject = cameraStream;
    } catch (err) {
        showError("カメラへのアクセスができません。");
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
function captureImage() {
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

function checkAnalyzeButtonState() {
    analyzeButton.disabled = !(selectedScene && base64Image);
}

analyzeButton.addEventListener('click', callGeminiApi);

// --- Gemini API 呼び出し (ダミー) ---
async function callGeminiApi() {
    loadingSpinner.classList.remove('hidden');
    analyzeButton.disabled = true;
    hideError();
    analysisResultContainer.classList.add('hidden');
    // API省略 → ダミー返却
    setTimeout(() => {
        displayResult({
            scene: selectedScene,
            evaluation: [
                { item: "清潔感", score: 5, comment: "とても清潔" },
                { item: "フォーマル度", score: 4, comment: "ほぼ最適" },
                { item: "サイズ感", score: 4, comment: "適正" },
                { item: "髪型", score: 4, comment: "スマート" },
                { item: "表情/姿勢", score: 5, comment: "好感" }
            ],
            overallScore: 92,
            overallComment: {
                goodPoints: "清潔感・表情が高評価です。",
                suggestions: "フォーマル度をもう少し意識しましょう。",
                summary: "総合的に非常に好印象です。"
            }
        });
        loadingSpinner.classList.add('hidden');
        analyzeButton.disabled = false;
    }, 1200);
}

// --- 結果表示 ---
function displayResult(data) {
    analysisResultContainer.classList.remove('hidden');
    overallScoreEl.textContent = data.overallScore || 0;
    sceneForScoreEl.textContent = `（${data.scene || selectedScene}での評価）`;
    const ctx = document.getElementById('attireRadarChart').getContext('2d');
    const labels = data.evaluation.map(item => item.item);
    const scores = data.evaluation.map(item => item.score);
    if (myRadarChart) { myRadarChart.destroy(); }
    myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '項目別評価',
                data: scores,
                backgroundColor: 'rgba(109,40,217,0.2)',
                borderColor: 'rgba(109,40,217,1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(109,40,217,1)'
            }]
        },
        options: { scales: { r: { min: 0, max: 5, ticks: { stepSize: 1 } } } }
    });
    analysisResult.innerHTML =
    `<h3>✔️ 良い点</h3><p>${data.overallComment.goodPoints}</p>
    <h3>⚠️ 改善提案</h3><p>${data.overallComment.suggestions}</p>
    <h3>💡 総評</h3><p>${data.overallComment.summary}</p>
    <ul>${data.evaluation.map(item=>`
        <li><strong>${item.item} (${item.score}/5):</strong> ${item.comment}</li>
    `).join('')}</ul>`;
}

function showError(msg) { errorMessage.textContent = msg; errorMessage.classList.remove('hidden'); }
function hideError() { errorMessage.textContent = ''; errorMessage.classList.add('hidden'); }

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    selectInputMethod('upload');
    lucide.createIcons();
});