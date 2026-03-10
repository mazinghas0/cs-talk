import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Ticket, Message } from '../../types/ticket';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Send } from 'lucide-react';
import './CustomerTicketView.css';

type Step = 'auth' | 'chat';

export const CustomerTicketView: React.FC = () => {
    const { ticketId } = useParams<{ ticketId: string }>();

    const [step, setStep] = useState<Step>('auth');
    const [pinInput, setPinInput] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<HTMLDivElement>(null);

    // URL에서 pin 파라미터 자동 입력
    useEffect(() => {
        const urlPin = new URLSearchParams(window.location.search).get('pin');
        if (urlPin) setPinInput(urlPin);
    }, []);

    const isAtBottom = useCallback(() => {
        const el = chatRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (step === 'chat') scrollToBottom();
    }, [messages, step, scrollToBottom]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketId || !pinInput.trim() || !customerName.trim()) return;

        setIsVerifying(true);
        setError('');

        try {
            const { data, error: fetchError } = await supabase
                .from('tickets')
                .select('*')
                .eq('id', ticketId)
                .single();

            if (fetchError || !data) {
                setError('티켓을 찾을 수 없습니다.');
                return;
            }

            if (data.pin !== pinInput.trim()) {
                setError('PIN 번호가 올바르지 않습니다.');
                return;
            }

            if (data.status === 'resolved') {
                setError('이미 처리 완료된 상담입니다.');
                return;
            }

            setTicket(data as Ticket);

            // 공개 메시지(내부 메모 제외) 불러오기
            const { data: msgData } = await supabase
                .from('messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .eq('is_internal_note', false)
                .order('created_at', { ascending: true });

            setMessages((msgData || []) as Message[]);
            setStep('chat');

            // 실시간 구독
            supabase
                .channel(`customer-ticket-${ticketId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `ticket_id=eq.${ticketId}`
                }, (payload) => {
                    const msg = payload.new as Message;
                    if (!msg.is_internal_note) {
                        setMessages((prev) => {
                            if (prev.some(m => m.id === msg.id)) return prev;
                            return [...prev, msg];
                        });
                    }
                })
                .subscribe();
        } catch (err) {
            setError('오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSend = async () => {
        if (!ticketId || !newMessage.trim() || isSending) return;

        setIsSending(true);
        const content = newMessage.trim();
        setNewMessage('');

        try {
            const { error } = await supabase
                .from('messages')
                .insert([{
                    ticket_id: ticketId,
                    user_id: null,
                    customer_name: customerName,
                    content,
                    is_internal_note: false,
                    is_resolution: false,
                }]);

            if (error) throw error;
        } catch (err) {
            alert('메시지 전송에 실패했습니다.');
            setNewMessage(content);
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

    if (step === 'auth') {
        return (
            <div className="customer-auth-page">
                <div className="customer-auth-card">
                    <div className="customer-auth-logo">CS Talk</div>
                    <h2>상담 채팅 입장</h2>
                    <p className="customer-auth-desc">담당자에게 받은 PIN 번호와 이름을 입력하세요.</p>

                    <form onSubmit={handleVerify} className="customer-auth-form">
                        <div className="customer-form-group">
                            <label>이름</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="이름을 입력하세요"
                                required
                                autoFocus
                                maxLength={30}
                            />
                        </div>
                        <div className="customer-form-group">
                            <label>PIN 번호</label>
                            <input
                                type="text"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="4자리 숫자"
                                required
                                maxLength={4}
                                className="pin-input"
                            />
                        </div>
                        {error && <p className="customer-error">{error}</p>}
                        <button type="submit" className="customer-enter-btn" disabled={isVerifying}>
                            {isVerifying ? '확인 중...' : '입장하기'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="customer-chat-page">
            <div className="customer-chat-header">
                <div className="customer-chat-header-info">
                    <div className="customer-logo">CS Talk</div>
                    <div>
                        <h2>{ticket?.title}</h2>
                        <span className="customer-welcome">{customerName}님 입장</span>
                    </div>
                </div>
                <span className={`status-badge-customer ${ticket?.status}`}>
                    {ticket?.status === 'in_progress' ? '진행중' : '처리완료'}
                </span>
            </div>

            <div className="customer-messages" ref={chatRef} onScroll={() => { if (isAtBottom()) {} }}>
                {/* 최초 요청 메시지 */}
                <div className="customer-msg-wrapper customer-side">
                    <div className="customer-msg-bubble customer-bubble">
                        <p className="customer-msg-text">{ticket?.description}</p>
                        {ticket?.image_url && (
                            <img src={ticket.image_url} alt="첨부 이미지" className="customer-attached-img" />
                        )}
                        <span className="customer-msg-meta">
                            {customerName} · {ticket ? format(new Date(ticket.created_at), 'a h:mm', { locale: ko }) : ''} (최초 요청)
                        </span>
                    </div>
                </div>

                {messages.map((msg) => {
                    const isCustomer = !msg.user_id;
                    const senderName = msg.customer_name || '고객';
                    const adminName = msg.profiles?.full_name || '담당자';

                    return (
                        <div
                            key={msg.id}
                            className={`customer-msg-wrapper ${isCustomer ? 'customer-side' : 'admin-side'}`}
                        >
                            <div className={`customer-msg-bubble ${isCustomer ? 'customer-bubble' : 'admin-bubble'}`}>
                                <p className="customer-msg-text">{msg.content}</p>
                                {msg.image_url && (
                                    <img src={msg.image_url} alt="첨부 이미지" className="customer-attached-img" />
                                )}
                                <span className="customer-msg-meta">
                                    {isCustomer ? senderName : adminName} · {format(new Date(msg.created_at), 'a h:mm', { locale: ko })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {ticket?.status !== 'resolved' ? (
                <div className="customer-input-area">
                    <div className="customer-input-wrapper">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="메시지 입력 (Enter로 전송)"
                            rows={1}
                            disabled={isSending}
                        />
                    </div>
                    <button
                        className="customer-send-btn"
                        onClick={handleSend}
                        disabled={isSending || !newMessage.trim()}
                    >
                        <Send size={18} />
                    </button>
                </div>
            ) : (
                <div className="customer-resolved-notice">
                    이 상담은 처리 완료되었습니다. 추가 문의는 새로운 요청을 접수해 주세요.
                </div>
            )}
        </div>
    );
};
