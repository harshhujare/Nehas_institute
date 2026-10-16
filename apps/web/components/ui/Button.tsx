'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="btn-spinner animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
        ) : leftIcon ? (
          <span className="btn-icon-left">{leftIcon}</span>
        ) : null}
        
        <span className="btn-label">{children}</span>
        
        {!isLoading && rightIcon ? (
          <span className="btn-icon-right">{rightIcon}</span>
        ) : null}

        <style>{`
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            font-family: inherit;
            font-weight: 600;
            border-radius: 12px;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
            white-space: nowrap;
            user-select: none;
            position: relative;
            outline: none;
          }

          .btn:active:not(:disabled) {
            transform: scale(0.97);
          }

          .btn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
            pointer-events: none;
          }

          .btn:focus-visible {
            box-shadow: 0 0 0 3px var(--accent-soft), 0 0 0 1.5px var(--accent);
          }

          /* Sizes */
          .btn--sm {
            min-height: 38px;
            padding: 0.375rem 0.875rem;
            font-size: 0.8125rem;
            border-radius: 8px;
          }

          .btn--md {
            min-height: 46px; /* Meets 44px mobile touch standard */
            padding: 0.625rem 1.25rem;
            font-size: 0.9375rem;
          }

          .btn--lg {
            min-height: 52px;
            padding: 0.75rem 1.75rem;
            font-size: 1.05rem;
            border-radius: 14px;
          }

          .btn--full {
            width: 100%;
          }

          /* Variants */
          .btn--primary {
            background: var(--accent);
            color: var(--accent-text);
            box-shadow: 0 4px 14px -2px rgba(194, 65, 12, 0.35);
          }
          .btn--primary:hover:not(:disabled) {
            background: var(--accent-hover);
            box-shadow: 0 6px 20px -2px rgba(194, 65, 12, 0.45);
          }

          .btn--secondary {
            background: var(--bg-surface-2);
            color: var(--text-primary);
            border-color: var(--border);
          }
          .btn--secondary:hover:not(:disabled) {
            background: var(--bg-hover);
            border-color: var(--border-strong);
          }

          .btn--outline {
            background: transparent;
            color: var(--text-primary);
            border-color: var(--border-strong);
          }
          .btn--outline:hover:not(:disabled) {
            background: var(--bg-hover);
            border-color: var(--accent);
            color: var(--accent);
          }

          .btn--ghost {
            background: transparent;
            color: var(--text-secondary);
            border-color: transparent;
          }
          .btn--ghost:hover:not(:disabled) {
            background: var(--bg-hover);
            color: var(--text-primary);
          }

          .btn--danger {
            background: var(--danger-bg);
            color: var(--danger-text);
            border-color: var(--danger-border);
          }
          .btn--danger:hover:not(:disabled) {
            filter: brightness(0.95);
          }

          .btn-spinner {
            flex-shrink: 0;
          }
        `}</style>
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
