import { LucideIcon } from 'lucide-react';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';

interface ActionButton {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    disabled?: boolean;
    loading?: boolean;
}

import { Language } from '../../App';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ActionButton[];
    language?: Language;
}

export function PageHeader({ title, subtitle, actions = [] }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 group mb-8">
            <div>
                <h1 className="text-4xl font-black text-[var(--text-primary)] mb-2 tracking-tight group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-accent group-hover:bg-clip-text group-hover:text-transparent transition-all duration-500 cursor-default">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-[var(--text-secondary)] font-medium text-lg">
                        {subtitle}
                    </p>
                )}
            </div>

            {actions.length > 0 && (
                <div className="flex gap-3">
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        const variantClasses = {
                            primary: 'btn-primary',
                            secondary: 'btn-secondary',
                            danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2',
                            ghost: 'bg-transparent hover:bg-[var(--surface)] text-[var(--text-secondary)] px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2'
                        };

                        return (
                            <button
                                key={index}
                                onClick={action.onClick}
                                disabled={action.disabled || action.loading}
                                className={`${variantClasses[action.variant || 'secondary']} min-w-[100px] justify-center`}
                            >
                                {action.loading && <LoadingIndicator type="line-spinner" size="xs" className="mr-2" />}
                                {!action.loading && Icon && <Icon className="w-5 h-5" />}
                                {action.label && <span>{action.label}</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
