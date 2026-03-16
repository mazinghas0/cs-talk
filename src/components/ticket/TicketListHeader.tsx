import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import './TicketList.css';

export interface TicketListHeaderProps {
    onRefresh: () => void;
    onCreate: () => void;
}

export const TicketListHeader: React.FC<TicketListHeaderProps> = ({ onRefresh, onCreate }) => {
    return (
        <div className="ticket-list-header">
            <h2 className="title">업무 요청</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="icon-btn-refresh" onClick={onRefresh} title="새로고침">
                    <RefreshCw size={16} />
                </button>
                <button className="icon-btn-create" onClick={onCreate}>
                    <Plus size={16} /> 업무 등록
                </button>
            </div>
        </div>
    );
};
