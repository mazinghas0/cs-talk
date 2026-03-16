import React from 'react';
import { X } from 'lucide-react';
import { TicketPriority } from '../../types/ticket';
import { WorkspaceMemberProfile } from '../../store/authStore';
import './TicketModal.css';

export interface TicketCreateModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    priority: TicketPriority;
    tags: string[];
    assigneeId: string;
    image: File | null;
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
    onImageChange: (file: File | null) => void;
}

export const TicketCreateModal: React.FC<TicketCreateModalProps> = (props) => {
    if (!props.isOpen) return null;

    return (
        <div className="modal-overlay">
            <div
                className="modal-content"
                onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf('image') !== -1) {
                            const file = items[i].getAsFile();
                            if (file) { props.onImageChange(file); e.preventDefault(); break; }
                        }
                    }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith('image/')) props.onImageChange(file);
                }}
            >
                <div className="modal-header">
                    <h3>새 업무 등록</h3>
                    <button className="icon-btn-close" onClick={props.onClose}><X size={20} /></button>
                </div>
                <form onSubmit={props.onSubmit} className="modal-form">
                    <div className="form-group">
                        <label>요청 제목</label>
                        <input type="text" value={props.title} onChange={(e) => props.onTitleChange(e.target.value)} placeholder="무엇을 도와드릴까요?" required autoFocus />
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
                        <label>상세 내용</label>
                        <textarea value={props.description} onChange={(e) => props.onDescriptionChange(e.target.value)} placeholder="상세한 요청 내용이나 오류 상황을 적어주세요." rows={4} required />
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
                        <label>첨부 이미지 (사진 선택, 캡처 붙여넣기, 또는 드래그 앤 드롭)</label>
                        {props.image && (
                            <div className="image-preview" style={{ marginBottom: '8px', fontSize: '0.85rem', color: 'var(--accent-success)' }}>
                                ✅ 이미지 첨부됨: {props.image.name}
                            </div>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => props.onImageChange(e.target.files?.[0] || null)} />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={props.onClose}>취소</button>
                        <button type="submit" className="btn-submit" disabled={props.isSubmitting}>
                            {props.isSubmitting ? '등록 중...' : '등록하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
