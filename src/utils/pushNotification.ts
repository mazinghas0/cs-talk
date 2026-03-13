/**
 * PWA 푸시 알림 권한 및 구독 유틸리티
 */

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('이 브라우저는 알림을 지원하지 않습니다.');
        return false;
    }

    if (Notification.permission === 'granted') return true;

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

/**
 * 브라우저 Push 구독 생성 후 Supabase DB에 저장
 * 권한 허용 시 자동 호출됨
 */
export const subscribeUserToPush = async (userId: string): Promise<void> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
        console.warn('VITE_VAPID_PUBLIC_KEY가 설정되지 않았습니다.');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        const sub = subscription.toJSON();
        const p256dh = sub.keys?.p256dh;
        const auth = sub.keys?.auth;
        if (!p256dh || !auth) return;

        const { supabase } = await import('../lib/supabase');
        await supabase.from('push_subscriptions').upsert({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh,
            auth,
        }, { onConflict: 'endpoint' });

    } catch (err) {
        console.error('Push 구독 실패:', err);
    }
};

/**
 * 인앱 알림 (Phase 1 — 앱이 열려 있을 때)
 */
export const showInAppNotification = (title: string, body: string, ticketId?: string) => {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/icon-192.png',
            tag: ticketId,
        });
    }
};

// VAPID 키 변환 도우미
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
