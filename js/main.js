// main.js
// Basic UI wiring for camera/upload + fake analysis demo.
// This is a light implementation intended to replace the original inline JS
// and show a working split into index.html / style.css / main.js.

document.addEventListener('DOMContentLoaded', () => {
  // Page switching
  window.showPage = (id) => {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Elements
  const sceneSelect = document.getElementById('sceneSelect');
  const btnUseCamera = document.getElementById('btnUseCamera');
  const btnUseUpload = document.getElementById('btnUseUpload');
  const cameraUi = document.getElementById('cameraUi');
  const uploadUi = document.getElementById('uploadUi');
  const cameraStream = document.getElementById('cameraStream');
  const captureCanvas = document.getElementById('captureCanvas');
  const captureButton = document.getElementById('captureButton');
  const imageInput = document.getElementById('imageInput');
  const dropZone = document.getElementById('dropZone');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const analyzeButton = document.getElementById('analyzeButton');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const errorMessage = document.getElementById('errorMessage');
  const analysisResultContainer = document.getElementById('analysisResultContainer');
  const overallScoreEl = document.getElementById('overallScore');
  const sceneForScore = document.getElementById('sceneForScore');
  const analysisResult = document.getElementById('analysisResult');
  const radarCtx = document.getElementById('attireRadarChart').getContext('2d');

  let currentStream = null;
  let currentImageFile = null;
  let radarChart = null;

  function setError(msg) {
    if (!msg) {
      errorMessage.classList.add('hidden');
      errorMessage.textContent = '';
      return;
    }
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
  }

  function updateAnalyzeEnabled() {
    const hasScene = sceneSelect && sceneSelect.value;
    const hasImage = !!currentImageFile || !!imagePreview.src;
    analyzeButton.disabled = !(hasScene && hasImage);
  }

  // Camera / Upload toggles
  btnUseCamera.addEventListener('click', async () => {
    setError('');
    uploadUi.classList.add('hidden');
    cameraUi.classList.remove('hidden');

    try {
      if (currentStream) {
        // already active
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      currentStream = stream;
      cameraStream.srcObject = stream;
    } catch (err) {
      setError('カメラにアクセスできません: ' + (err.message || err));
    }
  });

  btnUseUpload.addEventListener('click', () => {
    setError('');
    cameraUi.classList.add('hidden');
    uploadUi.classList.remove('hidden');
    // stop camera if running
    stopCamera();
  });

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
      cameraStream.srcObject = null;
    }
  }

  // Capture from camera
  captureButton.addEventListener('click', () => {
    if (!currentStream) {
      setError('カメラが開始されていません。');
      return;
    }
    const video = cameraStream;
    const canvas = captureCanvas;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) {
        setError('撮影に失敗しました。');
        return;
      }
      currentImageFile = new File([blob], 'capture.png', { type: 'image/png' });
      showPreviewFromFile(currentImageFile);
      // stop camera after capture
      stopCamera();
      cameraUi.classList.add('hidden');
    }, 'image/png', 0.95);
  });

  // File input
  imageInput.addEventListener('change', (e) => {
    setError('');
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください。');
      return;
    }
    currentImageFile = f;
    showPreviewFromFile(f);
  });

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError('ファイルサイズは5MB以下にしてください。');
      return;
    }
    currentImageFile = f;
    showPreviewFromFile(f);
  });
  dropZone.addEventListener('click', () => imageInput.click());

  function showPreviewFromFile(file) {
    setError('');
    const url = URL.createObjectURL(file);
    imagePreview.src = url;
    imagePreviewContainer.classList.remove('hidden');
    analysisResultContainer.classList.add('hidden');
    updateAnalyzeEnabled();
  }

  // Scene select
  sceneSelect.addEventListener('change', () => {
    updateAnalyzeEnabled();
  });

  // Analysis flow (fake/local demo)
  analyzeButton.addEventListener('click', async () => {
    setError('');
    analysisResultContainer.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    analyzeButton.disabled = true;

    // Simulate processing time
    await new Promise(r => setTimeout(r, 1400));

    // Simple deterministic-ish scoring based on image size and scene
    let base = 60;
    if (currentImageFile && currentImageFile.size) {
      base += Math.min(30, Math.floor((currentImageFile.size / (1024 * 50)))); // up to +30
    }
    if (sceneSelect.value && sceneSelect.value.includes('カジュアル')) base -= 10;
    if (sceneSelect.value && sceneSelect.value.includes('最終')) base += 5;

    // Clamp and randomize lightly
    base = Math.max(30, Math.min(95, base + Math.floor((Math.random() - 0.5) * 12)));

    // Build criteria for radar chart
    const criteria = ['清潔感', 'フィット感', '色の合わせ', 'フォーマル度', 'アクセント'];
    const values = criteria.map((_, i) => {
      // distribute from base with variance
      const v = Math.max(10, Math.min(100, Math.round(base + (i - 2) * 6 + (Math.random() - 0.5) * 20)));
      return v;
    });

    // Compute overall as weighted average
    const overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

    // Render results
    overallScoreEl.textContent = overall;
    sceneForScore.textContent = `選択された場面: ${sceneSelect.value || '—'}`;
    analysisResult.innerHTML = `
      <p class="font-semibold">評価のポイント</p>
      <ul class="list-disc ml-5">
        <li>清潔感: ${values[0]} / 100 — ${values[0] > 70 ? '良い' : '改善の余地あり'}</li>
        <li>フィット感: ${values[1]} / 100 — ${values[1] > 65 ? '良い' : 'ジャストフィットを検討'}</li>
        <li>色の合わせ: ${values[2]} / 100 — ${values[2] > 60 ? '好印象' : '色の統一を意識'}</li>
        <li>フォーマル度: ${values[3]} / 100 — ${values[3] > 70 ? '場面に適合' : '少しカジュアル寄り'}</li>
        <li>アクセント: ${values[4]} / 100 — ${values[4] > 50 ? 'センスあり' : '控えめが無難'}</li>
      </ul>
      <p class="mt-4"><strong>ワンポイントアドバイス:</strong> 面接の場面に合わせて「色の統一」と「ジャケットのフィット感」を最優先でチェックしましょう。</p>
    `;

    // Show radar chart
    if (radarChart) {
      radarChart.destroy();
      radarChart = null;
    }
    radarChart = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: criteria,
        datasets: [{
          label: '評価 (/100)',
          data: values,
          backgroundColor: 'rgba(124,58,237,0.15)', // purple-600 15%
          borderColor: 'rgba(124,58,237,0.95)',
          pointBackgroundColor: 'rgba(124,58,237,0.95)',
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { stepSize: 20 }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });

    loadingSpinner.classList.add('hidden');
    analysisResultContainer.classList.remove('hidden');
    analyzeButton.disabled = false;
  });

  // Initial state
  updateAnalyzeEnabled();

  // Cleanup camera when leaving camera page
  const observer = new MutationObserver(() => {
    const cameraSectionActive = document.getElementById('pageCamera').classList.contains('active');
    if (!cameraSectionActive) {
      stopCamera();
    }
  });
  observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
});
