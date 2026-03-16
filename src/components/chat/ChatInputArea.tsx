import React from 'react';
import { FilePlus, Send, X } from 'lucide-react';
import { Message } from '../../types/ticket';
import './ChatArea.css';

export interface ChatInputAreaProps {
  newMessage: string;
  isInternal: boolean;
  isSending: boolean;
  isUploading: boolean;
  pendingImageUrl: string | null;
  replyTarget: Message | null;
  canSend: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onMessageChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onToggleInternal: (checked: boolean) => void;
  onClearReply: () => void;
  onClearImage: () => void;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  newMessage,
  isInternal,
  isSending,
  isUploading,
  pendingImageUrl,
  replyTarget,
  canSend,
  fileInputRef,
  textareaRef,
  onImageSelect,
  onMessageChange,
  onKeyDown,
  onSend,
  onToggleInternal,
  onClearReply,
  onClearImage,
}) => {
  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onImageSelect}
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
          <button className="reply-preview-cancel" onClick={onClearReply}>
            <X size={14} />
          </button>
        </div>
      )}

      {pendingImageUrl && (
        <div className="pending-image-preview">
          <img src={pendingImageUrl} alt="첨부 예정" />
          <button className="remove-image-btn" onClick={onClearImage}>
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
            onChange={onMessageChange}
            onKeyDown={onKeyDown}
            placeholder={isInternal ? '내부 메모 작성...' : '메시지 입력 (Enter로 전송)'}
            rows={1}
            disabled={isSending || isUploading}
          />
        </div>

        <button className="icon-btn send-btn" onClick={onSend} disabled={!canSend}>
          <Send size={20} />
        </button>
      </div>

      <div className={`chat-input-footer${isInternal ? ' internal-mode' : ''}`}>
        <label className={`toggle-internal${isInternal ? ' active' : ''}`}>
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(event) => onToggleInternal(event.target.checked)}
          />
          <span className="toggle-internal-dot" />
          <span>내부 메모 {isInternal ? '(팀원만 볼 수 있음)' : '로 전송'}</span>
        </label>
      </div>
    </>
  );
};
