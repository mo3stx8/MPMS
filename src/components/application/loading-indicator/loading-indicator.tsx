import React from 'react';
import { cn } from "@/utils/cn";

interface LoadingIndicatorProps {
  type?: 'line-spinner' | 'circular';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  type = 'line-spinner',
  size = 'md',
  label,
  className,
}) => {
  const sizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const lineSpinner = (
    <div className={cn("relative inline-block", sizeMap[size], className)} id="loading-indicator">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute left-[44.5%] top-0 h-[25%] w-[10%] rounded-[50px] bg-current font-bold"
          style={{
            transformOrigin: '50% 160%',
            transform: `rotate(${i * 30}deg) translate(0, -130%)`,
            animation: `spinner-fade 1.2s linear infinite`,
            animationDelay: `${-1.2 + i * 0.1}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes spinner-fade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );

  const circular = (
    <div className={cn("relative", sizeMap[size], className)}>
      <div className="absolute inset-0 rounded-full border-2 border-primary/20 opacity-20"></div>
      <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-primary animate-spin"></div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative flex items-center justify-center">
        {type === 'line-spinner' ? lineSpinner : circular}
      </div>
      {label && (
        <span className="text-sm font-semibold text-muted-foreground tracking-tight animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
};
