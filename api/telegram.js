module.exports = async (req, res) => {
  // تنظیمات CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Tina Telegram Bot - Connected to HTML AI',
      status: 'active',
      html_bot_url: 'https://al1r3z4-b.github.io/tina-assistant/Tina2.html'
    });
  }

  if (req.method === 'POST') {
    const token = "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
    
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
            await connectToHTMLBot(update, res, token);
          } catch (error) {
            res.status(400).json({ error: 'Invalid JSON' });
          }
        });
        return;
      }
      
      await connectToHTMLBot(update, res, token);
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

// تابع برای ارتباط با هوش مصنوعی ربات HTML
async function connectToHTMLBot(update, res, token) {
  if (!update?.message) {
    return res.status(200).json({ status: 'ok' });
  }

  const chatId = update.message.chat.id;
  const userMessage = update.message.text || '';
  const firstName = update.message.chat.first_name || 'کاربر';

  console.log(`📨 Message from ${firstName}: ${userMessage}`);

  try {
    // استفاده از هوش مصنوعی مشابه ربات HTML
    const response = await getTinaAIResponse(userMessage, firstName);
    
    // ارسال پاسخ به تلگرام
    await sendTelegramMessage(token, chatId, response);
    
    res.status(200).json({ status: 'success' });
    
  } catch (error) {
    console.error('Error:', error);
    
    // پاسخ fallback در صورت خطا
    await sendTelegramMessage(token, chatId, 
      `⚡ متأسفم! ارتباط با سرور اصلی برقرار نشد.\n\nپیام شما: "${userMessage}"\n\nلطفاً کمی بعد مجدداً تلاش کنید.`
    );
    
    res.status(200).json({ status: 'fallback_used' });
  }
}

// هسته هوش مصنوعی - کاملاً مشابه ربات HTML
async function getTinaAIResponse(message, userName) {
  const lowerMessage = message.toLowerCase();
  
  // دیتابیس قیمت‌ها (مشابه ربات HTML)
  const itemPrices = {
    "الماس": "20 جم",
    "شمشیر الماسی": "20 جم", 
    "شمشیر آهنی": "10 جم",
    "شمشیر سنگی": "5 جم",
    "گوشت گاو": "1 جم",
    "گوشت پخته": "2 جم",
    "ابزار الماسی": "25 جم",
    "ابزار آهنی": "12 جم",
    "زره الماسی": "25 جم (هر قطعه)",
    "سیب": "1 جم",
    "نان": "1 جم",
    "بلوک": "1 جم (برای 3 عدد)",
    "بذر": "3-12 جم",
    "کوره": "5 جم",
    "سپر": "8 جم"
  };

  // تشخیص نوع سوال و پاسخ‌دهی هوشمند
  if (lowerMessage.includes("قیمت") || lowerMessage.includes("چنده") || lowerMessage.includes("هزینه")) {
    for (const [item, price] of Object.entries(itemPrices)) {
      if (lowerMessage.includes(item.toLowerCase())) {
        return `💰 قیمت ${item} در فروشگاه کانیلا: ${price}\n\nمی‌تونی برای خرید به فروشگاه مرکزی شهر مراجعه کنی!`;
      }
    }
    return `📊 لیست قیمت‌های مهم:\n\n` +
           Object.entries(itemPrices).map(([item, price]) => `• ${item}: ${price}`).join('\n') +
           `\n\nبرای قیمت دقیق‌تر، نام آیتم رو بپرس!`;
  }

  if (lowerMessage.includes("سلام") || lowerMessage.includes("/start")) {
    const greetings = [
      `سلام ${userName} عزیز! به شهر کانیلا خوش آمدی! 🤗`,
      `درود ${userName}! من تینا هستم، دستیار شهر کانیلا.`,
      `سلام! خوبی؟ چطور می‌تونم کمک کنم؟`
    ];
    return greetings[Math.floor(Math.random() * greetings.length)] +
           `\n\nمی‌تونی در مورد قیمت آیتم‌ها، نقشه شهر یا مأموریت‌ها سوال بپرسی!`;
  }

  if (lowerMessage.includes("کانیلا") || lowerMessage.includes("شهر")) {
    return `🏰 شهر کانیلا:\n\n` +
           `• بانک مرکزی\n• فروشگاه مرکزی\n• مزرعه عمومی\n• قلعه تاریخی\n• کتابخانه\n\n` +
           `مختصات: X: 120, Y: 64, Z: -350\n` +
           `می‌تونی از منوی نقشه استفاده کنی!`;
  }

  if (lowerMessage.includes("کمک") || lowerMessage.includes("راهنما") || lowerMessage.includes("/help")) {
    return `📋 راهنمای تینا:\n\n` +
           `🎮 می‌تونم در مورد:\n` +
           `• قیمت آیتم‌ها (بپرس: "قیمت الماس")\n` +
           `• نقشه شهر کانیلا\n` +
           `• مکان‌های مهم\n` +
           `• مأموریت‌ها\n` +
           `• قوانین شهر\n\n` +
           `🌐 نسخه کامل: https://al1r3z4-b.github.io/tina-assistant/Tina2.html`;
  }

  if (lowerMessage.includes("مأموریت") || lowerMessage.includes("quest")) {
    return `🎯 مأموریت‌های فعال:\n\n` +
           `1. گشت‌زنی در شهر (۱۰ امتیاز)\n` +
           `2. جمع‌آوری منابع (۱۵ امتیاز)\n` +
           `3. کمک به شهروندان (۲۰ امتیاز)\n\n` +
           `برای شروع مأموریت به میدان اصلی شهر برو!`;
  }

  if (lowerMessage.includes("فروشگاه") || lowerMessage.includes("خرید")) {
    return `🛍️ فروشگاه کانیلا:\n\n` +
           `📍 مکان: مرکز شهر، جنب قلعه\n` +
           `⏰ ساعت کاری: 24/7\n` +
           `💰 سیستم خرید اقساطی موجود\n\n` +
           `همه آیتم‌های ماینکرافت با قیمت مناسب!`;
  }

  // پاسخ‌های عمومی هوشمند
  const smartResponses = [
    `سوال جالبی پرسیدی! می‌تونی در مورد قیمت آیتم‌ها یا مکان‌های شهر بپرسی.`,
    `هنوز این قابلیت رو کامل ندارم، اما می‌تونم در مورد شهر کانیلا کمک کنم!`,
    `جوابتو نمی‌دونم، اما می‌تونی ازم بپرسی: "قیمت الماس" یا "نقشه شهر"`,
    `برای اطلاعات بیشتر به نسخه وب من سر بزن: https://al1r3z4-b.github.io/tina-assistant/Tina2.html`,
    `می‌خوای بازی کنی؟ نسخه وب من بازی‌های سرگرم کننده داره!`
  ];

  return smartResponses[Math.floor(Math.random() * smartResponses.length)];
}

// تابع ارسال پیام به تلگرام
async function sendTelegramMessage(token, chatId, text) {
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
  
  const result = await response.json();
  if (!result.ok) {
    throw new Error(result.description);
  }
  return result;
}
