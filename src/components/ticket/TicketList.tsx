import React, { useEffect, useState, useRef } from 'react';
import './TicketList.css';
import './TicketModal.css';
import { useTicketStore } from '../../store/ticketStore';
import { TicketTabs } from './TicketTabs';
import { Clock, Plus, X, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useAuthStore } from '../../store/authStore';
import { TicketPriority } from '../../types/ticket';

export const TicketList: React.FC = () => {
    const { tickets, activeTab, selectedTicketId, setSelectedTicketId, fetchTickets, createTicket, isLoadingData, unreadCounts } = useTicketStore();
    const { user } = useAuthStore();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newPriority, setNewPriority] = useState<TicketPriority>('medium');
    const [newImage, setNewImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pull-to-refresh state
    const [pullDistance, setPullDistance] = useState(0);
    const isPulling = useRef(false);
    const pullStartY = useRef(0);
    const listBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

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

    const filteredTickets = tickets.filter(t => t.status === activeTab);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newTitle.trim() || !newDesc.trim()) return;

        setIsSubmitting(true);
        try {
            let imageUrl = undefined;
            if (newImage) {
                imageUrl = await useTicketStore.getState().uploadImage(newImage);
            }
            await createTicket(newTitle, newDesc, newPriority, user.id, imageUrl);
            setIsModalOpen(false);
            setNewTitle('');
            setNewDesc('');
            setNewPriority('medium');
            setNewImage(null);
        } catch (err: any) {
            console.error('Create Ticket Error:', err);
            const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
            alert(`티켓 생성 실패: ${errorMessage}\n\n잠시 후 다시 시도해주세요.`);
        } finally {
            setIsSubmitting(false);
        }
    };

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
                                {(unreadCounts[ticket.id] ?? 0) > 0 && (
                                    <span className="unread-badge">{unreadCounts[ticket.id]}</span>
                                )}
                            </div>
                            <h3 className="ticket-title">{ticket.title}</h3>
                            <p className="ticket-desc">{ticket.description}</p>
                        </div>
                    ))
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
        </div>
    );
};
