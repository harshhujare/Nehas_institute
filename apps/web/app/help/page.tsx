'use client';

// No useSearchParams — avoids the Suspense/prerender requirement.
// We read the URL directly via window.location (client-only, safe).
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { HelpCircle, Ticket, Inbox, Plus } from 'lucide-react';
import FAQSection from '@/components/help/FAQSection';
import ContactForm from '@/components/help/ContactForm';
import TicketCard from '@/components/help/TicketCard';
import useAuthStore from '@/lib/auth-store';
import apiClient from '@/lib/api-client';
import { useFaqs } from '@/hooks/useFaqs';

type Tab = 'help' | 'tickets';

export default function HelpCenterPage() {
  const { user, isInitialized, initialize } = useAuthStore();

  // Read tab from URL without useSearchParams (avoids Suspense requirement)
  const [activeTab, setActiveTab] = useState<Tab>('help');

  useEffect(() => {
    const readTab = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(params.get('tab') === 'tickets' ? 'tickets' : 'help');
    };
    readTab();
    // Keep in sync with browser back/forward
    window.addEventListener('popstate', readTab);
    return () => window.removeEventListener('popstate', readTab);
  }, []);

  // FAQs via React Query — cached in localStorage for 7 days (Phase 3c)
  const { data: faqs = [] } = useFaqs();

  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState('');

  // Init auth
  useEffect(() => {
    if (!isInitialized) initialize();
  }, [initialize, isInitialized]);

  // Note: FAQs are now fetched via useFaqs() hook (React Query, Phase 3c)

  // Fetch tickets when that tab is active and user is logged in
  const fetchTickets = useCallback(() => {
    if (!user) return;
    setTicketsLoading(true);
    setTicketsError('');
    apiClient.get('/api/support/mine')
      .then(res => setTickets(res.data.data))
      .catch(err => setTicketsError(err.response?.data?.error || 'Failed to load tickets'))
      .finally(() => setTicketsLoading(false));
  }, [user]);

  useEffect(() => {
    if (activeTab === 'tickets') fetchTickets();
  }, [activeTab, fetchTickets]);

  const setTab = (tab: Tab) => {
    const url = tab === 'tickets' ? '/help?tab=tickets' : '/help';
    window.history.pushState({}, '', url);
    setActiveTab(tab);
  };

  return (
    <div className="help-page">

      {/* ── Hero ── */}
      <div className="help-hero">
        <div className="help-hero-icon">
          <HelpCircle size={30} />
        </div>
        <h1 className="help-hero-title font-serif">How can we help you?</h1>
        <p className="help-hero-subtitle">
          Browse FAQs, contact support, or track your existing requests — all in one place.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="help-tabs-bar">
        <div className="help-tabs">
          <button
            className={`help-tab ${activeTab === 'help' ? 'help-tab--active' : ''}`}
            onClick={() => setTab('help')}
          >
            <HelpCircle size={16} />
            Help &amp; FAQs
          </button>

          {user && (
            <button
              className={`help-tab ${activeTab === 'tickets' ? 'help-tab--active' : ''}`}
              onClick={() => setTab('tickets')}
            >
              <Ticket size={16} />
              My Tickets
              {tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length > 0 && (
                <span className="help-tab-badge">
                  {tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="help-content">

        {/* TAB 1 — Help & FAQs */}
        {activeTab === 'help' && (
          <div className="help-layout">
            <div className="help-faq-col">
              <h2 className="help-section-title">Frequently Asked Questions</h2>
              <FAQSection faqs={faqs} />
            </div>

            <div className="help-contact-col">
              {user ? (
                <ContactForm onSuccess={() => setTab('tickets')} />
              ) : (
                <div className="help-login-prompt">
                  <HelpCircle size={28} className="help-login-icon" />
                  <h3 className="help-login-title">Need personal support?</h3>
                  <p className="help-login-desc">Log in to submit a support ticket and track your replies.</p>
                  <Link href="/login" className="help-login-btn">Log in to Contact Support</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2 — My Tickets */}
        {activeTab === 'tickets' && (
          <div className="help-tickets">
            <div className="help-tickets-header">
              <div>
                <h2 className="help-section-title">My Support Tickets</h2>
                <p className="help-tickets-sub">View status and history of your requests.</p>
              </div>
              <button className="help-new-ticket-btn" onClick={() => setTab('help')}>
                <Plus size={15} />
                New Ticket
              </button>
            </div>

            {ticketsError && (
              <div className="help-tickets-error">{ticketsError}</div>
            )}

            {ticketsLoading ? (
              <div className="help-ticket-skeletons">
                {[1, 2, 3].map(i => <div key={i} className="help-ticket-skeleton" />)}
              </div>
            ) : tickets.length === 0 ? (
              <div className="help-tickets-empty">
                <div className="help-tickets-empty-icon"><Inbox size={30} /></div>
                <h3 className="help-tickets-empty-title">No tickets yet</h3>
                <p className="help-tickets-empty-sub">Submit a request from the Help &amp; FAQs tab.</p>
                <button className="help-new-ticket-btn" onClick={() => setTab('help')}>
                  Contact Support
                </button>
              </div>
            ) : (
              <div className="help-ticket-list">
                {tickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        .help-page {
          min-height: 100vh;
          background: var(--color-cream, #fffbf7);
          padding-top: 3.5rem;
          padding-bottom: 5rem;
          color: var(--color-espresso, #1c1917);
        }

        /* ── Hero ── */
        .help-hero {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 2.5rem;
          padding: 0 1.25rem;
        }

        .help-hero-icon {
          width: 56px; height: 56px;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem;
          box-shadow: 0 4px 14px rgba(217, 119, 6, 0.12);
        }

        .help-hero-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(2rem, 4.5vw, 2.75rem);
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 0.75rem;
          line-height: 1.2;
        }

        .help-hero-subtitle {
          font-size: 1rem;
          color: var(--color-muted, #78716c);
          line-height: 1.6;
        }

        /* ── Tabs Bar ── */
        .help-tabs-bar {
          border-bottom: 1px solid var(--color-border, #fed7aa);
          margin-bottom: 2.5rem;
          padding: 0 1.25rem;
        }

        .help-tabs {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          gap: 0.5rem;
        }

        .help-tab {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 48px;
          padding: 0.75rem 1.25rem;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: inherit;
          color: var(--color-muted, #78716c);
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          margin-bottom: -1px;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
          position: relative;
        }

        .help-tab:hover { color: var(--color-espresso, #1c1917); }

        .help-tab--active {
          color: var(--color-terracotta, #c2410c);
          border-bottom-color: var(--color-terracotta, #c2410c);
          font-weight: 700;
        }

        .help-tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
        }

        /* ── Content ── */
        .help-content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 1.25rem;
        }

        /* Tab 1: Two-column layout */
        .help-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2.5rem;
          align-items: start;
        }

        .help-faq-col { display: flex; flex-direction: column; gap: 1.5rem; }

        .help-section-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 0.25rem;
        }

        .help-contact-col {
          position: sticky;
          top: 5.5rem;
        }

        /* Login prompt (for logged-out users) */
        .help-login-prompt {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          padding: 2.25rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.85rem;
          box-shadow: 0 4px 16px rgba(194, 65, 12, 0.04);
        }

        .help-login-icon { color: var(--color-muted, #78716c); }

        .help-login-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
        }

        .help-login-desc {
          font-size: 0.9rem;
          color: var(--color-muted, #78716c);
          line-height: 1.55;
        }

        .help-login-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          width: 100%;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          margin-top: 0.5rem;
          transition: background 0.15s, transform 0.15s;
          box-shadow: 0 4px 14px rgba(194, 65, 12, 0.25);
        }
        .help-login-btn:hover { 
          background: #9a3412; 
          transform: translateY(-1px);
        }

        /* Tab 2: Tickets */
        .help-tickets { display: flex; flex-direction: column; gap: 1.5rem; }

        .help-tickets-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .help-tickets-sub { font-size: 0.88rem; color: var(--color-muted, #78716c); margin-top: 0.25rem; }

        .help-new-ticket-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-height: 44px;
          padding: 0.65rem 1.25rem;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(194, 65, 12, 0.2);
        }
        .help-new-ticket-btn:hover { background: #9a3412; }

        .help-tickets-error {
          padding: 0.875rem 1rem;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 10px;
          font-size: 0.88rem;
        }

        .help-ticket-skeletons { display: flex; flex-direction: column; gap: 0.75rem; }
        .help-ticket-skeleton {
          height: 90px;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 16px;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.4; } }

        .help-tickets-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 4rem 2rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          gap: 0.75rem;
        }

        .help-tickets-empty-icon {
          width: 60px; height: 60px;
          background: var(--color-cream, #fffbf7);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-muted, #78716c);
          margin-bottom: 0.25rem;
        }

        .help-tickets-empty-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
        }

        .help-tickets-empty-sub {
          font-size: 0.9rem;
          color: var(--color-muted, #78716c);
        }

        .help-ticket-list { display: flex; flex-direction: column; gap: 0.85rem; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .help-layout {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .help-contact-col {
            position: static;
            order: -1;
          }
        }

        @media (max-width: 480px) {
          .help-tab { padding: 0.65rem 0.85rem; font-size: 0.85rem; }
        }
      `}</style>
    </div>
  );
}
