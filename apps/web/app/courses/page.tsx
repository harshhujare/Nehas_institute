'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ChefHat, 
  Search, 
  Clock, 
  BookOpen, 
  Star, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Filter,
  Play
} from 'lucide-react';

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: 'Regional Indian' | 'Baking & Pastry' | 'Street Classics' | 'Mithai & Sweets' | 'Healthy Everyday';
  duration: string;
  lessonsCount: number;
  rating: number;
  studentsCount: number;
  level: 'Beginner Friendly' | 'Intermediate' | 'Advanced Technique';
  badge?: string;
  hasFreePreview?: boolean;
  accentGradient: string;
}

const CATEGORIES = [
  'All Tracks',
  'Regional Indian',
  'Baking & Pastry',
  'Street Classics',
  'Mithai & Sweets',
  'Healthy Everyday',
] as const;

const COURSES: readonly Course[] = [
  {
    id: 'c1',
    slug: 'mastering-indian-gravies',
    title: 'Mastering Restaurant-Style Indian Gravies',
    description: 'Deconstruct authentic makhani, bhuna, korma, and onion-tomato masala bases with exact restaurant caramelization techniques.',
    category: 'Regional Indian',
    duration: '3h 30m',
    lessonsCount: 12,
    rating: 4.95,
    studentsCount: 1840,
    level: 'Beginner Friendly',
    badge: 'Flagship Masterclass',
    hasFreePreview: true,
    accentGradient: 'linear-gradient(135deg, #c2410c, #9a3412)',
  },
  {
    id: 'c2',
    slug: 'eggless-baking-academy',
    title: 'The Complete Eggless Baking Masterclass',
    description: 'Learn the chemistry of egg replacers, moist tea cakes, bakery-style cookies, and foolproof French sponge cakes.',
    category: 'Baking & Pastry',
    duration: '5h 15m',
    lessonsCount: 18,
    rating: 4.98,
    studentsCount: 2150,
    level: 'Beginner Friendly',
    badge: 'Most Popular',
    hasFreePreview: true,
    accentGradient: 'linear-gradient(135deg, #d97706, #b45309)',
  },
  {
    id: 'c3',
    slug: 'authentic-mithai-confectionery',
    title: 'Artisanal Festive Mithai & Halwai Secrets',
    description: 'Traditional kaju katli, melt-in-mouth pedas, gulab jamuns, and seasonal sweets with zero guesswork sugar syrup stages.',
    category: 'Mithai & Sweets',
    duration: '2h 45m',
    lessonsCount: 10,
    rating: 4.92,
    studentsCount: 980,
    level: 'Intermediate',
    badge: 'Festive Special',
    hasFreePreview: false,
    accentGradient: 'linear-gradient(135deg, #b91c1c, #881337)',
  },
  {
    id: 'c4',
    slug: 'street-food-mastery',
    title: 'Street Classics: Momos, Dim Sums & Secret Chilli Oils',
    description: 'From translucent wrappers to juicy vegetarian fillings and the iconic smoky roadside schezwan and chilli oils.',
    category: 'Street Classics',
    duration: '3h 00m',
    lessonsCount: 11,
    rating: 4.9,
    studentsCount: 1230,
    level: 'Beginner Friendly',
    badge: 'Trending',
    hasFreePreview: true,
    accentGradient: 'linear-gradient(135deg, #ea580c, #c2410c)',
  },
  {
    id: 'c5',
    slug: 'quick-20min-dinner-bowls',
    title: 'Balanced Everyday Cooking & 20-Minute Dinners',
    description: 'Elevate weekly homestyle cooking with high-protein millet recipes, vibrant stir-fries, and quick wholesome dinner bowls.',
    category: 'Healthy Everyday',
    duration: '2h 20m',
    lessonsCount: 9,
    rating: 4.88,
    studentsCount: 860,
    level: 'Beginner Friendly',
    hasFreePreview: false,
    accentGradient: 'linear-gradient(135deg, #15803d, #166534)',
  },
  {
    id: 'c6',
    slug: 'sourdough-artisan-breads',
    title: 'Artisan Sourdough & Crusty European Breads',
    description: 'Cultivate a resilient sourdough starter, master dough hydration, scoring patterns, and baking in home ovens with Dutch ovens.',
    category: 'Baking & Pastry',
    duration: '4h 10m',
    lessonsCount: 14,
    rating: 4.96,
    studentsCount: 740,
    level: 'Advanced Technique',
    badge: 'Advanced',
    hasFreePreview: false,
    accentGradient: 'linear-gradient(135deg, #78350f, #451a03)',
  },
] as const;

