// دیتابیس بهبود یافته با ذخیره‌سازی پایدار
let messages = [];
let messageId = 1;

// تلاش برای بارگذاری از localStorage (اگر در محیط مرورگر اجرا شود)
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('tina_messages');
    if (saved) {
      const parsed = JSON.parse(saved);
      messages = parsed.messages || [];
      messageId = parsed.messageId || 1;
    }
  }
} catch (e) {
  console.log('Cannot access localStorage, using in-memory storage');
}

// تابع ذخیره‌سازی
function saveToStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('tina_messages', JSON.stringify({
        messages,
        messageId
      }));
    }
  } catch (e) {
    // ignore storage errors
  }
}

module.exports = {
  // ذخیره پیام جدید
  addMessage: (user, message, isFromUser = true) => {
    const newMessage = {
      id: messageId++,
      user: user,
      message: message,
      isFromUser: isFromUser,
      timestamp: new Date().toISOString(),
      replied: false,
      reply: null,
      replyTimestamp: null
    };
    messages.push(newMessage);
    saveToStorage();
    return newMessage;
  },

  // دریافت پیام‌های پاسخ داده نشده
  getUnrepliedMessages: () => {
    return messages.filter(msg => !msg.replied);
  },

  // دریافت پیام‌های یک کاربر خاص
  getUserMessages: (userId) => {
    return messages.filter(msg => msg.user === userId);
  },

  // دریافت پیام‌های پاسخ داده شده برای یک کاربر
  getUserReplies: (userId) => {
    return messages.filter(msg => msg.user === userId && msg.replied);
  },

  // افزودن پاسخ به پیام
  addReply: (messageId, reply) => {
    const messageIndex = messages.findIndex(msg => msg.id === parseInt(messageId));
    if (messageIndex !== -1) {
      messages[messageIndex].replied = true;
      messages[messageIndex].reply = reply;
      messages[messageIndex].replyTimestamp = new Date().toISOString();
      saveToStorage();
      return true;
    }
    return false;
  },

  // دریافت تمام پیام‌ها
  getAllMessages: () => {
    return messages;
  },

  // پاک کردن پیام‌های قدیمی (اختیاری)
  cleanupOldMessages: (maxAgeHours = 24) => {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    messages = messages.filter(msg => new Date(msg.timestamp) > cutoff);
    saveToStorage();
  }
};
