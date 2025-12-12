lucide.createIcons();

// --- モーダル制御 ---
function setupModal(btnId, modalId, contentId, overlayId, wrapperId, closeBtnIds) {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    const overlay = document.getElementById(overlayId);
    const wrapper = document.getElementById(wrapperId);
    const closeBtns = closeBtnIds.map(id => document.getElementById(id)).filter(el => el);

    const open = () => {
        modal.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            content.classList.remove('opacity-0', 'scale-95');
        }, 10);
    };

    const close = () => {
        overlay.classList.add('opacity-0');
        content.classList.add('opacity-0', 'scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    };

    if (btn) btn.addEventListener('click', open);
    closeBtns.forEach(b => b.addEventListener('click', close));

    if (wrapper) {
        wrapper.addEventListener('click', (e) => {
            if (!content.contains(e.target)) close();
        });
    }
    return { open, close };
}

setupModal('helpButton', 'helpModal', 'helpContent', 'helpOverlay', 'modalWrapper', ['closeHelpBtn', 'closeHelpBtnBottom']);
const authModalCtrl = setupModal(null, 'authModal', 'authContent', 'authOverlay', 'authModalWrapper', ['closeAuthBtn']);
const historyModalCtrl = setupModal(null, 'historyModal', 'historyContent', 'historyOverlay', 'historyModalWrapper', ['closeHistoryBtn', 'closeHistoryBtnBottom']);

// プロフィールモーダル制御
const profileModalCtrl = setupModal(null, 'profileModal', 'profileContent', 'profileOverlay', 'profileModalWrapper', ['closeProfileBtn']);

// --- ドロップダウンメニュー制御 ---
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');

if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('hidden');
    });
}

document.addEventListener('click', (e) => {
    if (userMenuBtn && userDropdown && !userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
    }
});

// --- ロジック ---
const Auth = {
    KEY: 'career_app_users',
    SESSION_KEY: 'career_app_session',
    HISTORY_KEY_PREFIX: 'career_app_history_',
    PROFILE_KEY_PREFIX: 'career_app_profile_',

    getUsers() { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); },

    register(name, email, password) {
        const users = this.getUsers();
        if (users.find(u => u.email === email)) { alert('このメールアドレスは既に登録されています。'); return false; }
        const newUser = { id: Date.now().toString(), name, email, password };
        users.push(newUser);
        localStorage.setItem(this.KEY, JSON.stringify(users));
        this.login(email, password);
        return true;
    },

    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            const sessionUser = { ...user };
            delete sessionUser.password;
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionUser));
            this.updateUI();
            return true;
        } else {
            alert('メールアドレスまたはパスワードが間違っています。');
            return false;
        }
    },

    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        if (userDropdown) userDropdown.classList.add('hidden');
        this.updateUI();
        alert('ログアウトしました。');
    },

    getCurrentUser() { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); },

    getHistory() {
        const user = this.getCurrentUser();
        if (!user) return [];
        const key = this.HISTORY_KEY_PREFIX + user.id;
        return JSON.parse(localStorage.getItem(key) || '[]');
    },

    saveProfile(profileData) {
        const user = this.getCurrentUser();
        if (!user) return false;
        const key = this.PROFILE_KEY_PREFIX + user.id;
        localStorage.setItem(key, JSON.stringify(profileData));
        return true;
    },

    getProfile() {
        const user = this.getCurrentUser();
        if (!user) return null;
        const key = this.PROFILE_KEY_PREFIX + user.id;
        return JSON.parse(localStorage.getItem(key));
    },

    updateUI() {
        const user = this.getCurrentUser();
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userAvatar = document.getElementById('userAvatar');
        const userEmailDisplay = document.getElementById('userEmailDisplay');

        if (user) {
            if (authButtons) authButtons.classList.add('hidden');
            if (userMenu) userMenu.classList.remove('hidden');
            if (userNameDisplay) userNameDisplay.textContent = user.name;
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            if (userAvatar) userAvatar.textContent = user.name.charAt(0).toUpperCase();
        } else {
            if (authButtons) authButtons.classList.remove('hidden');
            if (userMenu) userMenu.classList.add('hidden');
        }
    }
};

