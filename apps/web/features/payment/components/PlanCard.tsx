import React from 'react';

export interface PlanData {
  duration: 30 | 180 | 365;
  label: string;
  price: string;
  period: string;
  badge?: string;
  description?: string;  // optional override for the plan card body text
}

interface PlanCardProps {
  plan: PlanData;
  isLoading: boolean;
  disabled: boolean;
  onSelect: (duration: 30 | 180 | 365) => void;
  statusText?: string;
}

export default function PlanCard({ plan, isLoading, disabled, onSelect, statusText }: PlanCardProps) {
  return (
    <div className="plan-card">
      <div className="plan-header">
        <h3 className="plan-title">{plan.label} Plan</h3>
        {plan.badge && <span className="plan-badge">{plan.badge}</span>}
      </div>
      
      <div className="plan-price-wrapper">
        <span className="plan-price">{plan.price}</span>
        <span className="plan-period">/ {plan.period}</span>
      </div>

      <p className="plan-desc">
        {plan.description ||
          `Get unlimited access to all courses, video lectures, and chef recipe guides for ${plan.period}.`}
      </p>

      <ul className="plan-features">
        <li>
          <CheckIcon />
          <span>All video masterclasses & lectures</span>
        </li>
        <li>
          <CheckIcon />
          <span>Printable chef recipe cards & guides</span>
        </li>
        <li>
          <CheckIcon />
          <span>Step-by-step technique breakdowns</span>
        </li>
        <li>
          <CheckIcon />
          <span>Access valid for {plan.period}</span>
        </li>
      </ul>

      <button
        className="plan-button"
        onClick={() => onSelect(plan.duration)}
        disabled={disabled || isLoading}
      >
        {statusText || (isLoading ? 'Processing...' : 'Get Access Now')}
      </button>

      <style>{`
        .plan-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          padding: 2.25rem 1.75rem;
          max-width: 440px;
          width: 100%;
          margin: 0 auto;
          box-shadow: 0 4px 20px rgba(194, 65, 12, 0.06);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
          display: flex;
          flex-direction: column;
        }
        
        .plan-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(194, 65, 12, 0.12);
          border-color: var(--color-terracotta, #c2410c);
        }

        .plan-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .plan-title {
          font-family: var(--font-playfair), serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin: 0;
        }

        .plan-badge {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .plan-price-wrapper {
          display: flex;
          align-items: baseline;
          margin-bottom: 1.25rem;
          color: var(--color-espresso, #1c1917);
        }

        .plan-price {
          font-family: var(--font-playfair), serif;
          font-size: 3rem;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.02em;
          color: var(--color-terracotta, #c2410c);
        }

        .plan-period {
          font-size: 1rem;
          color: var(--color-muted, #78716c);
          margin-left: 0.5rem;
          font-weight: 500;
        }

        .plan-desc {
          color: var(--color-muted, #78716c);
          line-height: 1.6;
          margin-bottom: 1.75rem;
          font-size: 0.95rem;
        }

        .plan-features {
          list-style: none;
          padding: 0;
          margin: 0 0 2rem 0;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .plan-features li {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          color: var(--color-espresso, #1c1917);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .plan-button {
          margin-top: auto;
          width: 100%;
          min-height: 48px;
          padding: 0.875rem 1.25rem;
          border-radius: 12px;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          font-size: 1.05rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, opacity 0.2s;
          box-shadow: 0 4px 14px rgba(194, 65, 12, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .plan-button:hover:not(:disabled) {
          background: #9a3412;
          transform: translateY(-1px);
        }

        .plan-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .plan-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }}
    >
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
