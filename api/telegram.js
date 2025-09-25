const messageDB = require('./messages');

module.exports = async (req, res) => {
  // تنظیمات CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const token = "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";

  if (req.method === 'GET') {
    // API برای وب - دریافت پیام‌ها
    if (req.query.action === 'get_messages') {
      const messages = messageDB.getAllMessages();
      return res.status(200).json(messages);
    }
    
    // API برای وب - ارسال پیام جدید
    if (req.query.action === 'send_message') {
      const { user, message } = req.query;
      if (!user || !message) {
        return res.status(400).json({ error: 'Missing parameters' });
      }
      
      const newMessage = messageDB.addMessage(user, message, true);
      
      // اطلاع به تلگرام
      await notifyTelegram(token, newMessage);
      
      return res.status(200).json({ status: 'sent', id: newMessage.id });
    }
    
    // API برای وب - بررسی پاسخ‌ها
    if (req.query.action === 'check_replies') {
      const messages = messageDB.getAllMessages();
      const userMessages = messages.filter(msg => msg.user === req.query.user && msg.replied);
      return res.status(200).json(userMessages);
    }

    return res.status(200).json({ 
      message: 'Tina Chat API',
      endpoints: {
        'برای ارسال پیام': '/api/telegram?action=send_message&user=USERNAME&message=MESSAGE',
        'برای دریافت پاسخ‌ها': '/api/telegram?action=check_replies&user=USERNAME'
      }
    });
  }

  if (req.method === 'POST') {
    // پردازش پیام از تلگرام (پاسخ شما)
    try {
      let update;
      if (typeof req.body === 'object') {
        update = req.body;
      } else {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          try {
            update = JSON.parse(body);
            await processTelegramMessage(update, res, token);
          } catch (error) {
            res.status(400).json({ error: 'Invalid JSON' });
          }
        });
        return;
      }
      
      await processTelegramMessage(update, res, token);
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

// اطلاع‌رسانی پیام جدید به تلگرام
async function notifyTelegram(token, message) {
  const text = `💬 پیام جدید از کاربر:\n\n👤 کاربر: ${message.user}\n📝 پیام: ${message.message}\n⏰ زمان: ${new Date(message.timestamp).toLocaleString('fa-IR')}\n\nبرای پاسخ: /reply_${message.id}`;
  
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: 222666092, // چت آی دی شما
      text: text,
      parse_mode: 'Markdown'
    })
  });
}

// پردازش پیام از تلگرام
async function processTelegramMessage(update, res, token) {
  if (!update?.message) return res.status(200).json({ status: 'ok' });

  const chatId = update.message.chat.id;
  const text = update.message.text || '';

  // دستور پاسخ به پیام
  if (text.startsWith('/reply_')) {
    const parts = text.split(' ');
    if (parts.length >= 3) {
      const messageId = parseInt(parts[0].replace('/reply_', ''));
      const replyText = parts.slice(1).join(' ');
      
      if (messageDB.addReply(messageId, replyText)) {
        await sendTelegramMessage(token, chatId, '✅ پاسخ شما ارسال شد!');
      } else {
        await sendTelegramMessage(token, chatId, '❌ پیام مورد نظر یافت نشد!');
      }
    } else {
      await sendTelegramMessage(token, chatId, 
        '📝 فرمت پاسخ:\n/reply_123 متن پاسخ شما\n\n(123 = شماره پیام)'
      );
    }
  }
  
  // دستور مشاهده پیام‌ها
  else if (text === '/messages') {
    const unreplied = messageDB.getUnrepliedMessages();
    if (unreplied.length === 0) {
      await sendTelegramMessage(token, chatId, '📭 هیچ پیام جدیدی وجود ندارد!');
    } else {
      let response = `📬 پیام‌های پاسخ داده نشده (${unreplied.length}):\n\n`;
      unreplied.forEach(msg => {
        response += `🔸 #${msg.id} - ${msg.user}: ${msg.message}\n`;
        response += `⏰ ${new Date(msg.timestamp).toLocaleString('fa-IR')}\n`;
        response += `📝 برای پاسخ: /reply_${msg.id} متن پاسخ\n\n`;
      });
      await sendTelegramMessage(token, chatId, response);
    }
  }

  else if (text === '/start') {
    await sendTelegramMessage(token, chatId, 
      `👨‍💼 پنل مدیریت چت تینا\n\n` +
      `دستورات:\n` +
      `📬 /messages - مشاهده پیام‌های جدید\n` +
      `📝 /reply_123 متن - پاسخ به پیام\n` +
      `ℹ️  /help - راهنما`
    );
  }

  else if (text === '/help') {
    await sendTelegramMessage(token, chatId, 
      `📋 راهنمای مدیریت چت:\n\n` +
      `1. کاربران در وب به آدرس زیر پیام می‌فرستند:\n` +
      `https://al1r3z4-b.github.io/tina-assistant/Tina2.html\n\n` +
      `2. شما پیام‌ها را اینجا می‌بینید\n` +
      `3. با /reply پاسخ می‌دهید\n` +
      `4. کاربر پاسخ را در وب می‌بیند`
    );
  }

  res.status(200).json({ status: 'processed' });
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
