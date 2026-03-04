import React from 'react';
import './ChatArea.css';
import { useTicketStore } from '../../store/ticketStore';
import { Send, FilePlus, MessageSquareWarning } from 'lucide-react';

export const ChatArea: React.FC = () => {
    const { tickets, selectedTicketId } = useTicketStore();
    const ticket = tickets.find(t => t.id === selectedTicketId);

    if (!ticket) {
        return (
            <div className="chat-empty">
                <MessageSquareWarning size={48} color="var(--glass-border)" />
                <p>왼쪽에서 처리할 요청(티켓)을 선택하세요.</p>
            </div>
        );
    }

    return (
        <div className="chat-area">
            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-info">
                    <h2>{ticket.title}</h2>
                    <span className={`status-badge ${ticket.status}`}>
                        {ticket.status === 'open' ? '요청 대기' : ticket.status === 'in_progress' ? '진행중' : '처리완료'}
                    </span>
                </div>
                <div className="chat-header-actions">
                    {/* Action buttons (e.g. mark as resolved, assign to me) */}
                    {ticket.status !== 'resolved' && (
                        <button className="btn-resolve">완료 처리</button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {/* Placeholder for actual messages */}
                <div className="message-wrapper user-req">
                    <div className="message-bubble req-bubble">
                        <p className="msg-text">{ticket.description}</p>
                        <span className="msg-time">오전 10:24</span>
                    </div>
                </div>

                {ticket.status === 'in_progress' && (
                    <div className="message-wrapper admin-res">
                        <div className="message-bubble res-bubble">
                            <p className="msg-text">안녕하세요, 고객님. 현재 해당 부서에서 원인 파악 중입니다. 잠시만 기다려주세요!</p>
                            <span className="msg-time">오전 10:30</span>
                        </div>
                    </div>
                )}

                <div className="internal-note-divider">
                    <span>이하 관리자 전용 내부 메모</span>
                </div>

                <div className="message-wrapper internal">
                    <div className="message-bubble internal-bubble">
                        <p className="msg-text">결제 모듈 설정값이 어제 배포 건에서 누락된 것 같습니다. DB 확인 필요합니다.</p>
                        <span className="msg-time">관리자 A · 오전 10:32</span>
                    </div>
                </div>
            </div>

            {/* Input */}
            <div className="chat-input-area">
                <button className="icon-btn tool-btn"><FilePlus size={20} /></button>
                <div className="input-wrapper">
                    <textarea placeholder="메시지 또는 /명령어 (내부 메모는 하단 토글 사용)" rows={1} />
                </div>
                <button className="icon-btn send-btn"><Send size={20} /></button>
            </div>

            <div className="chat-input-footer">
                <label className="toggle-internal">
                    <input type="checkbox" />
                    <span>고객에게 보이지 않는 내부 메모로 전송</span>
                </label>
            </div>
        </div>
    );
};
