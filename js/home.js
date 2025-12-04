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

    if(btn) btn.addEventListener('click', open);
    closeBtns.forEach(b => b.addEventListener('click', close));
    
    if(wrapper) {
        wrapper.addEventListener('click', (e) => {
            if (!content.contains(e.target)) close();
        });
    }
    return { open, close };
}

setupModal('helpButton', 'helpModal', 'helpContent', 'helpOverlay', 'modalWrapper', ['closeHelpBtn', 'closeHelpBtnBottom']);
const authModalCtrl = setupModal(null, 'authModal', 'authContent', 'authOverlay', 'authModalWrapper', ['closeAuthBtn']);
// 履歴モーダル制御
const historyModalCtrl = setupModal(null, 'historyModal', 'historyContent', 'historyOverlay', 'historyModalWrapper', ['closeHistoryBtn', 'closeHistoryBtnBottom']);

// --- ドロップダウンメニュー制御 ---
const userMenuBtn = document.getElementById('userMenuBtn');
const userDropdown = document.getElementById('userDropdown');

userMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
    }
});

// --- ロジック ---
const Auth = {
    KEY: 'career_app_users',      
    SESSION_KEY: 'career_app_session',
    HISTORY_KEY_PREFIX: 'career_app_history_',

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
        userDropdown.classList.add('hidden'); // メニューを閉じる
        this.updateUI();
        alert('ログアウトしました。');
    },
    
    getCurrentUser() { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); },
    
    // 履歴取得
    getHistory() {
        const user = this.getCurrentUser();
        if (!user) return [];
        const key = this.HISTORY_KEY_PREFIX + user.id;
        return JSON.parse(localStorage.getItem(key) || '[]');
    },

    updateUI() {
        const user = this.getCurrentUser();
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userAvatar = document.getElementById('userAvatar');
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        
        if (user) {
            authButtons.classList.add('hidden');
            userMenu.classList.remove('hidden');
            userNameDisplay.textContent = user.name;
            userEmailDisplay.textContent = user.email;
            userAvatar.textContent = user.name.charAt(0).toUpperCase();
        } else {
            authButtons.classList.remove('hidden');
            userMenu.classList.add('hidden');
        }
    }
};

// --- 履歴表示処理 ---
const historyBtn = document.getElementById('historyBtn');
const historyList = document.getElementById('historyList');
const emptyHistory = document.getElementById('emptyHistory');

historyBtn.addEventListener('click', () => {
    userDropdown.classList.add('hidden');
    renderHistory();
    historyModalCtrl.open();
});

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
            el.className = 'bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4 hover:border-blue-200 transition-colors';
            
            let iconHtml = '';
            let typeLabel = '';
            let typeColor = '';

            if (h.type === 'sindan') {
                typeLabel = '適性診断';
                typeColor = 'text-blue-600 bg-blue-50';
                iconHtml = '<i data-lucide="file-text" class="w-6 h-6"></i>';
            } else {
                typeLabel = '服装分析';
                typeColor = 'text-indigo-600 bg-indigo-50';
                iconHtml = '<i data-lucide="camera" class="w-6 h-6"></i>';
            }

            el.innerHTML = `
                <div class="flex-shrink-0 w-12 h-12 rounded-xl ${typeColor} flex items-center justify-center">
                    ${iconHtml}
                </div>
                <div class="flex-grow">
                    <div class="flex justify-between items-start mb-1">
                        <span class="text-xs font-bold ${typeColor.replace('bg-', 'text-').replace('50', '600')} bg-opacity-10 px-2 py-0.5 rounded-full">${typeLabel}</span>
                        <span class="text-xs text-slate-400 font-mono">${h.date}</span>
                    </div>
                    <h4 class="font-bold text-slate-900 text-lg mb-1">${h.title}</h4>
                    <p class="text-sm text-slate-500 line-clamp-2">${h.summary}</p>
                </div>
            `;
            historyList.appendChild(el);
        });
        lucide.createIcons();
    }
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
    if(mode === 'login') {
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
    if(name && email && pass) {
        if(Auth.register(name, email, pass)) {
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
    if(email && pass) {
        if(Auth.login(email, pass)) {
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
    }
});