import React from 'react';
import { X } from 'lucide-react';
import { Ticket, TicketPriority } from '../../types/ticket';
import { WorkspaceMemberProfile } from '../../store/authStore';
import './TicketModal.css';

export interface TicketEditModalProps {
    ticket: Ticket | null;
    title: string;
    description: string;
    priority: TicketPriority;
    tags: string[];
    assigneeId: string;
    isSubmitting: boolean;
    ticketTags: string[];
    workspaceMembers: WorkspaceMemberProfile[];
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onPriorityChange: (value: TicketPriority) => void;
    onTagToggle: (tag: string) => void;
    onAssigneeChange: (value: string) => void;
}

export const TicketEditModal: React.FC<TicketEditModalProps> = (props) => {
    if (!props.ticket) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>업무 수정</h3>
                    <button className="icon-btn-close" onClick={props.onClose}><X size={20} /></button>
                </div>
                <form onSubmit={props.onSubmit} className="modal-form">
                    <div className="form-group">
                        <label>요청 제목</label>
                        <input type="text" value={props.title} onChange={(e) => props.onTitleChange(e.target.value)} required autoFocus />
                    </div>
                    <div className="form-group">
                        <label>우선 순위</label>
                        <select value={props.priority} onChange={(e) => props.onPriorityChange(e.target.value as TicketPriority)}>
                            <option value="low">낮음 (여유 시 처리)</option>
                            <option value="medium">보통 (일반 요청)</option>
                            <option value="high">높음 (빠른 처리 요망)</option>
                            <option value="urgent">긴급 (즉시 처리 및 장애)</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>태그</label>
                        <div className="tag-selector">
                            {props.ticketTags.map((tag) => (
                                <button key={tag} type="button" className={`tag-chip ${props.tags.includes(tag) ? 'selected' : ''}`} onClick={() => props.onTagToggle(tag)}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    {props.workspaceMembers.length > 0 && (
                        <div className="form-group">
                            <label>담당자</label>
                            <select value={props.assigneeId} onChange={(e) => props.onAssigneeChange(e.target.value)}>
                                <option value="">담당자 없음</option>
                                {props.workspaceMembers.map((m) => (
                                    <option key={m.user_id} value={m.user_id}>
                                        {m.full_name ?? m.email}{m.role === 'leader' ? ' (리더)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label>상세 내용</label>
                        <textarea value={props.description} onChange={(e) => props.onDescriptionChange(e.target.value)} rows={4} required />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={props.onClose}>취소</button>
                        <button type="submit" className="btn-submit" disabled={props.isSubmitting}>
                            {props.isSubmitting ? '저장 중...' : '저장하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
