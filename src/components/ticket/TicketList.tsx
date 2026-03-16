import React, { useEffect, useState, useRef, useCallback } from 'react';
import './TicketList.css';
import './TicketModal.css';
import { useTicketStore } from '../../store/ticketStore';
import { TicketTabs } from './TicketTabs';
import { useAuthStore } from '../../store/authStore';
import { TicketPriority, Ticket } from '../../types/ticket';
import { TicketItem } from './TicketItem';
import { TicketListHeader } from './TicketListHeader';
import { TicketSearchBar } from './TicketSearchBar';
import { TicketFilterBar } from './TicketFilterBar';
import { TicketCreateModal } from './TicketCreateModal';
import { TicketEditModal } from './TicketEditModal';

const TICKET_TAGS = ['출고', '배송', '반품', '환불', '교환', '재고', '결제', '인사', '기타'];

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
    const [newAssigneeId, setNewAssigneeId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 수정 모달 state
    const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editPriority, setEditPriority] = useState<TicketPriority>('medium');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editAssigneeId, setEditAssigneeId] = useState('');
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);

    // 검색 & 필터 state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState<TicketPriority | null>(null);
    const [filterTags, setFilterTags] = useState<string[]>([]);
    const [showFilterBar, setShowFilterBar] = useState(false);

    // Pull-to-refresh state
    const [pullDistance, setPullDistance] = useState(0);
    const isPulling = useRef(false);
    const pullStartY = useRef(0);
    const listBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentWorkspace) fetchTickets();
    }, [fetchTickets, currentWorkspace]);

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
        if (diff > 0) setPullDistance(Math.min(diff * 0.4, 80));
    };

    const handleListTouchEnd = async () => {
        if (!isPulling.current) return;
        isPulling.current = false;
        if (pullDistance > 50) await fetchTickets();
        setPullDistance(0);
    };

    const q = searchQuery.trim().toLowerCase();
    const filteredTickets = tickets
        .filter(t => t.status === activeTab)
        .filter(t => !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
        .filter(t => !filterPriority || t.priority === filterPriority)
        .filter(t => filterTags.length === 0 || filterTags.some(tag => (t.tags ?? []).includes(tag)));

    const activeFilterCount = (filterPriority ? 1 : 0) + (filterTags.length > 0 ? 1 : 0);

    const handleEditOpen = useCallback((ticket: Ticket) => {
        setEditingTicket(ticket);
        setEditTitle(ticket.title);
        setEditDesc(ticket.description);
        setEditPriority(ticket.priority);
        setEditTags(ticket.tags ?? []);
        setEditAssigneeId(ticket.assignee_id ?? '');
    }, []);

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

    const handleDelete = useCallback(async (id: string) => {
        try {
            await deleteTicket(id);
        } catch (err) {
            console.error('Delete Ticket Error:', err);
            alert('삭제 실패. 다시 시도해주세요.');
        }
    }, [deleteTicket]);

    const handleRestore = useCallback(async (id: string) => {
        try {
            await updateTicketStatus(id, 'in_progress');
        } catch (err) {
            console.error('Restore Ticket Error:', err);
            alert('원복 실패. 다시 시도해주세요.');
        }
    }, [updateTicketStatus]);

    const handleResolve = useCallback(async (id: string) => {
        try {
            await updateTicketStatus(id, 'resolved');
        } catch (err) {
            console.error('Resolve Ticket Error:', err);
        }
    }, [updateTicketStatus]);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentWorkspace) { alert('새 워크스페이스를 먼저 추가하거나 선택해주세요.'); return; }
        if (!user || !newTitle.trim() || !newDesc.trim()) return;
        setIsSubmitting(true);
        try {
            let imageUrl = undefined;
            if (newImage) imageUrl = await useTicketStore.getState().uploadImage(newImage);
            await createTicket(newTitle, newDesc, newPriority, user.id, currentWorkspace.id, imageUrl, newTags, newAssigneeId || undefined);
            setIsModalOpen(false);
            setNewTitle(''); setNewDesc(''); setNewPriority('medium'); setNewImage(null); setNewTags([]); setNewAssigneeId('');
        } catch (err: unknown) {
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
            <TicketListHeader onRefresh={fetchTickets} onCreate={() => setIsModalOpen(true)} />
            <TicketTabs />
            <TicketSearchBar value={searchQuery} onChange={setSearchQuery} onClear={() => setSearchQuery('')} />
            <TicketFilterBar
                ticketTags={TICKET_TAGS}
                showFilterBar={showFilterBar}
                activeFilterCount={activeFilterCount}
                filterPriority={filterPriority}
                filterTags={filterTags}
                onToggleBar={() => setShowFilterBar(v => !v)}
                onReset={() => { setFilterPriority(null); setFilterTags([]); }}
                onPriorityChange={(p) => setFilterPriority(prev => prev === p ? null : p)}
                onTagToggle={(tag) => setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
            />

            {pullDistance > 0 && (
                <div className="pull-indicator" style={{ height: pullDistance }}>
                    {pullDistance > 50 ? '🔄 놓아서 새로고침' : '⬇️ 계속 당기세요...'}
                </div>
            )}

            <div className="ticket-list-body" ref={listBodyRef} onTouchStart={handleListTouchStart} onTouchMove={handleListTouchMove} onTouchEnd={handleListTouchEnd}>
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
                            <TicketItem
                                key={ticket.id}
                                ticket={ticket}
                                isSelected={selectedTicketId === ticket.id}
                                unreadCount={unreadCounts[ticket.id] ?? 0}
                                canSwipe={activeTab === 'in_progress'}
                                canEdit={isCreator && activeTab === 'in_progress'}
                                canDelete={isCreator || isLeader}
                                canRestore={(isCreator || isLeader) && activeTab === 'resolved'}
                                workspaceMembers={workspaceMembers}
                                onSelect={setSelectedTicketId}
                                onEdit={handleEditOpen}
                                onDelete={handleDelete}
                                onRestore={handleRestore}
                                onResolve={handleResolve}
                            />
                        );
                    })
                )}
            </div>

            <TicketCreateModal
                isOpen={isModalOpen}
                title={newTitle}
                description={newDesc}
                priority={newPriority}
                tags={newTags}
                assigneeId={newAssigneeId}
                image={newImage}
                isSubmitting={isSubmitting}
                ticketTags={TICKET_TAGS}
                workspaceMembers={workspaceMembers}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateSubmit}
                onTitleChange={setNewTitle}
                onDescriptionChange={setNewDesc}
                onPriorityChange={setNewPriority}
                onTagToggle={(tag) => setNewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                onAssigneeChange={setNewAssigneeId}
                onImageChange={setNewImage}
            />

            <TicketEditModal
                ticket={editingTicket}
                title={editTitle}
                description={editDesc}
                priority={editPriority}
                tags={editTags}
                assigneeId={editAssigneeId}
                isSubmitting={isEditSubmitting}
                ticketTags={TICKET_TAGS}
                workspaceMembers={workspaceMembers}
                onClose={() => setEditingTicket(null)}
                onSubmit={handleEditSubmit}
                onTitleChange={setEditTitle}
                onDescriptionChange={setEditDesc}
                onPriorityChange={setEditPriority}
                onTagToggle={(tag) => setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                onAssigneeChange={setEditAssigneeId}
            />
        </div>
    );
};
