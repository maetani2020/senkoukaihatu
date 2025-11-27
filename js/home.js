// アイコンの初期化
lucide.createIcons();

// --- モーダル制御 ---
function setupModal(btnId, modalId, contentId, overlayId, wrapperId, closeBtnIds) {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    const overlay = document.getElementById(overlayId);
    const wrapper = document.getElementById(wrapperId);
    
    // closeBtnIds は配列で受け取る
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
// ※ ログインボタンと登録ボタンの2箇所から開くため、戻り値の open 関数を使う
const authModalCtrl = setupModal(null, 'authModal', 'authContent', 'authOverlay', 'authModalWrapper', ['closeAuthBtn']);

// --- 認証ロジック (LocalStorage) ---
const Auth = {
    KEY: 'career_app_users',      // ユーザー情報の保存キー
    SESSION_KEY: 'career_app_session', // ログイン状態の保存キー
    
    // ユーザー一覧を取得
    getUsers() {
        return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    },
    
    // 新規登録
    register(name, email, password) {
        const users = this.getUsers();
        // 重複チェック
        if (users.find(u => u.email === email)) {
            alert('このメールアドレスは既に登録されています。');
            return false;
        }
        
        // ユーザー追加
        const newUser = { id: Date.now(), name, email, password };
        users.push(newUser);
        localStorage.setItem(this.KEY, JSON.stringify(users));
        
        // 自動ログイン
        this.login(email, password);
        return true;
    },
    
    // ログイン
    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            // セッションに保存 (パスワードは除外するフリ)
            const sessionUser = { ...user };
            // 実際はDBではないのでここにあるpasswordは消しても消さなくてもlocalStorageには残るが、
            // セッション管理としては消しておくのがマナー
            delete sessionUser.password; 
            localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionUser));
            
            this.updateUI();
            return true;
        } else {
            alert('メールアドレスまたはパスワードが間違っています。');
            return false;
        }
    },
    
    // ログアウト
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        this.updateUI();
        alert('ログアウトしました。');
    },
    
    // 現在のユーザーを取得
    getCurrentUser() {
        return JSON.parse(localStorage.getItem(this.SESSION_KEY));
    },
    
    // UI更新 (ヘッダーの切り替え)
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
            userAvatar.textContent = user.name.charAt(0).toUpperCase(); // 頭文字
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
document.getElementById('doRegisterBtn').addEventListener('click', () => {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPassword').value;
    
    if(name && email && pass) {
        if(Auth.register(name, email, pass)) {
            authModalCtrl.close();
            alert('登録が完了しました！ようこそ ' + name + ' さん');
            // 入力欄クリア
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
        }
    } else {
        alert('すべての項目を入力してください。');
    }
});

// ログイン実行
document.getElementById('doLoginBtn').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    
    if(email && pass) {
        if(Auth.login(email, pass)) {
            authModalCtrl.close();
            // 入力欄クリア
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
            // help close logic handled by setupModal internals or simplistic approach:
            document.getElementById('closeHelpBtn').click();
        }
        if (!document.getElementById('authModal').classList.contains('hidden')) {
            authModalCtrl.close();
        }
    }
});