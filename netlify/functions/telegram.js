exports.handler = async (event) => {
  const token = "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
  
  try {
    const body = JSON.parse(event.body);
    
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;
      
      let response = "";
      
      if (text === "/start") {
        response = `سلام! من تینا هستم 🤖\nدستیار شهر کانیلا`;
      } else {
        response = `پیام شما: "${text}"`;
      }
      
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: response })
      });
    }
    
    return { statusCode: 200, body: JSON.stringify({ status: 'success' }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
