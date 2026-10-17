'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useAuthStore from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { loadRazorpayScript } from '@/features/payment/utils/razorpay';
import { 
  ChefHat, 
  Play, 
  Clock, 
  BookOpen, 
  Star, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  Award,
  Users
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  duration: string;
  isFreePreview: boolean;
  hasRecipeCard: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

const COURSE_DATA = {
  slug: 'mastering-indian-gravies',
  title: 'Mastering Restaurant-Style Indian Gravies',
  tagline: 'Deconstruct restaurant gravies, learn the science of emulsification, slow bhunao, and create 20+ authentic royal curries.',
  category: 'Regional Indian',
  rating: 4.95,
  studentsCount: 1840,
  duration: '3 Hours 30 Mins',
  totalLessons: 12,
  level: 'Beginner to Intermediate',
  language: 'English & Hindi (Bilingual)',
  instructor: "Chef Neha Ma'am",
  instructorRole: 'Executive Chef & Institute Founder',
  learnings: [
    'Master the 4 fundamental mother gravies: White (Kaju/Melon seed), Red (Makhani), Brown (Bhuna Pyaaz), and Yellow (Korma).',
    'Understand exact flame temperatures to brown onions without bitterness or oil burn.',
    'Master oil separation (rogan float) techniques that unlock authentic restaurant flavor and aroma.',
    'Create restaurant-style Butter Chicken, Paneer Makhani, Malai Kofta, and Methi Matar Malai at home.',
    'Store base gravies for up to 30 days in freezer for quick 15-minute weekday dinners.',
  ],
  modules: [
    {
      id: 'm1',
      title: 'Module 1: Foundations of Restaurant-Style Gravies',
      description: 'The science of whole spice blooming, fat selection, and tomato-onion ratios.',
      lessons: [
        { id: 'l1', title: '1. Introduction: Deconstructing Commercial vs Home Gravies', duration: '14:20', isFreePreview: true, hasRecipeCard: true },
        { id: 'l2', title: '2. Whole Spice Blooming & Temperature Management', duration: '18:45', isFreePreview: false, hasRecipeCard: false },
        { id: 'l3', title: '3. Onion Chemistry: Slice, Paste, or Fried Birista?', duration: '22:10', isFreePreview: false, hasRecipeCard: true },
      ],
    },
    {
      id: 'm2',
      title: 'Module 2: The Mother Gravies from Scratch',
      description: 'Step-by-step masterclasses on Makhani, White cashew, and Brown Bhuna bases.',
      lessons: [
        { id: 'l4', title: '4. The Silk Makhani (Red) Base: Emulsification & Kasuri Methi', duration: '28:15', isFreePreview: true, hasRecipeCard: true },
        { id: 'l5', title: '5. The Royal Shahi (White) Cashew Base: Velvety texture without curdling', duration: '24:30', isFreePreview: false, hasRecipeCard: true },
        { id: 'l6', title: '6. The Deep Bhuna (Brown) Onion-Tomato Base: Authentic rogan release', duration: '26:40', isFreePreview: false, hasRecipeCard: true },
      ],
    },
    {
      id: 'm3',
      title: 'Module 3: Putting Gravies into Action',
      description: 'Converting base pastes into finished restaurant dishes and quick dinner variations.',
      lessons: [
        { id: 'l7', title: '7. Paneer Butter Masala & Shahi Paneer Assembly', duration: '21:05', isFreePreview: false, hasRecipeCard: true },
        { id: 'l8', title: '8. Malai Kofta: Soft melt-in-mouth dumplings that never disintegrate', duration: '25:50', isFreePreview: false, hasRecipeCard: true },
        { id: 'l9', title: '9. Veg Kolhapuri & Spicy Maharashtrian Tambda/Pandhra Rassa adaptation', duration: '22:15', isFreePreview: false, hasRecipeCard: true },
      ],
    },
    {
      id: 'm4',
      title: 'Module 4: Storage, Bulk Prep & Kitchen Tips',
      description: 'Portioning, freezing, and reheating without sauce separation.',
      lessons: [
        { id: 'l10', title: '10. Freezer Batching: 30-Day Storage & Reheating Protocol', duration: '16:30', isFreePreview: false, hasRecipeCard: true },
        { id: 'l11', title: '11. Troubleshooting: Overly sour tomatoes, split cream, and spice fixes', duration: '15:10', isFreePreview: false, hasRecipeCard: false },
        { id: 'l12', title: '12. Course Wrap-up, Q&A and Certificate Requirements', duration: '12:00', isFreePreview: false, hasRecipeCard: true },
      ],
    },
  ],
};

import { useCourse } from '@/hooks/useCourses';

export default function CourseDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'mastering-restaurant-style-indian-gravies';
  const { user } = useAuthStore();
  const [openModuleIds, setOpenModuleIds] = useState<string[]>(['m1', 'm2', 's0', 's1']);

  const router = useRouter();
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const { data: course, isLoading } = useCourse(slug);

  const isPaid = user?.plan === 'PAID';
  const planExpiresAt = user?.planExpiresAt ? new Date(user.planExpiresAt) : null;
  const isExpired = planExpiresAt ? planExpiresAt < new Date() : false;
  const isActivePaid = isPaid && !isExpired;
  const isEnrolled = isActivePaid || Boolean(course?.isEnrolled) || user?.role !== 'STUDENT';

  const priceInRupees = course?.priceInPaise !== undefined ? Math.round(course.priceInPaise / 100) : 499;
  const isFreeCourse = course?.priceInPaise === 0;

  const handleEnrollFree = async () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${slug}`);
      return;
    }
    if (!course) return;

    try {
      setIsProcessingPurchase(true);
      setPurchaseError(null);
      await apiClient.post(`/api/courses/${course.id}/enroll`);
      router.push(`/courses/${slug}/watch`);
    } catch (err: any) {
      setPurchaseError(err.response?.data?.error || 'Failed to enroll in free course.');
    } finally {
      setIsProcessingPurchase(false);
    }
  };

  const handleBuyCourse = async () => {
    if (!user) {
      router.push(`/login?redirect=/courses/${slug}`);
      return;
    }
    if (!course) return;

    try {
      setIsProcessingPurchase(true);
      setPurchaseError(null);

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your connection.');
      }

      const { data: res } = await apiClient.post('/api/payments/create-order', {
        productType: 'COURSE',
        courseId: course.id,
      });
      const orderData = res.data;

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: "Neha's Culinary Institute",
        description: course.title,
        order_id: orderData.orderId,
        prefill: {
          name: user.name || '',
          email: user.email || '',
        },
        theme: {
          color: '#d97706',
        },
        handler: async (response: any) => {
          try {
            await apiClient.post('/api/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            router.push(`/courses/${slug}/watch`);
          } catch {
            setPurchaseError('Payment received. Access will appear shortly.');
            router.push(`/courses/${slug}/watch`);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPurchase(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setPurchaseError(err.response?.data?.error || err.message || 'Payment initiation failed.');
      setIsProcessingPurchase(false);
    }
  };

  // Adapt live backend sections or fallback
  const liveModules = course?.sections && course.sections.length > 0
    ? course.sections.map((s, idx) => ({
        id: s.id || `s${idx}`,
        title: s.title,
        description: `${s.lectures.length} lessons • Step-by-step masterclass`,
        lessons: s.lectures.map((l) => ({
          id: l.id,
          title: l.title,
          duration: `${Math.floor(l.durationSec / 60)}:${String(l.durationSec % 60).padStart(2, '0')}`,
          isFreePreview: l.isFreePreview,
          hasRecipeCard: true,
        })),
      }))
    : null;

  const currentModules = liveModules || COURSE_DATA.modules;
  const courseTitle = course?.title || COURSE_DATA.title;
  const courseCategory = course?.category || COURSE_DATA.category;
  const courseTagline = course?.shortDescription || course?.description || COURSE_DATA.tagline;
  const totalLessonsCount = course?.totalLectures || COURSE_DATA.totalLessons;
  const durationText = course?.totalDurationSec
    ? `${Math.floor(course.totalDurationSec / 3600)}h ${Math.floor((course.totalDurationSec % 3600) / 60)}m`
    : COURSE_DATA.duration;

  const toggleModule = (id: string) => {
    setOpenModuleIds((prev) => 
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="course-detail-page">
      {/* ── Hero Section ── */}
      <section className="detail-hero">
        <div className="container">
          <div className="hero-columns">
            {/* Left: Info */}
            <div className="hero-left">
              <div className="breadcrumb-nav">
                <Link href="/courses">All Masterclasses</Link>
                <span>›</span>
                <span className="current-crumb">{courseCategory}</span>
              </div>

              <h1 className="course-main-title">{courseTitle}</h1>
              <p className="course-tagline">{courseTagline}</p>

              <div className="course-badges-row">
                <span className="rating-badge">
                  <Star size={14} className="text-amber-500 fill-amber-500 inline mr-1" />
                  {COURSE_DATA.rating} ({COURSE_DATA.studentsCount} students)
                </span>
                <span className="meta-pill">
                  <Clock size={14} className="inline mr-1" />
                  {durationText}
                </span>
                <span className="meta-pill">
                  <BookOpen size={14} className="inline mr-1" />
                  {totalLessonsCount} Lessons
                </span>
                <span className="meta-pill">
                  <Award size={14} className="inline mr-1 text-emerald-600" />
                  Certificate Included
                </span>
              </div>

              <div className="instructor-badge-box">
                <div className="instructor-avatar">NM</div>
                <div>
                  <span className="instructor-label">Instructor</span>
                  <strong className="instructor-name">{COURSE_DATA.instructor}</strong>
                  <p className="instructor-role">{COURSE_DATA.instructorRole}</p>
                </div>
              </div>
            </div>

            {/* Right: Teaser Video Card */}
            <div className="hero-right">
              <div className="detail-teaser-card">
                <div className="teaser-media-top">
                  <Link href={`/courses/${slug}/watch`} className="play-button-big" aria-label="Watch free preview lesson">
                    <Play size={28} className="fill-white text-white ml-1" />
                  </Link>
                  <span className="preview-label">Free Preview Lesson Available</span>
                </div>
                <div className="teaser-card-body">
                  <div className="price-tag-row">
                    {isFreeCourse ? (
                      <span className="pass-price text-emerald-600 font-bold">100% Free Masterclass</span>
                    ) : (
                      <>
                        <span className="pass-price">₹{priceInRupees}</span>
                        <span className="sub-cost">or ₹499 (All-Access Pass)</span>
                      </>
                    )}
                  </div>

                  <div className="teaser-action-buttons">
                    <Link href={`/courses/${slug}/watch`} className="btn-watch-preview">
                      <Play size={16} className="inline mr-1" />
                      Watch Free Preview Lecture
                    </Link>

                    {isEnrolled ? (
                      <Link href={`/courses/${slug}/watch`} className="btn-start-course">
                        Start Full Masterclass →
                      </Link>
                    ) : isFreeCourse ? (
                      <button
                        onClick={handleEnrollFree}
                        disabled={isProcessingPurchase}
                        className="btn-start-course cursor-pointer w-full text-center"
                      >
                        {isProcessingPurchase ? 'Enrolling…' : 'Enroll Free (Instant Access) →'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={handleBuyCourse}
                          disabled={isProcessingPurchase}
                          className="btn-start-course cursor-pointer w-full text-center"
                        >
                          {isProcessingPurchase ? 'Preparing Checkout…' : `Buy Masterclass — ₹${priceInRupees} →`}
                        </button>
                        <Link href="/pricing" className="btn-unlock-pass text-center block">
                          Unlock with Chef Pass (₹499) →
                        </Link>
                      </div>
                    )}
                    {purchaseError && (
                      <p className="text-xs text-rose-600 text-center font-medium mt-1">{purchaseError}</p>
                    )}
                  </div>

                  <div className="course-guarantee-list">
                    <div className="guarantee-item">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span>Instant digital access on mobile &amp; desktop</span>
                    </div>
                    <div className="guarantee-item">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span>Printable chef recipe PDF cards with exact gram weights</span>
                    </div>
                    <div className="guarantee-item">
                      <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                      <span>Dedicated recipe Q&amp;A support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Columns ── */}
      <section className="detail-body-section">
        <div className="container">
          <div className="body-grid">
            <div className="main-content-col">
              {/* What you will learn */}
              <div className="content-card">
                <h2 className="card-heading">What You Will Master</h2>
                <div className="learnings-grid">
                  {COURSE_DATA.learnings.map((item, idx) => (
                    <div key={idx} className="learning-item">
                      <CheckCircle2 size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Curriculum Syllabus */}
              <div className="content-card">
                <div className="syllabus-header">
                  <div>
                    <h2 className="card-heading">Course Curriculum</h2>
                    <p className="syllabus-sub">
                      {currentModules.length} Modules • {totalLessonsCount} Lessons • {durationText} Total
                    </p>
                  </div>
                </div>

                <div className="modules-accordion">
                  {currentModules.map((mod) => {
                    const isOpen = openModuleIds.includes(mod.id);
                    return (
                      <div key={mod.id} className="module-group">
                        <button
                          className="module-header-btn"
                          onClick={() => toggleModule(mod.id)}
                          aria-expanded={isOpen}
                        >
                          <div className="module-title-box">
                            <span className="module-title">{mod.title}</span>
                            <span className="module-desc-inline">{mod.description}</span>
                          </div>
                          <div className="module-toggle-right">
                            <span className="module-count">{mod.lessons.length} lessons</span>
                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="lessons-list">
                            {mod.lessons.map((lesson) => (
                              <div key={lesson.id} className="lesson-row">
                                <div className="lesson-left">
                                  <span className="lesson-play-icon">
                                    <Play size={14} className="text-stone-500" />
                                  </span>
                                  <div className="lesson-info">
                                    <span className="lesson-name">{lesson.title}</span>
                                    <div className="lesson-tags">
                                      <span className="lesson-duration">{lesson.duration}</span>
                                      {lesson.hasRecipeCard && (
                                        <span className="recipe-tag">
                                          <FileText size={12} className="inline mr-1" />
                                          Recipe PDF
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="lesson-right">
                                  {lesson.isFreePreview ? (
                                    <Link 
                                      href={`/courses/${slug}/watch`}
                                      className="lesson-preview-btn"
                                    >
                                      Preview
                                    </Link>
                                  ) : (
                                    <span className="locked-badge">Locked</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* About the Instructor */}
              <div className="content-card">
                <h2 className="card-heading">Meet Your Mentor</h2>
                <div className="mentor-box">
                  <div className="mentor-avatar">NM</div>
                  <div className="mentor-details">
                    <h3 className="mentor-name">Chef Neha Ma&apos;am</h3>
                    <span className="mentor-title">Executive Culinary Mentor &amp; Pastry Specialist</span>
                    <p className="mentor-text">
                      With over a decade of teaching experience across Indian regional cookery, confectionery, and modern baking, Neha Ma&apos;am simplifies culinary technique into logical, predictable formulas that deliver reliable, beautiful meals every single time.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar (Tablet/Desktop) */}
            <div className="sidebar-col">
              <div className="sidebar-card">
                <h3 className="sidebar-title">This Masterclass Includes:</h3>
                <div className="sidebar-features">
                  <div className="sidebar-feature">
                    <Play size={18} className="text-orange-600" />
                    <span>3.5 Hours of on-demand HD video</span>
                  </div>
                  <div className="sidebar-feature">
                    <FileText size={18} className="text-orange-600" />
                    <span>10 Printable recipe cards with exact gram weights</span>
                  </div>
                  <div className="sidebar-feature">
                    <Download size={18} className="text-orange-600" />
                    <span>Ingredient substitutions &amp; storage guide</span>
                  </div>
                  <div className="sidebar-feature">
                    <Award size={18} className="text-orange-600" />
                    <span>Certificate of completion upon finishing</span>
                  </div>
                  <div className="sidebar-feature">
                    <Users size={18} className="text-orange-600" />
                    <span>Student discussion &amp; recipe Q&amp;A</span>
                  </div>
                </div>

                <div className="sidebar-cta-box">
                  {isActivePaid ? (
                    <Link href={`/courses/${slug}/watch`} className="btn-full-width">
                      Start Masterclass
                    </Link>
                  ) : (
                    <Link href="/pricing" className="btn-full-width">
                      Get All-Access Pass (₹499)
                    </Link>
                  )}
                  <p className="sidebar-guarantee">30-day money-back satisfaction guarantee</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky Mobile Bar ── */}
      <div className="mobile-buy-bar">
        <div className="mobile-bar-info">
          <span className="bar-title">{COURSE_DATA.title}</span>
          <span className="bar-pass">₹499 • Unlimited Access</span>
        </div>
        <div className="mobile-bar-actions">
          <Link href={`/courses/${slug}/watch`} className="bar-preview-btn">
            Preview
          </Link>
          <Link href="/pricing" className="bar-buy-btn">
            Unlock
          </Link>
        </div>
      </div>

      <style>{`
        .course-detail-page {
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

        /* ── Hero ── */
        .detail-hero {
          background: #fff7ed;
          border-bottom: 1px solid var(--color-border, #fed7aa);
          padding: 3rem 0;
        }

        .hero-columns {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 3.5rem;
          align-items: center;
        }

        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--color-muted, #78716c);
          margin-bottom: 1rem;
        }

        .breadcrumb-nav a {
          color: var(--color-terracotta, #c2410c);
          text-decoration: none;
          font-weight: 600;
        }

        .current-crumb {
          color: var(--color-espresso, #1c1917);
          font-weight: 600;
        }

        .course-main-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: clamp(2rem, 4.5vw, 2.85rem);
          font-weight: 800;
          color: var(--color-espresso, #1c1917);
          line-height: 1.2;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .course-tagline {
          font-size: 1.05rem;
          color: var(--color-muted, #78716c);
          line-height: 1.6;
          margin-bottom: 1.75rem;
        }

        .course-badges-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-bottom: 2rem;
        }

        .rating-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 700;
        }

        .meta-pill {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--color-espresso, #1c1917);
        }

        .instructor-badge-box {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 1rem 1.25rem;
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 16px;
          max-width: 380px;
        }

        .instructor-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c2410c, #ea580c);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.1rem;
        }

        .instructor-label {
          display: block;
          font-size: 0.72rem;
          text-transform: uppercase;
          color: var(--color-muted, #78716c);
          letter-spacing: 0.05em;
        }

        .instructor-name {
          font-size: 0.98rem;
          color: var(--color-espresso, #1c1917);
        }

        .instructor-role {
          font-size: 0.8rem;
          color: var(--color-muted, #78716c);
          margin: 0;
        }

        /* Teaser Card */
        .detail-teaser-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(194, 65, 12, 0.1);
        }

        .teaser-media-top {
          height: 200px;
          background: linear-gradient(135deg, #c2410c, #7c2d12);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .play-button-big {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(8px);
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .play-button-big:hover {
          transform: scale(1.1);
        }

        .preview-label {
          position: absolute;
          bottom: 0.85rem;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 0.3rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .teaser-card-body {
          padding: 1.75rem;
        }

        .price-tag-row {
          margin-bottom: 1.25rem;
        }

        .pass-price {
          display: block;
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--color-espresso, #1c1917);
        }

        .sub-cost {
          font-size: 0.88rem;
          color: var(--color-terracotta, #c2410c);
          font-weight: 700;
        }

        .teaser-action-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .btn-watch-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0.75rem;
          background: var(--color-cream, #fffbf7);
          color: var(--color-espresso, #1c1917);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s;
        }

        .btn-watch-preview:hover {
          background: #ffedd5;
        }

        .btn-unlock-pass, .btn-start-course {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0.75rem;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(194, 65, 12, 0.25);
          transition: background 0.15s;
        }

        .btn-unlock-pass:hover, .btn-start-course:hover {
          background: #9a3412;
        }

        .course-guarantee-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          font-size: 0.85rem;
          color: var(--color-muted, #78716c);
          border-top: 1px solid var(--color-border, #fed7aa);
          padding-top: 1.25rem;
        }

        .guarantee-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }

        /* ── Body Grid ── */
        .detail-body-section {
          padding: 3rem 0;
        }

        .body-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 2.5rem;
          align-items: start;
        }

        .main-content-col {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .content-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 4px 16px rgba(194, 65, 12, 0.03);
        }

        .card-heading {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.45rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 1.25rem;
        }

        .learnings-grid {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .learning-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          font-size: 0.95rem;
          color: var(--color-espresso, #1c1917);
          line-height: 1.5;
        }

        /* Syllabus Accordion */
        .syllabus-sub {
          font-size: 0.88rem;
          color: var(--color-muted, #78716c);
          margin-top: -0.75rem;
          margin-bottom: 1.25rem;
        }

        .modules-accordion {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .module-group {
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 14px;
          overflow: hidden;
        }

        .module-header-btn {
          width: 100%;
          padding: 1.15rem 1.25rem;
          background: var(--color-cream, #fffbf7);
          border: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          text-align: left;
          gap: 1rem;
        }

        .module-title-box {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .module-title {
          font-weight: 700;
          font-size: 1rem;
          color: var(--color-espresso, #1c1917);
        }

        .module-desc-inline {
          font-size: 0.82rem;
          color: var(--color-muted, #78716c);
        }

        .module-toggle-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--color-muted, #78716c);
          flex-shrink: 0;
        }

        .module-count {
          font-size: 0.82rem;
        }

        .lessons-list {
          background: var(--color-surface, #ffffff);
          border-top: 1px solid var(--color-border, #fed7aa);
        }

        .lesson-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid #fef3c7;
        }

        .lesson-row:last-child {
          border-bottom: none;
        }

        .lesson-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .lesson-play-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-cream, #fffbf7);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .lesson-name {
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--color-espresso, #1c1917);
        }

        .lesson-tags {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.78rem;
          color: var(--color-muted, #78716c);
          margin-top: 0.15rem;
        }

        .recipe-tag {
          color: #166534;
          background: #dcfce7;
          padding: 0.1rem 0.45rem;
          border-radius: 4px;
          font-weight: 600;
        }

        .lesson-preview-btn {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--color-terracotta, #c2410c);
          background: #fff7ed;
          border: 1px solid #ffedd5;
          padding: 0.3rem 0.75rem;
          border-radius: 8px;
          text-decoration: none;
        }

        .locked-badge {
          font-size: 0.75rem;
          color: var(--color-muted, #78716c);
          background: #f5f5f4;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }

        /* Mentor box */
        .mentor-box {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .mentor-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c2410c, #ea580c);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.4rem;
          flex-shrink: 0;
        }

        .mentor-name {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-espresso, #1c1917);
          margin: 0;
        }

        .mentor-title {
          font-size: 0.82rem;
          color: var(--color-terracotta, #c2410c);
          font-weight: 600;
          display: block;
          margin-bottom: 0.5rem;
        }

        .mentor-text {
          font-size: 0.92rem;
          color: var(--color-muted, #78716c);
          line-height: 1.6;
          margin: 0;
        }

        /* Sidebar */
        .sidebar-card {
          background: var(--color-surface, #ffffff);
          border: 1px solid var(--color-border, #fed7aa);
          border-radius: 20px;
          padding: 1.75rem;
          position: sticky;
          top: 5rem;
          box-shadow: 0 4px 16px rgba(194, 65, 12, 0.04);
        }

        .sidebar-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 1.25rem;
        }

        .sidebar-features {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          font-size: 0.88rem;
          color: var(--color-espresso, #1c1917);
          margin-bottom: 1.75rem;
        }

        .sidebar-feature {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .btn-full-width {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 48px;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
        }

        .sidebar-guarantee {
          text-align: center;
          font-size: 0.78rem;
          color: var(--color-muted, #78716c);
          margin-top: 0.75rem;
        }

        /* Mobile Buy Bar */
        .mobile-buy-bar {
          display: none;
        }

        @media (max-width: 860px) {
          .hero-columns {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .body-grid {
            grid-template-columns: 1fr;
          }
          .sidebar-col {
            display: none;
          }
          .mobile-buy-bar {
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
          }
          .mobile-bar-info {
            display: flex;
            flex-direction: column;
            max-width: 60%;
          }
          .bar-title {
            color: #ffffff;
            font-size: 0.82rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .bar-pass {
            color: #f59e0b;
            font-size: 0.75rem;
            font-weight: 600;
          }
          .mobile-bar-actions {
            display: flex;
            gap: 0.5rem;
          }
          .bar-preview-btn {
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
            padding: 0.5rem 0.85rem;
            border-radius: 10px;
            font-size: 0.82rem;
            font-weight: 600;
            text-decoration: none;
          }
          .bar-buy-btn {
            background: var(--color-terracotta, #c2410c);
            color: #ffffff;
            padding: 0.5rem 1.1rem;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 700;
            text-decoration: none;
          }
        }
      `}</style>
    </div>
  );
}
