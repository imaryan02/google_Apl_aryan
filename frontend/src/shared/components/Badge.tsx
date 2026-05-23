import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'green' | 'amber' | 'red' | 'blue' | 'gray';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  pulse = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    cyan: 'bg-cyber-primary/10 border-cyber-primary/40 text-cyber-primary shadow-glow',
    green: 'bg-cyber-success/10 border-cyber-success/40 text-cyber-success shadow-glow-success',
    amber: 'bg-cyber-warning/10 border-cyber-warning/40 text-cyber-warning shadow-glow-warning',
    red: 'bg-cyber-danger/10 border-cyber-danger/40 text-cyber-danger shadow-glow-danger',
    blue: 'bg-cyber-vip/10 border-cyber-vip/40 text-cyber-vip shadow-glow-vip',
    gray: 'bg-cyber-border/40 border-cyber-muted/20 text-cyber-muted'
  };

  const pulseColors = {
    cyan: 'bg-cyber-primary',
    green: 'bg-cyber-success',
    amber: 'bg-cyber-warning',
    red: 'bg-cyber-danger',
    blue: 'bg-cyber-vip',
    gray: 'bg-cyber-muted'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-mono font-bold uppercase tracking-wider rounded-full select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {pulse && (
        <span className={`glow-dot ${pulseColors[variant]}`}></span>
      )}
      {children}
    </span>
  );
};
