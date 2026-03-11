import React, { useState } from 'react';
import './MainLayout.css';
import { MessageSquare, UserCircle, Shield, Download, Layers, UserPlus, Loader2 } from 'lucide-react';
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
    const [joinMode, setJoinMode] = useState<'select' | 'create' | 'code'>('select');
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const { selectedTicketId, setSelectedTicketId, fetchTickets } = useTicketStore();
    const { isAdmin, workspaces, currentWorkspace, isLoading, joinWorkspaceByCode } = useAuthStore();

    const [isMobile, setIsMobile] = React.useState(
        () => window.matchMedia('(max-width: 1024px)').matches
    );

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
