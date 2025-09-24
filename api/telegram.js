module.exports = async (req, res) => {
  // تنظیمات CORS برای اجازه دسترسی
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // اگر درخواست OPTIONS باشد (برای CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const token = "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
  
  try {
    const update = req.body;
    console.log('Received update:', JSON.stringify(update));
    
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      
      let response = "";
      
      if (text === "/start") {
        response = `سلام! من تینا هستم 🤖
دستیار شهر کانیلا در ماینکرافت

✨ می‌تونم در مورد:
• قیمت آیتم‌ها
• نقشه شهر کانیلا  
• مأموریت‌ها
• بازی‌های سرگرم کننده
• و هر سوال دیگه‌ای کمک کنم!

برای شروع می‌تونی از منوی پایین انتخاب کنی یا مستقیم سوال بپرسی!`;
      } else if (text === "/help") {
        response = `راهنمایی تینا:

📋 دستورات موجود:
/start - شروع کار با تینا
/help - راهنمایی

🎮 به زودی:
• قیمت آیتم‌ها
• نقشه شهر
• مأموریت‌ها
• بازی‌های سرگرم کننده`;
      } else {
        response = `پیام شما: "${text}"
        
فعلاً نسخه کامل من در حال توسعه است، اما به زودی همه قابلیت‌ها در تلگرام هم فعال میشن! 🌟

می‌تونی از نسخه وب من استفاده کنی:
https://al1r3z4-b.github.io/tina-assistant/`;
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
    }
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