export default function CoursesCatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Tracks');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = COURSES.filter((course) => {
    const matchesCategory = selectedCategory === 'All Tracks' || course.category === selectedCategory;
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="courses-page">
      {/* ── Header & Banner ── */}
      <div className="courses-header-section">
        <div className="container">
          <div className="courses-header-content">
            <span className="eyebrow-pill">
              <ChefHat size={14} className="inline mr-1" />
              Comprehensive Curriculum
            </span>
            <h1 className="courses-title">Masterclass Catalog</h1>
            <p className="courses-subtitle">
              Every course is structured step-by-step with HD demonstration videos, printable recipe PDF cards, and exact measurements in grams.
            </p>

            {/* Chef Pass Value Banner */}
            <div className="catalog-pass-banner">
              <div className="banner-left">
                <Sparkles size={20} className="text-amber-300 flex-shrink-0" />
                <div>
                  <strong>All Masterclasses Included in One Pass</strong>
                  <p>Get unlimited access to every course and future additions for just ₹499.</p>
                </div>
              </div>
              <Link href="/pricing" className="banner-btn">
                Get All-Access Pass →
              </Link>
            </div>

            {/* Search Input */}
            <div className="search-bar-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes, masterclasses, techniques, or ingredients..."
                className="search-input"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="clear-search-btn"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter Pills Bar ── */}
      <div className="filter-pills-bar">
        <div className="container">
          <div className="pills-scroll-container">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`category-pill ${selectedCategory === cat ? 'category-pill--active' : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Course Grid ── */}
      <div className="courses-grid-section">
        <div className="container">
          <div className="catalog-status-row">
            <span className="results-count">
              Showing <strong>{filteredCourses.length}</strong> {filteredCourses.length === 1 ? 'masterclass' : 'masterclasses'}
            </span>
            <span className="all-pass-note">
              ✓ All courses accessible on mobile &amp; tablet
            </span>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="empty-catalog-state">
              <ChefHat size={48} className="text-amber-700 opacity-60 mb-2" />
              <h3 className="empty-title">No masterclasses found</h3>
              <p className="empty-desc">
                We couldn&apos;t find anything matching &ldquo;{searchQuery}&rdquo;. Try another keyword or browse all tracks.
              </p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All Tracks'); }} 
                className="reset-filters-btn"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="courses-grid">
              {filteredCourses.map((course) => (
                <div key={course.id} className="catalog-card">
                  {/* Thumbnail */}
                  <div className="card-thumb" style={{ background: course.accentGradient }}>
                    <div className="thumb-top-row">
                      {course.badge && (
                        <span className="card-badge">{course.badge}</span>
                      )}
                      {course.hasFreePreview && (
                        <span className="preview-badge">
                          <Play size={10} className="fill-white text-white inline mr-1" />
                          Free Preview
                        </span>
                      )}
                    </div>
                    <div className="thumb-center-icon">
                      <ChefHat size={42} className="text-white opacity-85" />
                    </div>
                    <div className="thumb-bottom-row">
                      <span className="level-pill">{course.level}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="card-body">
                    <div className="card-meta-top">
                      <span className="course-cat">{course.category}</span>
                      <span className="course-rating">
                        <Star size={13} className="text-amber-500 fill-amber-500" />
                        {course.rating} ({course.studentsCount})
                      </span>
                    </div>

                    <h2 className="course-name">{course.title}</h2>
                    <p className="course-excerpt">{course.description}</p>

                    <div className="course-stats-bar">
                      <span className="stat-item">
                        <Clock size={14} className="inline mr-1 text-stone-500" />
                        {course.duration}
                      </span>
                      <span className="stat-item">
                        <BookOpen size={14} className="inline mr-1 text-stone-500" />
                        {course.lessonsCount} Video Lessons
                      </span>
                    </div>

                    <div className="card-footer">
                      <div className="access-info">
                        <span className="pass-chip">Included in Pass</span>
                      </div>
                      <Link href={`/courses/${course.slug}`} className="view-course-btn">
                        <span>View Details</span>
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .courses-page {
          min-height: 100vh;
          background: var(--color-cream, #fffbf7);
          color: var(--color-espresso, #1c1917);
          padding-bottom: 6rem;
        }

        .container {
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 1.25rem;
        }

        /* ── Header ── */
        .courses-header-section {
          padding: 3rem 0 2rem;
        }

        .courses-header-content {
          max-width: 760px;
        }

        .eyebrow-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.35rem 0.85rem;
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.85rem;
        }

        .courses-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 800;
          color: var(--color-espresso, #1c1917);
          line-height: 1.15;
          margin-bottom: 0.75rem;
        }

        .courses-subtitle {
          font-size: 1.05rem;
          color: var(--color-muted, #78716c);
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        /* All-Access Banner */
        .catalog-pass-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          background: linear-gradient(135deg, #1c1917, #292524);
          color: #ffffff;
          padding: 1.25rem 1.75rem;
          border-radius: 20px;
          margin-bottom: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
        }

        .banner-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .banner-left strong {
          display: block;
          font-size: 1rem;
          color: #fef3c7;
          margin-bottom: 0.15rem;
        }

        .banner-left p {
          margin: 0;
          font-size: 0.88rem;
          color: #d6d3d1;
        }

        .banner-btn {
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          padding: 0.65rem 1.25rem;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
          transition: background 0.15s;
          flex-shrink: 0;
        }

        .banner-btn:hover {
          background: #9a3412;
        }

        /* Search input */
        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 1.25rem;
          color: var(--color-muted, #78716c);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          min-height: 52px;
          padding: 0.85rem 3rem 0.85rem 3.25rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 16px;
          font-size: 16px; /* 16px prevents iOS zoom */
          color: var(--color-espresso, #1c1917);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 10px rgba(194, 65, 12, 0.03);
        }

        .search-input:focus {
          border-color: var(--color-terracotta, #c2410c);
          box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.12);
        }

        .search-input::placeholder {
          color: #a8a29e;
        }

        .clear-search-btn {
          position: absolute;
          right: 1.25rem;
          background: none;
          border: none;
          color: var(--color-muted, #78716c);
          cursor: pointer;
          font-size: 0.9rem;
        }

        /* Filter Pills */
        .filter-pills-bar {
          position: sticky;
          top: 64px;
          background: rgba(255, 251, 247, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 40;
          border-bottom: 1px solid var(--color-border, #fed7aa);
          padding: 0.85rem 0;
        }

        .pills-scroll-container {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          overflow-x: auto;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .pills-scroll-container::-webkit-scrollbar {
          display: none;
        }

        .category-pill {
          padding: 0.55rem 1.15rem;
          border-radius: 9999px;
          font-size: 0.88rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          background: var(--color-surface, #ffffff);
          color: var(--color-muted, #78716c);
          border: 1px solid var(--color-border, #fed7aa);
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .category-pill:hover {
          color: var(--color-espresso, #1c1917);
          border-color: var(--color-terracotta, #c2410c);
        }

        .category-pill--active {
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border-color: var(--color-terracotta, #c2410c);
          box-shadow: 0 2px 8px rgba(194, 65, 12, 0.25);
        }

        .category-pill--active:hover {
          color: #ffffff;
          background: #9a3412;
        }

        /* ── Grid Section ── */
        .courses-grid-section {
          padding: 2.5rem 0;
        }

        .catalog-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.75rem;
          font-size: 0.88rem;
          color: var(--color-muted, #78716c);
        }

        .catalog-status-row strong {
          color: var(--color-espresso, #1c1917);
        }

        .all-pass-note {
          color: #166534;
          font-weight: 600;
        }

        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
        }

        /* Course Card */
        .catalog-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(194, 65, 12, 0.04);
          display: flex;
          flex-direction: column;
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
        }

        .catalog-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(194, 65, 12, 0.1);
          border-color: var(--color-terracotta, #c2410c);
        }

        .card-thumb {
          height: 180px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .thumb-top-row {
          position: absolute;
          top: 0.85rem;
          left: 0.85rem;
          right: 0.85rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .card-badge {
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .preview-badge {
          background: rgba(16, 185, 129, 0.85);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          display: flex;
          align-items: center;
        }

        .thumb-bottom-row {
          position: absolute;
          bottom: 0.85rem;
          left: 0.85rem;
        }

        .level-pill {
          background: rgba(255, 255, 255, 0.9);
          color: var(--color-espresso, #1c1917);
          padding: 0.2rem 0.6rem;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .card-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .card-meta-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .course-cat {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--color-terracotta, #c2410c);
          letter-spacing: 0.05em;
        }

        .course-rating {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .course-name {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          line-height: 1.35;
          margin-bottom: 0.5rem;
        }

        .course-excerpt {
          font-size: 0.88rem;
          color: var(--color-muted, #78716c);
          line-height: 1.55;
          margin-bottom: 1.25rem;
          flex: 1;
        }

        .course-stats-bar {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          font-size: 0.82rem;
          color: var(--color-muted, #78716c);
          padding-top: 0.85rem;
          border-top: 1px solid var(--color-border, #fed7aa);
          margin-bottom: 1rem;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pass-chip {
          font-size: 0.78rem;
          font-weight: 700;
          background: #dcfce7;
          color: #166534;
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
        }

        .view-course-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          min-height: 40px;
          padding: 0.5rem 1rem;
          background: var(--color-cream, #fffbf7);
          color: var(--color-terracotta, #c2410c);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 10px;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s;
        }

        .view-course-btn:hover {
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border-color: var(--color-terracotta, #c2410c);
        }

        /* Empty state */
        .empty-catalog-state {
          text-align: center;
          padding: 4rem 2rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .empty-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .empty-desc {
          color: var(--color-muted, #78716c);
          font-size: 0.95rem;
          max-width: 480px;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }

        .reset-filters-btn {
          padding: 0.65rem 1.5rem;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .catalog-pass-banner {
            flex-direction: column;
            align-items: flex-start;
          }
          .banner-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
