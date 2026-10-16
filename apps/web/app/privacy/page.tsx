import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Privacy Policy — Neha's Institute",
  description: "Privacy policy detailing how student data, Google profiles, and payment information are protected.",
};

export default function PrivacyPage() {
  return (
    <div className="legal-container">
      <Link href="/login" className="legal-back-link">
        <ArrowLeft size={16} /> Back to Sign In
      </Link>

      <article className="legal-card">
        <header className="legal-header">
          <span className="legal-tag">Privacy & Data</span>
          <h1 className="legal-title font-serif">Privacy Policy</h1>
          <p className="legal-meta">Last updated: October 2026</p>
        </header>

        <section className="legal-section">
          <h2>1. Information We Collect</h2>
          <p>
            When you sign in using Google OAuth, we receive basic profile information including your name, email address, and avatar URL. When you make a purchase, payment processing is handled directly by Razorpay; we do not store full payment card details or banking credentials.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. How We Use Your Information</h2>
          <p>
            Your information is used exclusively to:
          </p>
          <ul className="legal-list">
            <li>Authenticate your access to enrolled culinary courses and recipe guides.</li>
            <li>Maintain your course completion progress and watch history.</li>
            <li>Send order confirmation receipts and critical platform notifications.</li>
            <li>Provide customer and technical assistance through our Help Center.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Data Protection & Privacy</h2>
          <p>
            We respect your privacy. We do not sell, rent, or trade your personal information with third-party advertisers. All network communications are encrypted via SSL/TLS.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Cookies & Local Storage</h2>
          <p>
            We use secure cookies and browser storage strictly for session authentication and offline caching of recipe guides.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Contact Us</h2>
          <p>
            If you have questions about your personal data or wish to request account deletion, please reach out via our <Link href="/help">Help Center</Link>.
          </p>
        </section>
      </article>

      <style>{`
        .legal-container {
          max-width: 760px;
          margin: 0 auto;
          padding: 2rem 1rem 5rem;
        }
        .legal-back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          transition: color 0.15s;
        }
        .legal-back-link:hover {
          color: var(--text-primary);
        }
        .legal-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 2.5rem 2rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
        }
        .legal-tag {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent);
          background: rgba(194, 65, 12, 0.1);
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          display: inline-block;
          margin-bottom: 1rem;
        }
        .legal-title {
          font-size: 2.25rem;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        .legal-meta {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .legal-section {
          margin-bottom: 2rem;
        }
        .legal-section h2 {
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.75rem;
        }
        .legal-section p {
          font-size: 0.95rem;
          line-height: 1.7;
          color: var(--text-secondary);
        }
        .legal-list {
          margin-top: 0.75rem;
          padding-left: 1.25rem;
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.7;
        }
        .legal-section a {
          color: var(--accent);
          text-decoration: underline;
        }
        @media (max-width: 640px) {
          .legal-card {
            padding: 1.75rem 1.25rem;
          }
          .legal-title {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
}