// --- プロフィール設定処理 ---
const profileBtn = document.getElementById('profileBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profIndustry = document.getElementById('profIndustry');
const profRole = document.getElementById('profRole');
const profCompany = document.getElementById('profCompany');
const profPersona = document.getElementById('profPersona');

if (profileBtn) {
    profileBtn.addEventListener('click', () => {
        if (userDropdown) userDropdown.classList.add('hidden');
        const profile = Auth.getProfile();
        if (profile) {
            if (profIndustry) profIndustry.value = profile.industry || '';
            if (profRole) profRole.value = profile.role || '';
            if (profCompany) profCompany.value = profile.company || '';
            if (profPersona) profPersona.value = profile.persona || '';
        }
        profileModalCtrl.open();
    });
}

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', () => {
        const profileData = {
            industry: profIndustry ? profIndustry.value : '',
            role: profRole ? profRole.value : '',
            company: profCompany ? profCompany.value : '',
            persona: profPersona ? profPersona.value : ''
        };

        if (Auth.saveProfile(profileData)) {
            profileModalCtrl.close();
            alert('プロフィールを保存しました。\n診断や面接でこの情報が活用されます。');
        } else {
            alert('保存に失敗しました。ログイン状態を確認してください。');
        }
    });
}

// 詳細モーダル制御
const detailModalCtrl = setupModal(null, 'detailModal', 'detailContent', 'detailOverlay', 'detailModalWrapper', ['closeDetailBtn', 'closeDetailBtnBottom']);
let detailChart = null;

function renderHistory() {
    const histories = Auth.getHistory();
    historyList.innerHTML = '';

    if (histories.length === 0) {
        emptyHistory.classList.remove('hidden');
    } else {
        emptyHistory.classList.add('hidden');
        // 日付降順
        histories.sort((a, b) => new Date(b.date) - new Date(a.date));

        histories.forEach(h => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group';

            // クリックイベント追加
            el.addEventListener('click', () => showHistoryDetail(h));

            let iconHtml = '';
            let typeLabel = '';
            let typeColor = '';

            if (h.type === 'sindan') {
                typeLabel = '適性診断';
                typeColor = 'text-blue-600 bg-blue-50';
                iconHtml = '<i data-lucide="file-text" class="w-6 h-6"></i>';
            } else if (h.type === 'camera') {
                typeLabel = '服装分析';
                typeColor = 'text-indigo-600 bg-indigo-50';
                iconHtml = '<i data-lucide="camera" class="w-6 h-6"></i>';
            } else if (h.type === 'interview') {
                typeLabel = '模擬面接';
                typeColor = 'text-teal-600 bg-teal-50';
                iconHtml = '<i data-lucide="mic" class="w-6 h-6"></i>';
            }

            el.innerHTML = `
                <div class="flex-shrink-0 w-12 h-12 rounded-xl ${typeColor} flex items-center justify-center group-hover:scale-105 transition-transform">
                    ${iconHtml}
                </div>
                <div class="flex-grow">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-xs font-bold ${typeColor.replace('bg-', 'text-').replace('50', '600')} bg-opacity-10 px-2 py-0.5 rounded-full">${typeLabel}</span>
                        <span class="text-xs text-slate-400 font-mono">${h.date}</span>
                    </div>
                    <h4 class="font-bold text-slate-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">${h.title}</h4>
                    <p class="text-sm text-slate-500 line-clamp-2">${h.summary}</p>
                </div>
                <div class="self-center text-slate-300 group-hover:text-blue-400 transition-colors">
                     <i data-lucide="chevron-right" class="w-5 h-5"></i>
                </div>
            `;
            historyList.appendChild(el);
        });
        lucide.createIcons();
    }
}

