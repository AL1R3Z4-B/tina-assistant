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
      console.log('👤 Register result:', result);
      return res.json(result);
    }

    if (action === 'login') {
      const result = messageDB.loginUser(username, password);
      console.log('🔐 Login result:', result);
      return res.json(result);
    }

    if (action === 'send_message') {
      console.log('💬 Send message:', { userid, username, message });
      const newMessage = messageDB.addMessage(parseInt(userid), username, message);
      console.log('📨 Message saved:', newMessage);
      
      // ارسال به تلگرام
      await notifyTelegram(BOT_TOKEN, ADMIN_CHAT_ID, newMessage);
      return res.json({ status: 'sent', id: newMessage.id });
    }

    if (action === 'check_replies') {
      const replies = messageDB.getUserReplies(parseInt(userid));
      console.log('📩 Check replies:', replies);
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

    if (action === 'admin_stats') {
      const stats = messageDB.getStats();
      return res.json(stats);
    }

    res.json({ 
      message: 'Tina Assistant API - Use specific actions',
      available_actions: ['register', 'login', 'send_message', 'check_replies', 'check_notifications']
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook برای تلگرام
app.post('/api/telegram', async (req, res) => {
  try {
    console.log('🤖 Telegram webhook received:', req.body);
    
    const BOT_TOKEN = process.env.BOT_TOKEN || "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "222666092";
    
    await processTelegramMessage(req.body, BOT_TOKEN, ADMIN_CHAT_ID);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OPTIONS برای CORS
app.options('/api/telegram', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

// توابع کمکی
async function notifyTelegram(token, chatId, message) {
  const text = `💬 پیام جدید از کاربر:\n\n👤 کاربر: ${message.username} (ID: ${message.userId})\n📝 پیام: ${message.message}\n⏰ زمان: ${new Date(message.timestamp).toLocaleString('fa-IR')}\n\n📩 برای پاسخ: /reply_${message.id}`;
  
  try {
    console.log('📤 Sending to Telegram...');
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: text, 
        parse_mode: 'Markdown' 
      })
    });
    
    const result = await response.json();
    console.log('✅ Telegram response:', result);
    
    if (!result.ok) {
      console.error('❌ Telegram error:', result);
    }
  } catch (error) {
    console.error('❌ Error sending to Telegram:', error);
  }
}

async function processTelegramMessage(update, token, adminChatId) {
  if (!update?.message?.text) {
    console.log('📨 No text message in update');
    return;
  }

  const chatId = update.message.chat.id;
  const text = update.message.text;

  console.log(`🤖 Processing message from ${chatId}: ${text}`);

  if (chatId.toString() !== adminChatId) {
    console.log('🚫 Unauthorized access attempt');
    await sendTelegramMessage(token, chatId, '❌ شما دسترسی ادمین ندارید');
    return;
  }

  if (text.startsWith('/reply_')) {
    const parts = text.split(' ');
    if (parts.length >= 2) {
      const msgId = parts[0].replace('/reply_', '');
      const replyText = parts.slice(1).join(' ');
      
      console.log(`📩 Replying to message ${msgId}: ${replyText}`);
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
      response += `────────────\n`;
    });
    
    await sendTelegramMessage(token, chatId, response);
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
      `📬 /users - مشاهده کاربران\n` +
      `📊 /stats - آمار سیستم\n` +
      `📝 /reply_123 متن - پاسخ به پیام\n` +
      `ℹ️  /help - راهنما`;
    
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
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    console.log('✅ Message sent to Telegram');
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error);
  }
}

// شروع سرور
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Tina Assistant API running on port ${PORT}`);
  console.log(`📍 Health check: https://tina-assistant-api.onrender.com/`);
  console.log(`🤖 Bot Token: ${process.env.BOT_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`👤 Admin Chat ID: ${process.env.ADMIN_CHAT_ID || '222666092'}`);
});
