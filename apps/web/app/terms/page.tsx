import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Terms of Service — Neha's Institute",
  description: "Terms and conditions for accessing courses, video masterclasses, and recipe guides on Neha's Institute.",
};

export default function TermsPage() {
  return (
    <div className="legal-container">
      <Link href="/login" className="legal-back-link">
        <ArrowLeft size={16} /> Back to Sign In
      </Link>

      <article className="legal-card">
        <header className="legal-header">
          <span className="legal-tag">Legal Terms</span>
          <h1 className="legal-title font-serif">Terms of Service</h1>
          <p className="legal-meta">Last updated: October 2026</p>
        </header>

        <section className="legal-section">
          <h2>1. Introduction & Acceptance</h2>
          <p>
            Welcome to <strong>Neha&apos;s Institute</strong> (&quot;the Platform&quot;). By accessing our website, enrolling in culinary masterclasses, or purchasing all-access passes, you agree to abide by these Terms of Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Intellectual Property & Course Content</h2>
          <p>
            All video lectures, culinary techniques, recipe PDFs, and instructional media provided on this platform are the intellectual property of Neha&apos;s Institute. Access is granted for personal, non-commercial culinary learning only. Unauthorized downloading, redistributing, or re-recording of course videos is strictly prohibited.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Account & Security</h2>
          <p>
            Accounts are authenticated securely via Google Sign-In. You are responsible for maintaining the confidentiality of your account. Access to enrolled courses and passes is strictly single-user and non-transferable.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Payments & Refunds</h2>
          <p>
            Payments are securely processed via Razorpay. Subscriptions and all-access passes provide immediate digital access to courses and recipe notes. In the event of duplicate billing or payment discrepancies, contact support at our Help Center.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Contact & Support</h2>
          <p>
            If you have questions regarding these terms, please visit our <Link href="/help">Help Center</Link> or submit a support ticket directly from your account.
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
