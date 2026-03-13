import React, { useMemo } from 'react';
import { X, BarChart2, Clock, Users, AlertTriangle } from 'lucide-react';
import { useTicketStore } from '../../store/ticketStore';
import { useAuthStore } from '../../store/authStore';
import { TicketPriority } from '../../types/ticket';
import './DashboardPanel.css';

interface DashboardPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const PRIORITY_LABEL: Record<TicketPriority, string> = {
    urgent: '긴급',
    high: '높음',
    medium: '보통',
    low: '낮음',
};

function formatDuration(ms: number): string {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h >= 24) return `${Math.floor(h / 24)}일 ${h % 24}시간`;
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ isOpen, onClose }) => {
    const { tickets } = useTicketStore();
    const { workspaceMembers } = useAuthStore();

    const stats = useMemo(() => {
        const inProgress = tickets.filter(t => t.status === 'in_progress');
        const resolved = tickets.filter(t => t.status === 'resolved');

        // 우선순위별 진행중 건수
        const byPriority: Record<TicketPriority, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
        inProgress.forEach(t => { byPriority[t.priority] += 1; });

        // 담당자별 현황
        const assigneeMap: Record<string, { name: string; inProgress: number; resolved: number }> = {};
        tickets.forEach(t => {
            const key = t.assignee_id ?? '__none__';
            if (!assigneeMap[key]) {
                const member = workspaceMembers.find(m => m.user_id === t.assignee_id);
                assigneeMap[key] = {
                    name: t.assignee_id
                        ? (member?.full_name ?? member?.email ?? '알 수 없음')
                        : '미배정',
                    inProgress: 0,
                    resolved: 0,
                };
            }
            if (t.status === 'in_progress') assigneeMap[key].inProgress += 1;
            else assigneeMap[key].resolved += 1;
        });
        const assigneeRows = Object.values(assigneeMap).sort((a, b) =>
            (b.inProgress + b.resolved) - (a.inProgress + a.resolved)
        );

        // 평균 처리시간 (resolved 티켓 기준)
        let avgMs: number | null = null;
        if (resolved.length > 0) {
            const total = resolved.reduce((sum, t) => {
                return sum + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime());
            }, 0);
            avgMs = total / resolved.length;
        }

        return { inProgress, resolved, byPriority, assigneeRows, avgMs };
    }, [tickets, workspaceMembers]);

    if (!isOpen) return null;

    return (
        <div className="dashboard-overlay" onClick={onClose}>
            <div className="dashboard-panel" onClick={e => e.stopPropagation()}>
                <div className="dashboard-header">
                    <div className="dashboard-header-title">
                        <BarChart2 size={18} />
                        <span>워크스페이스 현황</span>
                    </div>
                    <button className="dashboard-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="dashboard-body">
                    {/* 상단 요약 카드 */}
                    <div className="dashboard-cards">
                        <div className="dash-card in-progress">
                            <div className="dash-card-value">{stats.inProgress.length}</div>
                            <div className="dash-card-label">진행중</div>
                        </div>
                        <div className="dash-card resolved">
                            <div className="dash-card-value">{stats.resolved.length}</div>
                            <div className="dash-card-label">처리완료</div>
                        </div>
                        <div className="dash-card total">
                            <div className="dash-card-value">{tickets.length}</div>
                            <div className="dash-card-label">전체</div>
                        </div>
                        <div className="dash-card avg-time">
                            <div className="dash-card-value">
                                {stats.avgMs !== null ? formatDuration(stats.avgMs) : '-'}
                            </div>
                            <div className="dash-card-label">평균 처리시간</div>
                        </div>
                    </div>

                    {/* 우선순위별 진행중 */}
                    <div className="dash-section">
                        <div className="dash-section-title">
                            <AlertTriangle size={14} />
                            진행중 우선순위 분포
                        </div>
                        <div className="priority-bars">
                            {(['urgent', 'high', 'medium', 'low'] as TicketPriority[]).map(p => {
                                const count = stats.byPriority[p];
                                const max = Math.max(...Object.values(stats.byPriority), 1);
                                const pct = Math.round((count / max) * 100);
                                return (
                                    <div key={p} className="priority-bar-row">
                                        <span className={`priority-label-chip ${p}`}>{PRIORITY_LABEL[p]}</span>
                                        <div className="priority-bar-track">
                                            <div className={`priority-bar-fill ${p}`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="priority-bar-count">{count}건</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 담당자별 현황 */}
                    <div className="dash-section">
                        <div className="dash-section-title">
                            <Users size={14} />
                            담당자별 현황
                        </div>
                        {stats.assigneeRows.length === 0 ? (
                            <p className="dash-empty">배정된 티켓이 없습니다.</p>
                        ) : (
                            <div className="assignee-table">
                                <div className="assignee-table-head">
                                    <span>담당자</span>
                                    <span>진행중</span>
                                    <span>처리완료</span>
                                    <span>합계</span>
                                </div>
                                {stats.assigneeRows.map((row, i) => (
                                    <div key={i} className="assignee-table-row">
                                        <span className="assignee-name">{row.name}</span>
                                        <span className="assignee-in-progress">{row.inProgress}</span>
                                        <span className="assignee-resolved">{row.resolved}</span>
                                        <span className="assignee-total">{row.inProgress + row.resolved}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 처리시간 안내 */}
                    <div className="dash-footer-note">
                        <Clock size={12} />
                        평균 처리시간은 처리완료 티켓의 등록~완료 시간 기준입니다.
                    </div>
                </div>
            </div>
        </div>
    );
};
