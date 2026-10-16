'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useAuthStore from '@/lib/auth-store';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import Slider from '@/components/ui/Slider';
import { 
  ChefHat, 
  Play, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Users, 
  ShieldCheck, 
  Star, 
  Smartphone,
  ChevronDown,
  Award
} from 'lucide-react';

const TRACKS = [
  {
    icon: '🍞',
    title: 'Artisan Baking & Desserts',
    desc: 'Master foolproof eggless tea cakes, artisanal cookies, sourdoughs, and French pastries with precise temperature guides.',
    tag: 'Popular',
  },
  {
    icon: '🍛',
    title: 'Royal Indian Gravies',
    desc: 'Learn restaurant-grade makhani, bhuna, and korma bases. Perfect the art of tempering, slow-simmering, and authentic spice blending.',
    tag: 'Bestseller',
  },
  {
    icon: '🥢',
    title: 'Pan-Asian & Street Classics',
    desc: 'Crispy dim sums, handmade momos, authentic street-style noodles, and signature chilli oils from scratch.',
    tag: 'Trending',
  },
  {
    icon: '🥗',
    title: 'Balanced Everyday Meals',
    desc: 'Nutritious 20-minute dinner bowls, grain & millet preparations, and family-friendly wholesome meals without compromising flavor.',
    tag: 'Essential',
  },
] as const;

const FEATURED_COURSES = [
  {
    id: 'mastering-indian-gravies',
    title: 'Mastering Restaurant-Style Indian Gravies',
    category: 'Regional Indian',
    duration: '3.5 Hours',
    lessons: 12,
    rating: '4.95',
    students: '1,840',
    slug: 'mastering-indian-gravies',
    badge: 'Flagship Masterclass',
    imageBg: 'linear-gradient(135deg, #ea580c, #c2410c)',
  },
  {
    id: 'eggless-baking-academy',
    title: 'The Complete Eggless Baking Masterclass',
    category: 'Baking & Pastry',
    duration: '5.0 Hours',
    lessons: 18,
    rating: '4.98',
    students: '2,150',
    slug: 'eggless-baking-academy',
    badge: 'Student Favorite',
    imageBg: 'linear-gradient(135deg, #d97706, #b45309)',
  },
  {
    id: 'authentic-mithai-confectionery',
    title: 'Artisanal Festive Mithai & Halwai Secrets',
    category: 'Desserts & Sweets',
    duration: '2.5 Hours',
    lessons: 10,
    rating: '4.92',
    students: '980',
    slug: 'authentic-mithai-confectionery',
    badge: 'Seasonal Special',
    imageBg: 'linear-gradient(135deg, #b91c1c, #991b1b)',
  },
] as const;

const TESTIMONIALS = [
  {
    quote: "Neha Ma'am's gravy masterclass changed the way I cook at home. The exact measurements and tips on onion caramelization gave me restaurant quality in my own kitchen!",
    author: "Pooja Deshmukh",
    city: "Pune",
    badge: "Home Baker & Cook",
    rating: 5,
  },
  {
    quote: "Her eggless sponge cake recipe worked on the very first try. No collapsing, no eggy smell, just soft bakery perfection. Worth ten times the pass price!",
    author: "Ananya Iyer",
    city: "Bangalore",
    badge: "Culinary Student",
    rating: 5,
  },
  {
    quote: "The recipe PDF cards are so clear with gram-by-gram measurements. I keep my phone on the kitchen counter while watching the video lessons. Truly the best cooking platform.",
    author: "Kavita Sharma",
    city: "Mumbai",
    badge: "Food Enthusiast",
    rating: 5,
  },
] as const;

