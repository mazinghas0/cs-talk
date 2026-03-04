import React from 'react';
import './TicketList.css';
import { useTicketStore } from '../../store/ticketStore';
import { TicketTabs } from './TicketTabs';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export const TicketList: React.FC = () => {
    const { tickets, activeTab, selectedTicketId, setSelectedTicketId } = useTicketStore();

    // Filter tickets by active tab
    const filteredTickets = tickets.filter(t => t.status === activeTab);

    return (
        <div className="ticket-list-container">
            <div className="ticket-list-header">
                <h2 className="title">업무 요청</h2>
            </div>

            <TicketTabs />

            <div className="ticket-list-body">
                {filteredTickets.length === 0 ? (
                    <div className="empty-state">해당 상태의 티켓이 없습니다.</div>
                ) : (
                    filteredTickets.map(ticket => (
                        <div
                            key={ticket.id}
                            className={`ticket-item ${selectedTicketId === ticket.id ? 'selected' : ''}`}
                            onClick={() => setSelectedTicketId(ticket.id)}
                        >
                            <div className="ticket-header">
                                <span className={`priority-badge ${ticket.priority}`}>
                                    {ticket.priority.toUpperCase()}
                                </span>
                                <span className="time">
                                    <Clock size={12} />
                                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ko })}
                                </span>
                            </div>
                            <h3 className="ticket-title">{ticket.title}</h3>
                            <p className="ticket-desc">{ticket.description}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
