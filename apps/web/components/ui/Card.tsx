import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padded?: boolean;
}

export function Card({
  children,
  interactive = false,
  padded = true,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`card ${interactive ? 'card--interactive' : ''} ${padded ? 'card--padded' : ''} ${className}`}
      {...props}
    >
      {children}

      <style>{`
        .card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.2s ease;
        }

        .card--padded {
          padding: 1.5rem;
        }

        .card--interactive {
          cursor: pointer;
        }

        .card--interactive:hover {
          transform: translateY(-2px);
          border-color: var(--border-strong);
          box-shadow: var(--shadow-warm);
        }

        .card--interactive:active {
          transform: scale(0.985);
        }

        @media (max-width: 640px) {
          .card--padded {
            padding: 1.25rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default Card;
