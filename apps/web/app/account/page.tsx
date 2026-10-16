'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/lib/auth-store';
import { useTheme } from '@/lib/theme';
import { 
  ChefHat, 
  BookOpen, 
  HelpCircle, 
  Sun, 
  Moon, 
  ShieldCheck, 
  LogOut, 
  ChevronRight,
  Clock,
  Sparkles,
  User as UserIcon
} from 'lucide-react';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_MANAGER']);

export default function AccountPage() {
  const { user, isInitialized, logout } = useAuthStore();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login?callbackUrl=/account');
    }
  }, [isInitialized, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const getInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  // Plan status helpers
  const planExpiresAt = user?.planExpiresAt ? new Date(user.planExpiresAt) : null;
  const isPaid = user?.plan === 'PAID';
  const isExpired = planExpiresAt ? planExpiresAt < new Date() : false;
  const isActivePaid = isPaid && !isExpired;
  const daysLeft = planExpiresAt ? Math.max(0, Math.ceil((planExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const isAdmin = user ? ADMIN_ROLES.has(user.role) : false;

  if (!isInitialized || !user) {
    return (
      <div className="account-page">
        <div className="account-skeleton-header">
          <div className="skeleton-avatar-xl" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className="skeleton-line" style={{ width: 150 }} />
            <div className="skeleton-line" style={{ width: 220, height: 14 }} />
          </div>
        </div>
        <div className="skeleton-box" />
        <style>{pageStyles}</style>
      </div>
    );
  }

  return (
    <div className="account-page">
      {/* ── Page Header ── */}
      <div className="account-header">
        <h1 className="account-title">My Account</h1>
        <p className="account-subtitle">Manage your profile, chef membership, and learning preferences.</p>
      </div>

      {/* ── User card ───────────────────────────────────────────────────── */}
      <div className="account-user-card">
        <div className="account-avatar-wrapper">
          <span className="account-avatar">{getInitials(user.name)}</span>
        </div>
        <div className="account-user-info">
          <div className="account-name-row">
            <h2 className="account-user-name">{user.name}</h2>
            {isAdmin && <span className="account-admin-pill">Admin</span>}
          </div>
          <p className="account-user-email">{user.email}</p>
          <div className="account-status-wrapper">
            <span className={`account-plan-badge ${isActivePaid ? 'badge--premium' : 'badge--free'}`}>
              {isActivePaid ? (
                <>
                  <Sparkles size={12} className="inline mr-1 text-amber-800" />
                  Chef All-Access Pass
                </>
              ) : (
                <>
                  <UserIcon size={12} className="inline mr-1 text-stone-500" />
                  Free Account
                </>
              )}
            </span>
            {isActivePaid && !isExpired && (
              <span className="account-expiry-tag">
                <Clock size={12} className="inline mr-1" />
                {daysLeft} days remaining
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Membership & Courses Section ─────────────────────────────────── */}
      <div className="account-section-group">
        <span className="section-label">Culinary Learning</span>
        <div className="account-section">
          <Link href="/notes" className="account-item">
            <span className="account-item-icon-box bg-orange-50 text-orange-700">
              <BookOpen size={20} />
            </span>
            <div className="account-item-text">
              <span className="account-item-label">My Recipe Guides & Notes</span>
              <span className="account-item-sublabel">Access step-by-step masterclass PDF notes</span>
            </div>
            <ChevronRight size={18} className="account-item-chevron" />
          </Link>

          <Link href="/pricing" className="account-item">
            <span className="account-item-icon-box bg-amber-50 text-amber-700">
              <ChefHat size={20} />
            </span>
            <div className="account-item-text">
              <span className="account-item-label">
                {isActivePaid ? 'Manage Chef Pass' : 'Upgrade to Chef All-Access'}
              </span>
              <span className="account-item-sublabel">
                {isActivePaid ? `Active until ${planExpiresAt?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Unlock all video lectures & recipes for ₹499'}
              </span>
            </div>
            {!isActivePaid ? (
              <span className="account-item-cta">Upgrade</span>
            ) : (
              <ChevronRight size={18} className="account-item-chevron" />
            )}
          </Link>
        </div>
      </div>

      {/* ── Preferences & Support ────────────────────────────────────────── */}
      <div className="account-section-group">
        <span className="section-label">Preferences & Support</span>
        <div className="account-section">
          <Link href="/help" className="account-item">
            <span className="account-item-icon-box bg-stone-100 text-stone-700">
              <HelpCircle size={20} />
            </span>
            <div className="account-item-text">
              <span className="account-item-label">Help Center & FAQ</span>
              <span className="account-item-sublabel">Get student support or recipe assistance</span>
            </div>
            <ChevronRight size={18} className="account-item-chevron" />
          </Link>

          {/* Theme toggle */}
          <button className="account-item account-item--btn" onClick={toggle} aria-label="Toggle theme">
            <span className="account-item-icon-box bg-stone-100 text-stone-700">
              {theme === 'dark' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-stone-700" />}
            </span>
            <div className="account-item-text">
              <span className="account-item-label">
                {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              </span>
              <span className="account-item-sublabel">Adjust visual appearance</span>
            </div>
            <span className="theme-toggle-pill">
              <span className={`theme-toggle-thumb ${theme === 'dark' ? 'theme-toggle-thumb--right' : ''}`} />
            </span>
          </button>
        </div>
      </div>

      {/* ── Admin Management Link ────────────────────────────────────────── */}
      {isAdmin && (
        <div className="account-section-group">
          <span className="section-label">Faculty Administration</span>
          <div className="account-section">
            <Link href="/admin" className="account-item account-item--admin">
              <span className="account-item-icon-box bg-red-50 text-red-700">
                <ShieldCheck size={20} />
              </span>
              <div className="account-item-text">
                <span className="account-item-label text-red-800 font-semibold">Institute Admin Console</span>
                <span className="account-item-sublabel">Manage courses, lectures, uploads, and students</span>
              </div>
              <ChevronRight size={18} className="account-item-chevron" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Sign Out ────────────────────────────────────────────────────── */}
      <div className="account-logout-wrapper">
        <button
          id="account-logout-btn"
          className="account-signout-btn"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Sign Out of Neha&apos;s Institute</span>
        </button>
      </div>

      <style>{pageStyles}</style>
    </div>
  );
}

const pageStyles = `
  .account-page {
    min-height: 100vh;
    background: var(--color-cream, #fffbf7);
    padding: 2.5rem 1.25rem 6.5rem;
    max-width: 580px;
    margin: 0 auto;
    color: var(--color-espresso, #1c1917);
  }

  .account-header {
    margin-bottom: 2rem;
  }

  .account-title {
    font-family: var(--font-playfair), Georgia, serif;
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-espresso, #1c1917);
    margin-bottom: 0.35rem;
  }

  .account-subtitle {
    font-size: 0.95rem;
    color: var(--color-muted, #78716c);
    line-height: 1.5;
  }

  /* User card */
  .account-user-card {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    background: var(--color-surface, #ffffff);
    border: 1px solid var(--color-border, #fed7aa);
    border-radius: 20px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 16px rgba(194, 65, 12, 0.04);
  }

  .account-avatar-wrapper {
    flex-shrink: 0;
  }

  .account-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #c2410c, #ea580c);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    box-shadow: 0 4px 12px rgba(194, 65, 12, 0.25);
  }

  .account-user-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    flex: 1;
  }

  .account-name-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .account-user-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--color-espresso, #1c1917);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .account-admin-pill {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
  }

  .account-user-email {
    font-size: 0.88rem;
    color: var(--color-muted, #78716c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .account-status-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.35rem;
    flex-wrap: wrap;
  }

  .account-plan-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .badge--premium {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  .badge--free {
    background: var(--color-cream, #fffbf7);
    color: var(--color-muted, #78716c);
    border: 1px solid var(--color-border, #fed7aa);
  }

  .account-expiry-tag {
    font-size: 0.75rem;
    color: #166534;
    font-weight: 600;
  }

  /* Section Groups */
  .account-section-group {
    margin-bottom: 1.5rem;
  }

  .section-label {
    display: block;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted, #78716c);
    margin-bottom: 0.65rem;
    padding-left: 0.25rem;
  }

  .account-section {
    background: var(--color-surface, #ffffff);
    border: 1px solid var(--color-border, #fed7aa);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(194, 65, 12, 0.03);
  }

  /* Items */
  .account-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    color: var(--color-espresso, #1c1917);
    text-decoration: none;
    font-size: 0.95rem;
    border-bottom: 1px solid var(--color-border, #fed7aa);
    transition: background 0.15s ease;
    background: none;
    width: 100%;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    min-height: 56px;
  }

  .account-item:last-child {
    border-bottom: none;
  }

  .account-item:hover {
    background: var(--color-cream, #fffbf7);
  }

  .account-item--btn {
    border: none;
  }

  .account-item-icon-box {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .account-item-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .account-item-label {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-espresso, #1c1917);
  }

  .account-item-sublabel {
    font-size: 0.8rem;
    color: var(--color-muted, #78716c);
    margin-top: 0.1rem;
  }

  .account-item-cta {
    font-size: 0.82rem;
    color: #ffffff;
    background: var(--color-terracotta, #c2410c);
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .account-item-chevron {
    color: var(--color-muted, #78716c);
    flex-shrink: 0;
  }

  /* Theme pill toggle */
  .theme-toggle-pill {
    width: 40px;
    height: 22px;
    background: #e7e5e4;
    border-radius: 9999px;
    position: relative;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .theme-toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: #ffffff;
    border-radius: 50%;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .theme-toggle-thumb--right {
    transform: translateX(18px);
    background: var(--color-terracotta, #c2410c);
  }

  /* Logout button */
  .account-logout-wrapper {
    margin-top: 2rem;
  }

  .account-signout-btn {
    width: 100%;
    min-height: 48px;
    padding: 0.875rem 1.25rem;
    background: #fff1f2;
    border: 1px solid #fecdd3;
    color: #e11d48;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    text-align: center;
    transition: background 0.15s, border-color 0.15s;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .account-signout-btn:hover {
    background: #ffe4e6;
    border-color: #fda4af;
  }

  /* Skeletons */
  .account-skeleton-header {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem;
    background: var(--color-surface, #ffffff);
    border: 1px solid var(--color-border, #fed7aa);
    border-radius: 20px;
    margin-bottom: 1.5rem;
    animation: acct-pulse 1.5s infinite ease-in-out;
  }

  .skeleton-avatar-xl {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #fed7aa;
    flex-shrink: 0;
  }

  .skeleton-line {
    height: 16px;
    background: #fed7aa;
    border-radius: 6px;
  }

  .skeleton-box {
    width: 100%;
    height: 180px;
    background: var(--color-surface, #ffffff);
    border: 1px solid var(--color-border, #fed7aa);
    border-radius: 18px;
    animation: acct-pulse 1.5s infinite ease-in-out;
  }

  @keyframes acct-pulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 0.4; }
  }
`;
