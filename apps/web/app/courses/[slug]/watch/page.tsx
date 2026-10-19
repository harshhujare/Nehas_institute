'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useAuthStore from '@/lib/auth-store';
import { useCourse, useLecturePlay, useLectureProgress } from '@/hooks/useCourses';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Settings, 
  BookOpen, 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  Lock, 
  ChefHat, 
  Download, 
  Clock, 
  Sparkles, 
  X,
  Volume2,
  AlertCircle,
  LifeBuoy
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Lesson {
  id: string;
  number: number;
  title: string;
  duration: string;
  durationSec?: number;
  isFreePreview: boolean;
  completed?: boolean;
}

const LESSONS: readonly Lesson[] = [
  { id: 'l1', number: 1, title: 'Introduction: Deconstructing Commercial vs Home Gravies', duration: '14:20', isFreePreview: true, completed: true },
  { id: 'l2', number: 2, title: 'Whole Spice Blooming & Temperature Management', duration: '18:45', isFreePreview: false },
  { id: 'l3', number: 3, title: 'Onion Chemistry: Slice, Paste, or Fried Birista?', duration: '22:10', isFreePreview: false },
  { id: 'l4', number: 4, title: 'The Silk Makhani (Red) Base: Emulsification & Kasuri Methi', duration: '28:15', isFreePreview: true },
  { id: 'l5', number: 5, title: 'The Royal Shahi (White) Cashew Base: Velvety texture without curdling', duration: '24:30', isFreePreview: false },
  { id: 'l6', number: 6, title: 'The Deep Bhuna (Brown) Onion-Tomato Base: Authentic rogan release', duration: '26:40', isFreePreview: false },
  { id: 'l7', number: 7, title: 'Paneer Butter Masala & Shahi Paneer Assembly', duration: '21:05', isFreePreview: false },
  { id: 'l8', number: 8, title: 'Malai Kofta: Soft melt-in-mouth dumplings that never disintegrate', duration: '25:50', isFreePreview: false },
  { id: 'l9', number: 9, title: 'Veg Kolhapuri & Spicy Maharashtrian Tambda/Pandhra Rassa adaptation', duration: '22:15', isFreePreview: false },
  { id: 'l10', number: 10, title: 'Freezer Batching: 30-Day Storage & Reheating Protocol', duration: '16:30', isFreePreview: false },
  { id: 'l11', number: 11, title: 'Troubleshooting: Overly sour tomatoes, split cream, and spice fixes', duration: '15:10', isFreePreview: false },
  { id: 'l12', number: 12, title: 'Course Wrap-up, Q&A and Certificate Requirements', duration: '12:00', isFreePreview: false },
] as const;

type WatchTab = 'lessons' | 'recipe' | 'qa';