function showHistoryDetail(history) {
    const container = document.getElementById('detailBody');

    // 詳細データがない場合
    if (!history.detail) {
        container.innerHTML = `
            <div class="text-center py-8">
                <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                     <i data-lucide="file-x" class="w-8 h-8"></i>
                </div>
                <h4 class="text-lg font-bold text-slate-700">詳細データがありません</h4>
                <p class="text-sm text-slate-500 mt-2">この履歴には詳細情報が保存されていません。</p>
            </div>
        `;
        detailModalCtrl.open();
        lucide.createIcons();
        return;
    }

    // 面接結果の場合
    if (history.type === 'interview') {
        const data = history.detail;
        const score = data.overallScore || 0;

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

        container.innerHTML = `
            <div class="space-y-8">
                 <!-- Score Card -->
                <div class="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-bold text-indigo-800 mb-1">総合評価</p>
                        <div class="flex items-end gap-2">
                            <span class="text-5xl font-black text-indigo-600 tracking-tighter">${score}</span>
                            <span class="text-xl font-bold text-indigo-400 mb-1">/ 5.0</span>
                        </div>
                    </div>
                </div>

                 <!-- Evaluation -->
                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-slate-900 text-lg mb-4 flex items-center"><i data-lucide="check-circle-2" class="w-5 h-5 text-green-500 mr-2"></i> 総合評価</h3>
                     <div class="flex items-center mb-3">
                        ${stars(score)}
                    </div>
                    <p class="text-slate-600 leading-relaxed text-sm">${data.overallEvaluation}</p>
                </div>

                <!-- Chart -->
                 <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-slate-900 text-lg mb-4 text-center">スキル分析</h3>
                    <div class="aspect-square max-w-sm mx-auto relative">
                        <canvas id="detailRadarChart"></canvas>
                    </div>
                </div>

                <!-- Strengths & Weaknesses -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 class="font-bold text-slate-900 text-lg mb-4 flex items-center"><i data-lucide="thumbs-up" class="w-5 h-5 text-blue-500 mr-2"></i> 強み</h3>
                        <ul class="space-y-2">
                            ${(data.strengths || []).map(s => `<li class="flex items-start gap-2 text-slate-600 text-sm"><span class="text-blue-500 mt-1">•</span>${s}</li>`).join('')}
                        </ul>
                    </div>
                     <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <h3 class="font-bold text-slate-900 text-lg mb-4 flex items-center"><i data-lucide="alert-triangle" class="w-5 h-5 text-red-500 mr-2"></i> 課題</h3>
                        <ul class="space-y-2">
                            ${(data.weaknesses || []).map(w => `<li class="flex items-start gap-2 text-slate-600 text-sm"><span class="text-red-500 mt-1">•</span>${w}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                
                 <!-- Advice -->
                <div class="bg-yellow-50 rounded-2xl p-6 border border-yellow-100">
                    <h3 class="font-bold text-yellow-800 text-lg mb-3 flex items-center"><i data-lucide="lightbulb" class="w-5 h-5 mr-2"></i> 今後のアドバイス</h3>
                    <p class="text-yellow-900 leading-relaxed text-sm">
                        ${data.advice}
                    </p>
                </div>
            </div>
        `;

        // Render Chart
        if (detailChart) { detailChart.destroy(); }
        const ctx = document.getElementById('detailRadarChart').getContext('2d');
        detailChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['スキル・能力', '論理性', '熱意', '柔軟性', '知識'],
                datasets: [{
                    label: '評価スコア',
                    data: [
                        data.radarChart?.skill || 0,
                        data.radarChart?.logical || 0,
                        data.radarChart?.enthusiasm || 0,
                        data.radarChart?.flexibility || 0,
                        data.radarChart?.knowledge || 0
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

    } else if (history.type === 'camera') {
        const data = history.detail;
        const score = data.overallScore || 0;

        container.innerHTML = `
            <div class="space-y-8">
                 <!-- Score -->
                <div class="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 text-center">
                    <p class="text-sm font-bold text-indigo-800 mb-2">服装分析スコア</p>
                    <div class="flex items-end justify-center gap-2">
                        <span class="text-6xl font-black text-indigo-600 tracking-tighter">${score}</span>
                        <span class="text-xl font-bold text-indigo-400 mb-2">/ 100</span>
                    </div>
                </div>

                <!-- Chart -->
                 <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-slate-900 text-lg mb-4 text-center">バランス分析</h3>
                    <div class="aspect-square max-w-sm mx-auto relative">
                        <canvas id="detailRadarChart"></canvas>
                    </div>
                </div>

                <!-- Summary -->
                <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                     <div>
                        <h4 class="font-bold text-green-700 flex items-center mb-1"><i data-lucide="check-circle" class="w-4 h-4 mr-2"></i>Good Points</h4>
                        <p class="text-sm text-slate-600 leading-relaxed">${(data.overallComment?.goodPoints || '').replace(/\n/g, '<br>')}</p>
                     </div>
                     <div>
                        <h4 class="font-bold text-yellow-700 flex items-center mb-1"><i data-lucide="alert-triangle" class="w-4 h-4 mr-2"></i>Suggestions</h4>
                        <p class="text-sm text-slate-600 leading-relaxed">${(data.overallComment?.suggestions || '').replace(/\n/g, '<br>')}</p>
                     </div>
                </div>

                 <!-- Details -->
                <div>
                     <h4 class="font-bold text-slate-900 mb-2">項目別評価</h4>
                     <div class="space-y-2">
                        ${(data.evaluation || []).map(item => `
                            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="font-bold text-slate-700 text-sm">${item.item}</span>
                                    <span class="font-bold text-indigo-600 text-sm">${item.score}/5</span>
                                </div>
                                <p class="text-xs text-slate-500">${item.comment}</p>
                            </div>
                        `).join('')}
                     </div>
                </div>
            </div>
        `;

        // Render Chart
        if (detailChart) { detailChart.destroy(); }
        setTimeout(() => {
            const ctx = document.getElementById('detailRadarChart').getContext('2d');
            const labels = (data.evaluation || []).map(item => item.item);
            const scores = (data.evaluation || []).map(item => item.score);

            detailChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '評価',
                        data: scores,
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
                            suggestedMin: 0,
                            suggestedMax: 5,
                            ticks: { stepSize: 1, display: false }
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }, 0);

    } else if (history.type === 'sindan') {
        const data = history.detail;
        const scores = data.scores || {};

        // カテゴリ名のマッピング (英語キー -> 日本語ラベル)
        const categoryNames = {
            action: '行動力',
            logic: '論理力',
            team: '協調性',
            creative: '創造性',
            resilience: '精神力'
        };

        container.innerHTML = `
            <div class="space-y-8">
                 <!-- Main Result -->
                <div class="bg-blue-50 rounded-2xl p-6 border border-blue-100 text-center">
                    <p class="text-sm font-bold text-blue-800 mb-2">あなたの最大の強み</p>
                    <h3 class="text-2xl font-bold text-slate-900 mb-1">${data.element}</h3>
                    <p class="text-sm text-blue-600 font-bold">${data.category}</p>
                </div>

                <!-- Chart -->
                 <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-slate-900 text-lg mb-4 text-center">基礎力バランス</h3>
                    <div class="aspect-square max-w-sm mx-auto relative">
                        <canvas id="detailRadarChart"></canvas>
                    </div>
                </div>

                 <!-- Content -->
                <div class="space-y-4">
                    <div class="bg-white rounded-2xl p-5 border border-slate-200">
                        <h4 class="font-bold text-slate-800 mb-2 text-sm flex items-center"><i data-lucide="compass" class="w-4 h-4 mr-2 text-blue-500"></i>アピールの方向性</h4>
                        <p class="text-sm text-slate-600 leading-relaxed">${data.direction}</p>
                    </div>
                    <div class="bg-white rounded-2xl p-5 border border-slate-200">
                        <h4 class="font-bold text-slate-800 mb-2 text-sm flex items-center"><i data-lucide="building" class="w-4 h-4 mr-2 text-indigo-500"></i>業界・企業への適性</h4>
                        <p class="text-sm text-slate-600 leading-relaxed">${data.industryFit}</p>
                    </div>
                     <div class="bg-white rounded-2xl p-5 border border-slate-200">
                        <h4 class="font-bold text-slate-800 mb-2 text-sm flex items-center"><i data-lucide="lightbulb" class="w-4 h-4 mr-2 text-yellow-500"></i>アドバイス</h4>
                        <ul class="list-disc list-inside text-sm text-slate-600 space-y-1">
                            ${(data.advice || []).map(a => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Render Chart
        if (detailChart) { detailChart.destroy(); }
        setTimeout(() => {
            const ctx = document.getElementById('detailRadarChart').getContext('2d');
            // チャート用データの準備 (固定順序)
            const chartLabels = ['行動力', '論理力', '協調性', '創造性', '精神力'];
            const chartData = [
                scores.action || 0,
                scores.logic || 0,
                scores.team || 0,
                scores.creative || 0,
                scores.resilience || 0
            ];

            detailChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'スコア',
                        data: chartData,
                        backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue-500
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                        pointBackgroundColor: '#3b82f6',
                        pointHoverBorderColor: '#fff'
                    }]
                },
                options: {
                    scales: {
                        r: {
                            suggestedMin: 0,
                            ticks: { display: false }
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }, 0);

    } else {
        // 未知のタイプ
        container.innerHTML = `
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <pre class="whitespace-pre-wrap text-sm text-slate-700 font-mono overflow-x-auto">${JSON.stringify(history.detail, null, 2)}</pre>
            </div>
         `;
    }

    detailModalCtrl.open();
    lucide.createIcons();
}

// --- 履歴表示処理 ---
const historyBtn = document.getElementById('historyBtn');
const historyList = document.getElementById('historyList');
const emptyHistory = document.getElementById('emptyHistory');

if (historyBtn) {
    historyBtn.addEventListener('click', () => {
        if (typeof userDropdown !== 'undefined' && userDropdown) {
            userDropdown.classList.add('hidden');
        }
        renderHistory();
        historyModalCtrl.open();
    });
}

// --- イベント ---
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => { toggleAuthMode('login'); authModalCtrl.open(); });
}

