import React, { useState, useRef, useCallback } from 'react';
import './MainLayout.css';
import { MessageSquare, UserCircle, Shield, Download, Layers, UserPlus, Loader2, ChevronLeft, ChevronRight, Sun, Moon, HelpCircle, BarChart2 } from 'lucide-react';
import { TicketList } from '../ticket/TicketList';
import { ChatArea } from '../chat/ChatArea';
import { ProfileSettings } from '../profile/ProfileSettings';
import { AdminPanel } from '../admin/AdminPanel';
import { WorkspaceInviteModal } from '../workspace/WorkspaceInviteModal';
import { ShortcutsModal } from './ShortcutsModal';
import { useTicketStore } from '../../store/ticketStore';
import { useAuthStore } from '../../store/authStore';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { DashboardPanel } from '../dashboard/DashboardPanel';
import { subscribeUserToPush } from '../../utils/pushNotification';

export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [isAdminOpen, setIsAdminOpen] = React.useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = React.useState(false);
    const [isInviteOpen, setIsInviteOpen] = React.useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = React.useState(false);
    const [isDashboardOpen, setIsDashboardOpen] = React.useState(false);

    // iOS 설치 배너
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    const [showIOSBanner, setShowIOSBanner] = React.useState(
        () => isIOS && !isStandalone && !localStorage.getItem('cs_ios_banner_dismissed')
    );

    // 알림 권한 배너
    const [notifPermission, setNotifPermission] = React.useState<NotificationPermission | 'unsupported'>(
        () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
    );
    const [showNotifBanner, setShowNotifBanner] = React.useState(
        () => typeof Notification !== 'undefined' && Notification.permission === 'default' && !localStorage.getItem('cs_notif_banner_dismissed')
    );

    const dismissIOSBanner = () => {
        localStorage.setItem('cs_ios_banner_dismissed', '1');
        setShowIOSBanner(false);
    };

    const dismissNotifBanner = () => {
        localStorage.setItem('cs_notif_banner_dismissed', '1');
        setShowNotifBanner(false);
    };
    const [installPrompt, setInstallPrompt] = React.useState<Event | null>(null);
    const [joinMode, setJoinMode] = useState<'select' | 'create' | 'code'>('select');
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const { selectedTicketId, setSelectedTicketId, fetchTickets } = useTicketStore();
    const { isAdmin, workspaces, currentWorkspace, isLoading, joinWorkspaceByCode, currentWorkspaceRole, user } = useAuthStore();

    const handleRequestNotif = async () => {
        if (typeof Notification === 'undefined') return;
        const result = await Notification.requestPermission();
        setNotifPermission(result);
        setShowNotifBanner(false);
        if (result === 'granted' && user) {
            subscribeUserToPush(user.id);
        }
    };

    // 이미 권한 허용된 경우 자동 구독 등록 (재방문/재설치 대응)
    React.useEffect(() => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && user) {
            subscribeUserToPush(user.id);
        }
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const [isMobile, setIsMobile] = React.useState(
        () => window.matchMedia('(max-width: 1024px)').matches
    );

    // 패널 너비 상태 (데스크탑 전용)
    const SIDEBAR_MIN = 60;
    const SIDEBAR_MAX = 160;
    const LIST_MIN = 200;
    const LIST_MAX = 520;
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem('cs_talk_sidebar_width');
        return saved ? Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, parseInt(saved))) : 80;
    });
    const [listWidth, setListWidth] = useState(() => {
        const saved = localStorage.getItem('cs_talk_list_width');
        return saved ? Math.min(LIST_MAX, Math.max(LIST_MIN, parseInt(saved))) : 320;
    });
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const sidebarWidthBeforeCollapse = useRef(80);

    // 테마 토글
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('cs_talk_theme');
        return saved ? saved === 'dark' : true;
    });

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        localStorage.setItem('cs_talk_theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    type UserStatus = 'online' | 'away' | 'busy';
    const STATUS_CYCLE: UserStatus[] = ['online', 'away', 'busy'];
    const STATUS_LABEL: Record<UserStatus, string> = { online: '온라인', away: '자리비움', busy: '바쁨' };
    const [userStatus, setUserStatus] = useState<UserStatus>(
        () => (localStorage.getItem('cs_talk_status') as UserStatus) || 'online'
    );
    const cycleStatus = useCallback(() => {
        setUserStatus(prev => {
            const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(prev) + 1) % STATUS_CYCLE.length];
            localStorage.setItem('cs_talk_status', next);
            return next;
        });
    }, []);
    const [draggingResizer, setDraggingResizer] = useState<'sidebar' | 'list' | null>(null);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);

    const onResizerMouseDown = useCallback((e: React.MouseEvent, target: 'sidebar' | 'list') => {
        e.preventDefault();
        dragStartX.current = e.clientX;
        dragStartWidth.current = target === 'sidebar' ? sidebarWidth : listWidth;
        setDraggingResizer(target);

        let finalWidth = dragStartWidth.current;

        const onMouseMove = (ev: MouseEvent) => {
            const delta = ev.clientX - dragStartX.current;
            if (target === 'sidebar') {
                finalWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartWidth.current + delta));
                setSidebarWidth(finalWidth);
            } else {
                finalWidth = Math.min(LIST_MAX, Math.max(LIST_MIN, dragStartWidth.current + delta));
                setListWidth(finalWidth);
            }
        };

        const onMouseUp = () => {
            setDraggingResizer(null);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            const key = target === 'sidebar' ? 'cs_talk_sidebar_width' : 'cs_talk_list_width';
            localStorage.setItem(key, String(finalWidth));
        };

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [sidebarWidth, listWidth]);

    const handleSidebarToggle = useCallback(() => {
        if (isSidebarCollapsed) {
            setSidebarWidth(sidebarWidthBeforeCollapse.current);
            setIsSidebarCollapsed(false);
        } else {
            sidebarWidthBeforeCollapse.current = sidebarWidth;
            setSidebarWidth(0);
            setIsSidebarCollapsed(true);
        }
    }, [isSidebarCollapsed, sidebarWidth]);

    React.useEffect(() => {
        const mq = window.matchMedia('(max-width: 1024px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);

        // PWA 설치 안내 프롬프트
        const handleInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleInstallPrompt);

        const handleShortcutKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                setIsShortcutsOpen(v => !v);
            }
        };
        window.addEventListener('keydown', handleShortcutKey);

        return () => {
            mq.removeEventListener('change', handler);
            window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
            window.removeEventListener('keydown', handleShortcutKey);
        };
    }, []);

    // Android 시스템 뒤로가기: 채팅 열려있으면 목록으로, 아니면 기본 동작
    React.useEffect(() => {
        if (!isMobile) return;

        if (selectedTicketId) {
            // 채팅이 열릴 때 더미 히스토리 항목 추가 (뒤로가기 intercept용)
            window.history.pushState({ chatOpen: true }, '');
        }

        const handlePopState = (_e: PopStateEvent) => {
            if (selectedTicketId) {
                // 뒤로가기 → 채팅 닫기
                setSelectedTicketId(null);
                // 히스토리 다시 추가해서 다음 뒤로가기도 intercept
            }
            // selectedTicketId가 없으면 기본 동작 (앱 이탈)
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isMobile, selectedTicketId, setSelectedTicketId]);

    const handleInstallClick = async () => {
        if (!installPrompt) return;
        const prompt = installPrompt as BeforeInstallPromptEvent;
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    };

    const showList = !isMobile || !selectedTicketId;
    const showChat = !isMobile || !!selectedTicketId;

    const handleBack = () => setSelectedTicketId(null);

    const handleJoinByCode = async () => {
        if (!joinCode.trim()) return;
        setIsJoining(true);
        setJoinError('');
        try {
            await joinWorkspaceByCode(joinCode.trim());
            await fetchTickets();
        } catch (err) {
            setJoinError(err instanceof Error ? err.message : '참여에 실패했습니다. 코드를 확인해주세요.');
        } finally {
            setIsJoining(false);
        }
    };

    // 워크스페이스가 없을 때 안내 화면
    if (!isLoading && workspaces.length === 0) {
        return (
            <div className="layout-container empty-workspace-screen">
                <div className="empty-workspace-content">
                    <div className="empty-workspace-icon">CS</div>
                    <p className="empty-workspace-title">아직 팀 공간이 없어요</p>

                    {joinMode === 'select' && (
                        <>
                            <p className="empty-workspace-desc">새 팀을 만들거나, 초대 코드로 기존 팀에 참여하세요.</p>
                            <div className="empty-workspace-actions">
                                <button className="btn-workspace-option btn-create" onClick={() => setJoinMode('create')}>
                                    새 팀 만들기
                                </button>
                                <button className="btn-workspace-option btn-join" onClick={() => setJoinMode('code')}>
                                    초대 코드로 참여
                                </button>
                            </div>
                        </>
                    )}

                    {joinMode === 'create' && (
                        <>
                            <p className="empty-workspace-desc">아래에서 첫 번째 워크스페이스를 만들어보세요.</p>
                            <WorkspaceSwitcher showCreateOnly />
                            <button className="btn-back-select" onClick={() => setJoinMode('select')}>← 뒤로</button>
                        </>
                    )}

                    {joinMode === 'code' && (
                        <>
                            <p className="empty-workspace-desc">팀에서 받은 초대 코드를 입력하세요.</p>
                            <div className="join-code-form">
                                <input
                                    type="text"
                                    className="join-code-input"
                                    placeholder="초대 코드 입력 (예: ABC123)"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    maxLength={10}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                                />
                                {joinError && <p className="join-code-error">{joinError}</p>}
                                <button
                                    className="btn-workspace-option btn-create"
                                    onClick={handleJoinByCode}
                                    disabled={isJoining || !joinCode.trim()}
                                >
                                    {isJoining ? <Loader2 size={16} className="spin" /> : '참여하기'}
                                </button>
                            </div>
                            <button className="btn-back-select" onClick={() => { setJoinMode('select'); setJoinError(''); setJoinCode(''); }}>← 뒤로</button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`layout-container${isMobile ? ' is-mobile' : ''}`} style={{ flexDirection: 'column' }}>

            {/* iOS 설치 안내 배너 */}
            {showIOSBanner && (
                <div className="install-banner ios-banner">
                    <span>
                        Safari에서 <strong>공유 버튼</strong> → <strong>홈 화면에 추가</strong>를 누르면 앱처럼 사용할 수 있어요.
                    </span>
                    <button className="banner-dismiss-btn" onClick={dismissIOSBanner}>✕</button>
                </div>
            )}

            {/* 알림 권한 배너 */}
            {showNotifBanner && notifPermission === 'default' && (
                <div className="install-banner notif-banner">
                    <span>새 메시지 알림을 받으시겠어요?</span>
                    <div className="banner-actions">
                        <button className="banner-allow-btn" onClick={handleRequestNotif}>허용하기</button>
                        <button className="banner-dismiss-btn" onClick={dismissNotifBanner}>✕</button>
                    </div>
                </div>
            )}

            {/* 앱 본체 (배너 아래 나머지 공간) */}
            <div className={`layout-inner${isMobile ? ' is-mobile' : ''}`}>

            {/* 1. 사이드바 (데스크톱 전용) */}
            {!isMobile && (
                <nav className={`pane-sidebar${isSidebarCollapsed ? ' collapsed' : ''}`} style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}>
                    <div className="sidebar-top">
                        <div className="sidebar-logo">CS</div>
                        <div className="divider" style={{ width: '20px', height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }} />
                        <WorkspaceSwitcher showName={sidebarWidth >= 100} />
                        <div className="divider" style={{ width: '20px', height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }} />
                        {isAdmin && (
                            <div className={`sidebar-btn${isAdminOpen ? ' active' : ''}`} onClick={() => setIsAdminOpen(true)}>
                                <Shield size={22} color="var(--accent-primary)" />
                                <span className="sidebar-tooltip">사용자 관리</span>
                            </div>
                        )}
                        {currentWorkspaceRole === 'leader' && (
                            <div className={`sidebar-btn${isDashboardOpen ? ' active' : ''}`} onClick={() => setIsDashboardOpen(true)}>
                                <BarChart2 size={22} color="var(--text-secondary)" />
                                <span className="sidebar-tooltip">워크스페이스 현황</span>
                            </div>
                        )}
                        <div className={`sidebar-btn${isInviteOpen ? ' active' : ''}`} onClick={() => setIsInviteOpen(true)}>
                            <UserPlus size={22} color="var(--text-secondary)" />
                            <span className="sidebar-tooltip">팀원 초대</span>
                        </div>
                        {installPrompt && (
                            <div className="sidebar-btn" onClick={handleInstallClick}>
                                <Download size={22} color="var(--text-secondary)" />
                                <span className="sidebar-tooltip">앱 설치하기</span>
                            </div>
                        )}
                    </div>
                    <div className="sidebar-bottom">
                        <div className={`sidebar-btn${isShortcutsOpen ? ' active' : ''}`} onClick={() => setIsShortcutsOpen(v => !v)}>
                            <HelpCircle size={20} color="var(--text-secondary)" />
                            <span className="sidebar-tooltip">단축키 안내 (Ctrl+/)</span>
                        </div>
                        <div className="sidebar-btn" onClick={() => setIsDarkMode(v => !v)}>
                            {isDarkMode ? <Sun size={20} color="var(--accent-warning)" /> : <Moon size={20} color="var(--accent-primary)" />}
                            <span className="sidebar-tooltip">{isDarkMode ? '라이트 모드' : '다크 모드'}</span>
                        </div>
                        <div className={`sidebar-btn${isSettingsOpen ? ' active' : ''}`} onClick={() => setIsSettingsOpen(true)}>
                            <UserCircle size={30} color="var(--text-primary)" />
                            <span
                                className={`status-dot ${userStatus}`}
                                title={STATUS_LABEL[userStatus]}
                                onClick={(e) => { e.stopPropagation(); cycleStatus(); }}
                            />
                            <span className="sidebar-tooltip">프로필 설정 ({STATUS_LABEL[userStatus]})</span>
                        </div>
                    </div>
                    <div className="sidebar-collapse-btn" onClick={handleSidebarToggle}>
                        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </div>
                </nav>
            )}

            <ProfileSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
            <WorkspaceInviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
            <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
            <DashboardPanel isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} />

            {/* 모바일 워크스페이스 전환 시트 */}
            {isMobile && isWorkspaceOpen && (
                <div
                    className="workspace-mobile-overlay"
                    onClick={() => setIsWorkspaceOpen(false)}
                >
                    <div
                        className="workspace-mobile-sheet"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="workspace-mobile-title">워크스페이스</p>
                        <WorkspaceSwitcher
                            horizontal
                            onSelect={() => setIsWorkspaceOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* 사이드바 접혔을 때 펼치기 탭 */}
            {!isMobile && isSidebarCollapsed && (
                <div className="sidebar-collapse-btn sidebar-expand-tab" onClick={handleSidebarToggle}>
                    <ChevronRight size={14} />
                </div>
            )}

            {/* 사이드바 ↔ 티켓 목록 리사이저 (접힌 상태에서는 숨김) */}
            {!isMobile && !isSidebarCollapsed && (
                <div
                    className={`pane-resizer${draggingResizer === 'sidebar' ? ' dragging' : ''}`}
                    onMouseDown={(e) => onResizerMouseDown(e, 'sidebar')}
                />
            )}

            {/* 2. 티켓 목록 */}
            {showList && (
                <aside className="pane-list" style={!isMobile ? { width: listWidth } : undefined}>
                    <TicketList />
                </aside>
            )}

            {/* 티켓 목록 ↔ 채팅 리사이저 */}
            {!isMobile && (
                <div
                    className={`pane-resizer${draggingResizer === 'list' ? ' dragging' : ''}`}
                    onMouseDown={(e) => onResizerMouseDown(e, 'list')}
                />
            )}

            {/* 3. 채팅 영역 */}
            {showChat && (
                <main className="pane-content">
                    {children || <ChatArea onBack={handleBack} showBack={isMobile} />}
                </main>
            )}

            {/* 모바일 하단 네비게이션 */}
            {isMobile && !selectedTicketId && (
                <nav className="mobile-bottom-nav">
                    <div className="nav-item active">
                        <MessageSquare size={22} />
                        <span>업무</span>
                    </div>
                    <div className="nav-item" onClick={() => setIsWorkspaceOpen(true)}>
                        <Layers size={22} />
                        <span>{currentWorkspace?.name.substring(0, 4) || '공간'}</span>
                    </div>
                    <div className="nav-item" onClick={() => setIsInviteOpen(true)}>
                        <UserPlus size={22} />
                        <span>초대</span>
                    </div>
                    {installPrompt && (
                        <div className="nav-item" onClick={handleInstallClick}>
                            <Download size={22} />
                            <span>앱 설치</span>
                        </div>
                    )}
                    {currentWorkspaceRole === 'leader' && (
                        <div className="nav-item" onClick={() => setIsDashboardOpen(true)}>
                            <BarChart2 size={22} />
                            <span>현황</span>
                        </div>
                    )}
                    {isAdmin && (
                        <div className="nav-item" onClick={() => setIsAdminOpen(true)}>
                            <Shield size={22} />
                            <span>관리</span>
                        </div>
                    )}
                    <div className="nav-item" onClick={() => setIsSettingsOpen(true)}>
                        <UserCircle size={22} />
                        <span>프로필</span>
                    </div>
                </nav>
            )}
            </div> {/* layout-inner */}
        </div>
    );
};

// PWA 설치 프롬프트 타입 (브라우저 표준 미포함이라 별도 선언)
declare global {
    interface BeforeInstallPromptEvent extends Event {
        prompt(): Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    }
}
