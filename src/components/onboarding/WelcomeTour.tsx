import React, { useState } from 'react';
import { Layers, MessageSquare, ArrowRight, X } from 'lucide-react';
import './WelcomeTour.css';

interface WelcomeTourProps {
    onComplete: () => void;
}

const SLIDES = [
    {
        icon: <span className="tour-emoji">👋</span>,
        title: 'CS_talk에 오신 걸 환영합니다!',
        desc: '소규모 팀의 고객 지원을\n더 스마트하게 관리하세요.',
    },
    {
        icon: <Layers size={48} strokeWidth={1.5} className="tour-icon" />,
        title: '팀 공간을 만들어보세요',
        desc: '워크스페이스를 만들고 초대 링크로\n팀원을 불러오세요.\n여러 팀을 동시에 관리할 수 있어요.',
    },
    {
        icon: <MessageSquare size={48} strokeWidth={1.5} className="tour-icon" />,
        title: '업무 요청을 효율적으로',
        desc: '티켓으로 업무를 등록하고\n채팅으로 소통하세요.\n담당자 배정부터 처리완료까지 한 곳에서.',
    },
];

export const WelcomeTour: React.FC<WelcomeTourProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const isLast = step === SLIDES.length - 1;
    const slide = SLIDES[step];

    const handleNext = () => {
        if (isLast) {
            onComplete();
        } else {
            setStep(prev => prev + 1);
        }
    };

    return (
        <div className="tour-overlay">
            <div className="tour-card">
                <button className="tour-skip" onClick={onComplete} aria-label="건너뛰기">
                    <X size={18} />
                </button>

                <div className="tour-body">
                    <div className="tour-icon-wrap">{slide.icon}</div>
                    <h2 className="tour-title">{slide.title}</h2>
                    <p className="tour-desc">{slide.desc}</p>
                </div>

                <div className="tour-footer">
                    <div className="tour-dots">
                        {SLIDES.map((_, i) => (
                            <span
                                key={i}
                                className={`tour-dot ${i === step ? 'active' : ''}`}
                                onClick={() => setStep(i)}
                            />
                        ))}
                    </div>
                    <button className="tour-next-btn" onClick={handleNext}>
                        {isLast ? '시작하기' : '다음'}
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
