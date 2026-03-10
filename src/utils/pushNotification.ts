/**
 * PWA 푸시 알림 권한 및 핸들링 유틸리티
 */

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('이 브라우저는 알림을 지원하지 않습니다.');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

export const subscribeUserToPush = async () => {
    try {
        const registration = await navigator.serviceWorker.ready;

        // 브라우저에서 서버로 보낼 구독 정보(Subscription Object) 생성
        // 실제 VAPID 키가 필요하지만, 데모/MVP 단계에서는 클라이언트 권한 획득 위주로 구성
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || '')
        });

        console.log('Push Subscription:', JSON.stringify(subscription));
        return subscription;
    } catch (err) {
        console.error('Failed to subscribe user to push:', err);
        return null;
    }
};

// VAPID 키 변환 도우미 함수
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

/**
 * 인앱 수동 알림 (브라우저가 포커스된 상태일 때 사용)
 */
export const showInAppNotification = (title: string, body: string, ticketId?: string) => {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/icon-192.png',
            tag: ticketId
        });
    }
};
