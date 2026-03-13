import React, { useEffect, useState, useRef } from 'react';
import './TicketList.css';
import './TicketModal.css';
import { useTicketStore } from '../../store/ticketStore';
import { TicketTabs } from './TicketTabs';
import { Clock, Plus, X, RefreshCw, Search, Check, MoreVertical, Pencil, Trash2, Filter, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore, WorkspaceMemberProfile } from '../../store/authStore';
import { TicketPriority, Ticket } from '../../types/ticket';

interface SwipeableTicketItemProps {
    ticket: Ticket;
    isSelected: boolean;
    unreadCount: number;
    onSelect: () => void;
    canSwipe: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canRestore: boolean;
    onEdit: (ticket: Ticket) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    workspaceMembers: WorkspaceMemberProfile[];
}

const SwipeableTicketItem: React.FC<SwipeableTicketItemProps> = ({ ticket, isSelected, unreadCount, onSelect, canSwipe, canEdit, canDelete, canRestore, onEdit, onDelete, onRestore, workspaceMembers }) => {
    const { updateTicketStatus } = useTicketStore();
    const [swipeX, setSwipeX] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const startY = useRef(0);
    const isSwiping = useRef(false);
    const isVerticalScroll = useRef(false);
    const SWIPE_THRESHOLD = 100;

    // 외부 클릭 시 메뉴 닫기
    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
                setConfirmDelete(false);
            }
        };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [menuOpen]);

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (!canSwipe) return;
        const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
        const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;
        startX.current = pageX;
        startY.current = pageY;
        isSwiping.current = true;
        isVerticalScroll.current = false;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isSwiping.current || isVerticalScroll.current) return;

        const pageX = 'touches' in e ? e.touches[0].pageX : e.pageX;
        const pageY = 'touches' in e ? e.touches[0].pageY : e.pageY;

        const deltaX = pageX - startX.current;
        const deltaY = pageY - startY.current;

        // Check if user is scrolling vertically
        if (!isVerticalScroll.current && Math.abs(deltaY) > Math.abs(deltaX)) {
            isVerticalScroll.current = true;
            setSwipeX(0);
            return;
        }

        if (deltaX > 0) {
            // Horizontal swipe to the right
            if ('touches' in e) e.preventDefault(); // Prevent accidental vertical scroll during swipe
            setSwipeX(Math.min(deltaX, 150)); // Cap the visual movement
        } else {
            setSwipeX(0);
        }
    };

    const handleTouchEnd = async () => {
        if (!isSwiping.current) return;
        isSwiping.current = false;

        if (swipeX >= SWIPE_THRESHOLD) {
            // Trigger complete action
            try {
                await updateTicketStatus(ticket.id, 'resolved');
            } catch (err) {
                console.error('Swipe complete failed:', err);
                setSwipeX(0);
            }
        } else {
            // Reset position
            setSwipeX(0);
        }
    };

    return (
        <div className="ticket-item-wrapper">
            <div className={`swipe-bg ${swipeX > 20 ? 'visible' : ''}`}>
                <div className="swipe-content" style={{ opacity: Math.min(swipeX / SWIPE_THRESHOLD, 1) }}>
                    <Check size={20} />
                    <span>완료 처리</span>
                </div>
            </div>
            <div
                className={`ticket-item ${isSelected ? 'selected' : ''}`}
                style={{ transform: `translateX(${swipeX}px)`, zIndex: 1 }}
                onClick={onSelect}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                <div className="ticket-header">
                    <span className={`priority-badge ${ticket.priority}`}>
                        {ticket.priority.toUpperCase()}
                    </span>
                    <span className="time">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ko })}
                    </span>
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                    )}
                    {/* 더보기 버튼: 수정/삭제/원복 중 하나라도 권한 있을 때만 표시 */}
                    {(canEdit || canDelete || canRestore) && (
                        <div className="ticket-menu-wrap" ref={menuRef}>
                            <button
                                className="ticket-menu-btn"
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); setConfirmDelete(false); }}
                                title="더보기"
                            >
                                <MoreVertical size={14} />
                            </button>
                            {menuOpen && (
                                <div className="ticket-dropdown">
                                    {confirmDelete ? (
                                        <div className="ticket-dropdown-confirm">
                                            <span>정말 삭제할까요?</span>
                                            <div className="ticket-dropdown-confirm-btns">
                                                <button className="ticket-dropdown-del-confirm" onClick={(e) => { e.stopPropagation(); onDelete(ticket.id); setMenuOpen(false); }}>삭제</button>
                                                <button className="ticket-dropdown-cancel" onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}>취소</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {canEdit && (
                                                <button className="ticket-dropdown-item" onClick={(e) => { e.stopPropagation(); onEdit(ticket); setMenuOpen(false); }}>
                                                    <Pencil size={13} /> 수정
                                                </button>
                                            )}
                                            {canRestore && (
                                                <button className="ticket-dropdown-item" onClick={(e) => { e.stopPropagation(); onRestore(ticket.id); setMenuOpen(false); }}>
                                                    <RotateCcw size={13} /> 진행중으로 되돌리기
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button className="ticket-dropdown-item danger" onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}>
                                                    <Trash2 size={13} /> 삭제
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <h3 className="ticket-title">{ticket.title}</h3>
                {ticket.tags && ticket.tags.length > 0 && (
                    <div className="ticket-tags">
                        {ticket.tags.map(tag => (
                            <span key={tag} className="ticket-tag">{tag}</span>
                        ))}
                    </div>
                )}
                <p className="ticket-desc">{ticket.description}</p>
                {ticket.assignee_id && (() => {
                    const assignee = workspaceMembers.find(m => m.user_id === ticket.assignee_id);
                    return assignee ? (
                        <div className="ticket-assignee">
                            <span className="assignee-dot" />
                            {assignee.full_name ?? assignee.email}
                        </div>
                    ) : null;
                })()}
            </div>
        </div>
    );
};

export const TicketList: React.FC = () => {
    const { tickets, activeTab, selectedTicketId, setSelectedTicketId, fetchTickets, createTicket, deleteTicket, updateTicket, updateTicketStatus, isLoadingData, unreadCounts } = useTicketStore();
    const { user, currentWorkspace, currentWorkspaceRole, workspaceMembers } = useAuthStore();

    // 생성 모달 state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
    const [newImage, setNewImage] = useState<File | null>(null);
    const [newTags, setNewTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 수정 모달 state
    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editPriority, setEditPriority] = useState<TicketPriority>('medium');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);

    const TICKET_TAGS = ['출고', '배송', '반품', '환불', '교환', '재고', '결제', '인사', '기타'];

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState<TicketPriority | null>(null);
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [showFilterBar, setShowFilterBar] = useState(false);

    // 생성 모달 담당자 state
    const [newAssigneeId, setNewAssigneeId] = useState('');
    // 수정 모달 담당자 state
    const [editAssigneeId, setEditAssigneeId] = useState('');

    // Pull-to-refresh state
    const [pullDistance, setPullDistance] = useState(0);
    const isPulling = useRef(false);
    const pullStartY = useRef(0);
    const listBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentWorkspace) {
            fetchTickets();
        }
    }, [fetchTickets, currentWorkspace]);

    // --- Pull-to-Refresh (on the list body only) ---
    const handleListTouchStart = (e: React.TouchEvent) => {
        const el = listBodyRef.current;
        if (el && el.scrollTop === 0) {
            pullStartY.current = e.touches[0].pageY;
            isPulling.current = true;
        }
    };

    const handleListTouchMove = (e: React.TouchEvent) => {
        if (!isPulling.current) return;
        const diff = e.touches[0].pageY - pullStartY.current;
        if (diff > 0) {
            setPullDistance(Math.min(diff * 0.4, 80));
        }
    };

    const handleListTouchEnd = async () => {
        if (!isPulling.current) return;
        isPulling.current = false;
        if (pullDistance > 50) {
            await fetchTickets();
        }
        setPullDistance(0);
    };

    const q = searchQuery.trim().toLowerCase();
    const filteredTickets = tickets
        .filter(t => t.status === activeTab)
        .filter(t => !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
        .filter(t => !filterPriority || t.priority === filterPriority)
        .filter(t => filterTags.length === 0 || filterTags.some(tag => (t.tags ?? []).includes(tag)));

    const activeFilterCount = (filterPriority ? 1 : 0) + (filterTags.length > 0 ? 1 : 0);

    const handleEditOpen = (ticket: Ticket) => {
        setEditingTicket(ticket);
        setEditTitle(ticket.title);
        setEditDesc(ticket.description);
        setEditPriority(ticket.priority);
        setEditTags(ticket.tags ?? []);
        setEditAssigneeId(ticket.assignee_id ?? '');
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTicket || !editTitle.trim() || !editDesc.trim()) return;
        setIsEditSubmitting(true);
        try {
            await updateTicket(editingTicket.id, {
                title: editTitle.trim(),
                description: editDesc.trim(),
                priority: editPriority,
                tags: editTags,
                assignee_id: editAssigneeId || undefined,
            });
            setEditingTicket(null);
        } catch (err) {
            console.error('Update Ticket Error:', err);
            alert('수정 실패. 다시 시도해주세요.');
        } finally {
            setIsEditSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteTicket(id);
        } catch (err) {
            console.error('Delete Ticket Error:', err);
            alert('삭제 실패. 다시 시도해주세요.');
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await updateTicketStatus(id, 'in_progress');
        } catch (err) {
            console.error('Restore Ticket Error:', err);
            alert('원복 실패. 다시 시도해주세요.');
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentWorkspace) {
            alert('새 워크스페이스를 먼저 추가하거나 선택해주세요.');
            return;
        }
        if (!user || !newTitle.trim() || !newDesc.trim()) return;

        setIsSubmitting(true);
        try {
            let imageUrl = undefined;
            if (newImage) {
                imageUrl = await useTicketStore.getState().uploadImage(newImage);
            }
            await createTicket(newTitle, newDesc, newPriority, user.id, currentWorkspace.id, imageUrl, newTags, newAssigneeId || undefined);
            setIsModalOpen(false);
            setNewTitle('');
            setNewDesc('');
            setNewPriority('medium');
            setNewImage(null);
            setNewTags([]);
            setNewAssigneeId('');
        } catch (err: any) {
            console.error('Create Ticket Error:', err);
            const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
            alert(`티켓 생성 실패: ${errorMessage}\n\n잠시 후 다시 시도해주세요.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!currentWorkspace) {
        return (
            <div className="ticket-list-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '2rem' }}>
                <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '3rem 2rem', borderRadius: '16px', maxWidth: '400px', backdropFilter: 'blur(10px)' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>CS_talk 시작하기</h3>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
                        좌측 스위처 메뉴의 <b>+</b> 버튼을 눌러 새 워크스페이스를 만들거나, 초대받은 그룹을 선택해주세요.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="ticket-list-container">
            <div className="ticket-list-header">

                <h2 className="title">업무 요청</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className="icon-btn-refresh"
                        onClick={() => fetchTickets()}
                        title="새로고침"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button className="icon-btn-create" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} /> 업무 등록
                    </button>
                </div>
            </div>

            <TicketTabs />

            {/* 검색창 */}
            <div className="search-bar">
                <Search size={15} className="search-icon" />
                <input
                    type="text"
                    className="search-input"
                    placeholder="제목 또는 내용으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* 필터 토글 버튼 */}
            <div className="filter-toggle-row">
                <button
                    className={`filter-toggle-btn ${showFilterBar ? 'active' : ''} ${activeFilterCount > 0 ? 'has-filter' : ''}`}
                    onClick={() => setShowFilterBar(v => !v)}
                >
                    <Filter size={13} />
                    필터{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>
                {activeFilterCount > 0 && (
                    <button className="filter-reset-btn" onClick={() => { setFilterPriority(null); setFilterTags([]); }}>
                        초기화
                    </button>
                )}
            </div>

            {/* 필터 바 */}
            {showFilterBar && (
                <div className="filter-bar">
                    <div className="filter-section">
                        <span className="filter-label">우선순위</span>
                        <div className="filter-chips">
                            {(['urgent', 'high', 'medium', 'low'] as TicketPriority[]).map(p => (
                                <button
                                    key={p}
                                    className={`filter-chip priority-chip ${p} ${filterPriority === p ? 'selected' : ''}`}
                                    onClick={() => setFilterPriority(prev => prev === p ? null : p)}
                                >
                                    {p === 'urgent' ? '긴급' : p === 'high' ? '높음' : p === 'medium' ? '보통' : '낮음'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="filter-section">
                        <span className="filter-label">태그</span>
                        <div className="filter-chips">
                            {TICKET_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    className={`filter-chip tag-filter-chip ${filterTags.includes(tag) ? 'selected' : ''}`}
                                    onClick={() => setFilterTags(prev =>
                                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                    )}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Pull-to-refresh indicator */}
            {pullDistance > 0 && (
                <div className="pull-indicator" style={{ height: pullDistance }}>
                    {pullDistance > 50 ? '🔄 놓아서 새로고침' : '⬇️ 계속 당기세요...'}
                </div>
            )}

            <div
                className="ticket-list-body"
                ref={listBodyRef}
                onTouchStart={handleListTouchStart}
                onTouchMove={handleListTouchMove}
                onTouchEnd={handleListTouchEnd}
            >
                {isLoadingData ? (
                    <div className="empty-state">데이터를 불러오는 중...</div>
                ) : filteredTickets.length === 0 ? (
                    <div className="empty-state">
                        {searchQuery.trim() ? `"${searchQuery.trim()}" 검색 결과가 없습니다.` : '해당 상태의 티켓이 없습니다.'}
                    </div>
                ) : (
                    filteredTickets.map(ticket => {
                        const isCreator = user?.id === ticket.requesting_user_id;
                        const isLeader = currentWorkspaceRole === 'leader';
                        return (
                            <SwipeableTicketItem
                                key={ticket.id}
                                ticket={ticket}
                                isSelected={selectedTicketId === ticket.id}
                                unreadCount={unreadCounts[ticket.id] ?? 0}
                                onSelect={() => setSelectedTicketId(ticket.id)}
                                canSwipe={activeTab === 'in_progress'}
                                canEdit={isCreator && activeTab === 'in_progress'}
                                canDelete={isCreator || isLeader}
                                canRestore={(isCreator || isLeader) && activeTab === 'resolved'}
                                onEdit={handleEditOpen}
                                onDelete={handleDelete}
                                onRestore={handleRestore}
                                workspaceMembers={workspaceMembers}
                            />
                        );
                    })
                )}
            </div>

            {/* New Ticket Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content"
                        onPaste={(e) => {
                            const items = e.clipboardData?.items;
                            if (items) {
                                for (let i = 0; i < items.length; i++) {
                                    if (items[i].type.indexOf('image') !== -1) {
                                        const file = items[i].getAsFile();
                                        if (file) {
                                            setNewImage(file);
                                            e.preventDefault();
                                            break;
                                        }
                                    }
                                }
                            }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                                setNewImage(file);
                            }
                        }}
                    >
                        <div className="modal-header">
                            <h3>새 업무 등록</h3>
                            <button className="icon-btn-close" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="modal-form">
                            <div className="form-group">
                                <label>요청 제목</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="무엇을 도와드릴까요?"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>우선 순위</label>
                                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TicketPriority)}>
                                    <option value="low">낮음 (여유 시 처리)</option>
                                    <option value="medium">보통 (일반 요청)</option>
                                    <option value="high">높음 (빠른 처리 요망)</option>
                                    <option value="urgent">긴급 (즉시 처리 및 장애)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>상세 내용</label>
                                <textarea
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="상세한 요청 내용이나 오류 상황을 적어주세요."
                                    rows={4}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>태그</label>
                                <div className="tag-selector">
                                    {TICKET_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            className={`tag-chip ${newTags.includes(tag) ? 'selected' : ''}`}
                                            onClick={() => setNewTags(prev =>
                                                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                            )}
                                        >{tag}</button>
                                    ))}
                                </div>
                            </div>
                            {workspaceMembers.length > 0 && (
                                <div className="form-group">
                                    <label>담당자</label>
                                    <select value={newAssigneeId} onChange={e => setNewAssigneeId(e.target.value)}>
                                        <option value="">담당자 없음</option>
                                        {workspaceMembers.map(m => (
                                            <option key={m.user_id} value={m.user_id}>
                                                {m.full_name ?? m.email}{m.role === 'leader' ? ' (리더)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-group">
                                <label>첨부 이미지 (사진 선택, 캡처 붙여넣기, 또는 드래그 앤 드롭)</label>
                                {newImage && (
                                    <div className="image-preview" style={{ marginBottom: '8px', fontSize: '0.85rem', color: 'var(--accent-success)' }}>
                                        ✅ 이미지 첨부됨: {newImage.name}
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setNewImage(e.target.files?.[0] || null)}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>취소</button>
                                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                                    {isSubmitting ? '등록 중...' : '등록하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 수정 모달 */}
            {editingTicket && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>업무 수정</h3>
                            <button className="icon-btn-close" onClick={() => setEditingTicket(null)}>
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
                                <label>태그</label>
                                <div className="tag-selector">
                                    {TICKET_TAGS.map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            className={`tag-chip ${editTags.includes(tag) ? 'selected' : ''}`}
                                            onClick={() => setEditTags(prev =>
                                                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                            )}
                                        >{tag}</button>
                                    ))}
                                </div>
                            </div>
                            {workspaceMembers.length > 0 && (
                                <div className="form-group">
                                    <label>담당자</label>
                                    <select value={editAssigneeId} onChange={e => setEditAssigneeId(e.target.value)}>
                                        <option value="">담당자 없음</option>
                                        {workspaceMembers.map(m => (
                                            <option key={m.user_id} value={m.user_id}>
                                                {m.full_name ?? m.email}{m.role === 'leader' ? ' (리더)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                                <button type="button" className="btn-cancel" onClick={() => setEditingTicket(null)}>취소</button>
                                <button type="submit" className="btn-submit" disabled={isEditSubmitting}>
                                    {isEditSubmitting ? '저장 중...' : '저장하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
