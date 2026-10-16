'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Megaphone, 
  BookOpen, 
  FileText, 
  Users, 
  LifeBuoy, 
  HelpCircle, 
  CreditCard,
  Menu,
  X,
  ChefHat,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import useAuthStore from '@/lib/auth-store';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true, roles: ['SUPER_ADMIN', 'CONTENT_MANAGER'] },
  { href: '/admin/support', label: 'Support Inbox', icon: <LifeBuoy size={18} />, exact: true, roles: ['SUPER_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_MANAGER'] },
  { href: '/admin/support/faqs', label: 'Manage FAQs', icon: <HelpCircle size={18} />, exact: false, roles: ['SUPER_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_MANAGER'] },
  { href: '/admin/announcements', label: 'Announcements', icon: <Megaphone size={18} />, exact: false, roles: ['SUPER_ADMIN', 'CONTENT_MANAGER'] },
  { href: '/admin/notes', label: 'Recipe Notes', icon: <FileText size={18} />, exact: false, roles: ['SUPER_ADMIN', 'CONTENT_MANAGER'] },
  { href: '/admin/payments', label: 'Payments', icon: <CreditCard size={18} />, exact: false, roles: ['SUPER_ADMIN', 'CONTENT_MANAGER'] },
  { href: '/admin/users', label: 'Users & Roles', icon: <Users size={18} />, exact: false, roles: ['SUPER_ADMIN'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isInitialized, initialize } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isInitialized) initialize();
  }, [initialize, isInitialized]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) { router.replace('/login'); return; }
    
    const validRoles = ['SUPER_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_MANAGER'];
    if (!validRoles.includes(user.role)) {
      router.replace('/');
      return;
    }

    if (user.role === 'SUPPORT_MANAGER' && pathname === '/admin') {
      router.replace('/admin/support');
    }
  }, [user, isInitialized, router, pathname]);

  if (!isInitialized || !user) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
      </div>
    );
  }

  const validRoles = ['SUPER_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_MANAGER'];
  if (!validRoles.includes(user.role)) {
    return null;
  }

  const isActive = (item: typeof NAV_ITEMS[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const activeNavItem = NAV_ITEMS.find((item) => isActive(item)) || NAV_ITEMS[0];

  return (
    <div className="admin-shell">
      {/* ── Mobile Admin Header (< 768px) ── */}
      <header className="admin-mobile-header">
        <div className="mobile-header-left">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="mobile-header-brand">
            <span className="mobile-brand-title">Admin Console</span>
            <span className="mobile-page-name">{activeNavItem.label}</span>
          </div>
        </div>
        <Link href="/" className="mobile-exit-link" title="Exit to main website">
          <ArrowLeft size={16} />
          <span>Exit</span>
        </Link>
      </header>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-brand">
                <ChefHat size={22} className="text-orange-600" />
                <span className="drawer-brand-text">Neha&apos;s Institute</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="drawer-close-btn"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="drawer-nav">
              {NAV_ITEMS.map((item) => {
                if (!item.roles.includes(user.role)) return null;
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`drawer-nav-item ${active ? 'drawer-nav-item--active' : ''}`}
                  >
                    <span className="drawer-nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="drawer-footer">
              <Link href="/" className="drawer-back-btn">
                <ArrowLeft size={15} />
                <span>Return to Student Site</span>
              </Link>
              <div className="drawer-user-info">
                <span className="drawer-user-role">
                  {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'CONTENT_MANAGER' ? 'Content Manager' : 'Support Manager'}
                </span>
                <span className="drawer-user-name">{user.name}</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop Sidebar (>= 768px) ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <ChefHat size={20} className="text-orange-600 flex-shrink-0" />
          <span className="font-serif admin-brand-text">Institute Admin</span>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            if (!item.roles.includes(user.role)) return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive(item) ? 'admin-nav-item--active' : ''}`}
              >
                <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-back-link">
            ← Back to Student Site
          </Link>
          <div className="admin-user-chip">
            <span className="admin-user-role">
              {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'CONTENT_MANAGER' ? 'Content Manager' : 'Support Team'}
            </span>
            <span className="admin-user-name">{user.name}</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="admin-content">
        <div className="admin-content-inner">
          {children}
        </div>
      </main>

      <style>{`
        .admin-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-cream, #fffbf7);
        }
        .admin-spinner {
          width: 32px; height: 32px;
          border: 2px solid #fed7aa;
          border-top-color: var(--color-terracotta, #c2410c);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .admin-shell {
          display: flex;
          min-height: 100vh;
          background: var(--color-cream, #fffbf7);
          color: var(--color-espresso, #1c1917);
        }

        /* ── Mobile Header ── */
        .admin-mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: rgba(255, 251, 247, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--color-border, #fed7aa);
          z-index: 90;
          padding: 0 1rem;
          align-items: center;
          justify-content: space-between;
        }

        .mobile-header-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .mobile-menu-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          color: var(--color-espresso, #1c1917);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .mobile-header-brand {
          display: flex;
          flex-direction: column;
        }

        .mobile-brand-title {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-terracotta, #c2410c);
          letter-spacing: 0.05em;
        }

        .mobile-page-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
        }

        .mobile-exit-link {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-muted, #78716c);
          text-decoration: none;
          padding: 0.4rem 0.75rem;
          border-radius: 8px;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
        }

        /* ── Mobile Drawer ── */
        .mobile-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
        }

        .mobile-drawer {
          width: 280px;
          max-width: 85vw;
          background: var(--color-surface, #ffffff);
          border-right: 1px solid var(--color-border, #fed7aa);
          height: 100%;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          animation: slideIn 0.2s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--color-border, #fed7aa);
        }

        .drawer-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .drawer-brand-text {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
        }

        .drawer-close-btn {
          background: none;
          border: none;
          color: var(--color-muted, #78716c);
          cursor: pointer;
          padding: 0.25rem;
        }

        .drawer-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1rem 0.75rem;
          overflow-y: auto;
        }

        .drawer-nav-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          min-height: 48px;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--color-muted, #78716c);
          text-decoration: none;
          transition: all 0.15s;
        }

        .drawer-nav-item:hover {
          background: var(--color-cream, #fffbf7);
          color: var(--color-espresso, #1c1917);
        }

        .drawer-nav-item--active {
          background: #fff7ed;
          color: var(--color-terracotta, #c2410c);
          font-weight: 700;
        }

        .drawer-footer {
          padding: 1rem;
          border-top: 1px solid var(--color-border, #fed7aa);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .drawer-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-muted, #78716c);
          text-decoration: none;
        }

        .drawer-user-info {
          background: var(--color-cream, #fffbf7);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 10px;
          padding: 0.65rem 0.85rem;
        }

        .drawer-user-role {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-terracotta, #c2410c);
        }

        .drawer-user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-espresso, #1c1917);
        }

        /* ── Desktop Sidebar ── */
        .admin-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: var(--color-surface, #ffffff);
          border-right: 1px solid var(--color-border, #fed7aa);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 50;
          padding: 1.5rem 0;
        }

        .admin-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0 1.25rem 1.5rem;
          border-bottom: 1px solid var(--color-border, #fed7aa);
          margin-bottom: 0.85rem;
        }

        .admin-brand-text {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
        }

        .admin-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 0 0.75rem;
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.85rem;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-muted, #78716c);
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }

        .admin-nav-item:hover {
          background: var(--color-cream, #fffbf7);
          color: var(--color-espresso, #1c1917);
        }

        .admin-nav-item--active {
          background: #fff7ed;
          color: var(--color-terracotta, #c2410c);
          font-weight: 700;
        }

        .admin-sidebar-footer {
          padding: 1rem 1.25rem 0;
          border-top: 1px solid var(--color-border, #fed7aa);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .admin-back-link {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-muted, #78716c);
          text-decoration: none;
          transition: color 0.15s;
        }
        .admin-back-link:hover { color: var(--color-terracotta, #c2410c); }

        .admin-user-chip {
          background: var(--color-cream, #fffbf7);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 10px;
          padding: 0.65rem 0.85rem;
        }

        .admin-user-role {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-terracotta, #c2410c);
          margin-bottom: 0.15rem;
        }

        .admin-user-name {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--color-espresso, #1c1917);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Main Content ── */
        .admin-content {
          flex: 1;
          margin-left: 240px;
          padding: 2rem;
          min-height: 100vh;
        }

        .admin-content-inner {
          max-width: 1200px;
          margin: 0 auto;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 768px) {
          .admin-sidebar { display: none; }
          .admin-mobile-header { display: flex; }
          .admin-content {
            margin-left: 0;
            padding: 1rem;
            padding-top: 76px;
            padding-bottom: 3rem;
          }
        }
      `}</style>
    </div>
  );
}
