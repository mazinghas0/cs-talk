import React, { useState } from 'react';
import './AIBriefing.css';
import { Sparkles, RefreshCw, Calendar, ChevronRight, MessageSquareQuote } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';

export const AIBriefing: React.FC = () => {
    const { tickets } = useTicketStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [briefing, setBriefing] = useState<string | null>(null);

    const generateBriefing = async () => {
        setIsGenerating(true);
        // 실제 운영 환경에서는 Supabase Edge Function을 호출하여 AI 요약을 가져옵니다.
        // 현재는 케빈 님을 위한 프리미엄 데모 브리핑을 생성합니다.
        setTimeout(() => {
            setBriefing(`
### 🤖 오늘의 CS 브리핑 (Premium)

안녕하세요, 케빈 님! 오늘의 주요 상담 내용을 요약해 드립니다.

- **업무 처리량**: 총 ${tickets.length}건의 활성 티켓 중 ${tickets.filter(t => t.status === 'resolved').length}건이 완료되었습니다.
- **주요 이슈**: 현재 '${tickets.find(t => t.priority === 'urgent')?.title || '긴급 장애'}' 건이 가장 시급한 대응을 요약하고 있습니다.
- **고객 만족도**: 지난 24시간 동안 고객 응대 지연 시간이 평균 15분으로 양호하게 유지되고 있습니다.
- **AI 인사이트**: 최근 '결제 오류' 관련 문의가 20% 증가했습니다. 시스템 점검이 필요할 수 있습니다.

내일도 제나가 완벽하게 보필하겠습니다!
            `);
            setIsGenerating(false);
        }, 2000);
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
                        {briefing.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                        ))}
                        <div className="briefing-footer">
                            <span><Calendar size={12} /> {new Date().toLocaleDateString('ko-KR')}</span>
                            <ChevronRight size={14} />
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
