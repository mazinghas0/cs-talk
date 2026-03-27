import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { adventurer } from '@dicebear/collection';

interface AvatarPickerProps {
    selectedUrl: string | null;
    onSelect: (dataUrl: string) => void;
}

const PRESET_SEEDS = [
    'Felix', 'Aiden', 'Mia', 'Jasper', 'Luna',
    'Oscar', 'Cleo', 'Finn', 'Zoe', 'Leo',
    'Ivy', 'Max', 'Nora', 'Remy', 'Ellie',
    'Kai', 'Ruby', 'Theo', 'Sage', 'Aria',
];

function generateSvgDataUrl(seed: string): string {
    const svg = createAvatar(adventurer, { seed, size: 80 }).toString();
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ selectedUrl, onSelect }) => {
    const presets = useMemo(() => {
        return PRESET_SEEDS.map((seed) => ({
            seed,
            dataUrl: generateSvgDataUrl(seed),
        }));
    }, []);

    return (
        <div className="avatar-picker-grid">
            {presets.map(({ seed, dataUrl }) => (
                <button
                    key={seed}
                    type="button"
                    className={`avatar-picker-item${selectedUrl === dataUrl ? ' selected' : ''}`}
                    onClick={() => onSelect(dataUrl)}
                    title={seed}
                >
                    <img src={dataUrl} alt={seed} />
                </button>
            ))}
        </div>
    );
};
