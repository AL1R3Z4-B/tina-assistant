module.exports = async (req, res) => {
  // تنظیمات CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // هندل کردن درخواست OPTIONS برای CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const token = "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
  
  try {
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);
    
    let update;
    if (req.method === 'POST') {
      // اگر body به صورت JSON است
      if (typeof req.body === 'object') {
        update = req.body;
      } 
      // اگر body به صورت string است
      else if (typeof req.body === 'string') {
        update = JSON.parse(req.body);
      }
      // اگر body undefined است (از raw data استفاده کن)
      else {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          update = JSON.parse(body);
          processUpdate(update, res, token);
        });
        return;
      }
    } else if (req.method === 'GET') {
      // برای تست - پاسخ ساده برگردان
      return res.status(200).json({ 
        message: 'Tina Telegram Bot is running!',
        status: 'active',
        webhook: 'Ready to receive messages from Telegram'
      });
    }
    
    await processUpdate(update, res, token);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Check Vercel function logs for more information'
    });
  }
};

async function processUpdate(update, res, token) {
  console.log('Received update:', JSON.stringify(update, null, 2));
  
  if (update && update.message) {
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    let response = "";
    
    if (text === "/start") {
      response = `سلام! من تینا هستم 🤖
دستیار شهر کانیلا در ماینکرافت

✅ اتصال با سرور برقرار شد!
✨ به زودی همه قابلیت‌ها فعال می‌شوند.

فعلاً می‌تونی:
• /start - وضعیت ربات
• /help - راهنمایی

نسخه کامل وب: https://al1r3z4-b.github.io/tina-assistant/`;
    } else if (text === "/help") {
      response = `راهنمایی تینا:

📞 پشتیبانی فنی فعال شد!
ربات الآن به درستی به سرور متصل است.

🔄 به روزرسانی‌های آینده:
• سیستم قیمت‌گذاری
• نقشه شهر کانیلا
• مأموریت‌ها و بازی‌ها`;
    } else if (text) {
      response = `پیام شما: "${text}"
      
✅ ربات فعال است! اتصال سرور برقرار شد.
به زودی قابلیت چت کامل اضافه می‌شود.`;
    } else {
      response = "پیامی دریافت نشد!";
    }
    
    // ارسال پاسخ به تلگرام
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: response
      })
    });
    
    const result = await telegramResponse.json();
    console.log('Telegram API response:', result);
    
    res.status(200).json({ 
      status: 'success',
      message: 'Response sent to Telegram',
      chatId: chatId
    });
    
  } else {
    res.status(200).json({ 
      status: 'success',
      message: 'No message to process',
      update: update
    });
  }
}
