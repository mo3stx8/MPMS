import React from 'react';
import { Language } from '../../App';

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending' | 'active';

interface StatusBadgeProps {
    status: string;
    type?: StatusType;
    label?: string;
    language?: Language;
}

export function StatusBadge({ status, type = 'neutral', label, language = 'en' }: StatusBadgeProps) {
    const isRTL = language === 'ar';

    // Map specific status strings to types if type is not provided
    const inferredType = type === 'neutral' ? inferTypeFromStatus(status) : type;

    const styles = {
        success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        error: 'bg-red-500/10 text-red-500 border-red-500/20',
        info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        neutral: 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-color)]',
        pending: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        active: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    };

    return (
        <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${styles[inferredType]}`}>
            {label || status}
        </span>
    );
}

function inferTypeFromStatus(status: string): StatusType {
    const s = status.toLowerCase();
    if (['approved', 'completed', 'active', 'success', 'cleared'].some(k => s.includes(k))) return 'success';
    if (['pending', 'awaiting', 'waiting', 'hold'].some(k => s.includes(k))) return 'warning';
    if (['rejected', 'error', 'failed', 'blocked', 'expired'].some(k => s.includes(k))) return 'error';
    if (['info', 'processing', 'ongoing'].some(k => s.includes(k))) return 'info';
    return 'neutral';
}
