const express = require('express');
const messageDB = require('./messages');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Route اصلی
app.get('/', (req, res) => {
  res.json({ 
    message: '✅ Tina Assistant API is running!',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.get('/api/telegram', async (req, res) => {
  const { action, username, password, message, userid, title, user } = req.query;
  
  const BOT_TOKEN = process.env.BOT_TOKEN || "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "222666092";

  try {
    console.log('API Request:', { action, username, userid });

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

// توابع کمکی
async function notifyTelegram(token, chatId, message) {
  const text = `💬 پیام جدید از کاربر:\n\n👤 کاربر: ${message.username} (ID: ${message.userId})\n📝 پیام: ${message.message}\n⏰ زمان: ${new Date(message.timestamp).toLocaleString('fa-IR')}\n\n📩 برای پاسخ: /reply_${message.id}`;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
    console.log('Telegram notification sent:', response.status);
  } catch (error) {
    console.error('Error sending to Telegram:', error);
  }
}

// شروع سرور
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Tina Assistant API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
  console.log(`🤖 Bot Token: ${process.env.BOT_TOKEN ? 'Set' : 'Not set'}`);
});
