import React from 'react';
import './TicketTabs.css';
import { useTicketStore } from '../../store/ticketStore';
import { TicketStatus } from '../../types/ticket';

export const TicketTabs: React.FC = () => {
    const { activeTab, setActiveTab } = useTicketStore();

    const tabs: { id: TicketStatus; label: string }[] = [
        { id: 'in_progress', label: '진행중' },
        { id: 'resolved', label: '처리완료' },
    ];

    return (
        <div className="ticket-tabs">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};
