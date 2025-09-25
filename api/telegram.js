const messageDB = require('./messages');

module.exports = async (req, res) => {
  // تنظیمات CORS کامل
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";

  try {
    if (req.method === 'GET') {
      const { action, user, message } = req.query;

      // API برای وب - دریافت پیام‌های کاربر
      if (action === 'get_messages') {
        const messages = messageDB.getUserMessages(user);
        return res.status(200).json(messages);
      }
      
      // API برای وب - ارسال پیام جدید
      if (action === 'send_message') {
        if (!user || !message) {
          return res.status(400).json({ error: 'Missing parameters: user and message required' });
        }
        
        const newMessage = messageDB.addMessage(user, message, true);
        
        // اطلاع به تلگرام
        await notifyTelegram(token, newMessage);
        
        return res.status(200).json({ 
          status: 'sent', 
          id: newMessage.id,
          message: 'پیام با موفقیت ارسال شد'
        });
      }
      
      // API برای وب - بررسی پاسخ‌ها
      if (action === 'check_replies') {
        if (!user) {
          return res.status(400).json({ error: 'Missing user parameter' });
        }
        
        const userReplies = messageDB.getUserReplies(user);
        return res.status(200).json(userReplies);
      }

      // API برای مشاهده پیام‌های پاسخ داده نشده (برای تلگرام)
      if (action === 'get_unreplied') {
        const unreplied = messageDB.getUnrepliedMessages();
        return res.status(200).json(unreplied);
      }

      return res.status(200).json({ 
        message: 'Tina Chat API - Active',
        timestamp: new Date().toISOString(),
        endpoints: {
          'ارسال پیام': '/api/telegram?action=send_message&user=USERNAME&message=MESSAGE',
          'دریافت پاسخ‌ها': '/api/telegram?action=check_replies&user=USERNAME',
          'پیام‌های پاسخ داده نشده': '/api/telegram?action=get_unreplied'
        }
      });
    }

    if (req.method === 'POST') {
      // پردازش پیام از تلگرام
      let update;
      
      if (req.headers['content-type'] === 'application/json') {
        update = req.body;
      } else {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString();
        }
        update = JSON.parse(body);
      }

      await processTelegramMessage(update, token);
      return res.status(200).json({ status: 'processed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

// اطلاع‌رسانی پیام جدید به تلگرام
async function notifyTelegram(token, message) {
  const text = `💬 پیام جدید از کاربر:\n\n👤 کاربر: ${message.user}\n📝 پیام: ${message.message}\n⏰ زمان: ${new Date(message.timestamp).toLocaleString('fa-IR')}\n\nبرای پاسخ: /reply_${message.id}`;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error notifying Telegram:', error);
    throw error;
  }
}

// پردازش پیام از تلگرام
async function processTelegramMessage(update, token) {
  if (!update?.message?.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text;

  // دستور پاسخ به پیام
  if (text.startsWith('/reply_')) {
    const parts = text.split(' ');
    if (parts.length >= 2) {
      const messageId = parts[0].replace('/reply_', '');
      const replyText = parts.slice(1).join(' ');
      
      const success = messageDB.addReply(messageId, replyText);
      
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
  
  // دستور مشاهده پیام‌های پاسخ داده نشده
  else if (text === '/messages' || text === '/start') {
    const unreplied = messageDB.getUnrepliedMessages();
    
    if (unreplied.length === 0) {
      await sendTelegramMessage(token, chatId, '📭 هیچ پیام جدیدی وجود ندارد!');
    } else {
      let response = `📬 پیام‌های پاسخ داده نشده (${unreplied.length}):\n\n`;
      
      unreplied.forEach((msg, index) => {
        response += `🔸 #${msg.id} - ${msg.user}\n`;
        response += `📝 ${msg.message}\n`;
        response += `⏰ ${new Date(msg.timestamp).toLocaleString('fa-IR')}\n`;
        response += `📩 برای پاسخ: /reply_${msg.id} متن پاسخ\n\n`;
        
        // محدودیت طول پیام تلگرام
        if (index % 3 === 2 && index !== unreplied.length - 1) {
          response += '--- ادامه ---\n\n';
        }
      });
      
      await sendTelegramMessage(token, chatId, response);
    }
  }

  // دستور راهنما
  else if (text === '/help') {
    await sendTelegramMessage(token, chatId, 
      `📋 راهنمای مدیریت چت تینا:\n\n` +
      `📬 /messages - مشاهده پیام‌های جدید\n` +
      `📝 /reply_123 - پاسخ به پیام شماره 123\n` +
      `ℹ️  /help - نمایش این راهنما\n\n` +
      `🌐 کاربران از طریق این لینک پیام می‌فرستند:\n` +
      `https://al1r3z4-b.github.io/tina-assistant/`
    );
  }
}

async function sendTelegramMessage(token, chatId, text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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
    
    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
  }
