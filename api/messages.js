// دیتابیس ساده برای ذخیره پیام‌ها (در واقعیت از دیتابیس واقعی استفاده کنید)
let messages = [];
let messageId = 1;

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
      reply: null
    };
    messages.push(newMessage);
    return newMessage;
  },

  // دریافت پیام‌های پاسخ داده نشده
  getUnrepliedMessages: () => {
    return messages.filter(msg => !msg.replied);
  },

  // افزودن پاسخ به پیام
  addReply: (messageId, reply) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      message.replied = true;
      message.reply = reply;
      message.replyTimestamp = new Date().toISOString();
      return true;
    }
    return false;
  },

  // دریافت تمام پیام‌ها
  getAllMessages: () => {
    return messages;
  }
};
