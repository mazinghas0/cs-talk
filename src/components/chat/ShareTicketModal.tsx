import React, { useState } from 'react';
import './ShareTicketModal.css';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket } from '../../types/ticket';
import { useTicketStore } from '../../store/ticketStore';

interface ShareTicketModalProps {
    ticket: Ticket;
    isOpen: boolean;
    onClose: () => void;
}

export const ShareTicketModal: React.FC<ShareTicketModalProps> = ({ ticket, isOpen, onClose }) => {
    const { updateTicket } = useTicketStore();
    const [copied, setCopied] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    // 현재 도메인 기반 공유 URL 생성
    const shareUrl = `${window.location.origin}/ticket/${ticket.id}`;

    const generatePin = async () => {
        setIsGenerating(true);
        try {
            // 4자리 랜덤 숫자 생성
            const newPin = Math.floor(1000 + Math.random() * 9000).toString();
            await updateTicket(ticket.id, { pin: newPin });
        } catch (err) {
            console.error('Failed to generate PIN:', err);
            alert('PIN 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const shareText = ticket.pin
        ? `CS_talk 상담 링크: ${shareUrl}\n인증 PIN: ${ticket.pin}`
        : `CS_talk 상담 링크: ${shareUrl}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWebShare = async () => {
        await navigator.share({ title: ticket.title, text: shareText, url: shareUrl });
    };

    const handleTelegram = () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
    };

    const handleGmail = () => {
        window.open(`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(`[CS_talk] ${ticket.title}`)}&body=${encodeURIComponent(shareText)}`, '_blank');
    };

    const canWebShare = typeof navigator.share === 'function';

    return (
        <div className="modal-overlay">
            <div className="modal-content share-modal">
                <div className="modal-header">
                    <h3>고객 공유 및 접근 설정</h3>
                    <button className="icon-btn-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="share-body">
                    <p className="share-desc">고객에게 아래 링크와 PIN 번호를 공유하여 실시간 상담에 참여하게 하세요.</p>

                    <div className="share-section">
                        <label>공유 URL</label>
                        <div className="copy-box">
                            <input type="text" readOnly value={shareUrl} />
                            <button onClick={() => navigator.clipboard.writeText(shareUrl)} title="URL 복사">
                                <Copy size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="share-section">
                        <label>접근 인증 PIN</label>
                        {ticket.pin ? (
                            <div className="pin-display">
                                <span className="pin-code">{ticket.pin}</span>
                                <button className="btn-regenerate" onClick={generatePin} disabled={isGenerating}>
                                    재생성
                                </button>
                            </div>
                        ) : (
                            <button className="btn-generate-pin" onClick={generatePin} disabled={isGenerating}>
                                {isGenerating ? '생성 중...' : '보안 PIN 생성하기'}
                            </button>
                        )}
                    </div>

                    {ticket.pin && (
                        <div className="qr-preview-placeholder">
                            <div className="qr-code-wrapper">
                                <QRCodeSVG
                                    value={`${shareUrl}?pin=${ticket.pin}`}
                                    size={160}
                                    bgColor="#ffffff"
                                    fgColor="#1a1d27"
                                    level="M"
                                />
                            </div>
                            <p>고객이 QR 코드를 스캔하면 바로 접속합니다.</p>
                        </div>
                    )}
                </div>

                <div className="share-section">
                    <label>바로 공유하기</label>
                    <div className="share-btn-grid">
                        {canWebShare && (
                            <button className="share-app-btn share-native" onClick={handleWebShare}>
                                <Share2 size={18} />
                                <span>공유</span>
                            </button>
                        )}
                        <button className="share-app-btn share-telegram" onClick={handleTelegram}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.18 14.367l-2.965-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.641.219z"/></svg>
                            <span>텔레그램</span>
                        </button>
                        <button className="share-app-btn share-gmail" onClick={handleGmail}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.908 1.528-1.147C21.69 2.28 24 3.434 24 5.457z"/></svg>
                            <span>Gmail</span>
                        </button>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className={`btn-copy-full ${copied ? 'success' : ''}`} onClick={handleCopy}>
                        {copied ? <><Check size={18} /> 복사 완료!</> : '전체 정보 복사하기'}
                    </button>
                    <button className="btn-close-modal" onClick={onClose}>닫기</button>
                </div>
            </div>
        </div>
    );
};
