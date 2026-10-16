import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'free' | 'locked' | 'enrolled' | 'primary' | 'warning' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
  ...props
}: BadgeProps) {
  return (
    <span className={`badge badge--${variant} badge--${size} ${className}`} {...props}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-text">{children}</span>

      <style>{`
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.02em;
          border-radius: 999px;
          border: 1px solid transparent;
          white-space: nowrap;
          text-transform: uppercase;
        }

        .badge-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        /* Sizes */
        .badge--sm {
          font-size: 0.6875rem;
          padding: 0.2rem 0.55rem;
        }

        .badge--md {
          font-size: 0.75rem;
          padding: 0.3rem 0.75rem;
        }

        /* Variants */
        .badge--free {
          background: rgba(21, 128, 61, 0.12);
          color: #15803d;
          border-color: rgba(21, 128, 61, 0.25);
        }

        .badge--locked {
          background: var(--bg-surface-2);
          color: var(--text-muted);
          border-color: var(--border);
        }

        .badge--enrolled {
          background: rgba(194, 65, 12, 0.12);
          color: var(--accent);
          border-color: rgba(194, 65, 12, 0.25);
        }

        .badge--primary {
          background: var(--accent);
          color: #ffffff;
        }

        .badge--warning {
          background: rgba(217, 119, 6, 0.12);
          color: #b45309;
          border-color: rgba(217, 119, 6, 0.25);
        }

        .badge--neutral {
          background: var(--bg-surface-2);
          color: var(--text-secondary);
          border-color: var(--border);
        }
      `}</style>
    </span>
  );
}

export default Badge;