export default function CourseWatchPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'mastering-restaurant-style-indian-gravies';
  const { user } = useAuthStore();

  const { data: course, isLoading: isCourseLoading } = useCourse(slug);
  const { recordProgress } = useLectureProgress(course?.id);

  // Map live backend curriculum sections into a flat lesson sequence
  const liveLessons = useMemo<Lesson[] | null>(() => {
    if (!course?.sections || course.sections.length === 0) return null;
    let n = 1;
    return course.sections.flatMap((sec) =>
      sec.lectures.map((lec) => ({
        id: lec.id,
        number: n++,
        title: lec.title,
        duration: `${Math.floor(lec.durationSec / 60)}:${String(lec.durationSec % 60).padStart(2, '0')}`,
        durationSec: lec.durationSec,
        isFreePreview: lec.isFreePreview,
        completed: course.userProgress?.completedLectureIds?.includes(lec.id) || false,
      }))
    );
  }, [course]);

  const activeLessons = liveLessons || LESSONS;

  const [activeLessonId, setActiveLessonId] = useState<string>('l1');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<string>('1x');
  const [activeTab, setActiveTab] = useState<WatchTab>('lessons');
  const [showLockedModal, setShowLockedModal] = useState<boolean>(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(['l1']);

  // Sync initial lesson when live course loads
  useEffect(() => {
    if (liveLessons && liveLessons.length > 0) {
      setActiveLessonId((prev) => {
        const found = liveLessons.some((l) => l.id === prev);
        return found ? prev : liveLessons[0].id;
      });
      if (course?.userProgress?.completedLectureIds) {
        setCompletedLessonIds(course.userProgress.completedLectureIds);
      }
    }
  }, [liveLessons, course]);

  const isPaid = user?.plan === 'PAID';
  const planExpiresAt = user?.planExpiresAt ? new Date(user.planExpiresAt) : null;
  const isExpired = planExpiresAt ? planExpiresAt < new Date() : false;
  const isActivePaid = isPaid && !isExpired;
  const isUserEntitled = isActivePaid || Boolean(course?.isEnrolled) || user?.role !== 'STUDENT';

  const currentLesson = activeLessons.find((l) => l.id === activeLessonId) || activeLessons[0];
  const canAccessCurrent = currentLesson.isFreePreview || isUserEntitled;

  // Retrieve signed embed URL from backend
  const { data: playData, isLoading: isPlayLoading, error: playError } = useLecturePlay(
    currentLesson?.id,
    isPlaying && canAccessCurrent
  );

  // Playback issue report modal states (FR-S8)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('Video does not play / black screen');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to report a playback issue.');
      return;
    }
    try {
      setIsSubmittingReport(true);
      const diagnostics = [
        `Issue Type: ${reportIssueType}`,
        `Details: ${reportDetails || 'N/A'}`,
        `Course: ${course?.title || slug} (ID: ${course?.id || 'unknown'})`,
        `Lesson: ${currentLesson.title} (ID: ${currentLesson.id})`,
        `Play State: isPlaying=${isPlaying}, hasEmbedUrl=${Boolean(playData?.embedUrl)}`,
        `Error Details: ${playError ? JSON.stringify((playError as any)?.response?.data || playError.message) : 'None'}`,
        `User Agent: ${typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}`,
        `Resolution: ${typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}`,
        `Timestamp: ${new Date().toISOString()}`,
      ].join('\n');

      await apiClient.post('/api/support', {
        type: 'BUG_REPORT',
        subject: `Playback Issue: ${currentLesson.title.slice(0, 45)}`,
        message: diagnostics,
      });

      setReportSuccessMsg('Diagnostics submitted! Our chef technical team has received the playback report.');
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportSuccessMsg(null);
        setReportDetails('');
      }, 2500);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    if (!lesson.isFreePreview && !isUserEntitled) {
      setShowLockedModal(true);
      return;
    }
    setActiveLessonId(lesson.id);
    setIsPlaying(true);
  };

  const toggleLessonCompleted = (lessonId: string) => {
    const isCompleted = completedLessonIds.includes(lessonId);
    const newCompleted = !isCompleted;
    setCompletedLessonIds((prev) => 
      newCompleted ? [...prev, lessonId] : prev.filter((id) => id !== lessonId)
    );
    if (user && course?.id) {
      recordProgress({ lectureId: lessonId, positionSec: 0, completed: newCompleted });
    }
  };

  return (
    <div className="watch-page">
      {/* ── Breadcrumb / Header Bar ── */}
      <div className="watch-header-bar">
        <div className="watch-header-inner">
          <Link href={`/courses/${slug}`} className="back-link">
            ← Back to Course
          </Link>
          <span className="course-title-badge">
            {course?.title || 'Mastering Restaurant-Style Indian Gravies'}
          </span>
        </div>
      </div>

      {/* ── Main Layout (Player on Left/Top, Tabs on Right/Bottom) ── */}
      <div className="watch-layout">
        {/* Video Player & Current Lesson Meta Column */}
        <div className="player-column">
          {/* Pinned 16:9 Video Player */}
          <div className="video-player-box">
            <div className="video-viewport">
              {/* If playing and signed URL available, render real stream */}
              {isPlaying && playData?.embedUrl ? (
                <div className="absolute inset-0 w-full h-full bg-black z-10">
                  <iframe
                    src={playData.embedUrl}
                    className="w-full h-full border-0 absolute inset-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    title={currentLesson.title}
                  />
                </div>
              ) : playError ? (
                <div className="absolute inset-0 w-full h-full bg-stone-950 flex flex-col items-center justify-center p-6 text-center z-10">
                  <AlertCircle size={32} className="text-amber-500 mb-2" />
                  <h3 className="text-sm font-semibold text-stone-200">Playback Unavailable</h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-sm">
                    {(playError as any)?.response?.data?.error || 'Unable to authorize secure video stream.'}
                  </p>
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LifeBuoy size={14} className="text-amber-500" />
                    Report Issue
                  </button>
                </div>
              ) : isPlayLoading ? (
                <div className="absolute inset-0 w-full h-full bg-stone-950 flex flex-col items-center justify-center text-amber-500 z-10">
                  <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <span className="text-xs text-stone-400 font-medium tracking-wide">Loading Secure Stream…</span>
                </div>
              ) : (
                /* Poster Video UI */
                <div className="player-overlay">
                  <button 
                    onClick={() => {
                      if (!canAccessCurrent) {
                        setShowLockedModal(true);
                        return;
                      }
                      setIsPlaying(true);
                    }}
                    className="big-play-btn"
                    aria-label="Play video"
                  >
                    <Play size={32} className="text-white fill-white ml-1" />
                  </button>
                </div>
              )}

              {/* Player Top Meta */}
              <div className="player-top-meta">
                <span className="player-badge">
                  Lesson {currentLesson.number} of {activeLessons.length}
                </span>
                <span className="speed-badge">Speed: {playbackSpeed}</span>
              </div>

              {/* Player Bottom Control Bar */}
              <div className="player-controls-bar">
                <div className="progress-bar-wrap">
                  <div className="progress-bar-filled" style={{ width: '42%' }} />
                </div>
                <div className="controls-row">
                  <div className="controls-left">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)} 
                      className="control-btn"
                      aria-label="Play/Pause"
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button className="control-btn" title="Rewind 10s">
                      <RotateCcw size={16} />
                    </button>
                    <button className="control-btn" title="Forward 10s">
                      <RotateCw size={16} />
                    </button>
                    <span className="video-time">05:42 / {currentLesson.duration}</span>
                  </div>
                  <div className="controls-right">
                    <button 
                      onClick={() => {
                        const speeds = ['1x', '1.25x', '1.5x', '2x', '0.75x'];
                        const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                        setPlaybackSpeed(next);
                      }}
                      className="speed-toggle-btn"
                    >
                      {playbackSpeed}
                    </button>
                    <button className="control-btn" title="Volume">
                      <Volume2 size={18} />
                    </button>
                    <button className="control-btn" title="Settings / 720p">
                      <Settings size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lesson Title & Completion Action */}
          <div className="lesson-meta-card">
            <div className="lesson-meta-main">
              <span className="lesson-track-tag">Regional Indian Curries</span>
              <h1 className="active-lesson-heading">{currentLesson.title}</h1>
              <p className="lesson-subtext">
                Taught by Chef Neha Ma&apos;am • HD 1080p Stream • Free Preview
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-700 bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800 text-xs font-medium transition cursor-pointer"
                title="Report a playback problem with automatic diagnostics"
              >
                <LifeBuoy size={14} className="text-amber-500" />
                <span>Report Issue</span>
              </button>
              <button 
                onClick={() => toggleLessonCompleted(currentLesson.id)}
                className={`mark-done-btn ${completedLessonIds.includes(currentLesson.id) ? 'mark-done-btn--completed' : ''}`}
              >
                <CheckCircle2 size={16} />
                <span>{completedLessonIds.includes(currentLesson.id) ? 'Completed' : 'Mark as Done'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabbed Panel Column */}
        <div className="tabs-column">
          <div className="watch-tabs-nav">
            <button
              onClick={() => setActiveTab('lessons')}
              className={`watch-tab-btn ${activeTab === 'lessons' ? 'watch-tab-btn--active' : ''}`}
            >
              <BookOpen size={16} />
              <span>Lessons ({LESSONS.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('recipe')}
              className={`watch-tab-btn ${activeTab === 'recipe' ? 'watch-tab-btn--active' : ''}`}
            >
              <FileText size={16} />
              <span>Recipe Notes</span>
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`watch-tab-btn ${activeTab === 'qa' ? 'watch-tab-btn--active' : ''}`}
            >
              <MessageSquare size={16} />
              <span>Chef Q&amp;A</span>
            </button>
          </div>

          {/* Tab 1: Lessons List */}
          {activeTab === 'lessons' && (
            <div className="tab-pane-lessons">
              <div className="lessons-progress-box">
                <div className="progress-info-row">
                  <span className="progress-label">Course Progress</span>
                  <span className="progress-pct">
                    {activeLessons.length > 0 ? Math.round((completedLessonIds.length / activeLessons.length) * 100) : 0}%
                  </span>
                </div>
                <div className="progress-track">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${activeLessons.length > 0 ? (completedLessonIds.length / activeLessons.length) * 100 : 0}%` }} 
                  />
                </div>
              </div>

              <div className="lessons-items-list">
                {activeLessons.map((l) => {
                  const isActive = l.id === activeLessonId;
                  const isCompleted = completedLessonIds.includes(l.id);
                  const isLocked = !l.isFreePreview && !isUserEntitled;

                  return (
                    <button
                      key={l.id}
                      onClick={() => handleSelectLesson(l)}
                      className={`lesson-item-btn ${isActive ? 'lesson-item-btn--active' : ''}`}
                    >
                      <div className="lesson-item-status">
                        {isCompleted ? (
                          <CheckCircle2 size={18} className="text-emerald-600 fill-emerald-100 flex-shrink-0" />
                        ) : isLocked ? (
                          <Lock size={16} className="text-stone-400 flex-shrink-0" />
                        ) : (
                          <span className="lesson-number-circle">{l.number}</span>
                        )}
                      </div>

                      <div className="lesson-item-text">
                        <span className="lesson-item-title">{l.title}</span>
                        <div className="lesson-item-meta">
                          <span className="lesson-dur">{l.duration}</span>
                          {l.isFreePreview && (
                            <span className="free-preview-pill">Free Preview</span>
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <div className="playing-indicator">
                          <span className="play-bar bar1" />
                          <span className="play-bar bar2" />
                          <span className="play-bar bar3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Recipe Card Notes */}
          {activeTab === 'recipe' && (
            <div className="tab-pane-recipe">
              <div className="recipe-card-header">
                <div>
                  <h3 className="recipe-title">Makhani Mother Base • Recipe Card</h3>
                  <span className="recipe-yield">Yield: 1.2 kg base (Serves 8-10) • Prep: 15m • Cook: 40m</span>
                </div>
                <button className="download-pdf-btn">
                  <Download size={15} />
                  <span>Download PDF</span>
                </button>
              </div>

              <div className="recipe-section">
                <h4 className="recipe-subheading">Gram-Measured Ingredients:</h4>
                <ul className="ingredients-list">
                  <li><strong>800g</strong> Roma / Desi red ripe tomatoes (halved)</li>
                  <li><strong>100g</strong> Cashew nuts (whole or split)</li>
                  <li><strong>60g</strong> Unsalted butter (dairy fresh)</li>
                  <li><strong>25g</strong> Kashmiri red chilli powder (for bright rogan color)</li>
                  <li><strong>15g</strong> Ginger-garlic paste (1:1 ratio)</li>
                  <li><strong>4 pcs</strong> Green cardamom pods (cracked)</li>
                  <li><strong>5g</strong> Kasuri methi (gently toasted &amp; crushed between palms)</li>
                  <li><strong>10g</strong> Honey or granulated sugar (to balance acidity)</li>
                </ul>
              </div>

              <div className="recipe-section">
                <h4 className="recipe-subheading">Chef Neha&apos;s Golden Principles:</h4>
                <p className="chef-tip-box">
                  <strong>
                    <AlertCircle size={15} className="inline mr-1 text-amber-500" />
                    Flame Management:
                  </strong> Never boil the tomatoes with dry spices without cashews. The cashews release natural emulsifiers during the simmer that turn the sauce velvety without requiring cornstarch.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Q&A */}
          {activeTab === 'qa' && (
            <div className="tab-pane-qa">
              <div className="qa-notice-box">
                <ChefHat size={20} className="text-orange-600 flex-shrink-0" />
                <p>Have a question about ingredient substitution or flame temperature? Neha Ma&apos;am and senior institute faculty answer student queries daily.</p>
              </div>

              <div className="qa-thread-sample">
                <div className="qa-author">Pooja M. • 2 days ago</div>
                <p className="qa-question">
                  &ldquo;Can I replace whole cashews with melon seeds (magajtari) if someone in my family has a nut allergy?&rdquo;
                </p>
                <div className="qa-chef-reply">
                  <strong className="reply-author">Chef Neha Ma&apos;am:</strong>
                  <p className="reply-body">
                    Yes, absolutely! Use equal weight (100g) of soaked white melon seeds (Char Magaj). Boil them for 10 minutes before blending for the exact same silky viscosity without nuts.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Locked Lesson Modal ── */}
      {showLockedModal && (
        <div className="locked-modal-overlay" onClick={() => setShowLockedModal(false)}>
          <div className="locked-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn" 
              onClick={() => setShowLockedModal(false)}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="modal-icon-wrap">
              <Sparkles size={28} className="text-amber-500" />
            </div>

            <h3 className="modal-title">Unlock All Masterclasses</h3>
            <p className="modal-desc">
              This lecture and its downloadable chef recipe cards are part of the <strong>Chef All-Access Pass</strong>.
            </p>

            <div className="modal-features">
              <div className="modal-feature-item">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Unlimited streaming of all 12 modules</span>
              </div>
              <div className="modal-feature-item">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Printable recipe PDF cards with gram measurements</span>
              </div>
              <div className="modal-feature-item">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Access all baking, regional, and street courses</span>
              </div>
            </div>

            <div className="modal-cta-group">
              <Link href="/pricing" className="btn-modal-unlock">
                Get All-Access Pass for ₹499 →
              </Link>
              <button 
                onClick={() => setShowLockedModal(false)} 
                className="btn-modal-cancel"
              >
                Continue Watching Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Playback Problem Modal (FR-S8) ── */}
      {isReportModalOpen && (
        <div className="modal-backdrop">
          <div className="locked-modal-card max-w-md w-full bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-2xl text-stone-100">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <LifeBuoy size={20} className="text-amber-500" />
                <h3 className="text-base font-bold text-white">Report Playback Problem</h3>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X size={18} />
              </button>
            </div>

            {reportSuccessMsg ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                <p className="text-sm font-semibold text-white">{reportSuccessMsg}</p>
                <p className="text-xs text-stone-400">Our engineering team has received your ticket.</p>
              </div>
            ) : (
              <form onSubmit={handleReportIssue} className="space-y-4 text-xs">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    What is the issue? *
                  </label>
                  <select
                    value={reportIssueType}
                    onChange={(e) => setReportIssueType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 focus:outline-hidden focus:border-amber-500 text-xs"
                  >
                    <option value="Video does not play / black screen">Video does not play / black screen</option>
                    <option value="Endless buffering / slow loading">Endless buffering / slow loading</option>
                    <option value="Audio is missing or out of sync">Audio is missing or out of sync</option>
                    <option value="Error code displayed">Error code displayed</option>
                    <option value="Other streaming problem">Other streaming problem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Additional notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. video stopped at 02:45, spinning wheel keeps showing..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 focus:outline-hidden focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800 text-[11px] text-stone-400 space-y-1 font-mono">
                  <p className="font-semibold text-stone-300">Diagnostics Attached:</p>
                  <p>• Lesson: {currentLesson.title.slice(0, 35)}...</p>
                  <p>• Lesson ID: {currentLesson.id}</p>
                  <p>• Stream state: {playData?.embedUrl ? 'Authorized' : 'Pending'}</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-stone-700 text-stone-400 hover:bg-stone-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium"
                  >
                    {isSubmittingReport ? 'Sending...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .watch-page {
          min-height: 100vh;
          background: #1c1917; /* Dark cinematic mode for video learning */
          color: #f5f5f4;
          padding-bottom: 5rem;
        }

        /* ── Header Bar ── */
        .watch-header-bar {
          background: #0c0a09;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.75rem 1.25rem;
        }

        .watch-header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .back-link {
          color: #d6d3d1;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.15s;
        }

        .back-link:hover {
          color: #ea580c;
        }

        .course-title-badge {
          font-size: 0.85rem;
          color: #a8a29e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Layout ── */
        .watch-layout {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 420px;
          gap: 1.5rem;
          padding: 1.5rem 1.25rem;
        }

        /* ── Video Player ── */
        .player-column {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .video-player-box {
          position: sticky;
          top: 64px;
          z-index: 50;
          background: #000000;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
        }

        .video-viewport {
          position: relative;
          width: 100%;
          padding-top: 56.25%; /* 16:9 Aspect Ratio */
          background: linear-gradient(135deg, #292524, #0c0a09);
        }

        .player-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .big-play-btn {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(194, 65, 12, 0.9);
          border: 2px solid rgba(255, 255, 255, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        }

        .big-play-btn:hover {
          transform: scale(1.1);
          background: #c2410c;
        }

        .player-top-meta {
          position: absolute;
          top: 1rem;
          left: 1rem;
          right: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          pointer-events: none;
        }

        .player-badge {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 0.3rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .speed-badge {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          color: #fbbf24;
          padding: 0.3rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .player-controls-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
          padding: 1rem 1.25rem 0.75rem;
        }

        .progress-bar-wrap {
          height: 4px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 999px;
          margin-bottom: 0.75rem;
          cursor: pointer;
          position: relative;
        }

        .progress-bar-filled {
          height: 100%;
          background: var(--color-terracotta, #c2410c);
          border-radius: 999px;
        }

        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .controls-left, .controls-right {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .control-btn {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          transition: color 0.15s;
        }

        .control-btn:hover {
          color: #ea580c;
        }

        .video-time {
          font-size: 0.8rem;
          color: #d6d3d1;
          font-variant-numeric: tabular-nums;
        }

        .speed-toggle-btn {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: #ffffff;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        /* Lesson Meta */
        .lesson-meta-card {
          background: #292524;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
        }

        .lesson-track-tag {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #fb923c;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 0.25rem;
        }

        .active-lesson-heading {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 0.35rem;
          line-height: 1.3;
        }

        .lesson-subtext {
          font-size: 0.85rem;
          color: #a8a29e;
          margin: 0;
        }

        .mark-done-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          min-height: 42px;
          padding: 0.55rem 1rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #ffffff;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .mark-done-btn--completed {
          background: #064e3b;
          border-color: #059669;
          color: #a7f3d0;
        }

        /* ── Tabs Column ── */
        .tabs-column {
          background: #292524;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: fit-content;
        }

        .watch-tabs-nav {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #1c1917;
        }

        .watch-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          padding: 0.85rem 0.5rem;
          background: none;
          border: none;
          color: #a8a29e;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }

        .watch-tab-btn--active {
          color: #ffffff;
          border-bottom-color: var(--color-terracotta, #c2410c);
          background: #292524;
        }

        /* Tab 1: Lessons */
        .tab-pane-lessons {
          display: flex;
          flex-direction: column;
        }

        .lessons-progress-box {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.15);
        }

        .progress-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          margin-bottom: 0.4rem;
          color: #d6d3d1;
        }

        .progress-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #10b981;
          border-radius: 999px;
        }

        .lessons-items-list {
          display: flex;
          flex-direction: column;
          max-height: 520px;
          overflow-y: auto;
        }

        .lesson-item-btn {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.95rem 1.25rem;
          background: none;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          text-align: left;
          cursor: pointer;
          color: #f5f5f4;
          transition: background 0.15s;
          width: 100%;
        }

        .lesson-item-btn:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .lesson-item-btn--active {
          background: rgba(194, 65, 12, 0.15);
          border-left: 3px solid var(--color-terracotta, #c2410c);
        }

        .lesson-number-circle {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 700;
          color: #d6d3d1;
          flex-shrink: 0;
        }

        .lesson-item-text {
          flex: 1;
          min-width: 0;
        }

        .lesson-item-title {
          font-size: 0.88rem;
          font-weight: 600;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .lesson-item-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.2rem;
        }

        .lesson-dur {
          font-size: 0.75rem;
          color: #a8a29e;
        }

        .free-preview-pill {
          font-size: 0.68rem;
          font-weight: 700;
          background: #064e3b;
          color: #6ee7b7;
          padding: 0.1rem 0.45rem;
          border-radius: 4px;
        }

        /* Playing animated bars */
        .playing-indicator {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 14px;
        }

        .play-bar {
          width: 3px;
          background: var(--color-terracotta, #c2410c);
          border-radius: 1px;
          animation: equalize 1s infinite alternate ease-in-out;
        }
        .bar1 { height: 60%; animation-delay: 0.1s; }
        .bar2 { height: 100%; animation-delay: 0.3s; }
        .bar3 { height: 40%; animation-delay: 0.2s; }

        @keyframes equalize {
          0% { height: 20%; }
          100% { height: 100%; }
        }

        /* Tab 2: Recipe Notes */
        .tab-pane-recipe {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .recipe-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .recipe-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 0.2rem;
        }

        .recipe-yield {
          font-size: 0.78rem;
          color: #a8a29e;
        }

        .download-pdf-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border: none;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .recipe-subheading {
          font-size: 0.92rem;
          font-weight: 700;
          color: #fb923c;
          margin-bottom: 0.65rem;
        }

        .ingredients-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          font-size: 0.88rem;
          color: #d6d3d1;
        }

        .chef-tip-box {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 12px;
          padding: 0.85rem 1rem;
          font-size: 0.85rem;
          line-height: 1.5;
          color: #fde68a;
          margin: 0;
        }

        /* Tab 3: Q&A */
        .tab-pane-qa {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .qa-notice-box {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          font-size: 0.85rem;
          color: #d6d3d1;
          line-height: 1.5;
        }

        .qa-thread-sample {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .qa-author {
          font-size: 0.78rem;
          color: #a8a29e;
        }

        .qa-question {
          font-size: 0.9rem;
          color: #ffffff;
          font-style: italic;
          margin: 0;
        }

        .qa-chef-reply {
          margin-top: 0.5rem;
          padding: 0.85rem;
          background: rgba(194, 65, 12, 0.12);
          border-left: 2px solid var(--color-terracotta, #c2410c);
          border-radius: 0 8px 8px 0;
        }

        .reply-author {
          display: block;
          font-size: 0.82rem;
          color: #fb923c;
          margin-bottom: 0.2rem;
        }

        .reply-body {
          font-size: 0.85rem;
          color: #f5f5f4;
          line-height: 1.5;
          margin: 0;
        }

        /* ── Locked Modal ── */
        .locked-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
        }

        .locked-modal-content {
          background: #292524;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 2.25rem 2rem;
          max-width: 440px;
          width: 100%;
          text-align: center;
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        .modal-close-btn {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          background: none;
          border: none;
          color: #a8a29e;
          cursor: pointer;
        }

        .modal-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.25rem;
        }

        .modal-title {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 1.45rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 0.5rem;
        }

        .modal-desc {
          font-size: 0.92rem;
          color: #d6d3d1;
          line-height: 1.55;
          margin-bottom: 1.5rem;
        }

        .modal-features {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          text-align: left;
          background: rgba(0, 0, 0, 0.2);
          padding: 1rem 1.25rem;
          border-radius: 14px;
          margin-bottom: 1.75rem;
          font-size: 0.88rem;
          color: #e7e5e4;
        }

        .modal-feature-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .modal-cta-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .btn-modal-unlock {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          background: var(--color-terracotta, #c2410c);
          color: #ffffff;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 14px rgba(194, 65, 12, 0.35);
        }

        .btn-modal-cancel {
          background: none;
          border: none;
          color: #a8a29e;
          font-size: 0.88rem;
          cursor: pointer;
          padding: 0.5rem;
        }

        @media (max-width: 900px) {
          .watch-layout {
            grid-template-columns: 1fr;
            padding: 0;
            gap: 1rem;
          }
          .video-player-box {
            border-radius: 0;
          }
          .lesson-meta-card {
            border-radius: 0;
            margin: 0 1rem;
          }
          .tabs-column {
            border-radius: 0;
            margin: 0 1rem;
          }
        }
      `}</style>
    </div>
  );
}
