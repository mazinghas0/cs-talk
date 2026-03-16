import React from 'react';
import { Bookmark, ChevronLeft, Edit2, Share2, Trash2 } from 'lucide-react';
import { Ticket } from '../../types/ticket';
import './ChatArea.css';

export interface ChatHeaderProps {
  ticket: Ticket;
  showBack?: boolean;
  isBookmarkPanelOpen: boolean;
  isAuthor: boolean;
  isLeader: boolean;
  onBack?: () => void;
  onToggleBookmarkPanel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  ticket,
  showBack,
  isBookmarkPanelOpen,
  isAuthor,
  isLeader,
  onBack,
  onToggleBookmarkPanel,
  onEdit,
  onDelete,
  onShare,
}) => {
  return (
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
          onClick={onToggleBookmarkPanel}
          title="북마크"
        >
          <Bookmark size={16} />
        </button>

        {isAuthor && (
          <button className="icon-btn-header" onClick={onEdit} title="수정">
            <Edit2 size={16} />
          </button>
        )}

        {(isAuthor || isLeader) && (
          <button className="icon-btn-header" onClick={onDelete} title="삭제">
            <Trash2 size={16} />
          </button>
        )}

        <button className="icon-btn-header share-btn" onClick={onShare} title="고객에게 공유">
          <Share2 size={16} />
        </button>
      </div>
    </div>
  );
};
