const STORAGE_KEY = 'cs_notif_settings';

export type SoundType = 'ding' | 'pop' | 'chime';

export interface NotifSettings {
    enabled: boolean;
    soundEnabled: boolean;
    soundType: SoundType;
}

const DEFAULT_SETTINGS: NotifSettings = {
    enabled: true,
    soundEnabled: true,
    soundType: 'ding',
};

export function getNotifSettings(): NotifSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveNotifSettings(settings: Partial<NotifSettings>): void {
    const current = getNotifSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...settings }));
}

// Web Audio API로 알림음 생성 (외부 파일 불필요)
function createAudioContext(): AudioContext | null {
    try {
        return new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
        return null;
    }
}

function playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    gainValue: number,
    type: OscillatorType = 'sine'
) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(gainValue, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

// ding: 맑은 단음
function playDing(ctx: AudioContext) {
    playTone(ctx, 880, ctx.currentTime, 0.6, 0.4);
}

// pop: 통통한 짧은 음 (카카오톡 스타일)
function playPop(ctx: AudioContext) {
    playTone(ctx, 600, ctx.currentTime, 0.08, 0.5, 'sine');
    playTone(ctx, 900, ctx.currentTime + 0.08, 0.2, 0.3, 'sine');
}

// chime: 부드러운 2음 차임
function playChime(ctx: AudioContext) {
    playTone(ctx, 523, ctx.currentTime, 0.5, 0.3);
    playTone(ctx, 659, ctx.currentTime + 0.25, 0.5, 0.25);
}

export function playNotificationSound(soundType?: SoundType): void {
    const settings = getNotifSettings();
    const type = soundType ?? settings.soundType;
    if (!settings.soundEnabled && !soundType) return; // preview 시엔 soundType 강제 전달

    const ctx = createAudioContext();
    if (!ctx) return;

    switch (type) {
        case 'ding': playDing(ctx); break;
        case 'pop': playPop(ctx); break;
        case 'chime': playChime(ctx); break;
    }
}

export function previewSound(soundType: SoundType): void {
    const ctx = createAudioContext();
    if (!ctx) return;
    switch (soundType) {
        case 'ding': playDing(ctx); break;
        case 'pop': playPop(ctx); break;
        case 'chime': playChime(ctx); break;
    }
}
