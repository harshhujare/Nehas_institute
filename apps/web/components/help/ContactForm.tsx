'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api-client';

type TicketType = 'GENERAL' | 'BUG_REPORT' | 'PAYMENT_ISSUE' | 'CONTENT_QUERY';

interface ContactFormProps {
  onSuccess?: (ticketId: string) => void;
}

export default function ContactForm({ onSuccess }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    type: 'GENERAL' as TicketType,
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/api/support', formData);
      setSubmitted(true);
      if (onSuccess) onSuccess(res.data.data.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <>
        <div className="contact-form contact-form--success">
          <div className="contact-success-icon">✓</div>
          <h2 className="contact-form-title">Ticket Submitted!</h2>
          <p className="contact-form-subtitle">We've received your request and will get back to you shortly. Check the <strong>My Tickets</strong> tab to track your reply.</p>
        </div>
        <style>{`
          .contact-form--success { text-align: center; align-items: center; padding: 2.5rem 2rem; }
          .contact-success-icon {
            width: 52px; height: 52px;
            background: var(--success-bg);
            color: var(--success-text);
            border: 1px solid var(--success-border);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.4rem; font-weight: 700;
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="contact-form">
        <div className="contact-form-header">
          <h2 className="contact-form-title">Contact Support</h2>
          <p className="contact-form-subtitle">We'll get back to you as soon as possible.</p>
        </div>

        {error && <div className="contact-error">{error}</div>}

        <div className="contact-fields">
          <div className="contact-field">
            <label className="contact-label">What is this regarding?</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as TicketType })}
              className="contact-select"
              required
            >
              <option value="GENERAL">General Inquiry</option>
              <option value="BUG_REPORT">Report a Bug / Issue</option>
              <option value="PAYMENT_ISSUE">Payment / Subscription Issue</option>
              <option value="CONTENT_QUERY">Question about Content</option>
            </select>
          </div>

          <div className="contact-field">
            <label className="contact-label">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Briefly describe your issue..."
              className="contact-input"
              required
              minLength={5}
              maxLength={100}
            />
          </div>

          <div className="contact-field">
            <label className="contact-label">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Please provide as much detail as possible..."
              rows={5}
              className="contact-textarea"
              required
              minLength={10}
              maxLength={2000}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="contact-submit">
          {loading ? (
            <Loader2 className="contact-submit-icon spinning" />
          ) : (
            <Send className="contact-submit-icon" />
          )}
          <span>Submit Ticket</span>
        </button>
      </form>

      <style>{`
        .contact-form {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          box-shadow: 0 4px 16px rgba(194, 65, 12, 0.04);
        }

        .contact-form-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 0.25rem;
        }
        .contact-form-subtitle {
          font-size: 0.88rem;
          color: var(--color-muted, #78716c);
          line-height: 1.5;
        }

        .contact-error {
          padding: 0.875rem 1rem;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 10px;
          font-size: 0.88rem;
        }

        .contact-fields { display: flex; flex-direction: column; gap: 1.15rem; }

        .contact-field { display: flex; flex-direction: column; gap: 0.4rem; }

        .contact-label {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--color-espresso, #1c1917);
        }

        .contact-select,
        .contact-input,
        .contact-textarea {
          width: 100%;
          background: var(--color-cream, #fffbf7);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          color: var(--color-espresso, #1c1917);
          font-size: 16px; /* 16px prevents iOS Safari auto-zoom */
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          appearance: none;
        }
        .contact-select:focus,
        .contact-input:focus,
        .contact-textarea:focus {
          border-color: var(--color-terracotta, #c2410c);
          box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.12);
        }
        .contact-textarea { resize: vertical; min-height: 110px; }

        .contact-input::placeholder,
        .contact-textarea::placeholder {
          color: #a8a29e;
        }

        .contact-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          min-height: 48px;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 0.875rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          box-shadow: 0 4px 14px rgba(194, 65, 12, 0.25);
        }
        .contact-submit:hover:not(:disabled) { 
          background: #9a3412; 
          transform: translateY(-1px);
        }
        .contact-submit:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

        .contact-submit-icon { width: 18px; height: 18px; }
        .spinning { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
