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

// Webhook برای تلگرام - سیستم جدید
app.post('/api/telegram', async (req, res) => {
  try {
    console.log('🤖 Telegram webhook received:', JSON.stringify(req.body, null, 2));
    
    const BOT_TOKEN = process.env.BOT_TOKEN || "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
    const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "222666092";
    
    // پردازش پیام
    await processTelegramMessage(req.body, BOT_TOKEN, ADMIN_CHAT_ID);
    res.json({ status: 'ok' });
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
        text: text,
        parse_mode: 'HTML'
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

// تابع پردازش پیام تلگرام - سیستم جدید
async function processTelegramMessage(update, token, adminChatId) {
  // بررسی وجود پیام
  if (!update.message || !update.message.text) {
    console.log('📭 No message text found');
    return;
  }

  const chatId = update.message.chat.id;
  const text = update.message.text;
  const messageId = update.message.message_id;

  console.log(`🤖 Processing Telegram message from ${chatId}: "${text}"`);

  // بررسی دسترسی
  if (chatId.toString() !== adminChatId) {
    console.log('🚫 Unauthorized access attempt from:', chatId);
    await sendTelegramMessage(token, chatId, '❌ دسترسی غیرمجاز');
    return;
  }

  // پردازش دستورات
  if (text.startsWith('/reply_')) {
    await handleReplyCommand(text, token, chatId);
  }
  else if (text === '/users') {
    await handleUsersCommand(token, chatId);
  }
  else if (text === '/stats') {
    await handleStatsCommand(token, chatId);
  }
  else if (text === '/start' || text === '/help') {
    await handleHelpCommand(token, chatId);
  }
  else {
    await sendTelegramMessage(token, chatId, '❌ دستور نامعتبر\nاز /help برای راهنما استفاده کنید');
  }
}

// تابع مدیریت دستور reply
async function handleReplyCommand(text, token, chatId) {
  const parts = text.split(' ');
  if (parts.length < 2) {
    await sendTelegramMessage(token, chatId, 
      '❌ فرمت دستور نادرست\n\n' +
      '📝 استفاده صحیح:\n' +
      '<code>/reply_123 متن پاسخ شما</code>\n\n' +
      'مثال:\n' +
      '<code>/reply_1 سلام! مشکل شما رو بررسی کردم</code>'
    );
    return;
  }

  const msgId = parts[0].replace('/reply_', '');
  const replyText = parts.slice(1).join(' ');

  console.log(`📨 Attempting to reply to message ${msgId}: "${replyText}"`);

  // بررسی اینکه msgId عدد معتبر هست
  if (!msgId || isNaN(parseInt(msgId))) {
    await sendTelegramMessage(token, chatId, '❌ شماره پیام نامعتبر است');
    return;
  }

  try {
    const success = messageDB.addReply(parseInt(msgId), replyText);
    
    if (success) {
      console.log('✅ Reply saved successfully');
      
      // پیدا کردن پیام اصلی
      const messages = messageDB.getAllMessages();
      const originalMessage = messages.find(msg => msg.id === parseInt(msgId));
      
      if (originalMessage) {
        console.log(`📨 پاسخ برای کاربر ${originalMessage.username} (ID: ${originalMessage.userId}) ذخیره شد`);
        await sendTelegramMessage(token, chatId, 
          `✅ پاسخ با موفقیت ارسال شد\n\n` +
          `👤 کاربر: ${originalMessage.username}\n` +
          `💬 پیام اصلی: ${originalMessage.message}\n` +
          `📝 پاسخ شما: ${replyText}`
        );
      } else {
        await sendTelegramMessage(token, chatId, '✅ پاسخ ذخیره شد (پیام اصلی یافت نشد)');
      }
    } else {
      console.log('❌ Failed to save reply - Message not found');
      await sendTelegramMessage(token, chatId, 
        '❌ پیام مورد نظر یافت نشد\n\n' +
        '🔍 برای مشاهده پیام‌ها از /users استفاده کنید'
      );
    }
  } catch (error) {
    console.error('❌ Error in reply command:', error);
    await sendTelegramMessage(token, chatId, '❌ خطا در ذخیره پاسخ');
  }
}

// تابع مدیریت دستور users
async function handleUsersCommand(token, chatId) {
  const users = messageDB.getAllUsers();
  let response = `👥 کاربران ثبت‌نام شده (${Object.keys(users).length}):\n\n`;
  
  if (Object.keys(users).length === 0) {
    response = '📭 هیچ کاربری ثبت‌نام نکرده است';
  } else {
    Object.entries(users).forEach(([username, user]) => {
      response += `👤 <b>${username}</b> (ID: ${user.id})\n`;
      response += `📅 عضویت: ${new Date(user.createdAt).toLocaleString('fa-IR')}\n`;
      response += `🕒 آخرین ورود: ${new Date(user.lastLogin).toLocaleString('fa-IR')}\n`;
      response += `────────────\n`;
    });
  }
  
  await sendTelegramMessage(token, chatId, response);
}

// تابع مدیریت دستور stats
async function handleStatsCommand(token, chatId) {
  const stats = messageDB.getStats();
  const response = `📊 آمار سیستم:\n\n` +
    `👥 کاربران کل: <b>${stats.totalUsers}</b>\n` +
    `💬 پیام‌های کل: <b>${stats.totalMessages}</b>\n` +
    `📩 پیام‌های خوانده نشده: <b>${stats.unreadMessages}</b>\n` +
    `🟢 کاربران فعال: <b>${stats.activeUsers}</b>`;
  
  await sendTelegramMessage(token, chatId, response);
}

// تابع مدیریت دستور help
async function handleHelpCommand(token, chatId) {
  const helpText = `🤖 ربات پشتیبانی تینا\n\n` +
    `🎯 <b>دستورات قابل استفاده:</b>\n\n` +
    `👥 <code>/users</code> - مشاهده کاربران\n` +
    `📊 <code>/stats</code> - آمار سیستم\n` +
    `💬 <code>/reply_123 متن</code> - پاسخ به پیام\n\n` +
    `📝 <b>مثال:</b>\n` +
    `<code>/reply_1 سلام! مشکل شما رو بررسی کردم</code>\n\n` +
    `📱 <b>وب‌سایت:</b>\n` +
    `https://al1r3z4-b.github.io/tina-assistant/`;
  
  await sendTelegramMessage(token, chatId, helpText);
}

// تابع ارسال پیام به تلگرام
async function sendTelegramMessage(token, chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    const result = await response.json();
    
    if (!result.ok) {
      console.error('❌ Telegram API error:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error);
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

// شروع سرور
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Tina Assistant API running on port ${PORT}`);
  console.log(`📍 Health: https://tina-assistant-api.onrender.com/`);
  console.log(`📍 Debug - Messages: https://tina-assistant-api.onrender.com/api/debug/messages`);
});
