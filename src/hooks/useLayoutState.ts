import React, { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeUserToPush } from '../utils/pushNotification';

export type JoinMode = 'select' | 'create' | 'code';
export type UserStatus = 'online' | 'away' | 'busy';
export type ResizerTarget = 'sidebar' | 'list';
export type NotificationPermissionState = NotificationPermission | 'unsupported';

const MOBILE_MEDIA_QUERY = '(max-width: 1024px)';
const IOS_BANNER_KEY = 'cs_ios_banner_dismissed';
const NOTIF_BANNER_KEY = 'cs_notif_banner_dismissed';
const THEME_KEY = 'cs_talk_theme';
const STATUS_KEY = 'cs_talk_status';
const SIDEBAR_WIDTH_KEY = 'cs_talk_sidebar_width';
const LIST_WIDTH_KEY = 'cs_talk_list_width';

const SIDEBAR_MIN = 60;
const SIDEBAR_MAX = 160;
const LIST_MIN = 200;
const LIST_MAX = 520;
const DEFAULT_SIDEBAR_WIDTH = 80;
const DEFAULT_LIST_WIDTH = 320;
const STATUS_CYCLE: UserStatus[] = ['online', 'away', 'busy'];

export const STATUS_LABEL: Record<UserStatus, string> = {
    online: '온라인',
    away: '자리비움',
    busy: '바쁨',
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function readStoredNumber(key: string, fallback: number, min: number, max: number) {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = parseInt(stored, 10);
    if (isNaN(parsed)) return fallback;
    return clamp(parsed, min, max);
}

function detectIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function detectStandalone() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

export interface UseLayoutStateParams {
    selectedTicketId: string | null;
    setSelectedTicketId: (id: string | null) => void;
    fetchTickets: () => Promise<void>;
    joinWorkspaceByCode: (code: string) => Promise<unknown>;
    userId?: string;
}

export interface UseLayoutStateResult {
    isSettingsOpen: boolean;
    setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isAdminOpen: boolean;
    setIsAdminOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isWorkspaceOpen: boolean;
    setIsWorkspaceOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isInviteOpen: boolean;
    setIsInviteOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isShortcutsOpen: boolean;
    setIsShortcutsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isDashboardOpen: boolean;
    setIsDashboardOpen: React.Dispatch<React.SetStateAction<boolean>>;
    showIOSBanner: boolean;
    dismissIOSBanner: () => void;
    notifPermission: NotificationPermissionState;
    showNotifBanner: boolean;
    dismissNotifBanner: () => void;
    requestNotificationPermission: () => Promise<void>;
    installPrompt: Event | null;
    triggerInstallPrompt: () => Promise<void>;
    joinMode: JoinMode;
    setJoinMode: React.Dispatch<React.SetStateAction<JoinMode>>;
    joinCode: string;
    setJoinCode: React.Dispatch<React.SetStateAction<string>>;
    joinError: string;
    isJoining: boolean;
    handleJoinByCode: () => Promise<void>;
    resetJoinFlow: () => void;
    isMobile: boolean;
    sidebarWidth: number;
    listWidth: number;
    isSidebarCollapsed: boolean;
    toggleSidebar: () => void;
    draggingResizer: ResizerTarget | null;
    onResizerMouseDown: (event: React.MouseEvent, target: ResizerTarget) => void;
    isDarkMode: boolean;
    setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    userStatus: UserStatus;
    cycleStatus: () => void;
    showList: boolean;
    showChat: boolean;
    handleBack: () => void;
}

export function useLayoutState({
    selectedTicketId,
    setSelectedTicketId,
    fetchTickets,
    joinWorkspaceByCode,
    userId,
}: UseLayoutStateParams): UseLayoutStateResult {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);

    const [showIOSBanner, setShowIOSBanner] = useState(
        () => detectIOS() && !detectStandalone() && !localStorage.getItem(IOS_BANNER_KEY)
    );
    const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(
        () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
    );
    const [showNotifBanner, setShowNotifBanner] = useState(
        () =>
            typeof Notification !== 'undefined' &&
            Notification.permission === 'default' &&
            !localStorage.getItem(NOTIF_BANNER_KEY)
    );
    const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

    const [joinMode, setJoinMode] = useState<JoinMode>('select');
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_MEDIA_QUERY).matches);
    const [sidebarWidth, setSidebarWidth] = useState(() =>
        readStoredNumber(SIDEBAR_WIDTH_KEY, DEFAULT_SIDEBAR_WIDTH, SIDEBAR_MIN, SIDEBAR_MAX)
    );
    const [listWidth, setListWidth] = useState(() =>
        readStoredNumber(LIST_WIDTH_KEY, DEFAULT_LIST_WIDTH, LIST_MIN, LIST_MAX)
    );
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const sidebarWidthBeforeCollapse = useRef(DEFAULT_SIDEBAR_WIDTH);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);
    const [draggingResizer, setDraggingResizer] = useState<ResizerTarget | null>(null);

    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        const stored = localStorage.getItem(THEME_KEY);
        return stored ? stored === 'dark' : true;
    });
    const [userStatus, setUserStatus] = useState<UserStatus>(
        () => (localStorage.getItem(STATUS_KEY) as UserStatus) || 'online'
    );

    const dismissIOSBanner = useCallback(() => {
        localStorage.setItem(IOS_BANNER_KEY, '1');
        setShowIOSBanner(false);
    }, []);

    const dismissNotifBanner = useCallback(() => {
        localStorage.setItem(NOTIF_BANNER_KEY, '1');
        setShowNotifBanner(false);
    }, []);

    const requestNotificationPermission = useCallback(async () => {
        if (typeof Notification === 'undefined') return;
        const result = await Notification.requestPermission();
        setNotifPermission(result);
        setShowNotifBanner(false);
        if (result === 'granted' && userId) {
            subscribeUserToPush(userId);
        }
    }, [userId]);

    useEffect(() => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && userId) {
            subscribeUserToPush(userId);
        }
    }, [userId]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const cycleStatus = useCallback(() => {
        setUserStatus((prev) => {
            const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(prev) + 1) % STATUS_CYCLE.length];
            localStorage.setItem(STATUS_KEY, next);
            return next;
        });
    }, []);

    const onResizerMouseDown = useCallback(
        (event: React.MouseEvent, target: ResizerTarget) => {
            event.preventDefault();
            dragStartX.current = event.clientX;
            dragStartWidth.current = target === 'sidebar' ? sidebarWidth : listWidth;
            setDraggingResizer(target);

            let finalWidth = dragStartWidth.current;

            const onMouseMove = (moveEvent: MouseEvent) => {
                const delta = moveEvent.clientX - dragStartX.current;
                if (target === 'sidebar') {
                    finalWidth = clamp(dragStartWidth.current + delta, SIDEBAR_MIN, SIDEBAR_MAX);
                    setSidebarWidth(finalWidth);
                } else {
                    finalWidth = clamp(dragStartWidth.current + delta, LIST_MIN, LIST_MAX);
                    setListWidth(finalWidth);
                }
            };

            const onMouseUp = () => {
                setDraggingResizer(null);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
                const storageKey = target === 'sidebar' ? SIDEBAR_WIDTH_KEY : LIST_WIDTH_KEY;
                localStorage.setItem(storageKey, String(finalWidth));
            };

            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        },
        [sidebarWidth, listWidth]
    );

    const toggleSidebar = useCallback(() => {
        if (isSidebarCollapsed) {
            setSidebarWidth(sidebarWidthBeforeCollapse.current);
            setIsSidebarCollapsed(false);
        } else {
            sidebarWidthBeforeCollapse.current = sidebarWidth;
            setSidebarWidth(0);
            setIsSidebarCollapsed(true);
        }
    }, [isSidebarCollapsed, sidebarWidth]);

    useEffect(() => {
        const mq = window.matchMedia(MOBILE_MEDIA_QUERY);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);

        const handleInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        const handleShortcutKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                setIsShortcutsOpen((v) => !v);
            }
        };

        window.addEventListener('beforeinstallprompt', handleInstallPrompt);
        window.addEventListener('keydown', handleShortcutKey);

        return () => {
            mq.removeEventListener('change', handler);
            window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
            window.removeEventListener('keydown', handleShortcutKey);
        };
    }, []);

    useEffect(() => {
        if (!isMobile) return;

        if (selectedTicketId) {
            window.history.pushState({ chatOpen: true }, '');
        }

        const handlePopState = () => {
            if (selectedTicketId) {
                setSelectedTicketId(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isMobile, selectedTicketId, setSelectedTicketId]);

    const triggerInstallPrompt = useCallback(async () => {
        if (!installPrompt) return;
        const prompt = installPrompt as BeforeInstallPromptEvent;
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    }, [installPrompt]);

    const handleBack = useCallback(() => {
        setSelectedTicketId(null);
    }, [setSelectedTicketId]);

    const handleJoinByCode = useCallback(async () => {
        if (!joinCode.trim()) return;
        setIsJoining(true);
        setJoinError('');
        try {
            await joinWorkspaceByCode(joinCode.trim().toUpperCase());
            await fetchTickets();
        } catch (err) {
            setJoinError(err instanceof Error ? err.message : '참여에 실패했습니다. 코드를 확인해주세요.');
        } finally {
            setIsJoining(false);
        }
    }, [fetchTickets, joinCode, joinWorkspaceByCode]);

    const resetJoinFlow = useCallback(() => {
        setJoinMode('select');
        setJoinCode('');
        setJoinError('');
    }, []);

    const showList = !isMobile || !selectedTicketId;
    const showChat = !isMobile || !!selectedTicketId;

    return {
        isSettingsOpen, setIsSettingsOpen,
        isAdminOpen, setIsAdminOpen,
        isWorkspaceOpen, setIsWorkspaceOpen,
        isInviteOpen, setIsInviteOpen,
        isShortcutsOpen, setIsShortcutsOpen,
        isDashboardOpen, setIsDashboardOpen,
        showIOSBanner, dismissIOSBanner,
        notifPermission, showNotifBanner, dismissNotifBanner, requestNotificationPermission,
        installPrompt, triggerInstallPrompt,
        joinMode, setJoinMode, joinCode, setJoinCode, joinError, isJoining, handleJoinByCode, resetJoinFlow,
        isMobile, sidebarWidth, listWidth, isSidebarCollapsed, toggleSidebar,
        draggingResizer, onResizerMouseDown,
        isDarkMode, setIsDarkMode,
        userStatus, cycleStatus,
        showList, showChat, handleBack,
    };
}

declare global {
    interface BeforeInstallPromptEvent extends Event {
        prompt(): Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    }
}
