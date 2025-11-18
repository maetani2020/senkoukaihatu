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
    }
};


// --- イベントリスナー ---
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

// --- アップロード処理 ---
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

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    handleFile(e.dataTransfer.files[0]);
}

imageInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

function handleFile(file) {
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
    try {
        // 既存のストリームがあれば停止
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' }, // フロントカメラ
            audio: false 
        });
        videoEl.srcObject = cameraStream;
    } catch (err) {
        console.error("Camera error:", err);
        showError("カメラへのアクセスが許可されませんでした。");
        selectInputMethod('upload'); // アップロードにフォールバック
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
    
    const dataUrl = captureCanvas.toDataURL('image/jpeg'); // JPEGで固定
    mimeType = 'image/jpeg';
    base64Image = dataUrl.split(',')[1];
    
    imagePreview.src = dataUrl;
    imagePreviewContainer.classList.remove('hidden');
    checkAnalyzeButtonState();
    stopCamera(); // 撮影したらカメラを止める
    cameraUi.classList.add('hidden'); // カメラUIを隠す
}

// --- 分析ボタンの制御 ---
function checkAnalyzeButtonState() {
    if (selectedScene && base64Image) {
        analyzeButton.disabled = false;
    } else {
        analyzeButton.disabled = true;
    }
}
analyzeButton.addEventListener('click', callGeminiApi);

// --- Gemini API 呼び出し (JSONモード) ---
async function callGeminiApi() {
    loadingSpinner.classList.remove('hidden');
    analyzeButton.disabled = true;
    analyzeButton.querySelector('span').textContent = '分析中です...';
    hideError();
    analysisResultContainer.classList.add('hidden');

    const apiKey = ""; // Canvasが自動挿入
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

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
            responseSchema: responseSchema
        }
    };

    try {
        const response = await fetchWithBackoff(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        
        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0].text) {
            const jsonString = result.candidates[0].content.parts[0].text;
            const data = JSON.parse(jsonString);
            displayResult(data);
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
        stopCamera();
    }
}

// --- 結果表示 ---
function displayResult(data) {
    analysisResultContainer.classList.remove('hidden');

    overallScoreEl.textContent = data.overallScore || 0;
    sceneForScoreEl.textContent = `（${data.scene || selectedScene}での評価）`;

    const ctx = document.getElementById('attireRadarChart').getContext('2d');
    const labels = data.evaluation.map(item => item.item);
    const scores = data.evaluation.map(item => item.score);

    if (myRadarChart) {
        myRadarChart.destroy(); // 既存のチャートを破棄
    }
    myRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '項目別評価 (5点満点)',
                data: scores,
                backgroundColor: 'rgba(109, 40, 217, 0.2)', // purple-600
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
                    suggestedMax: 5, // 5点満点
                    ticks: { stepSize: 1 },
                    pointLabels: { font: { size: 14 } }
                }
            },
            plugins: {
                legend: { position: 'top' }
            }
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
    // アイコンを再描画
    lucide.createIcons();
}


// --- UIヘルパー ---
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}
function hideError() {
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
}

// --- APIリトライ ---
async function fetchWithBackoff(url, options, maxRetries = 3, baseDelay = 1000) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            if (response.status === 429) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
            } else {
                return response;
            }
        } catch (error) {
            if (attempt + 1 >= maxRetries) {
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
        }
    }
    throw new Error('API request failed after all retries.');
}

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    selectInputMethod('upload'); // デフォルトはアップロード
    lucide.createIcons();
});