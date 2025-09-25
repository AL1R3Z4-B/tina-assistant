const messageDB = require('./messages');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const BOT_TOKEN = process.env.BOT_TOKEN || "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "222666092";

  try {
    if (req.method === 'GET') {
      const { action, username, password, message, userid, title, user } = req.query;

      if (action === 'register') {
        const result = messageDB.createUser(username, password);
        return res.json(result);
      }

      if (action === 'login') {
        const result = messageDB.loginUser(username, password);
        return res.json(result);
      }

      if (action === 'send_message') {
        const newMessage = messageDB.addMessage(parseInt(userid), username, message);
        await notifyTelegram(BOT_TOKEN, ADMIN_CHAT_ID, newMessage);
        return res.json({ status: 'sent', id: newMessage.id });
      }

      if (action === 'check_replies') {
        const replies = messageDB.getUserReplies(parseInt(userid));
        return res.json(replies);
      }

      if (action === 'check_notifications') {
        const notifications = messageDB.getUserNotifications(parseInt(userid));
        return res.json(notifications);
      }

      if (action === 'admin_get_users') {
        const users = messageDB.getAllUsers();
        return res.json(users);
      }

      if (action === 'admin_send_notification') {
        if (user === 'all') {
          const users = messageDB.getAllUsers();
          Object.keys(users).forEach(username => {
            const userObj = users[username];
            messageDB.addNotification(userObj.id, title, message);
          });
          return res.json({ success: true, sentTo: 'all users' });
        } else {
          const users = messageDB.getAllUsers();
          const userObj = users[user];
          if (userObj) {
            messageDB.addNotification(userObj.id, title, message);
            return res.json({ success: true, sentTo: user });
          }
          return res.json({ success: false, error: 'User not found' });
        }
      }

      if (action === 'admin_stats') {
        const stats = messageDB.getStats();
        return res.json(stats);
      }

      return res.json({ 
        message: 'Tina Assistant API',
        version: '2.0',
        admin: 'برای مدیریت از دستورات تلگرام استفاده کنید'
      });
    }

    if (req.method === 'POST') {
      let update = req.body;
      
      if (typeof req.body === 'string') {
        update = JSON.parse(req.body);
      }

      await processTelegramMessage(update, BOT_TOKEN, ADMIN_CHAT_ID);
      return res.json({ status: 'processed' });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

async function notifyTelegram(token, chatId, message) {
  const text = `💬 پیام جدید از کاربر:\n\n👤 کاربر: ${message.username} (ID: ${message.userId})\n📝 پیام: ${message.message}\n⏰ زمان: ${new Date(message.timestamp).toLocaleString('fa-IR')}\n\n📩 برای پاسخ: /reply_${message.id}`;
  
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });
}

