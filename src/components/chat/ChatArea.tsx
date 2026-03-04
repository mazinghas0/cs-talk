import React, { useState, useEffect, useRef } from 'react';
import './ChatArea.css';
import { useTicketStore } from '../../store/ticketStore';
import { useAuthStore } from '../../store/authStore';
import { Send, FilePlus, MessageSquareWarning } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export const ChatArea: React.FC = () => {
    const { tickets, selectedTicketId, messages, sendMessage, updateTicketStatus } = useTicketStore();
    const { user } = useAuthStore();
    const ticket = tickets.find(t => t.id === selectedTicketId);

    const [newMessage, setNewMessage] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!ticket) {
        return (
            <div className="chat-empty">
                <MessageSquareWarning size={48} color="var(--glass-border)" />
                <p>왼쪽에서 처리할 요청(티켓)을 선택하세요.</p>
            </div>
        );
    }

    const handleSend = async () => {
        if (!ticket || !user || !newMessage.trim()) return;

        setIsSending(true);
        try {
            await sendMessage(ticket.id, newMessage, user.id, isInternal);
            setNewMessage('');
            // If ticket was new/open, moving it to in_progress automatically could be a nice feature
            if (ticket.status === 'open' && !isInternal) {
                await updateTicketStatus(ticket.id, 'in_progress');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('메시지 전송에 실패했습니다.');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

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
                        <button className="btn-resolve" onClick={() => updateTicketStatus(ticket.id, 'resolved')}>완료 처리</button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                <div className="message-wrapper user-req">
                    <div className="message-bubble req-bubble">
                        <p className="msg-text">{ticket.description}</p>
                        <span className="msg-time">{format(new Date(ticket.created_at), 'a h:mm', { locale: ko })} (최초 요청)</span>
                    </div>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    const isInternalMsg = msg.is_internal;

                    if (isInternalMsg) {
                        return (
                            <div key={msg.id} className="message-wrapper internal">
                                <div className="message-bubble internal-bubble">
                                    <p className="msg-text">{msg.content}</p>
                                    <span className="msg-time">{msg.profiles?.full_name || '관리자'} · {format(new Date(msg.created_at), 'a h:mm', { locale: ko })}</span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={`message-wrapper ${isMe ? 'admin-res' : 'user-req'}`}>
                            <div className={`message-bubble ${isMe ? 'res-bubble' : 'req-bubble'}`}>
                                <p className="msg-text">{msg.content}</p>
                                <span className="msg-time">
                                    {!isMe && (msg.profiles?.full_name + ' · ')}
                                    {format(new Date(msg.created_at), 'a h:mm', { locale: ko })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
                <button className="icon-btn tool-btn"><FilePlus size={20} /></button>
                <div className="input-wrapper">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isInternal ? "내부 메모 작성..." : "메시지 입력 (Enter로 전송)"}
                        rows={1}
                        disabled={isSending}
                    />
                </div>
                <button className="icon-btn send-btn" onClick={handleSend} disabled={isSending || !newMessage.trim()}>
                    <Send size={20} />
                </button>
            </div>

            <div className="chat-input-footer">
                <label className="toggle-internal">
                    <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    <span>고객에게 보이지 않는 내부 메모로 전송</span>
                </label>
            </div>
        </div>
    );
};
