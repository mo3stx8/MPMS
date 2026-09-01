import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Language } from '../../App';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: string;
        direction: 'up' | 'down' | 'neutral';
    };
    color?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'cyan' | 'teal' | 'orange' | 'indigo' | 'green';
    onClick?: () => void;
    language?: Language;
}

export function StatCard({ label, value, icon: Icon, trend, color = 'blue', onClick, language = 'en' }: StatCardProps) {
    const isRTL = language === 'ar';

    const colorStyles = {
        blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
        red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
        purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
        cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/20' },
        teal: { bg: 'bg-teal-500/10', text: 'text-teal-500', border: 'border-teal-500/20' },
        orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
        indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20' },
        green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
    };

    const styles = colorStyles[color];

    return (
        <div
            onClick={onClick}
            className={`card-base p-6 group hover:-translate-y-1 transition-transform duration-300 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${styles.bg} group-hover:bg-opacity-80 transition-colors`}>
                    <Icon className={`w-8 h-8 ${styles.text}`} />
                </div>
                {trend && (
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-1 ${styles.bg} ${styles.text} ${styles.border}`}>
                        {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                        {trend.direction === 'down' && <TrendingDown className="w-3 h-3" />}
                        {trend.direction === 'neutral' && <Minus className="w-3 h-3" />}
                        {trend.value}
                    </div>
                )}
            </div>
            <div className="text-4xl font-black text-[var(--text-primary)] mb-1">{value}</div>
            <div className="text-[var(--text-secondary)] font-bold text-sm uppercase tracking-wide">{label}</div>
        </div>
    );
}
