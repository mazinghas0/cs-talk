import React from 'react';
import './MainLayout.css';
import { MessageSquare, LayoutDashboard, Settings, UserCircle } from 'lucide-react';
import { TicketList } from '../ticket/TicketList';
import { ChatArea } from '../chat/ChatArea';
import { ProfileSettings } from '../profile/ProfileSettings';
import { useTicketStore } from '../../store/ticketStore';

export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const { selectedTicketId, setSelectedTicketId } = useTicketStore();
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className={`layout-container ${isMobile ? 'mobile' : ''} ${selectedTicketId ? 'has-selection' : ''}`}>
            {/* 1. Global Sidebar (Left) - Hidden on mobile */}
            {!isMobile && (
                <nav className="pane-sidebar">
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1rem', fontWeight: 'bold' }}>
                            CS
                        </div>
                        <LayoutDashboard size={24} color="var(--text-secondary)" cursor="pointer" />
                        <MessageSquare size={24} color="var(--accent-primary)" cursor="pointer" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                        <Settings size={24} color="var(--text-secondary)" cursor="pointer" onClick={() => setIsSettingsOpen(true)} />
                        <UserCircle size={32} color="var(--text-primary)" cursor="pointer" onClick={() => setIsSettingsOpen(true)} />
                    </div>
                </nav>
            )}

            <ProfileSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* 2. Ticket / Chat List (Middle) */}
            <aside className={`pane-list ${isMobile && selectedTicketId ? 'hidden' : ''}`}>
                <TicketList />
            </aside>

            {/* 3. Main Chat Area (Right) */}
            <main className={`pane-content ${isMobile && !selectedTicketId ? 'hidden' : ''}`}>
                {children || <ChatArea onBack={() => isMobile && setSelectedTicketId(null)} showBack={isMobile} />}
            </main>

            {/* Mobile Bottom Navigation Bar */}
            {isMobile && !selectedTicketId && (
                <div className="mobile-bottom-nav">
                    <div className="nav-item active">
                        <MessageSquare size={24} />
                        <span>업무</span>
                    </div>
                    <div className="nav-item" onClick={() => setIsSettingsOpen(true)}>
                        <Settings size={24} />
                        <span>설정</span>
                    </div>
                    <div className="nav-item" onClick={() => setIsSettingsOpen(true)}>
                        <UserCircle size={24} />
                        <span>프로필</span>
                    </div>
                </div>
            )}
        </div>
    );
};
