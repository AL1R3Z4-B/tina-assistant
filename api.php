<?php
$token = "6270825914:AAG-zWoqrIDmsztk2RjDyv68eMhqcAU9Us4";
$website = "https://api.telegram.org/bot".$token;

$input = file_get_contents('php://input');
$update = json_decode($input, TRUE);

$chatId = $update['message']['chat']['id'];
$message = $update['message']['text'];

// پاسخ ساده
if ($message == "/start") {
    $response = "سلام! من تینا هستم 🤖\nدستیار شهر کانیلا در ماینکرافت\n\nمی‌تونم در مورد:\n• قیمت آیتم‌ها\n• نقشه شهر\n• مأموریت‌ها\n• و هر سوال دیگه‌ای کمک کنم!";
} else {
    $response = "پیام شما: \"$message\"\n\nمتأسفانه فعلاً فقط در نسخه وب کامل کار می‌کنم. به زودی به تلگرام هم میام! 🚀";
}

$sendMessage = $website . "/sendMessage?chat_id=" . $chatId . "&text=" . urlencode($response);
file_get_contents($sendMessage);

echo "OK";
?>
