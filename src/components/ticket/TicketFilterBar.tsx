import React from 'react';
import { Filter } from 'lucide-react';
import { TicketPriority } from '../../types/ticket';
import './TicketList.css';

export interface TicketFilterBarProps {
    ticketTags: string[];
    showFilterBar: boolean;
    activeFilterCount: number;
    filterPriority: TicketPriority | null;
    filterTags: string[];
    onToggleBar: () => void;
    onReset: () => void;
    onPriorityChange: (priority: TicketPriority) => void;
    onTagToggle: (tag: string) => void;
}

const PRIORITY_OPTIONS: TicketPriority[] = ['urgent', 'high', 'medium', 'low'];
const PRIORITY_LABEL: Record<TicketPriority, string> = { urgent: '긴급', high: '높음', medium: '보통', low: '낮음' };

export const TicketFilterBar: React.FC<TicketFilterBarProps> = ({
    ticketTags, showFilterBar, activeFilterCount, filterPriority, filterTags,
    onToggleBar, onReset, onPriorityChange, onTagToggle,
}) => {
    return (
        <>
            <div className="filter-toggle-row">
                <button
                    className={`filter-toggle-btn ${showFilterBar ? 'active' : ''} ${activeFilterCount > 0 ? 'has-filter' : ''}`}
                    onClick={onToggleBar}
                >
                    <Filter size={13} />
                    필터{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>
                {activeFilterCount > 0 && (
                    <button className="filter-reset-btn" onClick={onReset}>초기화</button>
                )}
            </div>
            {showFilterBar && (
                <div className="filter-bar">
                    <div className="filter-section">
                        <span className="filter-label">우선순위</span>
                        <div className="filter-chips">
                            {PRIORITY_OPTIONS.map((p) => (
                                <button
                                    key={p}
                                    className={`filter-chip priority-chip ${p} ${filterPriority === p ? 'selected' : ''}`}
                                    onClick={() => onPriorityChange(p)}
                                >
                                    {PRIORITY_LABEL[p]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="filter-section">
                        <span className="filter-label">태그</span>
                        <div className="filter-chips">
                            {ticketTags.map((tag) => (
                                <button
                                    key={tag}
                                    className={`filter-chip tag-filter-chip ${filterTags.includes(tag) ? 'selected' : ''}`}
                                    onClick={() => onTagToggle(tag)}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
