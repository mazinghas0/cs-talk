import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatArea.css';
import { useTicketStore } from '../../store/ticketStore';
import { useAuthStore } from '../../store/authStore';
import { Send, FilePlus, MessageSquareWarning, Edit2, Trash2, X, ChevronLeft, Share2, Bookmark, ChevronDown, RotateCcw } from 'lucide-react';
import { ShareTicketModal } from './ShareTicketModal';
import { MessageBubble } from './MessageBubble';
import { MessageContextMenu } from './MessageContextMenu';
import { BookmarkPanel } from './BookmarkPanel';
import { format, isSameDay, isSameMinute } from 'date-fns';
import { ko } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { Message, TicketPriority } from '../../types/ticket';
import html2canvas from 'html2canvas';

interface ChatAreaProps {
    onBack?: () => void;
    showBack?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ onBack, showBack }) => {
    const { tickets, selectedTicketId, messages, reactions, toggleReaction, sendMessage, deleteMessage, updateTicketStatus, deleteTicket, requestResolution, updateTicket, bookmarks, isBookmarkPanelOpen, setBookmarkPanelOpen, toggleBookmark, fetchBookmarks } = useTicketStore();
    const { user, workspaceMembers, currentWorkspaceRole } = useAuthStore();
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
    const [editPriority, setEditPriority] = useState<TicketPriority>('medium');
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    // 퀵액션 드롭다운 상태
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
    const priorityMenuRef = useRef<HTMLDivElement>(null);
    const assigneeMenuRef = useRef<HTMLDivElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const wasAtBottomRef = useRef(true);

    const isAtBottom = useCallback(() => {
        const el = chatMessagesRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    }, []);

    const scrollToBottom = useCallback((instant = false) => {
        messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
    }, []);

    // iOS Safari 키보드 대응: visualViewport 크기 변화로 키보드 높이 감지
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const handleResize = () => {
            const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
        };

        vv.addEventListener('resize', handleResize);
        vv.addEventListener('scroll', handleResize);
        return () => {
            vv.removeEventListener('resize', handleResize);
            vv.removeEventListener('scroll', handleResize);
            document.documentElement.style.setProperty('--keyboard-height', '0px');
        };
    }, []);

    // 북마크 초기 로드
    useEffect(() => {
        fetchBookmarks();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 퀵액션 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target as Node)) {
                setShowPriorityMenu(false);
            }
            if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(e.target as Node)) {
                setShowAssigneeMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // 채팅방 전환 시 즉시 맨 아래로 이동
    useEffect(() => {
        setHasNewMessage(false);
        wasAtBottomRef.current = true;
        const timer = setTimeout(() => scrollToBottom(true), 0);
        return () => clearTimeout(timer);
    }, [selectedTicketId, scrollToBottom]);

    // 새 메시지 도착 시 스마트 스크롤
    // DOM 렌더링 전 wasAtBottomRef로 판단 — isAtBottom()은 렌더 후 scrollHeight가 이미 커져서 오판함
    useEffect(() => {
        if (messages.length === 0) return;
        if (wasAtBottomRef.current) {
            const timer = setTimeout(() => scrollToBottom(), 0);
            setHasNewMessage(false);
            return () => clearTimeout(timer);
        } else {
            setHasNewMessage(true);
        }
    }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleScrollToNewMessage = () => {
        scrollToBottom();
        setHasNewMessage(false);
    };

    const handleScroll = () => {
        wasAtBottomRef.current = isAtBottom();
        if (wasAtBottomRef.current) {
            setHasNewMessage(false);
        }
    };

    const isAuthor = user?.id === ticket?.requesting_user_id;
    const isLeader = currentWorkspaceRole === 'leader';

    const PRIORITY_LABEL: Record<TicketPriority, string> = {
        urgent: '긴급',
        high: '높음',
        medium: '보통',
        low: '낮음',
    };

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

    // 메시지 컨텍스트 메뉴 — if (!ticket) return 이전에 선언 (Rules of Hooks 준수)
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
    const [copyToast, setCopyToast] = useState(false);
    const [errorToast, setErrorToast] = useState('');
    const [replyTarget, setReplyTarget] = useState<Message | null>(null);

    const handleMenuOpen = useCallback((pos: { x: number; y: number }, msg: Message) => {
        setContextMenu({ x: pos.x, y: pos.y, msg });
    }, []);

    const handleMenuClose = useCallback(() => {
        setContextMenu(null);
    }, []);

    const showCopyToast = useCallback(() => {
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2000);
    }, []);

    const handleCopy = useCallback(async () => {
        if (!contextMenu) return;
        try {
            await navigator.clipboard.writeText(contextMenu.msg.content);
            showCopyToast();
        } catch { /* 미지원 환경 무시 */ }
        setContextMenu(null);
    }, [contextMenu, showCopyToast]);

    const handleShare = useCallback(async () => {
        if (!contextMenu) return;
        const text = contextMenu.msg.content;
        try {
            if (navigator.share) {
                await navigator.share({ text });
            } else {
                await navigator.clipboard.writeText(text);
                showCopyToast();
            }
        } catch { /* 사용자 취소 또는 미지원 무시 */ }
        setContextMenu(null);
    }, [contextMenu, showCopyToast]);

    const handleCapture = useCallback(async () => {
        if (!contextMenu) return;
        const msgId = contextMenu.msg.id;
        setContextMenu(null);

        // data-msg-id로 버블 요소 탐색
        const el = document.querySelector<HTMLElement>(`[data-msg-id="${msgId}"]`);
        if (!el) return;

        try {
            const canvas = await html2canvas(el, {
                backgroundColor: null,
                scale: 2,          // 레티나 해상도
                useCORS: true,     // 첨부 이미지 CORS 허용
                logging: false,
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) return;

            const file = new File([blob], 'message.png', { type: 'image/png' });
            const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

            // 모바일(터치)에서만 공유 시트, PC는 항상 다운로드
            if (isTouchDevice && navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file] });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cs-talk-${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch {
            setErrorToast('캡쳐에 실패했습니다.');
            setTimeout(() => setErrorToast(''), 3000);
        }
    }, [contextMenu]);

    const handleDeleteMessage = useCallback(async () => {
        if (!contextMenu) return;
        const id = contextMenu.msg.id;
        setContextMenu(null);
        try {
            await deleteMessage(id);
        } catch (err) {
            const msg = err instanceof Error ? err.message : '삭제에 실패했습니다.';
            setErrorToast(msg);
            setTimeout(() => setErrorToast(''), 3000);
        }
    }, [contextMenu, deleteMessage]);

    const handleReply = useCallback(() => {
        if (!contextMenu) return;
        setReplyTarget(contextMenu.msg);
        setContextMenu(null);
        setTimeout(() => textareaRef.current?.focus(), 0);
    }, [contextMenu]);

    const handleReact = useCallback(async (emoji: string) => {
        if (!contextMenu) return;
        await toggleReaction(contextMenu.msg.id, emoji);
    }, [contextMenu, toggleReaction]);

    const handleBookmark = useCallback(async () => {
        if (!contextMenu) return;
        await toggleBookmark(contextMenu.msg.id);
    }, [contextMenu, toggleBookmark]);

    const handleScrollToReply = useCallback((msgId: string) => {
        const el = document.querySelector<HTMLElement>(`[data-msg-id="${msgId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 잠깐 하이라이트 효과
        el?.classList.add('msg-highlight');
        setTimeout(() => el?.classList.remove('msg-highlight'), 1500);
    }, []);

    if (!ticket) {
        return (
            <div className="chat-empty">
                <div className="chat-empty-icon">
                    <MessageSquareWarning size={32} color="var(--accent-primary)" />
                </div>
                <p className="chat-empty-title">요청을 선택하세요</p>
                <p className="chat-empty-desc">왼쪽 목록에서 처리할 업무 요청을 선택하면<br />대화 내용이 여기에 표시됩니다.</p>
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
            await sendMessage(ticket.id, newMessage || ' ', user.id, isInternal, pendingImageUrl || undefined, replyTarget?.id);
            setNewMessage('');
            setPendingImageUrl(null);
            setReplyTarget(null);
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('메시지 전송에 실패했습니다.');
        } finally {
            setIsSending(false);
            setTimeout(() => textareaRef.current?.focus(), 0);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(e.target.value);
        // 높이 자동 조절: 내용에 맞게 늘어났다가 비우면 원래 크기로 복귀
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
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
                    <button
                        className={`icon-btn-header${isBookmarkPanelOpen ? ' active' : ''}`}
                        onClick={() => setBookmarkPanelOpen(!isBookmarkPanelOpen)}
                        title="북마크"
                    >
                        <Bookmark size={16} />
                    </button>
                    {isAuthor && (
                        <button className="icon-btn-header" onClick={handleOpenEditModal} title="수정">
                            <Edit2 size={16} />
                        </button>
                    )}
                    {(isAuthor || isLeader) && (
                        <button className="icon-btn-header" onClick={handleDelete} title="삭제">
                            <Trash2 size={16} />
                        </button>
                    )}
                    <button className="icon-btn-header share-btn" onClick={() => setIsShareModalOpen(true)} title="고객에게 공유">
                        <Share2 size={16} />
                    </button>
                </div>
            </div>

            {/* 퀵액션 바 */}
            <div className="quick-action-bar">
                {/* 우선순위 칩 */}
                <div className="qa-chip-wrap" ref={priorityMenuRef}>
                    <button
                        className={`qa-chip priority-chip ${ticket.priority}`}
                        onClick={() => setShowPriorityMenu(v => !v)}
                    >
                        {PRIORITY_LABEL[ticket.priority]}
                        <ChevronDown size={11} />
                    </button>
                    {showPriorityMenu && (
                        <div className="qa-dropdown">
                            {(['urgent', 'high', 'medium', 'low'] as TicketPriority[]).map(p => (
                                <button
                                    key={p}
                                    className={`qa-dropdown-item ${ticket.priority === p ? 'active' : ''}`}
                                    onClick={async () => {
                                        await updateTicket(ticket.id, { priority: p });
                                        setShowPriorityMenu(false);
                                    }}
                                >
                                    {PRIORITY_LABEL[p]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* 담당자 칩 */}
                {workspaceMembers.length > 0 && (
                    <div className="qa-chip-wrap" ref={assigneeMenuRef}>
                        <button
                            className="qa-chip assignee-chip"
                            onClick={() => setShowAssigneeMenu(v => !v)}
                        >
                            {ticket.assignee_id
                                ? (workspaceMembers.find(m => m.user_id === ticket.assignee_id)?.full_name
                                    ?? workspaceMembers.find(m => m.user_id === ticket.assignee_id)?.email
                                    ?? '담당자')
                                : '담당자 없음'}
                            <ChevronDown size={11} />
                        </button>
                        {showAssigneeMenu && (
                            <div className="qa-dropdown">
                                <button
                                    className={`qa-dropdown-item ${!ticket.assignee_id ? 'active' : ''}`}
                                    onClick={async () => {
                                        await updateTicket(ticket.id, { assignee_id: undefined });
                                        setShowAssigneeMenu(false);
                                    }}
                                >
                                    없음
                                </button>
                                {workspaceMembers.map(m => (
                                    <button
                                        key={m.user_id}
                                        className={`qa-dropdown-item ${ticket.assignee_id === m.user_id ? 'active' : ''}`}
                                        onClick={async () => {
                                            await updateTicket(ticket.id, { assignee_id: m.user_id });
                                            setShowAssigneeMenu(false);
                                        }}
                                    >
                                        {m.full_name ?? m.email}{m.role === 'leader' ? ' (리더)' : ''}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 완료/원복/요청 버튼 */}
                <div className="qa-actions">
                    {ticket.status === 'resolved' ? (
                        (isAuthor || isLeader) && (
                            <button className="qa-btn qa-btn-restore" onClick={() => updateTicketStatus(ticket.id, 'in_progress')}>
                                <RotateCcw size={12} /> 되돌리기
                            </button>
                        )
                    ) : (
                        isAuthor ? (
                            <button className="qa-btn qa-btn-resolve" onClick={() => updateTicketStatus(ticket.id, 'resolved')}>
                                완료 처리
                            </button>
                        ) : (
                            ticket.resolve_requested ? (
                                <span className="resolve-requested-badge">완료 확인 대기중</span>
                            ) : (
                                <button className="qa-btn qa-btn-request" onClick={handleRequestResolution}>
                                    완료 요청
                                </button>
                            )
                        )
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
                    <div
                        className="message-bubble req-bubble"
                        onContextMenu={(e) => {
                            e.preventDefault();
                            handleMenuOpen({ x: e.clientX, y: e.clientY }, {
                                id: `ticket-desc-${ticket.id}`,
                                ticket_id: ticket.id,
                                user_id: ticket.requesting_user_id,
                                content: ticket.description,
                                is_internal_note: false,
                                is_resolution: false,
                                image_url: ticket.image_url,
                                created_at: ticket.created_at,
                            });
                        }}
                    >
                        <p className="msg-text">{ticket.description}</p>
                        {ticket.image_url && (
                            <img src={ticket.image_url} alt="첨부 이미지" className="attached-image" />
                        )}
                        <span className="msg-time">{format(new Date(ticket.created_at), 'a h:mm', { locale: ko })} (최초 요청)</span>
                    </div>
                </div>

                {messages.map((msg, idx) => {
                    const isMe = msg.user_id === user?.id;
                    const isInternalMsg = msg.is_internal_note;
                    const senderName = msg.customer_name || msg.profiles?.full_name || msg.profiles?.email?.split('@')[0] || '익명';

                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

                    const msgDate = new Date(msg.created_at);
                    const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;

                    // 날짜 구분선: 이전 메시지와 날짜가 다를 때
                    const showDateDivider = !prevDate || !isSameDay(msgDate, prevDate);

                    // 연속 그룹핑: 같은 발신자 + 1분 이내 + 둘 다 일반 메시지
                    const isContinued = !isInternalMsg &&
                        prevMsg !== null &&
                        !prevMsg.is_internal_note &&
                        prevMsg.user_id === msg.user_id &&
                        !showDateDivider &&
                        isSameMinute(msgDate, new Date(prevMsg.created_at));

                    // 마지막 메시지 여부: 다음이 없거나 다음 메시지가 다른 발신자거나 다른 분
                    const isLastInGroup = !nextMsg ||
                        nextMsg.is_internal_note ||
                        nextMsg.user_id !== msg.user_id ||
                        !isSameMinute(new Date(nextMsg.created_at), msgDate);

                    if (isInternalMsg) {
                        return (
                            <React.Fragment key={msg.id}>
                                {showDateDivider && (
                                    <div className="date-divider">
                                        <span>{format(msgDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}</span>
                                    </div>
                                )}
                                <MessageBubble
                                    msg={msg}
                                    isMe={isMe}
                                    isInternalMsg={true}
                                    isContinued={false}
                                    isLastInGroup={true}
                                    senderName={senderName}
                                    replyPreview={(() => {
                                        if (!msg.thread_parent_id) return null;
                                        const parent = messages.find(m => m.id === msg.thread_parent_id);
                                        if (!parent) return null;
                                        return {
                                            msgId: parent.id,
                                            content: parent.content,
                                            sender: parent.customer_name || parent.profiles?.full_name || '알 수 없음',
                                        };
                                    })()}
                                    reactions={reactions[msg.id]}
                                    currentUserId={user?.id}
                                    onToggleReaction={toggleReaction}
                                    onMenuOpen={handleMenuOpen}
                                    onScrollToReply={handleScrollToReply}
                                />
                            </React.Fragment>
                        );
                    }

                    return (
                        <React.Fragment key={msg.id}>
                            {showDateDivider && (
                                <div className="date-divider">
                                    <span>{format(msgDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}</span>
                                </div>
                            )}
                            <MessageBubble
                                msg={msg}
                                isMe={isMe}
                                isInternalMsg={false}
                                isContinued={isContinued}
                                isLastInGroup={isLastInGroup}
                                senderName={senderName}
                                replyPreview={(() => {
                                    if (!msg.thread_parent_id) return null;
                                    const parent = messages.find(m => m.id === msg.thread_parent_id);
                                    if (!parent) return null;
                                    return {
                                        msgId: parent.id,
                                        content: parent.content,
                                        sender: parent.customer_name || parent.profiles?.full_name || '알 수 없음',
                                    };
                                })()}
                                reactions={reactions[msg.id]}
                                currentUserId={user?.id}
                                onToggleReaction={toggleReaction}
                                onMenuOpen={handleMenuOpen}
                                onScrollToReply={handleScrollToReply}
                            />
                        </React.Fragment>
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
            {replyTarget && (
                <div className="reply-preview-bar">
                    <div className="reply-preview-content">
                        <span className="reply-preview-sender">
                            {replyTarget.customer_name || replyTarget.profiles?.full_name || '알 수 없음'}에게 답장
                        </span>
                        <p className="reply-preview-text">
                            {replyTarget.content.slice(0, 60)}{replyTarget.content.length > 60 ? '...' : ''}
                        </p>
                    </div>
                    <button className="reply-preview-cancel" onClick={() => setReplyTarget(null)}>
                        <X size={14} />
                    </button>
                </div>
            )}
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
                <div className={`input-wrapper${isInternal ? ' internal-input' : ''}`}>
                    <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={handleTextareaChange}
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

            <div className={`chat-input-footer${isInternal ? ' internal-mode' : ''}`}>
                <label className={`toggle-internal${isInternal ? ' active' : ''}`}>
                    <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    <span className="toggle-internal-dot" />
                    <span>내부 메모 {isInternal ? '(팀원만 볼 수 있음)' : '로 전송'}</span>
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
                                <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TicketPriority)}>
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

            {/* 메시지 컨텍스트 메뉴 */}
            {contextMenu && (
                <MessageContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    msg={contextMenu.msg}
                    isMe={contextMenu.msg.user_id === user?.id}
                    myReactions={(reactions[contextMenu.msg.id] ?? [])
                        .filter(r => r.user_id === user?.id)
                        .map(r => r.emoji)}
                    isBookmarked={bookmarks.some(b => b.message_id === contextMenu.msg.id)}
                    onClose={handleMenuClose}
                    onCopy={handleCopy}
                    onShare={handleShare}
                    onCapture={handleCapture}
                    onReply={handleReply}
                    onReact={handleReact}
                    onBookmark={handleBookmark}
                    onDelete={handleDeleteMessage}
                />
            )}

            {/* 복사 완료 토스트 */}
            {copyToast && <div className="copy-toast">복사됨</div>}

            {/* 에러 토스트 */}
            {errorToast && <div className="copy-toast error-toast">{errorToast}</div>}

            {/* 북마크 패널 */}
            <BookmarkPanel
                isOpen={isBookmarkPanelOpen}
                onClose={() => setBookmarkPanelOpen(false)}
                onScrollToMessage={handleScrollToReply}
            />
        </div>
    );
};
