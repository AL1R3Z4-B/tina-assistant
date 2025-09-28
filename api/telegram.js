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
    timestamp: new Date().toISOString(),
    version: '2.0'
  });
});

// API Routes
app.get('/api/telegram', async (req, res) => {
  const { action, username, password, message, userid, title, user } = req.query;
  
  const BOT_TOKEN = process.env.BOT_TOKEN || "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "222666092";

  try {
    console.log('📡 API Request:', req.query);

    if (action === 'register') {
      const result = messageDB.createUser(username, password);
      return res.json(result);
    }

    if (action === 'login') {
      const result = messageDB.loginUser(username, password);
      return res.json(result);
    }

    if (action === 'send_message') {
      console.log('💬 Send message request received');
      
      if (!userid || !username || !message) {
        return res.status(400).json({ error: 'Missing parameters' });
      }
      
      const newMessage = messageDB.addMessage(userid, username, message);
      console.log('💾 Message saved to database:', newMessage);
      
      // ارسال به تلگرام
      const telegramResult = await notifyTelegram(BOT_TOKEN, ADMIN_CHAT_ID, newMessage);
      console.log('📤 Telegram send result:', telegramResult);
      
      return res.json({ 
        status: 'sent', 
        id: newMessage.id,
        telegramSent: telegramResult
      });
    }

    if (action === 'check_replies') {
      console.log('🔍 Checking replies for user:', userid);
      const replies = messageDB.getUserReplies(userid);
      console.log('📨 Found replies:', replies);
      return res.json(replies);
    }

    res.json({ 
      message: 'Tina Assistant API - Use specific actions',
      available_actions: ['register', 'login', 'send_message', 'check_replies']
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API برای مدیریت کاربران پشتیبانی
app.get('/api/users', async (req, res) => {
  const { action, username, password } = req.query;
  
  try {
    console.log('👥 Users API Request:', req.query);

    if (action === 'register') {
      const result = messageDB.createUser(username, password);
      return res.json(result);
    }

    if (action === 'login') {
      const result = messageDB.loginUser(username, password);
      return res.json(result);
    }

    res.json({ 
      message: 'Users API - Use specific actions',
      available_actions: ['register', 'login']
    });

  } catch (error) {
    console.error('❌ Users API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook ساده شده - فقط برای تست
app.post('/api/telegram', async (req, res) => {
  try {
    console.log('🤖 Telegram webhook received - Ignoring for now');
    res.json({ status: 'ok', message: 'Webhook disabled' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// توابع کمکی
async function notifyTelegram(token, chatId, message) {
  const text = `📩 پیام جدید از کاربر:\n\n👤 کاربر: ${message.username}\n🆔 آی‌دی: ${message.userId}\n💬 پیام: ${message.message}\n⏰ زمان: ${new Date(message.timestamp).toLocaleString('fa-IR')}\n\nبرای پاسخ:\n/reply_${message.id} متن پاسخ شما`;
  
  try {
    console.log('📤 Attempting to send to Telegram...');
    
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: text
      })
    });
    
    const result = await response.json();
    console.log('✅ Telegram API response:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error sending to Telegram:', error);
    return { error: error.message };
  }
}

// Route برای دیباگ
app.get('/api/debug/messages', (req, res) => {
  try {
    const messages = messageDB.getAllMessages();
    res.json(messages);
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/users', (req, res) => {
  try {
    const users = messageDB.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/database', (req, res) => {
  try {
    const database = require('./database.json');
    res.json(database);
  } catch (error) {
    console.error('❌ Database error:', error);
    res.status(500).json({ error: error.message });
  }
});

// شروع سرور
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Tina Assistant API running on port ${PORT}`);
  console.log(`📍 Health: https://tina-assistant-api.onrender.com/`);
  console.log(`📍 Debug - Messages: https://tina-assistant-api.onrender.com/api/debug/messages`);
  console.log(`📍 Debug - Users: https://tina-assistant-api.onrender.com/api/debug/users`);
});
