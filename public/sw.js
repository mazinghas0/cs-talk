/* eslint-disable no-restricted-globals */

// 서비스 워커 설치 시 즉시 활성화
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// 백그라운드 푸시 이벤트 수신
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const { title, body, icon, data: customData } = data;

        const options = {
            body: body || '새로운 메시지가 도착했습니다.',
            icon: icon || '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [100, 50, 100],
            data: customData || {},
            actions: [
                { action: 'open', title: '보기' },
                { action: 'close', title: '닫기' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(title || 'CS Talk', options)
        );
    } catch (err) {
        console.error('Push Event Error:', err);
    }
});

// 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    // 알림 클릭 시 티켓 상세 페이지로 이동
    const ticketId = event.notification.data?.ticketId;
    const urlToOpen = ticketId ? `${self.location.origin}/ticket/${ticketId}` : self.location.origin;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // 이미 열려있는 창이 있으면 해당 창으로 이동 및 포커스
            for (let client of windowClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // 열려있는 창이 없으면 새 창 열기
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
