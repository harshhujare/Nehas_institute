'use client';

import React, { useEffect, useState } from 'react';
import useAuthStore from '@/lib/auth-store';
import { useCheckout, type PlanDuration } from '@/features/payment/hooks/useCheckout';
import PlanCard, { type PlanData } from '@/features/payment/components/PlanCard';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Zap, 
  ChefHat, 
  Smartphone, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  BookOpen,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

const FALLBACK_PLANS: readonly PlanData[] = [
  {
    duration: 30,
    label: 'All-Access Pass',
    price: '₹499',
    period: 'All courses & guides',
    badge: 'Most Popular',
    description: 'Unlock all video courses, lectures, and culinary recipe guides by Neha Ma\'am — all in one all-access pass.',
  },
] as const;

function daysRemaining(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default function PricingPage() {
  const { user, isInitialized } = useAuthStore();
  const { state: checkoutState, checkout } = useCheckout();

  // Fetch live pricing from backend
  const { data: serverPlans, isLoading: isPlansLoading } = useQuery({
    queryKey: ['public-plan-config'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: { planDuration: number; price: number; label: string; description: string | null }[] }>('/api/payments/plan-config');
      return data.data;
    },
  });

  const displayPlans: readonly PlanData[] = serverPlans && serverPlans.length > 0
    ? serverPlans.map((p) => ({
        duration: p.planDuration as 30 | 180 | 365,
        label: p.label,
        price: `₹${p.price / 100}`,
        period: 'All courses & guides',
        badge: 'Best Value',
        description: p.description || undefined,
      }))
    : FALLBACK_PLANS;

  // Cold-start UX — escalate message after 3s so users know it hasn't frozen
  const [coldStartMsg, setColdStartMsg] = useState('Preparing your order…');
  useEffect(() => {
    if (checkoutState.status !== 'creating_order') {
      setColdStartMsg('Preparing your order…');
      return;
    }
    const t = setTimeout(() => setColdStartMsg('Almost there… waking up the server'), 3000);
    return () => clearTimeout(t);
  }, [checkoutState.status]);

  // Session restore — auto-resume checkout if user was redirected to login
  useEffect(() => {
    if (!isInitialized || !user) return;
    const isPaid = user.plan === 'PAID';
    const planExpiresAt = user.planExpiresAt ? new Date(user.planExpiresAt) : null;
    const isExpired = planExpiresAt ? planExpiresAt < new Date() : false;
    const isActivePaid = isPaid && !isExpired;
    if (isActivePaid) return;

    const pending = sessionStorage.getItem('pendingPlanCheckout') as PlanDuration | null;
    if (pending && (['30', '180', '365'] as string[]).includes(pending)) {
      sessionStorage.removeItem('pendingPlanCheckout');
      checkout(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, user]);

  // Compute plan state
  const isPaid = user?.plan === 'PAID';
  const planExpiresAt = user?.planExpiresAt ? new Date(user.planExpiresAt) : null;
  const isExpired = planExpiresAt ? planExpiresAt < new Date() : false;
  const isActivePaid = isPaid && !isExpired;
  const days = planExpiresAt ? daysRemaining(planExpiresAt) : 0;
  const isExpiringSoon = isActivePaid && days <= 15;

  let statusText: string | undefined;
  if (checkoutState.status === 'creating_order') statusText = coldStartMsg;
  if (checkoutState.status === 'awaiting_payment') statusText = 'Complete payment…';
  if (checkoutState.status === 'verifying') statusText = 'Verifying…';
  if (checkoutState.status === 'polling') statusText = 'Confirming…';
  if (checkoutState.status === 'refreshing_token') statusText = 'Unlocking courses…';
  if (!user) statusText = 'Login to Subscribe';
  if (isActivePaid) statusText = 'Plan Active';

  const isCheckoutActive =
    checkoutState.status !== 'idle' &&
    checkoutState.status !== 'error' &&
    checkoutState.status !== 'cancelled';

  // Loading skeleton
  if (!isInitialized || isPlansLoading) {
    return (
      <div className="pricing-page">
        <div className="pricing-header">
          <div className="skeleton-title" />
          <div className="skeleton-subtitle" />
        </div>
        <div className="pricing-container" style={{ opacity: 0.6 }}>
          <div className="plan-skeleton-card" />
        </div>
        <style>{`
          .pricing-page {
            background: var(--color-cream, #fffbf7);
            min-height: 100vh;
            padding: 3.5rem 1.25rem;
          }
          .pricing-header {
            max-width: 650px;
            margin: 0 auto 3rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
          .skeleton-title {
            width: 280px;
            height: 38px;
            background: var(--color-surface, #ffffff);
            border-radius: 8px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          .skeleton-subtitle {
            width: 380px;
            max-width: 90%;
            height: 20px;
            background: var(--color-surface, #ffffff);
            border-radius: 6px;
            animation: pulse 1.5s infinite ease-in-out;
          }
          .plan-skeleton-card {
            width: 100%;
            max-width: 440px;
            height: 480px;
            background: var(--color-surface, #ffffff);
            border: 1px solid var(--color-border, #fed7aa);
            border-radius: 20px;
            margin: 0 auto;
            animation: pulse 1.5s infinite ease-in-out;
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      {/* ── PAID ACTIVE USER VIEW ── */}
      {isActivePaid && planExpiresAt ? (
        <div className="pricing-container">
          <div className="active-pass-hero">
            <span className="eyebrow-badge">
              <CheckCircle2 size={14} className="text-emerald-600 inline mr-1" />
              Active Membership
            </span>
            <h1 className="pricing-title">Chef&apos;s All-Access Pass</h1>
            <p className="pricing-subtitle">
              You have full, unrestricted access to all recorded video masterclasses, recipe notes, and cooking guides.
            </p>
          </div>

          <div className={`active-pass-card ${isExpiringSoon ? 'active-pass-card--expiring' : ''}`}>
            <div className="pass-card-header">
              <div className="pass-status-pill">
                <span className="status-dot" />
                Active Pass
              </div>
              <span className="pass-tier-name">⭐ Unlimited Access</span>
            </div>

            <div className="pass-details-box">
              <div className="pass-detail-item">
                <span className="detail-label">Valid Until</span>
                <span className="detail-value">
                  {planExpiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="pass-detail-item">
                <span className="detail-label">Status</span>
                <span className={`detail-days ${isExpiringSoon ? 'detail-days--alert' : ''}`}>
                  <Clock size={16} />
                  {days} days remaining
                </span>
              </div>
            </div>

            <div className="pass-perks-list">
              <h3 className="perks-heading">Your Pass Benefits:</h3>
              <div className="perk-row">
                <CheckCircle2 size={18} className="perk-icon" />
                <span>Unlimited streaming of all culinary lectures & masterclasses</span>
              </div>
              <div className="perk-row">
                <CheckCircle2 size={18} className="perk-icon" />
                <span>Downloadable, printable chef recipe PDF cards with exact measurements</span>
              </div>
              <div className="perk-row">
                <CheckCircle2 size={18} className="perk-icon" />
                <span>Instant access to newly released seasonal masterclasses</span>
              </div>
              <div className="perk-row">
                <CheckCircle2 size={18} className="perk-icon" />
                <span>Dedicated culinary support from Neha Ma&apos;am&apos;s team</span>
              </div>
            </div>

            {isExpiringSoon && (
              <div className="expiring-notice">
                <AlertCircle size={18} className="text-amber-700 flex-shrink-0" />
                <p>Your pass expires in {days} days. You can renew after expiry to ensure uninterrupted learning.</p>
              </div>
            )}

            <div className="pass-cta-group">
              <Link href="/notes" className="btn-primary-pass">
                <BookOpen size={18} />
                <span>Browse Recipe Guides</span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/account" className="btn-secondary-pass">
                Account Settings
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ── FREE / EXPIRED / LOGGED-OUT VIEW ── */
        <div className="pricing-container">
          <div className="pricing-header">
            <span className="eyebrow-badge">
              <ChefHat size={14} className="inline mr-1" />
              Chef&apos;s Culinary Pass
            </span>
            <h1 className="pricing-title">One Pass. Unlimited Culinary Mastery.</h1>
            <p className="pricing-subtitle">
              Unlock every video masterclass, foolproof secret recipe note, and kitchen technique by Neha Ma&apos;am.
            </p>
          </div>

          {isPaid && isExpired && (
            <div className="expired-plan-alert">
              <AlertCircle size={24} className="text-amber-800 flex-shrink-0" />
              <div>
                <strong>Your Chef All-Access Pass has expired.</strong>
                <p>
                  It expired on {planExpiresAt?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. 
                  Renew below to restore instant access to all recipe masterclasses.
                </p>
              </div>
            </div>
          )}

          {/* Pricing Cards Grid */}
          <div className="plans-grid">
            {displayPlans.map((plan) => (
              <PlanCard
                key={plan.duration}
                plan={plan}
                isLoading={checkoutState.status === 'creating_order'}
                disabled={isCheckoutActive || isActivePaid}
                statusText={statusText}
                onSelect={(duration) => checkout(duration.toString() as PlanDuration)}
              />
            ))}
          </div>

          {checkoutState.status === 'error' && (
            <div className="error-banner">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span>{checkoutState.message}</span>
            </div>
          )}

          {/* Trust Badges Grid */}
          <div className="trust-grid">
            <div className="trust-card">
              <div className="trust-icon-box">
                <Zap size={22} className="text-amber-600" />
              </div>
              <h3 className="trust-title">Instant Digital Access</h3>
              <p className="trust-desc">Begin streaming lectures and downloading recipe cards immediately after payment.</p>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <ShieldCheck size={22} className="text-emerald-600" />
              </div>
              <h3 className="trust-title">100% Secure Razorpay</h3>
              <p className="trust-desc">Bank-grade 256-bit encryption. Pay safely via UPI (GPay, PhonePe, Paytm), NetBanking, or Cards.</p>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <ChefHat size={22} className="text-orange-600" />
              </div>
              <h3 className="trust-title">Proven & Tested Recipes</h3>
              <p className="trust-desc">Every recipe is calibrated with gram-accurate measurements for fail-proof cooking at home.</p>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <Smartphone size={22} className="text-stone-700" />
              </div>
              <h3 className="trust-title">Optimized for Mobile</h3>
              <p className="trust-desc">Watch seamlessly in the kitchen on any mobile phone, even on standard 4G connections.</p>
            </div>
          </div>

          {/* Guarantee Banner */}
          <div className="guarantee-banner">
            <ShieldCheck size={28} className="text-orange-700 flex-shrink-0" />
            <div>
              <h4 className="guarantee-title">Zero Hidden Fees • No Recurring Auto-Debits</h4>
              <p className="guarantee-text">
                Your purchase is a single, one-time payment for the full pass duration. We never charge unexpected recurring subscriptions.
              </p>
            </div>
          </div>

          {/* FAQ Accordion Section */}
          <div className="faq-section">
            <h2 className="faq-heading">Frequently Asked Questions</h2>
            <div className="faq-list">
              <details className="faq-item">
                <summary className="faq-question">
                  <span>What exactly is included in the Chef&apos;s All-Access Pass?</span>
                </summary>
                <div className="faq-answer">
                  You get unlimited on-demand streaming of all recorded video masterclasses, printable chef recipe notes with exact ingredient ratios, step-by-step technique explanations, and access to all newly added courses during your pass period.
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>How quickly do I get access after paying?</span>
                </summary>
                <div className="faq-answer">
                  Access is immediate! As soon as your payment is verified via Razorpay, your account unlocks instantly and you can start learning right away.
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>Can I watch videos on my phone or tablet?</span>
                </summary>
                <div className="faq-answer">
                  Yes, absolutely. The platform is completely mobile-first and optimized for Android and iPhone. You can easily keep your phone next to the stove while cooking!
                </div>
              </details>

              <details className="faq-item">
                <summary className="faq-question">
                  <span>What payment methods are supported?</span>
                </summary>
                <div className="faq-answer">
                  We support all major Indian payment methods through Razorpay: UPI (Google Pay, PhonePe, Paytm, BHIM), Debit/Credit Cards (Visa, Mastercard, RuPay), NetBanking from 50+ banks, and popular wallets.
                </div>
              </details>
            </div>
          </div>

          {/* Need Help Footer */}
          <div className="support-banner">
            <HelpCircle size={20} className="text-stone-600" />
            <span>Have questions before joining?</span>
            <Link href="/help" className="support-link">
              Contact our Support Desk →
            </Link>
          </div>
        </div>
      )}

      <style>{`
        .pricing-page {
          background: var(--color-cream, #fffbf7);
          min-height: 100vh;
          padding: 3.5rem 1.25rem 5rem;
          color: var(--color-espresso, #1c1917);
        }

        .pricing-container {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2.5rem;
        }

        .pricing-header, .active-pass-hero {
          text-align: center;
          max-width: 650px;
          margin: 0 auto;
        }

        .eyebrow-badge {
          display: inline-flex;
          align-items: center;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 1rem;
        }

        .pricing-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          line-height: 1.15;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 0.85rem;
          letter-spacing: -0.02em;
        }

        .pricing-subtitle {
          font-size: 1.05rem;
          line-height: 1.6;
          color: var(--color-muted, #78716c);
          margin: 0 auto;
        }

        .plans-grid {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: stretch;
          margin-top: 0.5rem;
        }

        /* Active Plan Card */
        .active-pass-card {
          width: 100%;
          max-width: 540px;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 24px;
          padding: 2.25rem 2rem;
          box-shadow: 0 10px 30px rgba(194, 65, 12, 0.08);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .active-pass-card--expiring {
          border-color: #f59e0b;
          box-shadow: 0 10px 30px rgba(245, 158, 11, 0.15);
        }

        .pass-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pass-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #dcfce7;
          color: #166534;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16a34a;
        }

        .pass-tier-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-terracotta, #c2410c);
        }

        .pass-details-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          padding: 1.25rem;
          background: var(--color-cream, #fffbf7);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 16px;
        }

        .detail-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-muted, #78716c);
          margin-bottom: 0.25rem;
        }

        .detail-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
        }

        .detail-days {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 1.05rem;
          font-weight: 700;
          color: #166534;
        }

        .detail-days--alert {
          color: #b45309;
        }

        .perks-heading {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 0.85rem;
          color: var(--color-espresso, #1c1917);
        }

        .pass-perks-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .perk-row {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          font-size: 0.92rem;
          color: var(--color-espresso, #1c1917);
          line-height: 1.45;
        }

        .perk-icon {
          color: #16a34a;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .expiring-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 12px;
          color: #92400e;
          font-size: 0.88rem;
          line-height: 1.4;
        }

        .pass-cta-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .btn-primary-pass {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-height: 48px;
          padding: 0.875rem 1.5rem;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(194, 65, 12, 0.25);
          transition: background 0.15s, transform 0.15s;
        }

        .btn-primary-pass:hover {
          background: #9a3412;
          transform: translateY(-1px);
        }

        .btn-secondary-pass {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0.75rem 1.25rem;
          background: transparent;
          color: var(--color-espresso, #1c1917);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s;
        }

        .btn-secondary-pass:hover {
          background: var(--color-cream, #fffbf7);
        }

        /* Expired Banner */
        .expired-plan-alert {
          display: flex;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: 16px;
          color: #92400e;
          font-size: 0.95rem;
          max-width: 600px;
          width: 100%;
        }

        .expired-plan-alert strong {
          display: block;
          font-size: 1.05rem;
          margin-bottom: 0.25rem;
        }

        .expired-plan-alert p {
          margin: 0;
          line-height: 1.5;
        }

        /* Trust Grid */
        .trust-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          width: 100%;
          margin-top: 1rem;
        }

        .trust-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .trust-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--color-cream, #fffbf7);
          border: 1px solid var(--color-border, #fed7aa);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.35rem;
        }

        .trust-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin: 0;
        }

        .trust-desc {
          font-size: 0.88rem;
          color: var(--color-muted, #78716c);
          line-height: 1.5;
          margin: 0;
        }

        /* Guarantee Banner */
        .guarantee-banner {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background: #fff7ed;
          border: 1px solid #ffedd5;
          border-radius: 16px;
          padding: 1.5rem 1.75rem;
          width: 100%;
        }

        .guarantee-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin: 0 0 0.25rem 0;
        }

        .guarantee-text {
          font-size: 0.88rem;
          color: var(--color-muted, #78716c);
          margin: 0;
          line-height: 1.5;
        }

        /* FAQ */
        .faq-section {
          width: 100%;
          margin-top: 1rem;
        }

        .faq-heading {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.75rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 1.5rem;
          color: var(--color-espresso, #1c1917);
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .faq-item {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .faq-item[open] {
          border-color: var(--color-terracotta, #c2410c);
        }

        .faq-question {
          padding: 1.15rem 1.25rem;
          font-size: 0.98rem;
          font-weight: 600;
          color: var(--color-espresso, #1c1917);
          cursor: pointer;
          user-select: none;
          list-style: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .faq-question::-webkit-details-marker {
          display: none;
        }

        .faq-question::after {
          content: '+';
          font-size: 1.25rem;
          color: var(--color-terracotta, #c2410c);
          font-weight: 600;
        }

        .faq-item[open] .faq-question::after {
          content: '−';
        }

        .faq-answer {
          padding: 0 1.25rem 1.25rem;
          font-size: 0.92rem;
          color: var(--color-muted, #78716c);
          line-height: 1.6;
        }

        /* Support link */
        .support-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.92rem;
          color: var(--color-muted, #78716c);
        }

        .support-link {
          color: var(--color-terracotta, #c2410c);
          font-weight: 600;
          text-decoration: underline;
        }

        /* Error */
        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 12px;
          color: #dc2626;
          font-size: 0.92rem;
          font-weight: 500;
          max-width: 440px;
          width: 100%;
        }

        @media (max-width: 640px) {
          .pass-details-box {
            grid-template-columns: 1fr;
          }
          .guarantee-banner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
