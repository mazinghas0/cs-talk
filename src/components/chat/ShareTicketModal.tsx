import React, { useState } from 'react';
import './ShareTicketModal.css';
import { X, Copy, Check, QrCode } from 'lucide-react';
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

    const handleCopy = () => {
        navigator.clipboard.writeText(`상담 링크: ${shareUrl}\n인증 PIN: ${ticket.pin}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                            <QrCode size={48} color="var(--accent-primary)" />
                            <p>QR 코드가 활성화되었습니다.<br />(실제 서비스에서는 QR 이미지로 대체됩니다)</p>
                        </div>
                    )}
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
