const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');

// تابع بارگذاری دیتابیس
function loadDatabase() {
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('Starting with fresh database');
  }
  
  // دیتابیس پیش‌فرض
  return {
    users: {},
    messages: [],
    notifications: [],
    lastMessageId: 0,
    lastUserId: 0,
    lastNotificationId: 0
  };
}

// تابع ذخیره دیتابیس
function saveDatabase(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error('Error saving database:', e);
    return false;
  }
}

let database = loadDatabase();

// ماژول اصلی
module.exports = {
  createUser: (username, password) => {
    if (database.users[username]) {
      return { success: false, error: 'این نام کاربری قبلاً ثبت شده است' };
    }

    const userId = ++database.lastUserId;
    database.users[username] = {
      id: userId,
      password: password,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true
    };

    saveDatabase(database);
    return { success: true, userId: userId };
  },

  loginUser: (username, password) => {
    const user = database.users[username];
    if (!user) {
      return { success: false, error: 'نام کاربری یافت نشد' };
    }

    if (user.password !== password) {
      return { success: false, error: 'رمز عبور اشتباه است' };
    }

    user.lastLogin = new Date().toISOString();
    saveDatabase(database);

    return { success: true, user: user };
  },

  getAllUsers: () => {
    return database.users;
  },

  updateUserPassword: (username, newPassword) => {
    const user = database.users[username];
    if (user) {
      user.password = newPassword;
      saveDatabase(database);
      return { success: true };
    }
    return { success: false, error: 'کاربر یافت نشد' };
  },

  addMessage: (userId, username, message) => {
    const newMessage = {
      id: ++database.lastMessageId,
      userId: parseInt(userId),
      username: username,
      message: message,
      timestamp: new Date().toISOString(),
      replied: false,
      reply: null,
      replyTimestamp: null
    };

    database.messages.push(newMessage);
    saveDatabase(database);
    return newMessage;
  },

  addReply: (messageId, reply) => {
    const message = database.messages.find(msg => msg.id === parseInt(messageId));
    if (message) {
      message.replied = true;
      message.reply = reply;
      message.replyTimestamp = new Date().toISOString();
      saveDatabase(database);
      return true;
    }
    return false;
  },

  getUserReplies: (userId) => {
    return database.messages.filter(msg => msg.userId === parseInt(userId) && msg.replied);
  },

  getUnrepliedMessages: () => {
    return database.messages.filter(msg => !msg.replied);
  },

  addNotification: (userId, title, message) => {
    const newNotification = {
      id: ++database.lastNotificationId,
      userId: parseInt(userId),
      title: title,
      message: message,
      timestamp: new Date().toISOString(),
      read: false
    };

    database.notifications.push(newNotification);
    saveDatabase(database);
    return newNotification;
  },

  getUserNotifications: (userId) => {
    return database.notifications.filter(notif => notif.userId === parseInt(userId) && !notif.read);
  },

  getStats: () => {
    return {
      totalUsers: Object.keys(database.users).length,
      totalMessages: database.messages.length,
      unreadMessages: database.messages.filter(msg => !msg.replied).length,
      activeUsers: Object.values(database.users).filter(user => user.isActive).length
    };
  }
};
