import React from 'react';
import './AIBriefing.css';
import { Sparkles, Wrench } from 'lucide-react';

export const AIBriefing: React.FC = () => {
    return (
        <div className="ai-briefing-container">
            <div className="briefing-header">
                <div className="briefing-title">
                    <Sparkles size={20} className="glow-icon" />
                    <h3>AI CS 요약 브리핑</h3>
                </div>
                <span className="premium-tag">PREMIUM</span>
            </div>

            <div className="briefing-content">
                <div className="briefing-dev-notice">
                    <Wrench size={32} />
                    <p>현재 개발 중인 기능입니다.</p>
                    <span>정식 출시 시 티켓 현황을 AI가 자동으로 분석하고 요약해 드립니다.</span>
                </div>
            </div>
        </div>
    );
};
