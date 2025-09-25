const express = require('express');
const messageDB = require('./messages');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Routes
app.get('/api/telegram', async (req, res) => {
  const { action, username, password, message, userid, title, user } = req.query;
  
  const BOT_TOKEN = process.env.BOT_TOKEN || "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "222666092";

  try {
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

    res.json({ 
      message: 'Tina Assistant API',
      version: '2.0',
      status: 'active'
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route اصلی برای تست
app.get('/', (req, res) => {
  res.json({ 
    message: 'Tina Assistant API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      register: '/api/telegram?action=register&username=X&password=X',
      login: '/api/telegram?action=login&username=X&password=X',
      send_message: '/api/telegram?action=send_message&userid=X&username=X&message=X'
    }
  });
});

// Webhook برای تلگرام
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const BOT_TOKEN = process.env.BOT_TOKEN || "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "222666092";
    
    await processTelegramMessage(req.body, BOT_TOKEN, ADMIN_CHAT_ID);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// توابع کمکی
async function notifyTelegram(token, chatId, message) {
  const text = `💬 پیام جدید از کاربر:\n\n👤 کاربر: ${message.username} (ID: ${message.userId})\n📝 پیام: ${message.message}\n⏰ زمان: ${new Date(message.timestamp).toLocaleString('fa-IR')}\n\n📩 برای پاسخ: /reply_${message.id}`;
  
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
    console.error('Error sending to Telegram:', error);
  }
}

async function processTelegramMessage(update, token, adminChatId) {
  if (!update?.message?.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text;

  if (chatId.toString() !== adminChatId) {
    await sendTelegramMessage(token, chatId, '❌ شما دسترسی ادمین ندارید');
    return;
  }

  // پردازش دستورات (کد قبلی رو اینجا قرار بده)
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
  // بقیه دستورات رو اینجا اضافه کن...
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

// شروع سرور
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Tina Assistant API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
});
