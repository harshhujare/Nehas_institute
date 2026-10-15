'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useAuthStore from '@/lib/auth-store';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import Slider from '@/components/ui/Slider';

export default function Home() {
  const { user, isInitialized } = useAuthStore();
  const { data: announcements, isLoading: loadingAnnouncements } = useAnnouncements();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="homepage" style={{ minHeight: '80vh', paddingBottom: '4rem' }}>
      {/* ─── Hero / Announcements Section ─────────────────────────────────────── */}
      <section className="section-hero" style={{ padding: '2rem 1rem' }}>
        <div className="hero-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {!mounted || loadingAnnouncements ? (
            <div className="slider-skeleton" style={{ height: '240px', borderRadius: '16px', background: 'var(--surface)' }} />
          ) : announcements && announcements.length > 0 ? (
            <div style={{ marginBottom: '2.5rem' }}>
              <Slider announcements={announcements} />
            </div>
          ) : null}

          <div
            className="hero-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '3.5rem 2rem',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 1rem',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--accent)',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
              }}
            >
              👩‍🍳 Welcome to Neha&apos;s Institute
            </div>

            <h1
              className="hero-title font-serif"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                lineHeight: 1.2,
                marginBottom: '1.25rem',
                color: 'var(--text)',
              }}
            >
              Master the Art of Cooking <br />
              <span style={{ color: 'var(--accent)' }}>with Neha Ma&apos;am</span>
            </h1>

            <p
              className="hero-subtitle"
              style={{
                fontSize: '1.1rem',
                color: 'var(--muted)',
                maxWidth: '680px',
                margin: '0 auto 2.25rem',
                lineHeight: 1.6,
              }}
            >
              Step-by-step video courses, chef-curated recipe guides, and culinary masterclasses.
              Explore our study resources and stay tuned as brand new courses launch soon!
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {isInitialized && user ? (
                <>
                  <Link
                    href="/account"
                    className="btn-primary"
                    style={{
                      padding: '0.85rem 1.75rem',
                      borderRadius: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    My Account
                  </Link>
                  <Link
                    href="/notes"
                    className="btn-secondary"
                    style={{
                      padding: '0.85rem 1.75rem',
                      borderRadius: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View Recipe Notes
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="btn-primary"
                    style={{
                      padding: '0.85rem 1.75rem',
                      borderRadius: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Login to Get Started
                  </Link>
                  <Link
                    href="/notes"
                    className="btn-secondary"
                    style={{
                      padding: '0.85rem 1.75rem',
                      borderRadius: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Browse Recipes & Notes
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Highlights / Features Teaser ────────────────────────────────────── */}
      <section style={{ maxWidth: '1000px', margin: '2rem auto 0', padding: '0 1rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '2rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📹</div>
            <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Video Masterclasses
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              High-definition streaming lessons with detailed step-by-step cooking demonstrations.
            </p>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '2rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
            <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Curated Recipe Guides
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Handcrafted PDF guides with accurate measurements, tips, and troubleshooting advice.
            </p>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '2rem',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💬</div>
            <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Direct Student Support
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Dedicated helpdesk and support ticketing system to answer your culinary questions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
