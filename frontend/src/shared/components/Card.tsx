import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  glowColor?: 'cyan' | 'green' | 'amber' | 'red' | 'blue' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  headerAction,
  glowColor = 'none',
  className = '',
  ...props
}) => {
  const glowClasses = {
    cyan: 'border-cyber-primary/40 shadow-glow',
    green: 'border-cyber-success/40 shadow-glow-success',
    amber: 'border-cyber-warning/40 shadow-glow-warning',
    red: 'border-cyber-danger/40 shadow-glow-danger',
    blue: 'border-cyber-vip/40 shadow-glow-vip',
    none: 'border-cyber-border hover:border-cyber-border-glow'
  };

  return (
    <div
      className={`cyber-panel flex flex-col p-4 transition-all duration-300 ${glowClasses[glowColor]} ${className}`}
      {...props}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex flex-col">
            {title && (
              <h3 className="font-orbitron font-bold text-sm tracking-wide text-cyber-text">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-[10px] text-cyber-muted font-mono tracking-wide uppercase">
                {subtitle}
              </span>
            )}
          </div>
          {headerAction && <div className="flex items-center">{headerAction}</div>}
        </div>
      )}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
};
