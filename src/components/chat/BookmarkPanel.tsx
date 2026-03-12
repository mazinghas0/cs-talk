import React from 'react';
import { X, Bookmark, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTicketStore } from '../../store/ticketStore';
import './BookmarkPanel.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScrollToMessage: (msgId: string) => void;
}

export const BookmarkPanel: React.FC<Props> = ({ isOpen, onClose, onScrollToMessage }) => {
    const { bookmarks, toggleBookmark, tickets, setSelectedTicketId, setBookmarkPanelOpen } = useTicketStore();

    const handleGoToMessage = (messageId: string, ticketId: string) => {
        setSelectedTicketId(ticketId);
        setBookmarkPanelOpen(false);
        // 티켓 전환 후 DOM이 렌더링될 시간을 주고 스크롤
        setTimeout(() => onScrollToMessage(messageId), 400);
    };

    return (
        <>
            {isOpen && <div className="bookmark-panel-backdrop" onClick={onClose} />}
            <div className={`bookmark-panel${isOpen ? ' open' : ''}`}>
                <div className="bookmark-panel-header">
                    <div className="bookmark-panel-title">
                        <Bookmark size={16} />
                        <span>북마크</span>
                    </div>
                    <button className="bookmark-panel-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="bookmark-panel-body">
                    {bookmarks.length === 0 ? (
                        <div className="bookmark-empty">
                            <Bookmark size={32} />
                            <p>북마크한 메시지가 없습니다</p>
                            <span>메시지를 길게 누르거나 우클릭 후<br />북마크를 선택하세요</span>
                        </div>
                    ) : (
                        bookmarks.map((bookmark) => {
                            const ticket = tickets.find(t => t.id === bookmark.ticket_id);
                            return (
                                <div key={bookmark.id} className="bookmark-item">
                                    <div className="bookmark-item-meta">
                                        {ticket && <span className="bookmark-ticket-name">{ticket.title}</span>}
                                        <span className="bookmark-date">
                                            {format(new Date(bookmark.created_at), 'M월 d일', { locale: ko })}
                                        </span>
                                    </div>
                                    <p className="bookmark-content">
                                        {bookmark.content_snapshot.slice(0, 100)}
                                        {bookmark.content_snapshot.length > 100 ? '...' : ''}
                                    </p>
                                    <div className="bookmark-item-actions">
                                        <button
                                            className="bookmark-action-go"
                                            onClick={() => handleGoToMessage(bookmark.message_id, bookmark.ticket_id)}
                                        >
                                            <ArrowRight size={12} />
                                            <span>이동</span>
                                        </button>
                                        <button
                                            className="bookmark-action-remove"
                                            onClick={() => toggleBookmark(bookmark.message_id)}
                                        >
                                            해제
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
};
