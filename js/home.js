// アイコンの初期化
lucide.createIcons();

// --- モーダル制御 ---
function setupModal(btnId, modalId, contentId, overlayId, wrapperId, closeBtnIds) {
    const btn = btnId ? document.getElementById(btnId) : null;
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

// ヘルプモーダル
setupModal('helpButton', 'helpModal', 'helpContent', 'helpOverlay', 'modalWrapper', ['closeHelpBtn', 'closeHelpBtnBottom']);

// 認証モーダル（ログイン/登録）
const authModalCtrl = setupModal(null, 'authModal', 'authContent', 'authOverlay', 'authModalWrapper', ['closeAuthBtn']);

// --- 認証ロジック: サーバAPIとの連携 ---
const Auth = {
    currentUser: null, // メモリ上でログインユーザー保持

    async register(name, email, password) {
        try {
            const resp = await fetch('/api/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name, email, password })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                alert(data.error || '登録に失敗しました');
                return false;
            }
            this.currentUser = data.user;
            this.updateUI();
            return true;
        } catch (err) {
            alert('ネットワークエラー: ' + err);
            return false;
        }
    },

    async login(email, password) {
        try {
            const resp = await fetch('/api/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, password })
            });
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                alert(data.error || 'ログインできませんでした');
                return false;
            }
            this.currentUser = data.user;
            this.updateUI();
            return true;
        } catch (err) {
            alert('ネットワークエラー: ' + err);
            return false;
        }
    },

    logout() {
        this.currentUser = null;
        this.updateUI();
        alert('ログアウトしました');
    },

    getCurrentUser() {
        return this.currentUser;
    },

    updateUI() {
        const user = this.getCurrentUser();
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userAvatar = document.getElementById('userAvatar');
        
        if (user) {
            authButtons.classList.add('hidden');
            userMenu.classList.remove('hidden');
            userMenu.classList.add('flex');
            userNameDisplay.textContent = user.name;
            userAvatar.textContent = user.name.charAt(0).toUpperCase();
        } else {
            authButtons.classList.remove('hidden');
            userMenu.classList.add('hidden');
            userMenu.classList.remove('flex');
        }
    }
};

// --- イベントリスナー設定 ---

// ヘッダーのボタンからモーダルを開く
document.getElementById('loginBtn').addEventListener('click', () => {
    toggleAuthMode('login');
    authModalCtrl.open();
});
document.getElementById('registerBtn').addEventListener('click', () => {
    toggleAuthMode('register');
    authModalCtrl.open();
});

// モーダル内の切り替えリンク
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

// 登録実行
document.getElementById('doRegisterBtn').addEventListener('click', async () => {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    if(name && email && pass) {
        if(await Auth.register(name, email, pass)) {
            authModalCtrl.close();
            alert('登録が完了しました！ようこそ ' + name + ' さん');
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
        }
    } else {
        alert('すべての項目を入力してください。');
    }
});

// ログイン実行
document.getElementById('doLoginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    if(email && pass) {
        if(await Auth.login(email, pass)) {
            authModalCtrl.close();
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        }
    } else {
        alert('すべての項目を入力してください。');
    }
});

// ログアウト実行
document.getElementById('logoutBtn').addEventListener('click', () => {
    Auth.logout();
});

// 初期化時
Auth.updateUI();

// ESCキーで閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!document.getElementById('helpModal').classList.contains('hidden')) {
            document.getElementById('closeHelpBtn').click();
        }
        if (!document.getElementById('authModal').classList.contains('hidden')) {
            authModalCtrl.close();
        }
    }
});