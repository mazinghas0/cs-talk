import React from 'react';
import './MainLayout.css';
import { MessageSquare, Settings, UserCircle, Shield } from 'lucide-react';
import { TicketList } from '../ticket/TicketList';
import { ChatArea } from '../chat/ChatArea';
import { ProfileSettings } from '../profile/ProfileSettings';
import { AdminPanel } from '../admin/AdminPanel';
import { useTicketStore } from '../../store/ticketStore';
import { useAuthStore } from '../../store/authStore';

export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [isAdminOpen, setIsAdminOpen] = React.useState(false);
    const { selectedTicketId, setSelectedTicketId } = useTicketStore();
    const { isAdmin } = useAuthStore();

    // Use matchMedia for reliable mobile detection (more reliable than window.innerWidth)
    const [isMobile, setIsMobile] = React.useState(() => window.matchMedia('(max-width: 768px)').matches);

    React.useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // On mobile: show list when no ticket selected, show chat when ticket selected
    const showList = !isMobile || !selectedTicketId;
    const showChat = !isMobile || !!selectedTicketId;

    const handleBack = () => {
        setSelectedTicketId(null);
    };

    return (
        <div className={`layout-container ${isMobile ? 'is-mobile' : ''}`}>

            {/* 1. Global Sidebar — hidden on mobile */}
            {!isMobile && (
                <nav className="pane-sidebar">
                    <div className="sidebar-top">
                        <div className="sidebar-logo">CS</div>
                        {isAdmin && (
                            <Shield
                                size={22}
                                color="var(--accent-primary)"
                                style={{ cursor: 'pointer' }}
                                aria-label="사용자 관리"
                                onClick={() => setIsAdminOpen(true)}
                            />
                        )}
                        <MessageSquare size={22} color="var(--accent-primary)" style={{ cursor: 'pointer' }} />
                    </div>
                    <div className="sidebar-bottom">
                        <Settings size={22} color="var(--text-secondary)" style={{ cursor: 'pointer' }} onClick={() => setIsSettingsOpen(true)} />
                        <UserCircle size={30} color="var(--text-primary)" style={{ cursor: 'pointer' }} onClick={() => setIsSettingsOpen(true)} />
                    </div>
                </nav>
            )}

            <ProfileSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

            {/* 2. Ticket List */}
            {showList && (
                <aside className="pane-list">
                    <TicketList />
                </aside>
            )}

            {/* 3. Chat Area */}
            {showChat && (
                <main className="pane-content">
                    {children || <ChatArea onBack={handleBack} showBack={isMobile} />}
                </main>
            )}

            {/* Mobile Bottom Navigation (shown only when list is visible) */}
            {isMobile && !selectedTicketId && (
                <nav className="mobile-bottom-nav">
                    <div className="nav-item active">
                        <MessageSquare size={22} />
                        <span>업무</span>
                    </div>
                    {isAdmin && (
                        <div className="nav-item" onClick={() => setIsAdminOpen(true)}>
                            <Shield size={22} />
                            <span>관리</span>
                        </div>
                    )}
                    <div className="nav-item" onClick={() => setIsSettingsOpen(true)}>
                        <Settings size={22} />
                        <span>설정</span>
                    </div>
                    <div className="nav-item" onClick={() => setIsSettingsOpen(true)}>
                        <UserCircle size={22} />
                        <span>프로필</span>
                    </div>
                </nav>
            )}
        </div>
    );
};
