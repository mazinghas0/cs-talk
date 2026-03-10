import React from 'react';
import './MainLayout.css';
import { MessageSquare, UserCircle, Shield, Download, Layers, UserPlus } from 'lucide-react';
import { TicketList } from '../ticket/TicketList';
import { ChatArea } from '../chat/ChatArea';
import { ProfileSettings } from '../profile/ProfileSettings';
import { AdminPanel } from '../admin/AdminPanel';
import { WorkspaceInviteModal } from '../workspace/WorkspaceInviteModal';
import { useTicketStore } from '../../store/ticketStore';
import { useAuthStore } from '../../store/authStore';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [isAdminOpen, setIsAdminOpen] = React.useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = React.useState(false);
    const [isInviteOpen, setIsInviteOpen] = React.useState(false);
    const [installPrompt, setInstallPrompt] = React.useState<Event | null>(null);
    const { selectedTicketId, setSelectedTicketId } = useTicketStore();
    const { isAdmin, workspaces, currentWorkspace, isLoading } = useAuthStore();

    const [isMobile, setIsMobile] = React.useState(
        () => window.matchMedia('(max-width: 768px)').matches
    );

    React.useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);

        // PWA 설치 안내 프롬프트
        const handleInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleInstallPrompt);

        return () => {
            mq.removeEventListener('change', handler);
            window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
        };
    }, []);

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

    // 워크스페이스가 없을 때 안내 화면
    if (!isLoading && workspaces.length === 0) {
        return (
            <div className="layout-container empty-workspace-screen">
                <div className="empty-workspace-content">
                    <div className="empty-workspace-icon">🗂️</div>
                    <p className="empty-workspace-title">아직 팀 공간이 없어요</p>
                    <p className="empty-workspace-desc">아래에서 첫 번째 워크스페이스를 만들어보세요.</p>
                    <WorkspaceSwitcher showCreateOnly />
                </div>
            </div>
        );
    }

    return (
        <div className={`layout-container${isMobile ? ' is-mobile' : ''}`}>

            {/* 1. 사이드바 (데스크톱 전용) */}
            {!isMobile && (
                <nav className="pane-sidebar">
                    <div className="sidebar-top">
                        <div className="sidebar-logo">CS</div>
                        <div className="divider" style={{ width: '20px', height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }} />
                        <WorkspaceSwitcher />
                        <div className="divider" style={{ width: '20px', height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }} />
                        {isAdmin && (
                            <Shield
                                size={22}
                                color="var(--accent-primary)"
                                style={{ cursor: 'pointer' }}
                                aria-label="사용자 관리"
                                onClick={() => setIsAdminOpen(true)}
                            />
                        )}
                        <UserPlus
                            size={22}
                            color="var(--text-secondary)"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setIsInviteOpen(true)}
                            aria-label="팀원 초대"
                        />
                        {installPrompt && (
                            <Download
                                size={22}
                                color="var(--text-secondary)"
                                style={{ cursor: 'pointer' }}
                                onClick={handleInstallClick}
                                aria-label="앱 설치하기"
                            />
                        )}
                    </div>
                    <div className="sidebar-bottom">
                        <UserCircle
                            size={30}
                            color="var(--text-primary)"
                            style={{ cursor: 'pointer' }}
                            onClick={() => setIsSettingsOpen(true)}
                        />
                    </div>
                </nav>
            )}

            <ProfileSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
            <WorkspaceInviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />

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

            {/* 2. 티켓 목록 */}
            {showList && (
                <aside className="pane-list">
                    <TicketList />
                </aside>
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
