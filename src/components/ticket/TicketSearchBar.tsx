import React from 'react';
import { Search, X } from 'lucide-react';
import './TicketList.css';

export interface TicketSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
}

export const TicketSearchBar: React.FC<TicketSearchBarProps> = ({ value, onChange, onClear }) => {
    return (
        <div className="search-bar">
            <Search size={15} className="search-icon" />
            <input
                type="text"
                className="search-input"
                placeholder="제목 또는 내용으로 검색..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {value && (
                <button className="search-clear-btn" onClick={onClear}>
                    <X size={14} />
                </button>
            )}
        </div>
    );
};
