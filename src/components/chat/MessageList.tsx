import React, { forwardRef } from 'react';
import { format, isSameDay, isSameMinute } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Message } from '../../types/ticket';
import { MessageBubble } from './MessageBubble';
import './ChatArea.css';

interface ReplyPreview {
  msgId: string;
  content: string;
  sender: string;
}

export interface MessageListProps {
  ticketId: string;
  ticketDescription: string;
  ticketCreatedAt: string;
  ticketImageUrl?: string;
  ticketImageUrls?: string[];
  requestingUserId: string;
  messages: Message[];
  reactions: Record<string, { id: string; user_id: string; emoji: string; created_at: string; message_id: string }[]>;
  currentUserId?: string;
  hasNewMessage: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
  onScrollToNewMessage: () => void;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  onMenuOpen: (pos: { x: number; y: number }, msg: Message) => void;
  onScrollToReply: (msgId: string) => void;
}

function getReplyPreview(messages: Message[], msg: Message): ReplyPreview | null {
  if (!msg.thread_parent_id) return null;
  const parent = messages.find((item) => item.id === msg.thread_parent_id);
  if (!parent) return null;

  return {
    msgId: parent.id,
    content: parent.content,
    sender: parent.customer_name || parent.profiles?.full_name || '알 수 없음',
  };
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  {
    ticketId,
    ticketDescription,
    ticketCreatedAt,
    ticketImageUrl,
    ticketImageUrls,
    requestingUserId,
    messages,
    reactions,
    currentUserId,
    hasNewMessage,
    messagesEndRef,
    onScroll,
    onScrollToNewMessage,
    onToggleReaction,
    onMenuOpen,
    onScrollToReply,
  },
  scrollRef,
) {
  return (
    <div className="chat-messages" ref={scrollRef} onScroll={onScroll}>
      {hasNewMessage && <button className="new-message-toast" onClick={onScrollToNewMessage}>새 메시지 ↓</button>}

      <div className="message-wrapper user-req">
        <div
          className="message-bubble req-bubble"
          onContextMenu={(e) => {
            e.preventDefault();
            onMenuOpen({ x: e.clientX, y: e.clientY }, {
              id: `ticket-desc-${ticketId}`,
              ticket_id: ticketId,
              user_id: requestingUserId,
              content: ticketDescription,
              is_internal_note: false,
              is_resolution: false,
              image_url: ticketImageUrl,
              created_at: ticketCreatedAt,
            });
          }}
        >
          <p className="msg-text">{ticketDescription}</p>
          {(() => {
            const urls = ticketImageUrls && ticketImageUrls.length > 0
              ? ticketImageUrls
              : ticketImageUrl ? [ticketImageUrl] : [];
            if (urls.length === 0) return null;
            return (
              <div className={`attached-image-grid count-${urls.length}`}>
                {urls.map((url, i) => (
                  <img key={i} src={url} alt={`첨부 이미지 ${i + 1}`} className="attached-image" loading="lazy" />
                ))}
              </div>
            );
          })()}
          <span className="msg-time">{format(new Date(ticketCreatedAt), 'a h:mm', { locale: ko })} (최초 요청)</span>
        </div>
      </div>

      {messages.map((msg, idx) => {
        const prevMsg = idx > 0 ? messages[idx - 1] : null;
        const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
        const msgDate = new Date(msg.created_at);
        const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
        const showDateDivider = !prevDate || !isSameDay(msgDate, prevDate);
        const isInternalMsg = msg.is_internal_note;
        const isMe = msg.user_id === currentUserId;
        const senderName = msg.customer_name || msg.profiles?.full_name || msg.profiles?.email?.split('@')[0] || '익명';
        const isContinued = !isInternalMsg && !!prevMsg && !prevMsg.is_internal_note && prevMsg.user_id === msg.user_id && !showDateDivider && isSameMinute(msgDate, new Date(prevMsg.created_at));
        const isLastInGroup = !nextMsg || nextMsg.is_internal_note || nextMsg.user_id !== msg.user_id || !isSameMinute(new Date(nextMsg.created_at), msgDate);

        return (
          <React.Fragment key={msg.id}>
            {showDateDivider && <div className="date-divider"><span>{format(msgDate, 'yyyy년 M월 d일 (EEE)', { locale: ko })}</span></div>}
            <MessageBubble
              msg={msg}
              isMe={isMe}
              isInternalMsg={isInternalMsg}
              isContinued={isInternalMsg ? false : isContinued}
              isLastInGroup={isInternalMsg ? true : isLastInGroup}
              senderName={senderName}
              replyPreview={getReplyPreview(messages, msg)}
              reactions={reactions[msg.id]}
              currentUserId={currentUserId}
              onToggleReaction={onToggleReaction}
              onMenuOpen={onMenuOpen}
              onScrollToReply={onScrollToReply}
            />
          </React.Fragment>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
});
