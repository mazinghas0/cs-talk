import React from 'react';
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
import { useLayoutState, STATUS_LABEL } from '../../hooks/useLayoutState';

export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const { selectedTicketId, setSelectedTicketId, fetchTickets } = useTicketStore();
    const { isAdmin, workspaces, currentWorkspace, isLoading, joinWorkspaceByCode, currentWorkspaceRole, user, profile } = useAuthStore();

    const {
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
    } = useLayoutState({
        selectedTicketId,
        setSelectedTicketId,
        fetchTickets,
        joinWorkspaceByCode,
        userId: user?.id,
    });

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
                            <button className="btn-back-select" onClick={resetJoinFlow}>← 뒤로</button>
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
                        <button className="banner-allow-btn" onClick={requestNotificationPermission}>허용하기</button>
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
                            <div className="sidebar-btn" onClick={() => triggerInstallPrompt()}>
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
                        <div className={`sidebar-btn sidebar-profile-btn${isSettingsOpen ? ' active' : ''}`} onClick={() => setIsSettingsOpen(true)}>
                            <UserCircle size={30} color="var(--text-primary)" style={{ flexShrink: 0 }} />
                            <span
                                className={`status-dot ${userStatus}`}
                                title={STATUS_LABEL[userStatus]}
                                onClick={(e) => { e.stopPropagation(); cycleStatus(); }}
                            />
                            {sidebarWidth >= 100 && (
                                <div className="sidebar-profile-info">
                                    <span className="sidebar-profile-name">{profile?.full_name || user?.email?.split('@')[0] || '나'}</span>
                                    <span className="sidebar-profile-email">{user?.email || ''}</span>
                                </div>
                            )}
                            <span className="sidebar-tooltip">프로필 설정 ({STATUS_LABEL[userStatus]})</span>
                        </div>
                    </div>
                    <div className="sidebar-collapse-btn" onClick={toggleSidebar}>
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
                <div className="workspace-mobile-overlay" onClick={() => setIsWorkspaceOpen(false)}>
                    <div className="workspace-mobile-sheet" onClick={(e) => e.stopPropagation()}>
                        <p className="workspace-mobile-title">워크스페이스</p>
                        <WorkspaceSwitcher horizontal onSelect={() => setIsWorkspaceOpen(false)} />
                    </div>
                </div>
            )}

            {/* 사이드바 접혔을 때 펼치기 탭 */}
            {!isMobile && isSidebarCollapsed && (
                <div className="sidebar-collapse-btn sidebar-expand-tab" onClick={toggleSidebar}>
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
                        <div className="nav-item" onClick={() => triggerInstallPrompt()}>
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
