const Auth = {
    // LocalStorage Keys (Session only)
    SESSION_KEY: 'career_app_session',
    // Legacy Keys for Migration
    LEGACY_USERS_KEY: 'career_app_users',
    HISTORY_KEY_PREFIX: 'career_app_history_',
    MIGRATION_DONE_KEY: 'career_app_db_migrated',
    PROFILE_KEY_PREFIX: 'career_app_profile_',

    async hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },

    // Check and run migration
    async checkMigration() {
        if (localStorage.getItem(this.MIGRATION_DONE_KEY)) return;

        console.log('Checking for legacy data to migrate...');
        const legacyUsers = JSON.parse(localStorage.getItem(this.LEGACY_USERS_KEY) || '[]');

        if (legacyUsers.length === 0) {
            localStorage.setItem(this.MIGRATION_DONE_KEY, 'true');
            return;
        }

        const histories = [];
        legacyUsers.forEach(u => {
            const key = this.HISTORY_KEY_PREFIX + u.id;
            const hList = JSON.parse(localStorage.getItem(key) || '[]');
            hList.forEach(h => {
                histories.push({ ...h, userId: u.id });
            });
        });

        try {
            const res = await fetch('/api/migrate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ users: legacyUsers, histories })
            });

            if (res.ok) {
                console.log('Migration successful');
                localStorage.setItem(this.MIGRATION_DONE_KEY, 'true');
                alert('データ移行が完了しました。\nデータベースへの移行に成功しました。');
            } else {
                console.error('Migration failed', await res.text());
            }
        } catch (e) {
            console.error('Migration error', e);
        }
    },

    async register(name, email, password) {
        const hashedPassword = await this.hashPassword(password);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: Date.now().toString(),
                    name,
                    email,
                    password: hashedPassword
                })
            });

            if (res.ok) {
                await this.login(email, password);
                return true;
            } else {
                const err = await res.json();
                alert(err.error || '登録に失敗しました。');
                return false;
            }
        } catch (e) {
            alert('通信エラーが発生しました。');
            return false;
        }
    },

    async login(email, password) {
        const hashedPassword = await this.hashPassword(password);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: hashedPassword })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem(this.SESSION_KEY, JSON.stringify(data.user));
                // Reload or update UI handled by caller usually, but here we just return
                return true;
            } else {
                alert('メールアドレスまたはパスワードが間違っています。');
                return false;
            }
        } catch (e) {
            console.error(e);
            alert('ログイン中にエラーが発生しました。');
            return false;
        }
    },

    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        // UI update should be handled by the page specific script or here if generic
        window.location.href = 'home.html';
    },

    getCurrentUser() { return JSON.parse(localStorage.getItem(this.SESSION_KEY)); },

    async getHistory() {
        const user = this.getCurrentUser();
        if (!user) return [];
        try {
            const res = await fetch(`/api/user/history/${user.id}`);
            if (res.ok) {
                const data = await res.json();
                return data.history;
            }
        } catch (e) {
            console.error('Failed to fetch history', e);
        }
        return [];
    },

    // NEW: Function to add history
    async addHistory(type, title, summary, detail) {
        const user = this.getCurrentUser();
        if (!user) {
            console.warn('Cannot add history: User not logged in');
            return false;
        }

        const historyData = {
            userId: user.id,
            type,
            date: new Date().toISOString(),
            title,
            summary,
            detail
        };

        try {
            const res = await fetch('/api/user/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(historyData)
            });

            if (res.ok) {
                console.log('History saved to DB');
                return true;
            } else {
                console.error('Failed to save history:', await res.text());
                return false;
            }
        } catch (e) {
            console.error('Error saving history', e);
            return false;
        }
    },

    async saveProfile(profileData) {
        const user = this.getCurrentUser();
        if (!user) return false;

        try {
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, profile: profileData })
            });

            if (res.ok) {
                // Update local session
                user.profile = profileData;
                localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
                return true;
            }
        } catch (e) {
            console.error('Failed to save profile', e);
        }
        return false;
    },

    getProfile() {
        const user = this.getCurrentUser();
        return user ? user.profile : null;
    }
};
