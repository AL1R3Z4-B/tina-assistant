const fs = require('fs');
const path = require('path');

const usersDbPath = path.join(__dirname, 'users.json');

function loadUsers() {
    try {
        if (fs.existsSync(usersDbPath)) {
            const data = fs.readFileSync(usersDbPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.log('Error loading users database:', e);
    }
    
    return { users: {} };
}

function saveUsers(data) {
    try {
        fs.writeFileSync(usersDbPath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error saving users database:', e);
        return false;
    }
}

let usersDatabase = loadUsers();

module.exports = {
    registerUser: (username, password) => {
        if (usersDatabase.users[username]) {
            return { success: false, error: 'این نام کاربری قبلاً ثبت شده است' };
        }

        usersDatabase.users[username] = {
            password: password,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        saveUsers(usersDatabase);
        return { success: true };
    },

    loginUser: (username, password) => {
        const user = usersDatabase.users[username];
        if (!user) {
            return { success: false, error: 'نام کاربری یافت نشد' };
        }

        if (user.password !== password) {
            return { success: false, error: 'رمز عبور اشتباه است' };
        }

        user.lastLogin = new Date().toISOString();
        saveUsers(usersDatabase);

        return { success: true };
    }
};
