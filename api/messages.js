// دیتابیس ساده برای ذخیره‌سازی داده‌ها
let database = {
  users: {},
  messages: [],
  notifications: [],
  lastMessageId: 0,
  lastUserId: 0,
  lastNotificationId: 0
};

// بارگذاری از localStorage
function loadDatabase() {
  try {
    const saved = localStorage.getItem('tina_database');
    if (saved) {
      database = JSON.parse(saved);
    }
  } catch (e) {
    console.log('Starting with fresh database');
  }
}

// ذخیره در localStorage
function saveDatabase() {
  try {
    localStorage.setItem('tina_database', JSON.stringify(database));
  } catch (e) {
    console.log('Error saving database');
  }
}

// بارگذاری اولیه
loadDatabase();

module.exports = {
  // مدیریت کاربران
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

    saveDatabase();
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
    saveDatabase();

    return { success: true, user: user };
  },

  getAllUsers: () => {
    return database.users;
  },

  updateUserPassword: (username, newPassword) => {
    const user = database.users[username];
    if (user) {
      user.password = newPassword;
      saveDatabase();
      return { success: true };
    }
    return { success: false, error: 'کاربر یافت نشد' };
  },

  // مدیریت پیام‌ها
  addMessage: (userId, username, message) => {
    const newMessage = {
      id: ++database.lastMessageId,
      userId: userId,
      username: username,
      message: message,
      timestamp: new Date().toISOString(),
      replied: false,
      reply: null,
      replyTimestamp: null
    };

    database.messages.push(newMessage);
    saveDatabase();
    return newMessage;
  },

  addReply: (messageId, reply) => {
    const message = database.messages.find(msg => msg.id === parseInt(messageId));
    if (message) {
      message.replied = true;
      message.reply = reply;
      message.replyTimestamp = new Date().toISOString();
      saveDatabase();
      return true;
    }
    return false;
  },

  getUserReplies: (userId) => {
    return database.messages.filter(msg => msg.userId === userId && msg.replied);
  },

  getUnrepliedMessages: () => {
    return database.messages.filter(msg => !msg.replied);
  },

  // مدیریت اعلان‌ها
  addNotification: (userId, title, message) => {
    const newNotification = {
      id: ++database.lastNotificationId,
      userId: userId,
      title: title,
      message: message,
      timestamp: new Date().toISOString(),
      read: false
    };

    database.notifications.push(newNotification);
    saveDatabase();
    return newNotification;
  },

  getUserNotifications: (userId) => {
    return database.notifications.filter(notif => notif.userId === userId && !notif.read);
  },

  markNotificationAsRead: (notificationId) => {
    const notification = database.notifications.find(notif => notif.id === parseInt(notificationId));
    if (notification) {
      notification.read = true;
      saveDatabase();
      return true;
    }
    return false;
  },

  // آمار سیستم
  getStats: () => {
    return {
      totalUsers: Object.keys(database.users).length,
      totalMessages: database.messages.length,
      unreadMessages: database.messages.filter(msg => !msg.replied).length,
      activeUsers: Object.values(database.users).filter(user => user.isActive).length
    };
  }
};
