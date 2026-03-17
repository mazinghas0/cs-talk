import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './ChatArea.css';
import { useTicketStore } from '../../store/ticketStore';
import { useAuthStore } from '../../store/authStore';
import { MessageSquareWarning, X } from 'lucide-react';
import { ShareTicketModal } from './ShareTicketModal';
import { MessageContextMenu } from './MessageContextMenu';
import { BookmarkPanel } from './BookmarkPanel';
import { ChatHeader } from './ChatHeader';
import { QuickActionBar } from './QuickActionBar';
import { MessageList } from './MessageList';
import { ChatInputArea } from './ChatInputArea';
import { supabase } from '../../lib/supabase';
import { Message, TicketPriority } from '../../types/ticket';

interface ChatAreaProps {
    onBack?: () => void;
    showBack?: boolean;
}

const PRIORITY_LABEL: Record<TicketPriority, string> = {
    urgent: '긴급',
    high: '높음',
    medium: '보통',
    low: '낮음',
};

export const ChatArea: React.FC<ChatAreaProps> = ({ onBack, showBack }) => {
    const { tickets, selectedTicketId, messages, reactions, toggleReaction, sendMessage, deleteMessage, updateTicketStatus, deleteTicket, requestResolution, updateTicket, bookmarks, isBookmarkPanelOpen, setBookmarkPanelOpen, toggleBookmark, fetchBookmarks } = useTicketStore();
    const { user, workspaceMembers, currentWorkspaceRole } = useAuthStore();
    const ticket = useMemo(() => tickets.find(t => t.id === selectedTicketId), [tickets, selectedTicketId]);

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

    // iOS Safari 키보드 대응
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
        if (wasAtBottomRef.current) setHasNewMessage(false);
    };

    // 메시지 컨텍스트 메뉴
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
    const [copyToast, setCopyToast] = useState(false);
    const [errorToast, setErrorToast] = useState('');
    const [replyTarget, setReplyTarget] = useState<Message | null>(null);

    const handleMenuOpen = useCallback((pos: { x: number; y: number }, msg: Message) => {
        setContextMenu({ x: pos.x, y: pos.y, msg });
    }, []);

    const handleMenuClose = useCallback(() => { setContextMenu(null); }, []);

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
        const el = document.querySelector<HTMLElement>(`[data-msg-id="${msgId}"]`);
        if (!el) return;
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true, logging: false });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) return;
            const file = new File([blob], 'message.png', { type: 'image/png' });
            const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
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

    const isAuthor = user?.id === ticket.requesting_user_id;
    const isLeader = currentWorkspaceRole === 'leader';

    const handleDelete = async () => {
        if (window.confirm('정말 이 업무 요청을 삭제하시겠습니까? (관련 채팅 기록도 모두 삭제됩니다)')) {
            try {
                await deleteTicket(ticket.id);
            } catch {
                alert('업무 삭제에 실패했습니다.');
            }
        }
    };

    const handleRequestResolution = async () => {
        try {
            await requestResolution(ticket.id);
            alert('작성자에게 완료 처리를 요청했습니다.');
        } catch {
            alert('완료 요청에 실패했습니다.');
        }
    };

    const handleOpenEditModal = () => {
        setEditTitle(ticket.title);
        setEditDesc(ticket.description);
        setEditPriority(ticket.priority);
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTitle.trim() || !editDesc.trim()) return;
        setIsSubmittingEdit(true);
        try {
            await updateTicket(ticket.id, { title: editTitle, description: editDesc, priority: editPriority });
            setIsEditModalOpen(false);
        } catch (err) {
            console.error('Edit Error:', err);
            alert('업무 수정에 실패했습니다.');
        } finally {
            setIsSubmittingEdit(false);
        }
    };

    const handlePriorityChange = async (priority: TicketPriority) => {
        await updateTicket(ticket.id, { priority });
        setShowPriorityMenu(false);
    };

    const handleAssigneeChange = async (assigneeId?: string) => {
        await updateTicket(ticket.id, { assignee_id: assigneeId });
        setShowAssigneeMenu(false);
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('attachments').getPublicUrl(fileName);
            setPendingImageUrl(data.publicUrl);
        } catch {
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSend = async () => {
        if (!user || (!newMessage.trim() && !pendingImageUrl)) return;
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
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    };

    const canSend = !isSending && !isUploading && (!!newMessage.trim() || !!pendingImageUrl);

    return (
        <div className={`chat-area ambient-${ticket.priority}`}>
            <ChatHeader
                ticket={ticket}
                showBack={showBack}
                isBookmarkPanelOpen={isBookmarkPanelOpen}
                isAuthor={isAuthor}
                isLeader={isLeader}
                onBack={onBack}
                onToggleBookmarkPanel={() => setBookmarkPanelOpen(!isBookmarkPanelOpen)}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
                onShare={() => setIsShareModalOpen(true)}
            />

            <QuickActionBar
                ticket={ticket}
                workspaceMembers={workspaceMembers}
                isAuthor={isAuthor}
                isLeader={isLeader}
                showPriorityMenu={showPriorityMenu}
                showAssigneeMenu={showAssigneeMenu}
                priorityMenuRef={priorityMenuRef}
                assigneeMenuRef={assigneeMenuRef}
                priorityLabel={PRIORITY_LABEL}
                onTogglePriorityMenu={() => setShowPriorityMenu(v => !v)}
                onToggleAssigneeMenu={() => setShowAssigneeMenu(v => !v)}
                onPriorityChange={handlePriorityChange}
                onAssigneeChange={handleAssigneeChange}
                onRestore={() => updateTicketStatus(ticket.id, 'in_progress')}
                onResolve={() => updateTicketStatus(ticket.id, 'resolved')}
                onRequestResolution={handleRequestResolution}
            />

            <MessageList
                ref={chatMessagesRef}
                ticketId={ticket.id}
                ticketDescription={ticket.description}
                ticketCreatedAt={ticket.created_at}
                ticketImageUrl={ticket.image_url}
                ticketImageUrls={ticket.image_urls}
                requestingUserId={ticket.requesting_user_id}
                messages={messages}
                reactions={reactions}
                currentUserId={user?.id}
                hasNewMessage={hasNewMessage}
                messagesEndRef={messagesEndRef}
                onScroll={handleScroll}
                onScrollToNewMessage={handleScrollToNewMessage}
                onToggleReaction={toggleReaction}
                onMenuOpen={handleMenuOpen}
                onScrollToReply={handleScrollToReply}
            />

            <ChatInputArea
                newMessage={newMessage}
                isInternal={isInternal}
                isSending={isSending}
                isUploading={isUploading}
                pendingImageUrl={pendingImageUrl}
                replyTarget={replyTarget}
                canSend={canSend}
                fileInputRef={fileInputRef}
                textareaRef={textareaRef}
                onImageSelect={handleImageSelect}
                onMessageChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onSend={handleSend}
                onToggleInternal={setIsInternal}
                onClearReply={() => setReplyTarget(null)}
                onClearImage={() => setPendingImageUrl(null)}
            />

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
                                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required autoFocus />
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
                                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} required />
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

            <ShareTicketModal ticket={ticket} isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />

            {contextMenu && (
                <MessageContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    msg={contextMenu.msg}
                    isMe={contextMenu.msg.user_id === user?.id}
                    myReactions={(reactions[contextMenu.msg.id] ?? []).filter(r => r.user_id === user?.id).map(r => r.emoji)}
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

            {copyToast && <div className="copy-toast">복사됨</div>}
            {errorToast && <div className="copy-toast error-toast">{errorToast}</div>}

            <BookmarkPanel
                isOpen={isBookmarkPanelOpen}
                onClose={() => setBookmarkPanelOpen(false)}
                onScrollToMessage={handleScrollToReply}
            />
        </div>
    );
};
