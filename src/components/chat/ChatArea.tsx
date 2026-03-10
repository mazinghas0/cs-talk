import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatArea.css';
import { useTicketStore } from '../../store/ticketStore';
import { useAuthStore } from '../../store/authStore';
import { Send, FilePlus, MessageSquareWarning, Edit2, Trash2, X, ChevronLeft, Share2 } from 'lucide-react';
import { ShareTicketModal } from './ShareTicketModal';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

interface ChatAreaProps {
    onBack?: () => void;
    showBack?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onBack, showBack }) => {
    const { tickets, selectedTicketId, messages, sendMessage, updateTicketStatus, deleteTicket, requestResolution, updateTicket } = useTicketStore();
    const { user } = useAuthStore();
    const ticket = tickets.find(t => t.id === selectedTicketId);

    const [newMessage, setNewMessage] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editPriority, setEditPriority] = useState<any>('medium');
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const [hasNewMessage, setHasNewMessage] = useState(false);

    const isAtBottom = useCallback(() => {
        const el = chatMessagesRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    }, []);

    const scrollToBottom = useCallback((instant = false) => {
        messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
    }, []);

    // 채팅방 전환 시 즉시 맨 아래로 이동
    useEffect(() => {
        setHasNewMessage(false);
        // 렌더링 후 실행되도록 setTimeout 0 사용
        const timer = setTimeout(() => scrollToBottom(true), 0);
        return () => clearTimeout(timer);
    }, [selectedTicketId, scrollToBottom]);

    // 새 메시지 도착 시 스마트 스크롤
    useEffect(() => {
        if (messages.length === 0) return;
        if (isAtBottom()) {
            scrollToBottom();
            setHasNewMessage(false);
        } else {
            setHasNewMessage(true);
        }
    }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleScrollToNewMessage = () => {
        scrollToBottom();
        setHasNewMessage(false);
    };

    const handleScroll = () => {
        if (isAtBottom()) {
            setHasNewMessage(false);
        }
    };

    const isAuthor = user?.id === ticket?.requesting_user_id;

    const handleDelete = async () => {
        if (!ticket) return;
        if (window.confirm('정말 이 업무 요청을 삭제하시겠습니까? (관련 채팅 기록도 모두 삭제됩니다)')) {
            try {
                await deleteTicket(ticket.id);
            } catch (err) {
                alert('업무 삭제에 실패했습니다.');
            }
        }
    };

    const handleRequestResolution = async () => {
        if (!ticket) return;
        try {
            await requestResolution(ticket.id);
            alert('작성자에게 완료 처리를 요청했습니다.');
        } catch (err) {
            alert('완료 요청에 실패했습니다.');
        }
    };

    const handleOpenEditModal = () => {
        if (!ticket) return;
        setEditTitle(ticket.title);
        setEditDesc(ticket.description);
        setEditPriority(ticket.priority);
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticket || !editTitle.trim() || !editDesc.trim()) return;

        setIsSubmittingEdit(true);
        try {
            await updateTicket(ticket.id, {
                title: editTitle,
                description: editDesc,
                priority: editPriority
            });
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Edit Error:', err);
            alert('업무 수정에 실패했습니다.');
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    if (!ticket) {
        return (
            <div className="chat-empty">
                <MessageSquareWarning size={48} color="var(--glass-border)" />
                <p>왼쪽에서 처리할 요청(티켓)을 선택하세요.</p>
            </div>
        );
    }

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('attachments').getPublicUrl(fileName);
            setPendingImageUrl(data.publicUrl);
        } catch (err) {
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = async () => {
        if (!ticket || !user || (!newMessage.trim() && !pendingImageUrl)) return;

        setIsSending(true);
        try {
            await sendMessage(ticket.id, newMessage || ' ', user.id, isInternal, pendingImageUrl || undefined);
            setNewMessage('');
            setPendingImageUrl(null);
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

    const canSend = !isSending && !isUploading && (!!newMessage.trim() || !!pendingImageUrl);

    return (
        <div className={`chat-area ambient-${ticket.priority}`}>
            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-info">
                    {showBack && (
                        <button className="back-btn" onClick={onBack} aria-label="Go back">
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <h2>{ticket.title}</h2>
                    <span className={`status-badge ${ticket.status}`}>
                        {ticket.status === 'in_progress' ? '진행중' : '처리완료'}
                    </span>
                </div>
                <div className="chat-header-actions">
                    {ticket.status !== 'resolved' && (
                        <>
                            {isAuthor ? (
                                <>
                                    <button className="icon-btn-header" onClick={handleOpenEditModal} title="수정"><Edit2 size={16} /></button>
                                    <button className="icon-btn-header" onClick={handleDelete} title="삭제"><Trash2 size={16} /></button>
                                    <button className="btn-resolve" onClick={() => updateTicketStatus(ticket.id, 'resolved')}>완료 처리 (내가 작성함)</button>
                                </>
                            ) : (
                                <>
                                    {ticket.resolve_requested ? (
                                        <span className="resolve-requested-badge">요청자에게 완료 확인 대기중</span>
                                    ) : (
                                        <button className="btn-request-resolve" onClick={handleRequestResolution}>이 업무 완료 설정 시도하기 (요청자 승인필요)</button>
                                    )}
                                </>
                            )}
                            <button className="icon-btn-header share-btn" onClick={() => setIsShareModalOpen(true)} title="고객에게 공유">
                                <Share2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
                {hasNewMessage && (
                    <button className="new-message-toast" onClick={handleScrollToNewMessage}>
                        새 메시지 ↓
                    </button>
                )}
                <div className="message-wrapper user-req">
                    <div className="message-bubble req-bubble">
                        <p className="msg-text">{ticket.description}</p>
                        {ticket.image_url && (
                            <img src={ticket.image_url} alt="첨부 이미지" className="attached-image" />
                        )}
                        <span className="msg-time">{format(new Date(ticket.created_at), 'a h:mm', { locale: ko })} (최초 요청)</span>
                    </div>
                </div>

                {messages.map((msg) => {
                    const isMe = msg.user_id === user?.id;
                    const isInternalMsg = msg.is_internal_note;
                    const senderName = msg.customer_name || msg.profiles?.full_name || msg.profiles?.email?.split('@')[0] || '익명';

                    if (isInternalMsg) {
                        return (
                            <div key={msg.id} className="message-wrapper internal">
                                <div className="message-bubble internal-bubble">
                                    <p className="msg-text">{msg.content}</p>
                                    {msg.image_url && (
                                        <img src={msg.image_url} alt="첨부 이미지" className="attached-image" />
                                    )}
                                    <span className="msg-time">{senderName} · {format(new Date(msg.created_at), 'a h:mm', { locale: ko })}</span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={`message-wrapper ${isMe ? 'admin-res' : 'user-req'}`}>
                            <div className={`message-bubble ${isMe ? 'res-bubble' : 'req-bubble'}`}>
                                <p className="msg-text">{msg.content}</p>
                                {msg.image_url && (
                                    <img src={msg.image_url} alt="첨부 이미지" className="attached-image" />
                                )}
                                <span className="msg-time">
                                    {!isMe && (senderName + ' · ')}
                                    {format(new Date(msg.created_at), 'a h:mm', { locale: ko })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageSelect}
            />
            {pendingImageUrl && (
                <div className="pending-image-preview">
                    <img src={pendingImageUrl} alt="첨부 예정" />
                    <button className="remove-image-btn" onClick={() => setPendingImageUrl(null)}>
                        <X size={14} />
                    </button>
                </div>
            )}
            <div className="chat-input-area">
                <button
                    className={`icon-btn tool-btn ${isUploading ? 'uploading' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    title="이미지 첨부"
                >
                    <FilePlus size={20} />
                </button>
                <div className="input-wrapper">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isInternal ? "내부 메모 작성..." : "메시지 입력 (Enter로 전송)"}
                        rows={1}
                        disabled={isSending || isUploading}
                    />
                </div>
                <button className="icon-btn send-btn" onClick={handleSend} disabled={!canSend}>
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

            {/* Edit Ticket Modal */}
            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>업무 상세 내용 수정</h3>
                            <button className="icon-btn-close" onClick={() => setIsEditModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="modal-form">
                            <div className="form-group">
                                <label>요청 제목</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>우선 순위</label>
                                <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                                    <option value="low">낮음 (여유 시 처리)</option>
                                    <option value="medium">보통 (일반 요청)</option>
                                    <option value="high">높음 (빠른 처리 요망)</option>
                                    <option value="urgent">긴급 (즉시 처리 및 장애)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>상세 내용</label>
                                <textarea
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    rows={4}
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsEditModalOpen(false)}>취소</button>
                                <button type="submit" className="btn-submit" disabled={isSubmittingEdit}>
                                    {isSubmittingEdit ? '저장 중...' : '변경 내용 저장'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Share Ticket Modal */}
            <ShareTicketModal
                ticket={ticket}
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
            />
        </div>
    );
};
