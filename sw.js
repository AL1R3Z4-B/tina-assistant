// Service Worker برای Push Notification
const CACHE_NAME = 'tina-assistant-v2';

// نصب Service Worker
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installed');
  self.skipWaiting();
});

// فعال‌سازی Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// مدیریت Push Notification
self.addEventListener('push', (event) => {
  console.log('📩 Push event received', event);
  
  if (!event.data) {
    console.log('📭 No push data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📨 Push data:', data);
    
    const options = {
      body: data.body || 'پیام جدید از پشتیبانی',
      icon: '/tina-assistant/images/icon-192x192.png',
      badge: '/tina-assistant/images/icon-72x72.png',
      image: '/tina-assistant/images/icon-512x512.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'tina-support',
      renotify: true,
      requireInteraction: true,
      data: {
        url: data.url || '/tina-assistant/',
        action: 'support'
      },
      actions: [
        {
          action: 'open',
          title: '📩 مشاهده پیام'
        },
        {
          action: 'close',
          title: '❌ بستن'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'تینا - پیام جدید', options)
        .then(() => console.log('✅ Notification shown'))
        .catch(err => console.error('❌ Notification error:', err))
    );
  } catch (error) {
    console.error('❌ Push data parsing error:', error);
    
    // نمایش نوتیفیکیشن پیش‌فرض
    const options = {
      body: 'پیام جدید از پشتیبانی تینا',
      icon: '/tina-assistant/images/icon-192x192.png',
      tag: 'tina-support',
      requireInteraction: true
    };
    
    event.waitUntil(
      self.registration.showNotification('تینا - پیام جدید 📩', options)
    );
  }
});

// مدیریت کلیک روی نوتیفیکیشن
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked', event);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ 
        type: 'window',
        includeUncontrolled: true
      }).then((clientList) => {
        console.log('🔍 Found clients:', clientList.length);
        
        // اگر تب باز هست، فوکوس کن
        for (const client of clientList) {
          if (client.url.includes('tina-assistant') && 'focus' in client) {
            console.log('🎯 Focusing existing client');
            
            // ارسال پیام به تب باز برای رفتن به پشتیبانی
            if (client.postMessage) {
              client.postMessage({
                type: 'SHOW_SUPPORT',
                data: { force: true }
              });
            }
            
            return client.focus();
          }
        }
        
        // اگر تب باز نیست، تب جدید باز کن
        if (clients.openWindow) {
          console.log('🚀 Opening new window');
          return clients.openWindow('/tina-assistant/');
        }
      })
    );
  }
});

// دریافت پیام از صفحه اصلی
self.addEventListener('message', (event) => {
  console.log('📨 Message received in SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
