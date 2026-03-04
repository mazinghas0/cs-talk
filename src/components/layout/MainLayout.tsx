import React from 'react';
import './MainLayout.css';
import { MessageSquare, LayoutDashboard, Settings, UserCircle } from 'lucide-react';
import { TicketList } from '../ticket/TicketList';
import { ChatArea } from '../chat/ChatArea';
import { ProfileSettings } from '../profile/ProfileSettings';

export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    return (
        <div className="layout-container">
            {/* 1. Global Sidebar (Left) */}
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

            <ProfileSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* 2. Ticket / Chat List (Middle) */}
            <aside className="pane-list">
                <TicketList />
            </aside>

            {/* 3. Main Chat Area (Right) */}
            <main className="pane-content">
                {children || <ChatArea />}
            </main>
        </div>
    );
};