async function processTelegramMessage(update, token, adminChatId) {
  if (!update?.message?.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text;

  if (chatId.toString() !== adminChatId) {
    await sendTelegramMessage(token, chatId, '❌ شما دسترسی ادمین ندارید');
    return;
  }

  if (text.startsWith('/reply_')) {
    const parts = text.split(' ');
    if (parts.length >= 2) {
      const msgId = parts[0].replace('/reply_', '');
      const replyText = parts.slice(1).join(' ');
      
      const success = messageDB.addReply(msgId, replyText);
      await sendTelegramMessage(token, chatId, success ? 
        '✅ پاسخ با موفقیت ارسال شد' : 
        '❌ پیام مورد نظر یافت نشد'
      );
    }
  }
  else if (text === '/users') {
    const users = messageDB.getAllUsers();
    let response = `👥 کاربران ثبت‌نام شده (${Object.keys(users).length}):\n\n`;
    
    Object.entries(users).forEach(([username, user]) => {
      response += `🔸 ${username} (ID: ${user.id})\n`;
      response += `📅 عضویت: ${new Date(user.createdAt).toLocaleString('fa-IR')}\n`;
      response += `🔐 آخرین ورود: ${new Date(user.lastLogin).toLocaleString('fa-IR')}\n`;
      response += `📊 وضعیت: ${user.isActive ? 'فعال' : 'غیرفعال'}\n`;
      response += `────────────\n`;
    });
    
    await sendTelegramMessage(token, chatId, response);
  }
  else if (text.startsWith('/pass_')) {
    const parts = text.split(' ');
    if (parts.length >= 3) {
      const username = parts[0].replace('/pass_', '');
      const newPassword = parts.slice(1).join(' ');
      
      const result = messageDB.updateUserPassword(username, newPassword);
      await sendTelegramMessage(token, chatId, result.success ?
        `✅ رمز عبور ${username} تغییر یافت` :
        `❌ کاربر ${username} یافت نشد`
      );
    }
  }
  else if (text.startsWith('/notify_')) {
    const parts = text.split(' ');
    if (parts.length >= 3) {
      const target = parts[0].replace('/notify_', '');
      const notificationText = parts.slice(1).join(' ');
      
      let result;
      if (target === 'all') {
        result = { success: true, sentTo: 'all users' };
        const users = messageDB.getAllUsers();
        Object.keys(users).forEach(username => {
          const user = users[username];
          messageDB.addNotification(user.id, '📢 اعلان از ادمین', notificationText);
        });
      } else {
        const users = messageDB.getAllUsers();
        const user = users[target];
        if (user) {
          messageDB.addNotification(user.id, '📢 اعلان از ادمین', notificationText);
          result = { success: true, sentTo: target };
        } else {
          result = { success: false, error: 'User not found' };
        }
      }
      
      await sendTelegramMessage(token, chatId, result.success ?
        `✅ اعلان به ${result.sentTo} ارسال شد` :
        `❌ ارسال اعلان ناموفق بود`
      );
    }
  }
  else if (text === '/stats') {
    const stats = messageDB.getStats();
    const response = `📊 آمار سیستم:\n\n` +
      `👥 کاربران کل: ${stats.totalUsers}\n` +
      `💬 پیام‌های کل: ${stats.totalMessages}\n` +
      `📨 پیام‌های خوانده نشده: ${stats.unreadMessages}\n` +
      `✅ کاربران فعال: ${stats.activeUsers}`;
    
    await sendTelegramMessage(token, chatId, response);
  }
  else if (text === '/help' || text === '/start') {
    const helpText = `📋 دستورات مدیریت تینا:\n\n` +
      `📬 /users - مشاهده تمام کاربران\n` +
      `📊 /stats - آمار سیستم\n` +
      `📝 /reply_123 متن - پاسخ به پیام شماره 123\n` +
      `🔐 /pass_username رمزجدید - تغییر رمز کاربر\n` +
      `📢 /notify_all متن - ارسال اعلان به همه\n` +
      `📢 /notify_username متن - ارسال اعلان به کاربر خاص\n` +
      `ℹ️  /help - نمایش این راهنما\n\n` +
      `🌐 کاربران از طریق این لینک ثبت‌نام می‌کنند:\n` +
      `https://al1r3z4-b.github.io/tina-assistant/`;
    
    await sendTelegramMessage(token, chatId, helpText);
  }
  else if (text === '/messages') {
    const unreplied = messageDB.getUnrepliedMessages();
    
    if (unreplied.length === 0) {
      await sendTelegramMessage(token, chatId, '📭 هیچ پیام جدیدی وجود ندارد!');
    } else {
      let response = `📬 پیام‌های پاسخ داده نشده (${unreplied.length}):\n\n`;
      
      unreplied.forEach((msg, index) => {
        response += `🔸 #${msg.id} - ${msg.username}\n`;
        response += `📝 ${msg.message}\n`;
        response += `⏰ ${new Date(msg.timestamp).toLocaleString('fa-IR')}\n`;
        response += `📩 برای پاسخ: /reply_${msg.id} متن پاسخ\n\n`;
      });
      
      await sendTelegramMessage(token, chatId, response);
    }
  }
}

async function sendTelegramMessage(token, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}