export default function Home() {
  const { user, isInitialized } = useAuthStore();
  const { data: announcements, isLoading: loadingAnnouncements } = useAnnouncements();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="homepage-wrapper">
      {/* ─── Hero / Announcements Section ─────────────────────────────────────── */}
      <section className="section-hero">
        <div className="hero-container">
          {!mounted || loadingAnnouncements ? (
            <div className="slider-skeleton" />
          ) : announcements && announcements.length > 0 ? (
            <div className="announcements-bar">
              <Slider announcements={announcements} />
            </div>
          ) : null}

          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <ChefHat size={16} className="text-orange-600" />
                <span>Culinary Institute by Neha Ma&apos;am</span>
              </div>

              <h1 className="hero-title">
                Master the Art of Authentic <br />
                <span className="hero-title-accent">Cooking &amp; Baking</span>
              </h1>

              <p className="hero-subtitle">
                Step-by-step video masterclasses, secret restaurant-style techniques, and gram-perfect recipe cards designed for home kitchens.
              </p>

              {/* Proof badges */}
              <div className="hero-proof-list">
                <div className="proof-pill">
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  <span>4.9/5 Student Rating</span>
                </div>
                <div className="proof-pill">
                  <Users size={14} className="text-orange-600" />
                  <span>2,000+ Students Enrolled</span>
                </div>
                <div className="proof-pill">
                  <Award size={14} className="text-emerald-600" />
                  <span>Certificate of Completion</span>
                </div>
              </div>

              {/* Dual CTA buttons */}
              <div className="hero-cta-group">
                <Link href="/pricing" className="btn-hero-primary">
                  <span>Get Chef All-Access Pass (₹499)</span>
                  <ArrowRight size={18} />
                </Link>
                <Link href="/notes" className="btn-hero-secondary">
                  <BookOpen size={18} />
                  <span>Browse Free Recipe Guides</span>
                </Link>
              </div>

              <p className="hero-guarantee-note">
                <ShieldCheck size={16} className="text-emerald-600 inline mr-1" />
                One-time payment • No auto-renewing subscriptions • Instant mobile access
              </p>
            </div>

            {/* Video Teaser Mockup */}
            <div className="hero-teaser-box">
              <div className="teaser-card">
                <div className="teaser-media">
                  <div className="teaser-overlay">
                    <Link href="/courses/mastering-indian-gravies" className="teaser-play-btn" aria-label="Watch course preview">
                      <Play size={24} className="fill-white text-white ml-0.5" />
                    </Link>
                  </div>
                  <div className="teaser-badge">
                    <Sparkles size={13} className="text-amber-300 mr-1" />
                    Free Lesson Preview
                  </div>
                </div>
                <div className="teaser-body">
                  <span className="teaser-category">Masterclass Preview</span>
                  <h3 className="teaser-title">Restaurant Secrets: The Ultimate Silk Makhani Base</h3>
                  <div className="teaser-meta">
                    <span><Clock size={13} className="inline mr-1" /> 14 mins demonstration</span>
                    <span>• Printable Recipe Card Included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Highlights / Features Row ────────────────────────────────────────── */}
      <section className="section-features">
        <div className="container">
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon bg-orange-100 text-orange-700">📹</div>
              <h3 className="feature-title">High-Definition Masterclasses</h3>
              <p className="feature-desc">Clear, zoomed-in pan angles so you see exact color changes, bubbling textures, and consistency.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon bg-amber-100 text-amber-700">📄</div>
              <h3 className="feature-title">Printable Chef Recipe Cards</h3>
              <p className="feature-desc">Gram-measured ingredient cards with step-by-step instructions, troubleshooting tips, and substitutions.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon bg-stone-100 text-stone-700">📱</div>
              <h3 className="feature-title">Kitchen-Friendly Mobile Mode</h3>
              <p className="feature-desc">Stream smoothly on standard 4G mobile phones without buffering. Keep your phone by the stove.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon bg-emerald-100 text-emerald-700">💬</div>
              <h3 className="feature-title">Direct Culinary Support</h3>
              <p className="feature-desc">Ask recipe questions and receive guidance directly from Neha Ma&apos;am&apos;s institute team.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── What You Will Master (Curriculum Tracks) ─────────────────────────── */}
      <section className="section-tracks">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">COMPREHENSIVE CURRICULUM</span>
            <h2 className="section-heading">What You Will Master</h2>
            <p className="section-subheading">From everyday family dinners to professional festive confectionery, every track is thoroughly detailed.</p>
          </div>

          <div className="tracks-grid">
            {TRACKS.map((track) => (
              <div key={track.title} className="track-card">
                <div className="track-top">
                  <span className="track-emoji">{track.icon}</span>
                  <span className="track-badge">{track.tag}</span>
                </div>
                <h3 className="track-title">{track.title}</h3>
                <p className="track-desc">{track.desc}</p>
                <Link href="/courses" className="track-link">
                  <span>Explore Track</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Courses Section ────────────────────────────────────────── */}
      <section className="section-courses">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">POPULAR MASTERCLASSES</span>
            <h2 className="section-heading">Featured Video Masterclasses</h2>
            <p className="section-subheading">Included with your Chef&apos;s All-Access Pass. Start streaming in minutes.</p>
          </div>

          <div className="courses-grid">
            {FEATURED_COURSES.map((course) => (
              <div key={course.id} className="course-card">
                <div className="course-thumb" style={{ background: course.imageBg }}>
                  <div className="course-thumb-overlay">
                    <span className="course-badge">{course.badge}</span>
                    <span className="course-rating">
                      <Star size={13} className="text-amber-300 fill-amber-300" />
                      {course.rating} ({course.students})
                    </span>
                  </div>
                  <div className="course-play-center">
                    <ChefHat size={36} className="text-white opacity-80" />
                  </div>
                </div>

                <div className="course-body">
                  <span className="course-category">{course.category}</span>
                  <h3 className="course-title">{course.title}</h3>
                  <div className="course-meta-row">
                    <span className="course-meta-item">
                      <Clock size={14} className="inline mr-1 text-stone-500" />
                      {course.duration}
                    </span>
                    <span className="course-meta-item">
                      <BookOpen size={14} className="inline mr-1 text-stone-500" />
                      {course.lessons} Lessons
                    </span>
                  </div>
                  <div className="course-footer">
                    <span className="course-price-tag">All-Access Pass</span>
                    <Link href={`/courses/${course.slug}`} className="course-btn">
                      View Syllabus →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="all-courses-cta">
            <Link href="/courses" className="btn-secondary-lg">
              <span>View All Masterclasses &amp; Syllabi</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Chef Authority Section: Meet Neha Ma'am ─────────────────────────── */}
      <section className="section-chef">
        <div className="container">
          <div className="chef-card">
            <div className="chef-avatar-col">
              <div className="chef-portrait">
                <span className="chef-initials">NM</span>
                <span className="chef-award-tag">Executive Chef &amp; Mentor</span>
              </div>
            </div>
            <div className="chef-info-col">
              <span className="chef-eyebrow">YOUR INSTRUCTOR</span>
              <h2 className="chef-name">Meet Neha Ma&apos;am</h2>
              <p className="chef-bio">
                &ldquo;Cooking isn&apos;t about rigid rules — it is understanding why ingredients behave the way they do. When you master fundamental heat management, balancing acids, and layering aromatics, you can cook anything with complete confidence.&rdquo;
              </p>
              <div className="chef-bullets">
                <div className="chef-bullet">
                  <CheckCircle2 size={18} className="text-orange-600 flex-shrink-0" />
                  <span>Over 10+ years of dedicated culinary coaching for thousands of home cooks</span>
                </div>
                <div className="chef-bullet">
                  <CheckCircle2 size={18} className="text-orange-600 flex-shrink-0" />
                  <span>Gram-measured, repeatable recipes perfected specifically for Indian home kitchens</span>
                </div>
                <div className="chef-bullet">
                  <CheckCircle2 size={18} className="text-orange-600 flex-shrink-0" />
                  <span>Specialized in eggless confectionery, authentic curries, and modern baking</span>
                </div>
              </div>
              <div className="chef-cta-box">
                <Link href="/pricing" className="btn-hero-primary">
                  <span>Start Learning with Neha Ma&apos;am</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Student Reviews Section ─────────────────────────────────────────── */}
      <section className="section-testimonials">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">STUDENT STORIES</span>
            <h2 className="section-heading">Loved by Home Cooks &amp; Bakers</h2>
            <p className="section-subheading">Here is how students across India describe their culinary breakthroughs.</p>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-stars">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} className="text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <p className="testimonial-text">&ldquo;{t.quote}&rdquo;</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{t.author[0]}</div>
                  <div>
                    <h4 className="author-name">{t.author}</h4>
                    <span className="author-info">{t.city} • {t.badge}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final Pricing Call to Action ─────────────────────────────────────── */}
      <section className="section-cta-banner">
        <div className="container">
          <div className="cta-banner-box">
            <span className="cta-eyebrow">UNLIMITED CULINARY PASS</span>
            <h2 className="cta-title">Ready to Elevate Your Kitchen Skills?</h2>
            <p className="cta-desc">
              Join thousands of enthusiastic home chefs. Unlock all video courses, future masterclass additions, and printable PDF cards for just ₹499.
            </p>
            <div className="cta-btn-wrap">
              <Link href="/pricing" className="btn-cta-gold">
                <span>Unlock All-Access Pass (₹499)</span>
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="cta-trust-row">
              <span>⚡ Instant access</span>
              <span>•</span>
              <span>🔒 100% Secure Razorpay</span>
              <span>•</span>
              <span>📱 Mobile optimized</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Mobile Sticky Bar (Visible on mobile viewports) ───────────────────── */}
      <div className="mobile-sticky-cta">
        <div className="mobile-cta-text">
          <span className="mobile-cta-title">Chef All-Access Pass</span>
          <span className="mobile-cta-price">₹499 • All Courses</span>
        </div>
        <Link href="/pricing" className="mobile-cta-btn">
          Join Now
        </Link>
      </div>

      <style>{`
        .homepage-wrapper {
          min-height: 100vh;
          background: var(--color-cream, #fffbf7);
          color: var(--color-espresso, #1c1917);
          padding-bottom: 5rem;
        }

        .container {
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 1.25rem;
        }

        /* ── Hero Section ── */
        .section-hero {
          padding: 2.5rem 1.25rem 4rem;
        }

        .hero-container {
          max-width: 1160px;
          margin: 0 auto;
        }

        .announcements-bar {
          margin-bottom: 2rem;
        }

        .slider-skeleton {
          height: 220px;
          border-radius: 20px;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          margin-bottom: 2rem;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 3.5rem;
          align-items: center;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.95rem;
          border-radius: 9999px;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1.25rem;
        }

        .hero-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(2.25rem, 5vw, 3.75rem);
          line-height: 1.15;
          font-weight: 800;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 1.25rem;
          letter-spacing: -0.02em;
        }

        .hero-title-accent {
          color: var(--color-terracotta, #c2410c);
        }

        .hero-subtitle {
          font-size: 1.12rem;
          color: var(--color-muted, #78716c);
          line-height: 1.65;
          margin-bottom: 1.75rem;
          max-width: 580px;
        }

        .hero-proof-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }

        .proof-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 9999px;
          padding: 0.35rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-espresso, #1c1917);
          box-shadow: 0 2px 6px rgba(194, 65, 12, 0.03);
        }

        .hero-cta-group {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .btn-hero-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          min-height: 52px;
          padding: 0.875rem 1.75rem;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border-radius: 14px;
          font-size: 1.05rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 6px 20px rgba(194, 65, 12, 0.3);
          transition: background 0.15s, transform 0.15s;
        }

        .btn-hero-primary:hover {
          background: #9a3412;
          transform: translateY(-2px);
        }

        .btn-hero-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 52px;
          padding: 0.875rem 1.5rem;
          background: var(--color-surface, #ffffff);
          color: var(--color-espresso, #1c1917);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s;
        }

        .btn-hero-secondary:hover {
          background: #fff7ed;
        }

        .hero-guarantee-note {
          font-size: 0.85rem;
          color: var(--color-muted, #78716c);
          margin-top: 0.5rem;
        }

        /* Hero Teaser Box */
        .hero-teaser-box {
          position: relative;
        }

        .teaser-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(194, 65, 12, 0.1);
          transition: transform 0.25s ease;
        }

        .teaser-card:hover {
          transform: translateY(-4px);
        }

        .teaser-media {
          position: relative;
          height: 220px;
          background: linear-gradient(135deg, #c2410c, #7c2d12);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .teaser-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .teaser-play-btn {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(8px);
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, background 0.2s;
        }

        .teaser-play-btn:hover {
          transform: scale(1.1);
          background: rgba(255, 255, 255, 0.4);
        }

        .teaser-badge {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
        }

        .teaser-body {
          padding: 1.5rem;
        }

        .teaser-category {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-terracotta, #c2410c);
          letter-spacing: 0.05em;
        }

        .teaser-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin: 0.35rem 0 0.5rem 0;
          line-height: 1.35;
        }

        .teaser-meta {
          font-size: 0.85rem;
          color: var(--color-muted, #78716c);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* ── Features Row ── */
        .section-features {
          padding: 2.5rem 0;
          border-top: 1px solid var(--color-border, #fed7aa);
          border-bottom: 1px solid var(--color-border, #fed7aa);
          background: #fff7ed;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .feature-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.35rem;
        }

        .feature-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin: 0;
        }

        .feature-desc {
          font-size: 0.9rem;
          color: var(--color-muted, #78716c);
          line-height: 1.55;
          margin: 0;
        }

        /* ── Section Headers ── */
        .section-header {
          text-align: center;
          max-width: 650px;
          margin: 0 auto 3rem;
        }

        .section-eyebrow {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-terracotta, #c2410c);
          margin-bottom: 0.5rem;
          display: block;
        }

        .section-heading {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(1.85rem, 4vw, 2.5rem);
          font-weight: 800;
          color: var(--color-espresso, #1c1917);
          line-height: 1.2;
          margin-bottom: 0.75rem;
        }

        .section-subheading {
          font-size: 1.05rem;
          color: var(--color-muted, #78716c);
          line-height: 1.6;
        }

        /* ── Tracks Section ── */
        .section-tracks {
          padding: 5rem 0;
        }

        .tracks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .track-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 16px rgba(194, 65, 12, 0.04);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .track-card:hover {
          transform: translateY(-3px);
          border-color: var(--color-terracotta, #c2410c);
        }

        .track-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .track-emoji {
          font-size: 2.25rem;
        }

        .track-badge {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          padding: 0.2rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .track-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 0.5rem;
        }

        .track-desc {
          font-size: 0.9rem;
          color: var(--color-muted, #78716c);
          line-height: 1.55;
          margin-bottom: 1.5rem;
          flex: 1;
        }

        .track-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--color-terracotta, #c2410c);
          text-decoration: none;
        }

        /* ── Courses Section ── */
        .section-courses {
          padding: 5rem 0;
          background: var(--color-surface, #ffffff);
          border-top: 1px solid var(--color-border, #fed7aa);
          border-bottom: 1px solid var(--color-border, #fed7aa);
        }

        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
        }

        .course-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(194, 65, 12, 0.06);
          display: flex;
          flex-direction: column;
          transition: transform 0.25s, box-shadow 0.25s;
        }

        .course-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 32px rgba(194, 65, 12, 0.12);
        }

        .course-thumb {
          height: 190px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .course-thumb-overlay {
          position: absolute;
          top: 0.85rem;
          left: 0.85rem;
          right: 0.85rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .course-badge {
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          color: #ffffff;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .course-rating {
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          color: #ffffff;
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .course-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .course-category {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-terracotta, #c2410c);
          letter-spacing: 0.05em;
        }

        .course-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin: 0.35rem 0 0.85rem 0;
          line-height: 1.35;
        }

        .course-meta-row {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          font-size: 0.85rem;
          color: var(--color-muted, #78716c);
          margin-bottom: 1.5rem;
        }

        .course-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border, #fed7aa);
        }

        .course-price-tag {
          font-size: 0.85rem;
          font-weight: 700;
          color: #166534;
          background: #dcfce7;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
        }

        .course-btn {
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--color-terracotta, #c2410c);
          text-decoration: none;
        }

        .all-courses-cta {
          text-align: center;
          margin-top: 3rem;
        }

        .btn-secondary-lg {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 48px;
          padding: 0.75rem 1.75rem;
          background: var(--color-cream, #fffbf7);
          color: var(--color-espresso, #1c1917);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 12px;
          font-size: 0.98rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s;
        }

        .btn-secondary-lg:hover {
          background: #ffedd5;
        }

        /* ── Chef Authority Section ── */
        .section-chef {
          padding: 5rem 0;
        }

        .chef-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 28px;
          padding: 3rem;
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 3.5rem;
          align-items: center;
          box-shadow: 0 12px 36px rgba(194, 65, 12, 0.06);
        }

        .chef-avatar-col {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .chef-portrait {
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c2410c, #ea580c);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 30px rgba(194, 65, 12, 0.25);
          position: relative;
        }

        .chef-initials {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 4rem;
          font-weight: 800;
          color: #ffffff;
        }

        .chef-award-tag {
          position: absolute;
          bottom: 10px;
          background: #ffffff;
          color: #92400e;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          white-space: nowrap;
        }

        .chef-eyebrow {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-terracotta, #c2410c);
          display: block;
          margin-bottom: 0.35rem;
        }

        .chef-name {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 1rem;
        }

        .chef-bio {
          font-size: 1.05rem;
          line-height: 1.65;
          color: var(--color-muted, #78716c);
          font-style: italic;
          margin-bottom: 1.5rem;
        }

        .chef-bullets {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin-bottom: 2rem;
        }

        .chef-bullet {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          font-size: 0.95rem;
          color: var(--color-espresso, #1c1917);
        }

        /* ── Testimonials ── */
        .section-testimonials {
          padding: 5rem 0;
          background: #fff7ed;
          border-top: 1px solid var(--color-border, #fed7aa);
          border-bottom: 1px solid var(--color-border, #fed7aa);
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .testimonial-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 16px rgba(194, 65, 12, 0.04);
        }

        .testimonial-stars {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 1rem;
        }

        .testimonial-text {
          font-size: 0.95rem;
          line-height: 1.65;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 1.5rem;
          flex: 1;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .author-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #fef3c7;
          color: #92400e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
        }

        .author-name {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--color-espresso, #1c1917);
          margin: 0;
        }

        .author-info {
          font-size: 0.8rem;
          color: var(--color-muted, #78716c);
        }

        /* ── Final CTA Banner ── */
        .section-cta-banner {
          padding: 5rem 0 2rem;
        }

        .cta-banner-box {
          background: linear-gradient(135deg, #1c1917, #292524);
          border-radius: 28px;
          padding: 4rem 2rem;
          text-align: center;
          color: #ffffff;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.25);
          position: relative;
          overflow: hidden;
        }

        .cta-eyebrow {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #f59e0b;
          margin-bottom: 0.75rem;
          display: block;
        }

        .cta-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(2rem, 4.5vw, 3rem);
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 1rem;
        }

        .cta-desc {
          font-size: 1.05rem;
          color: #d6d3d1;
          max-width: 600px;
          margin: 0 auto 2.25rem;
          line-height: 1.6;
        }

        .cta-btn-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .btn-cta-gold {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          min-height: 52px;
          padding: 0.875rem 2rem;
          background: #ea580c;
          color: #ffffff;
          border-radius: 14px;
          font-size: 1.05rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 6px 20px rgba(234, 88, 12, 0.4);
          transition: background 0.15s, transform 0.15s;
        }

        .btn-cta-gold:hover {
          background: #c2410c;
          transform: translateY(-2px);
        }

        .cta-trust-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: #a8a29e;
          flex-wrap: wrap;
        }

        /* ── Mobile Sticky Bar ── */
        .mobile-sticky-cta {
          display: none;
        }

        @media (max-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 2.5rem;
          }
          .chef-card {
            grid-template-columns: 1fr;
            padding: 2rem 1.5rem;
            gap: 2rem;
            text-align: center;
          }
          .chef-portrait {
            margin: 0 auto;
          }
          .chef-bullet {
            text-align: left;
          }
          .chef-cta-box {
            display: flex;
            justify-content: center;
          }
          .mobile-sticky-cta {
            display: flex;
            position: fixed;
            bottom: calc(64px + env(safe-area-inset-bottom, 0px));
            left: 0;
            right: 0;
            background: rgba(28, 25, 23, 0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 0.75rem 1.25rem;
            align-items: center;
            justify-content: space-between;
            z-index: 90;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
          }
          .mobile-cta-text {
            display: flex;
            flex-direction: column;
          }
          .mobile-cta-title {
            color: #ffffff;
            font-size: 0.82rem;
            font-weight: 700;
          }
          .mobile-cta-price {
            color: #f59e0b;
            font-size: 0.75rem;
            font-weight: 600;
          }
          .mobile-cta-btn {
            background: var(--color-terracotta, #c2410c);
            color: #ffffff;
            padding: 0.5rem 1.15rem;
            border-radius: 10px;
            font-size: 0.88rem;
            font-weight: 700;
            text-decoration: none;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
