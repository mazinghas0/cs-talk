/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// vite-plugin-pwa가 빌드 시 self.__WB_MANIFEST 자동 주입
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// 즉시 활성화
self.skipWaiting();
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// 백그라운드 푸시 수신
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data: { title: string; body: string; tag?: string; url?: string };
    try {
        data = event.data.json();
    } catch {
        data = { title: '새 알림', body: event.data.text() };
    }

    event.waitUntil(
        // 앱이 포그라운드(보이는 상태)면 Phase1이 처리 → SW 알림 스킵
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            const hasVisible = clients.some((c) => c.visibilityState === 'visible');
            if (hasVisible) return;

            return self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: data.tag ?? 'cs-talk',
                data: { url: data.url ?? '/' },
            });
        })
    );
});

// 알림 클릭 시 앱 포커스 or 새창
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url ?? '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ('focus' in client) return (client as WindowClient).focus();
            }
            return self.clients.openWindow(url);
        })
    );
});
