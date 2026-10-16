'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="sheet-portal" role="dialog" aria-modal="true" aria-labelledby={title ? 'sheet-title' : undefined}>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      
      <div className="sheet-container">
        {/* Mobile drag handle bar */}
        <div className="sheet-handle-wrap" onClick={onClose}>
          <div className="sheet-handle" />
        </div>

        <div className="sheet-content">
          {(title || description) && (
            <div className="sheet-header">
              <div>
                {title && <h2 id="sheet-title" className="sheet-title font-serif">{title}</h2>}
                {description && <p className="sheet-desc">{description}</p>}
              </div>
              <button
                type="button"
                className="sheet-close-btn"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="sheet-body">{children}</div>
        </div>
      </div>

      <style>{`
        .sheet-portal {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .sheet-backdrop {
          position: absolute;
          inset: 0;
          background: var(--overlay-bg);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: fadeIn 0.2s ease-out;
        }

        .sheet-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 540px;
          background: var(--bg-surface);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          border: 1px solid var(--border);
          border-bottom: none;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .sheet-handle-wrap {
          display: flex;
          justify-content: center;
          padding: 0.75rem 0 0.25rem;
          cursor: pointer;
        }

        .sheet-handle {
          width: 40px;
          height: 4px;
          border-radius: 999px;
          background: var(--border-strong);
        }

        .sheet-content {
          padding: 1rem 1.5rem 1.5rem;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .sheet-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
        }

        .sheet-title {
          font-size: 1.35rem;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .sheet-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        .sheet-close-btn {
          background: var(--bg-surface-2);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .sheet-close-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @media (min-width: 641px) {
          .sheet-portal {
            align-items: center;
          }
          .sheet-container {
            border-radius: 24px;
            border-bottom: 1px solid var(--border);
            max-height: 80vh;
            animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .sheet-handle-wrap {
            display: none;
          }
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default BottomSheet;
