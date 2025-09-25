const messageDB = require('./messages');

module.exports = async (req, res) => {
  // تنظیمات CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";

  try {
    if (req.method === 'GET') {
      const { action, username, password, message, userid } = req.query;

      // ثبت نام کاربر جدید
      if (action === 'register') {
        if (!username || !password) {
          return res.status(400).json({ error: 'نام کاربری و رمز عبور ضروری است' });
        }
        const result = await messageDB.createUser(username, password);
        return res.status(result.success ? 200 : 400).json(result);
      }

      // ورود کاربر
      if (action === 'login') {
        if (!username || !password) {
          return res.status(400).json({ error: 'نام کاربری و رمز عبور ضروری است' });
        }
        const result = await messageDB.loginUser(username, password);
        return res.status(result.success ? 200 : 400).json(result);
      }

      // ارسال پیام
      if (action === 'send_message') {
        if (!userid || !message || !username) {
          return res.status(400).json({ error: 'پارامترهای ضروری ارسال نشده' });
        }
        
        const newMessage = await messageDB.addMessage(parseInt(userid), message, username);
        await notifyTelegram(token, newMessage);
        
        return res.status(200).json({ 
          status: 'sent', 
          id: newMessage.id 
        });
      }

      // دریافت پاسخ‌ها
      if (action === 'check_replies') {
        if (!userid) {
          return res.status(400).json({ error: 'شناسه کاربر ضروری است' });
        }
        
        const userReplies = await messageDB.getUserReplies(parseInt(userid));
        return res.status(200).json(userReplies);
      }

      // دریافت پیام‌های پاسخ داده نشده (برای تلگرام)
      if (action === 'get_unreplied') {
        const unreplied = await messageDB.getUnrepliedMessages();
        return res.status(200).json(unreplied);
      }

      return res.status(200).json({ 
        message: 'Tina Chat API - Active',
        timestamp: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      let update = req.body;
      
      if (typeof req.body === 'string') {
        update = JSON.parse(req.body);
      }

      await processTelegramMessage(update, token);
      return res.status(200).json({ status: 'processed' });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

async function notifyTelegram(token, message) {
  const text = `💬 پیام جدید از کاربر:\n\n👤 کاربر: ${message.username} (ID: ${message.userId})\n📝 پیام: ${message.message}\n⏰ زمان: ${new Date(message.timestamp).toLocaleString('fa-IR')}\n\nبرای پاسخ: /reply_${message.id}`;
  
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: 222666092,
      text: text,
      parse_mode: 'Markdown'
    })
  });
}

async function processTelegramMessage(update, token) {
  if (!update?.message?.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text;

  // پاسخ به پیام
  if (text.startsWith('/reply_')) {
    const parts = text.split(' ');
    if (parts.length >= 2) {
      const messageId = parts[0].replace('/reply_', '');
      const replyText = parts.slice(1).join(' ');
      
      const success = await messageDB.addReply(messageId, replyText);
      
      if (success) {
        await sendTelegramMessage(token, chatId, '✅ پاسخ شما با موفقیت ارسال شد!');
      } else {
        await sendTelegramMessage(token, chatId, '❌ پیام مورد نظر یافت نشد!');
      }
    } else {
      await sendTelegramMessage(token, chatId, 
        '📝 فرمت صحیح پاسخ:\n\n`/reply_123 متن پاسخ شما`\n\n(123 = شماره پیام)'
      );
    }
  }
  
  // مشاهده پیام‌های پاسخ داده نشده
  else if (text === '/messages' || text === '/start') {
    const unreplied = await messageDB.getUnrepliedMessages();
    
    if (unreplied.length === 0) {
      await sendTelegramMessage(token, chatId, '📭 هیچ پیام جدیدی وجود ندارد!');
    } else {
      let response = `📬 پیام‌های پاسخ داده نشده (${unreplied.length}):\n\n`;
      
      unreplied.forEach((msg, index) => {
        response += `🔸 #${msg.id} - ${msg.username} (ID: ${msg.userId})\n`;
        response += `📝 ${msg.message}\n`;
        response += `⏰ ${new Date(msg.timestamp).toLocaleString('fa-IR')}\n`;
        response += `📩 برای پاسخ: /reply_${msg.id} متن پاسخ\n\n`;
      });
      
      await sendTelegramMessage(token, chatId, response);
    }
  }

  // راهنما
  else if (text === '/help') {
    await sendTelegramMessage(token, chatId, 
      `📋 راهنمای مدیریت چت تینا:\n\n` +
      `📬 /messages - مشاهده پیام‌های جدید\n` +
      `📝 /reply_123 - پاسخ به پیام شماره 123\n` +
      `👥 /users - مشاهده کاربران ثبت‌نام شده\n` +
      `ℹ️  /help - نمایش راهنما`
    );
  }

  // مشاهده کاربران
  else if (text === '/users') {
    const users = await messageDB.getAllUsers();
    let response = `👥 کاربران ثبت‌نام شده (${Object.keys(users).length}):\n\n`;
    
    Object.entries(users).forEach(([username, user]) => {
      response += `🔸 ${username} (ID: ${user.id})\n`;
      response += `📅 عضو since: ${new Date(user.createdAt).toLocaleString('fa-IR')}\n`;
      response += `🔐 آخرین ورود: ${new Date(user.lastLogin).toLocaleString('fa-IR')}\n\n`;
    });
    
    await sendTelegramMessage(token, chatId, response);
  }
}

async function sendTelegramMessage(token, chatId, text) {
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
