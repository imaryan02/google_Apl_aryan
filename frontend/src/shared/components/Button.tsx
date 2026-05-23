import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = 'relative font-orbitron font-bold uppercase tracking-wider transition-all duration-200 focus:outline-none rounded-lg border select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
  
  const variantStyles = {
    primary: 'bg-cyber-primary/10 border-cyber-primary text-cyber-primary hover:bg-cyber-primary hover:text-cyber-bg hover:shadow-glow',
    secondary: 'bg-cyber-secondary/10 border-cyber-secondary text-cyber-secondary hover:bg-cyber-secondary hover:text-cyber-text',
    success: 'bg-cyber-success/10 border-cyber-success text-cyber-success hover:bg-cyber-success hover:text-cyber-bg hover:shadow-glow-success',
    danger: 'bg-cyber-danger/10 border-cyber-danger text-cyber-danger hover:bg-cyber-danger hover:text-cyber-text hover:shadow-glow-danger',
    warning: 'bg-cyber-warning/10 border-cyber-warning text-cyber-warning hover:bg-cyber-warning hover:text-cyber-bg hover:shadow-glow-warning',
    outline: 'bg-transparent border-cyber-border text-cyber-text hover:border-cyber-primary hover:text-cyber-primary'
  };

  const sizeStyles = {
    sm: 'px-3 py-1 text-[10px] tracking-tight',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-3 text-sm'
  };

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