const registerBtn = document.getElementById('registerBtn');
if (registerBtn) {
    registerBtn.addEventListener('click', () => { toggleAuthMode('register'); authModalCtrl.open(); });
}

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

function toggleAuthMode(mode) {
    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

document.getElementById('showRegisterLink').addEventListener('click', () => toggleAuthMode('register'));
document.getElementById('showLoginLink').addEventListener('click', () => toggleAuthMode('login'));

document.getElementById('doRegisterBtn').addEventListener('click', () => {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    if (name && email && pass) {
        if (Auth.register(name, email, pass)) {
            authModalCtrl.close();
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
        }
    } else { alert('すべての項目を入力してください。'); }
});

document.getElementById('doLoginBtn').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    if (email && pass) {
        if (Auth.login(email, pass)) {
            authModalCtrl.close();
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        }
    } else { alert('すべての項目を入力してください。'); }
});

document.getElementById('logoutBtn').addEventListener('click', () => { Auth.logout(); });

// 初期化
Auth.updateUI();

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!document.getElementById('helpModal').classList.contains('hidden')) document.getElementById('closeHelpBtn').click();
        if (!document.getElementById('authModal').classList.contains('hidden')) authModalCtrl.close();
        if (!document.getElementById('historyModal').classList.contains('hidden')) historyModalCtrl.close();
        if (!document.getElementById('profileModal').classList.contains('hidden')) profileModalCtrl.close();
    }
});
