import React, { useState } from 'react';
import './AIBriefing.css';
import { Sparkles, RefreshCw, Calendar, MessageSquareQuote } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';
import { supabase } from '../../lib/supabase';

export const AIBriefing: React.FC = () => {
    const { tickets } = useTicketStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [briefing, setBriefing] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const generateBriefing = async () => {
        setIsGenerating(true);
        setErrorMsg(null);

        try {
            const { data, error } = await supabase.functions.invoke('ai-briefing', {
                body: { tickets },
            });

            if (error) throw error;
            if (data?.briefing) {
                setBriefing(data.briefing);
            } else {
                throw new Error('응답 없음');
            }
        } catch (err) {
            // Edge Function 미배포 시 데모 브리핑으로 폴백
            const activeCount = tickets.filter(t => t.status === 'in_progress').length;
            const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
            const urgentTicket = tickets.find(t => t.priority === 'urgent');

            setBriefing(
                `현재 ${activeCount}건의 업무가 진행 중이며 ${resolvedCount}건이 완료되었습니다.` +
                (urgentTicket ? ` 특히 "${urgentTicket.title}" 건이 긴급 상태로 즉시 확인이 필요합니다.` : '') +
                ` 오늘은 미응답 티켓을 우선 처리하고, 완료 대기 중인 건들을 최종 확인해 주세요.` +
                `\n\n(AI 브리핑을 사용하려면 Supabase Edge Function을 배포하세요.)`
            );
            setErrorMsg('Edge Function 미배포 상태입니다. 데모 브리핑을 표시합니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="ai-briefing-container">
            <div className="briefing-header">
                <div className="briefing-title">
                    <Sparkles size={20} className="glow-icon" />
                    <h3>AI CS 요약 브리핑</h3>
                </div>
                <button
                    className={`btn-generate ${isGenerating ? 'loading' : ''}`}
                    onClick={generateBriefing}
                    disabled={isGenerating}
                >
                    {isGenerating ? <RefreshCw size={16} className="spin" /> : '요약 생성'}
                </button>
            </div>

            <div className="briefing-content">
                {briefing ? (
                    <div className="briefing-text animate-fade-in">
                        {errorMsg && <p className="briefing-warning">{errorMsg}</p>}
                        {briefing.split('\n').filter(l => l.trim()).map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                        <div className="briefing-footer">
                            <span><Calendar size={12} /> {new Date().toLocaleDateString('ko-KR')}</span>
                        </div>
                    </div>
                ) : (
                    <div className="briefing-placeholder">
                        <MessageSquareQuote size={40} />
                        <p>오늘의 상담 히스토리를 AI가 깔끔하게 정리해 드립니다.</p>
                        <span className="premium-tag">PREMIUM</span>
                    </div>
                )}
            </div>
        </div>
    );
};
