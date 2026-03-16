import React from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { WorkspaceMemberProfile } from '../../store/authStore';
import { Ticket, TicketPriority } from '../../types/ticket';
import './ChatArea.css';

export interface QuickActionBarProps {
  ticket: Ticket;
  workspaceMembers: WorkspaceMemberProfile[];
  isAuthor: boolean;
  isLeader: boolean;
  showPriorityMenu: boolean;
  showAssigneeMenu: boolean;
  priorityMenuRef: React.RefObject<HTMLDivElement>;
  assigneeMenuRef: React.RefObject<HTMLDivElement>;
  priorityLabel: Record<TicketPriority, string>;
  onTogglePriorityMenu: () => void;
  onToggleAssigneeMenu: () => void;
  onPriorityChange: (priority: TicketPriority) => Promise<void>;
  onAssigneeChange: (assigneeId?: string) => Promise<void>;
  onRestore: () => void;
  onResolve: () => void;
  onRequestResolution: () => void;
}

const PRIORITIES: TicketPriority[] = ['urgent', 'high', 'medium', 'low'];

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  ticket,
  workspaceMembers,
  isAuthor,
  isLeader,
  showPriorityMenu,
  showAssigneeMenu,
  priorityMenuRef,
  assigneeMenuRef,
  priorityLabel,
  onTogglePriorityMenu,
  onToggleAssigneeMenu,
  onPriorityChange,
  onAssigneeChange,
  onRestore,
  onResolve,
  onRequestResolution,
}) => {
  const assigneeLabel = ticket.assignee_id
    ? workspaceMembers.find((m) => m.user_id === ticket.assignee_id)?.full_name
      ?? workspaceMembers.find((m) => m.user_id === ticket.assignee_id)?.email
      ?? '담당자'
    : '담당자 없음';

  return (
    <div className="quick-action-bar">
      <div className="qa-chip-wrap" ref={priorityMenuRef}>
        <button className={`qa-chip priority-chip ${ticket.priority}`} onClick={onTogglePriorityMenu}>
          {priorityLabel[ticket.priority]}
          <ChevronDown size={11} />
        </button>
        {showPriorityMenu && (
          <div className="qa-dropdown">
            {PRIORITIES.map((priority) => (
              <button
                key={priority}
                className={`qa-dropdown-item ${ticket.priority === priority ? 'active' : ''}`}
                onClick={() => onPriorityChange(priority)}
              >
                {priorityLabel[priority]}
              </button>
            ))}
          </div>
        )}
      </div>

      {workspaceMembers.length > 0 && (
        <div className="qa-chip-wrap" ref={assigneeMenuRef}>
          <button className="qa-chip assignee-chip" onClick={onToggleAssigneeMenu}>
            {assigneeLabel}
            <ChevronDown size={11} />
          </button>
          {showAssigneeMenu && (
            <div className="qa-dropdown">
              <button
                className={`qa-dropdown-item ${!ticket.assignee_id ? 'active' : ''}`}
                onClick={() => onAssigneeChange(undefined)}
              >
                없음
              </button>
              {workspaceMembers.map((member) => (
                <button
                  key={member.user_id}
                  className={`qa-dropdown-item ${ticket.assignee_id === member.user_id ? 'active' : ''}`}
                  onClick={() => onAssigneeChange(member.user_id)}
                >
                  {member.full_name ?? member.email}{member.role === 'leader' ? ' (리더)' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="qa-actions">
        {ticket.status === 'resolved' ? (
          (isAuthor || isLeader) && (
            <button className="qa-btn qa-btn-restore" onClick={onRestore}>
              <RotateCcw size={12} /> 되돌리기
            </button>
          )
        ) : isAuthor ? (
          <button className="qa-btn qa-btn-resolve" onClick={onResolve}>
            완료 처리
          </button>
        ) : ticket.resolve_requested ? (
          <span className="resolve-requested-badge">완료 확인 대기중</span>
        ) : (
          <button className="qa-btn qa-btn-request" onClick={onRequestResolution}>
            완료 요청
          </button>
        )}
      </div>
    </div>
  );
};
