'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BookOpen, Plus, Edit2, Trash2, Video, Eye, EyeOff, RefreshCw, 
  UploadCloud, CheckCircle2, Clock, AlertTriangle, ArrowUp, ArrowDown,
  X, ChevronDown, ChevronRight, UserCheck, Play, Link as LinkIcon,
  HelpCircle, Sparkles
} from 'lucide-react';
import * as tus from 'tus-js-client';
import { apiClient } from '@/lib/api-client';

interface Lecture {
  id: string;
  title: string;
  order: number;
  videoId: string | null;
  durationSec: number | null;
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
  isFreePreview: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lectures: Lecture[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  priceInPaise: number;
  isPublished: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    enrollments: number;
  };
  sections: Section[];
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);

  // Paste Bunny Video GUID Modal
  const [pasteVideoModal, setPasteVideoModal] = useState<{ lectureId: string; lectureTitle: string } | null>(null);
  const [pastedVideoId, setPastedVideoId] = useState('');
  const [isSavingVideoId, setIsSavingVideoId] = useState(false);

  // Delete Course Confirmation Modal
  const [deleteCourseModal, setDeleteCourseModal] = useState<Course | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  // Form states for Course Create/Edit
  const [courseForm, setCourseForm] = useState({
    title: '',
    slug: '',
    description: '',
    shortDescription: '',
    category: 'Cooking Essentials',
    level: 'BEGINNER' as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
    priceInRupees: '0',
    isPublished: false,
  });

  // Curriculum states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingLectureToSectionId, setAddingLectureToSectionId] = useState<string | null>(null);
  const [newLectureTitle, setNewLectureTitle] = useState('');
  const [newLectureIsPreview, setNewLectureIsPreview] = useState(false);

  // Section rename state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');

  // Video Upload states
  const [uploadingLectureId, setUploadingLectureId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetLectureForUpload, setTargetLectureForUpload] = useState<{ id: string; isReplacement: boolean } | null>(null);

  // Enrollment Grant form
  const [grantForm, setGrantForm] = useState({
    userId: '',
    courseId: '',
    reason: '',
    expiresAt: '',
  });

  const fetchCourses = useCallback(async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/admin/courses');
      const list: Course[] = res.data.data || [];
      setCourses(list);
      // Refresh activeCourse if curriculum drawer is open without triggering an infinite re-render loop
      setActiveCourse((prev) => {
        if (!prev) return null;
        return list.find((c: Course) => c.id === prev.id) || prev;
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load courses.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses(true);
  }, [fetchCourses]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // ─── Course Form Handlers ───────────────────────────────────────────────────
  const openCreateCourseModal = () => {
    setCourseForm({
      title: '',
      slug: '',
      description: '',
      shortDescription: '',
      category: 'Cooking Essentials',
      level: 'BEGINNER',
      priceInRupees: '0',
      isPublished: false,
    });
    setActiveCourse(null);
    setIsCourseModalOpen(true);
  };

  const openEditCourseModal = (course: Course) => {
    setActiveCourse(course);
    setCourseForm({
      title: course.title,
      slug: course.slug,
      description: course.description,
      shortDescription: course.shortDescription || '',
      category: course.category,
      level: course.level,
      priceInRupees: (course.priceInPaise / 100).toString(),
      isPublished: course.isPublished,
    });
    setIsCourseModalOpen(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    if (!activeCourse) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setCourseForm((prev) => ({ ...prev, title, slug }));
    } else {
      setCourseForm((prev) => ({ ...prev, title }));
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: courseForm.title.trim(),
        slug: courseForm.slug.trim(),
        description: courseForm.description.trim(),
        shortDescription: courseForm.shortDescription.trim() || undefined,
        category: courseForm.category,
        level: courseForm.level,
        priceInPaise: Math.round(parseFloat(courseForm.priceInRupees || '0') * 100),
        isPublished: courseForm.isPublished,
      };

      if (activeCourse) {
        await apiClient.put(`/api/admin/courses/${activeCourse.id}`, payload);
        showNotification('Course profile updated successfully.');
      } else {
        await apiClient.post('/api/admin/courses', payload);
        showNotification('Course created! Now you can click "Manage Lessons" to add videos.');
      }

      setIsCourseModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save course.');
    }
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      await apiClient.patch(`/api/admin/courses/${course.id}/publish`, {
        isPublished: !course.isPublished,
      });
      showNotification(`Course ${!course.isPublished ? 'published to students' : 'unpublished'}.`);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to change publish state. Note: Course must have at least 1 READY lesson to publish.');
    }
  };

  const confirmDeleteCourse = async () => {
    if (!deleteCourseModal) return;
    try {
      setIsDeletingCourse(true);
      const res = await apiClient.delete(`/api/admin/courses/${deleteCourseModal.id}`);

      // Optimistically remove course from local state immediately
      const deletedId = deleteCourseModal.id;
      setCourses((prev) => prev.filter((c) => c.id !== deletedId));
      if (activeCourse?.id === deletedId) {
        setActiveCourse(null);
        setIsCurriculumOpen(false);
      }

      const isArchived = res.data?.data?.archived;
      showNotification(
        isArchived
          ? 'Course archived (enrolled students retain access).'
          : 'Course permanently deleted.'
      );
      setDeleteCourseModal(null);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete course.');
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handleArchiveCourse = (course: Course) => {
    setDeleteCourseModal(course);
  };

  // ─── Curriculum Handlers ────────────────────────────────────────────────────
  const openCurriculum = (course: Course) => {
    setActiveCourse(course);
    setIsCurriculumOpen(true);
    const expanded: Record<string, boolean> = {};
    (course.sections || []).forEach((s) => {
      expanded[s.id] = true;
    });
    setExpandedSections(expanded);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !newSectionTitle.trim()) return;

    try {
      await apiClient.post(`/api/admin/courses/${activeCourse.id}/sections`, {
        title: newSectionTitle.trim(),
        order: (activeCourse.sections || []).length,
      });
      setNewSectionTitle('');
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add section.');
    }
  };

  const handleSaveSectionRename = async (sectionId: string) => {
    if (!editingSectionTitle.trim()) return;
    try {
      await apiClient.put(`/api/admin/courses/sections/${sectionId}`, {
        title: editingSectionTitle.trim(),
      });
      setEditingSectionId(null);
      fetchCourses();
      showNotification('Section renamed.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to rename section.');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section and all lessons inside it?')) return;
    try {
      await apiClient.delete(`/api/admin/courses/sections/${sectionId}`);
      setActiveCourse((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          sections: prev.sections.filter((s) => s.id !== sectionId),
        };
      });
      fetchCourses();
      showNotification('Section deleted.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete section.');
    }
  };

  const handleAddLecture = async (sectionId: string) => {
    if (!newLectureTitle.trim()) return;
    try {
      const section = activeCourse?.sections.find((s) => s.id === sectionId);
      const order = (section?.lectures || []).length;

      await apiClient.post(`/api/admin/courses/sections/${sectionId}/lectures`, {
        title: newLectureTitle.trim(),
        isFreePreview: newLectureIsPreview,
        order,
      });

      setAddingLectureToSectionId(null);
      setNewLectureTitle('');
      setNewLectureIsPreview(false);
      fetchCourses();
      showNotification('Lesson added! Now upload or attach a video.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add lesson.');
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    try {
      await apiClient.delete(`/api/admin/courses/lectures/${lectureId}`);
      setActiveCourse((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            lectures: s.lectures.filter((l) => l.id !== lectureId),
          })),
        };
      });
      fetchCourses();
      showNotification('Lesson deleted.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete lesson.');
    }
  };

  const handleRefreshStatus = async (lectureId: string) => {
    try {
      const res = await apiClient.post(`/api/admin/courses/lectures/${lectureId}/refresh-status`);
      showNotification(`Video status refreshed: ${res.data.data?.status || 'UPDATED'}`);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to refresh video status from Bunny CDN.');
    }
  };

  // ─── Attach / Paste Bunny Video GUID ─────────────────────────────────────────
  const handleSavePastedVideoId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteVideoModal || !pastedVideoId.trim()) return;

    try {
      setIsSavingVideoId(true);
      await apiClient.put(`/api/admin/courses/lectures/${pasteVideoModal.lectureId}`, {
        videoId: pastedVideoId.trim(),
        status: 'READY',
      });

      showNotification('Bunny Video ID linked successfully! Status set to Ready.');
      setPasteVideoModal(null);
      setPastedVideoId('');
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to attach video ID.');
    } finally {
      setIsSavingVideoId(false);
    }
  };

  // ─── TUS Browser-Direct Resumable Upload ─────────────────────────────────────
  const triggerVideoUpload = (lectureId: string, isReplacement = false) => {
    setTargetLectureForUpload({ id: lectureId, isReplacement });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetLectureForUpload) return;

    const { id: lectureId, isReplacement } = targetLectureForUpload;

    try {
      setUploadingLectureId(lectureId);
      setUploadProgress(0);
      setUploadStatusText('Authorizing direct upload token...');

      const endpoint = isReplacement
        ? `/api/admin/courses/lectures/${lectureId}/replace-video`
        : `/api/admin/courses/lectures/${lectureId}/upload-auth`;

      const authRes = await apiClient.post(endpoint);
      const auth = authRes.data.data;

      setUploadStatusText('Streaming directly to Bunny CDN...');

      const upload = new tus.Upload(file, {
        endpoint: auth.uploadUrl,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          AuthorizationSignature: auth.signature,
          AuthorizationExpire: auth.expirationTime.toString(),
          VideoId: auth.videoId,
          LibraryId: auth.libraryId,
        },
        metadata: {
          filetype: file.type,
          title: file.name,
        },
        onError: (err) => {
          console.error('[TUS Upload Error]', err);
          alert(`Upload interrupted: ${err.message}. Retrying will resume from current progress.`);
          setUploadingLectureId(null);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setUploadProgress(percentage);
          setUploadStatusText(`${percentage}% (${(bytesUploaded / 1024 / 1024).toFixed(1)} MB / ${(bytesTotal / 1024 / 1024).toFixed(1)} MB)`);
        },
        onSuccess: () => {
          setUploadProgress(100);
          setUploadStatusText('Upload complete! Video is transcoding into HLS adaptive streams...');
          showNotification('Upload complete! Adaptive transcoding queued on Bunny.');
          setTimeout(() => {
            setUploadingLectureId(null);
            fetchCourses();
          }, 1500);
        },
      });

      upload.start();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initialize video upload.');
      setUploadingLectureId(null);
    }
  };

  // ─── Enrollment Grant Handler ───────────────────────────────────────────────
  const handleGrantEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/admin/courses/enrollments', {
        userId: grantForm.userId.trim(),
        courseId: grantForm.courseId,
        reason: grantForm.reason.trim(),
        expiresAt: grantForm.expiresAt ? new Date(grantForm.expiresAt).toISOString() : undefined,
      });

      showNotification('Access granted successfully.');
      setIsEnrollmentModalOpen(false);
      setGrantForm({ userId: '', courseId: '', reason: '', expiresAt: '' });
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to grant enrollment.');
    }
  };

  const renderBadge = (status: Lecture['status']) => {
    switch (status) {
      case 'READY':
        return (
          <span className="badge badge-ready">
            <CheckCircle2 size={12} /> Ready
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="badge badge-processing">
            <Clock size={12} /> Transcoding
          </span>
        );
      case 'UPLOADING':
        return (
          <span className="badge badge-uploading">
            <UploadCloud size={12} /> Uploading
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-failed">
            <AlertTriangle size={12} /> Failed
          </span>
        );
    }
  };

  return (
    <div className="courses-admin-page">
      {/* Hidden file input for TUS video upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="video/*"
        style={{ display: 'none' }}
      />

      {/* ── Page Header ── */}
      <header className="courses-header">
        <div className="courses-header-title-wrap">
          <div className="courses-header-icon">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="courses-title font-serif">Culinary Masterclasses & Video</h1>
            <p className="courses-subtitle">
              Manage video courses, curriculum chapters, adaptive CDN video streams, and student enrollments.
            </p>
          </div>
        </div>

        <div className="courses-header-actions">
          <button
            onClick={() => {
              setGrantForm({ userId: '', courseId: courses[0]?.id || '', reason: '', expiresAt: '' });
              setIsEnrollmentModalOpen(true);
            }}
            className="btn-secondary"
          >
            <UserCheck size={16} />
            <span>Grant Access</span>
          </button>
          <button onClick={openCreateCourseModal} className="btn-primary">
            <Plus size={16} />
            <span>New Course</span>
          </button>
        </div>
      </header>

      {/* ── Alerts & Toasts ── */}
      {successMsg && (
        <div className="toast-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="toast-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Course Cards List ── */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw className="spinning text-terracotta" size={32} />
          <p>Loading masterclasses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="empty-course-card">
          <BookOpen size={48} className="empty-icon" />
          <h3 className="empty-title font-serif">No courses created yet</h3>
          <p className="empty-desc">
            Get started by creating your first culinary course profile, then upload lesson videos inside the curriculum editor.
          </p>
          <button onClick={openCreateCourseModal} className="btn-primary" style={{ marginTop: '1.25rem' }}>
            <Plus size={16} /> Create Course
          </button>
        </div>
      ) : (
        <div className="courses-list">
          {courses.map((course) => {
            const totalLectures = course.sections.reduce((acc, s) => acc + s.lectures.length, 0);
            return (
              <div key={course.id} className="course-card">
                <div className="course-card-main">
                  {/* Category, Level, Status Badges */}
                  <div className="course-meta-pills">
                    <span className="pill pill-category">{course.category}</span>
                    <span className="pill pill-level">{course.level}</span>
                    {course.isPublished ? (
                      <span className="pill pill-published">
                        <CheckCircle2 size={12} /> Published
                      </span>
                    ) : (
                      <span className="pill pill-draft">Draft</span>
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="course-card-title font-serif">{course.title}</h3>
                  <p className="course-card-desc">
                    {course.shortDescription || course.description}
                  </p>

                  {/* Summary Bar */}
                  <div className="course-stat-bar">
                    <span><strong>{course.sections.length}</strong> sections</span>
                    <span className="dot-sep">•</span>
                    <span><strong>{totalLectures}</strong> lessons</span>
                    <span className="dot-sep">•</span>
                    <span>
                      {course.priceInPaise === 0 ? (
                        <strong className="text-free">FREE</strong>
                      ) : (
                        <strong>₹{(course.priceInPaise / 100).toLocaleString('en-IN')}</strong>
                      )}
                    </span>
                    <span className="dot-sep">•</span>
                    <span><strong>{course._count?.enrollments || 0}</strong> students enrolled</span>
                  </div>
                </div>

                {/* Course Actions */}
                <div className="course-card-actions">
                  <button
                    onClick={() => openCurriculum(course)}
                    className="btn-curriculum"
                    title="Open curriculum editor to add sections and upload videos"
                  >
                    <Video size={16} />
                    <span>Manage Lessons ({totalLectures})</span>
                  </button>

                  <div className="icon-actions-group">
                    <button
                      onClick={() => handleTogglePublish(course)}
                      title={course.isPublished ? 'Unpublish from catalog' : 'Publish course'}
                      className="icon-btn"
                    >
                      {course.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>

                    <button
                      onClick={() => openEditCourseModal(course)}
                      title="Edit course details"
                      className="icon-btn"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      onClick={() => setDeleteCourseModal(course)}
                      title="Delete course"
                      className="icon-btn icon-btn--danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Curriculum Editor Slide-Over Drawer ─── */}
      {isCurriculumOpen && activeCourse && (
        <div className="drawer-overlay" onClick={() => setIsCurriculumOpen(false)}>
          <aside className="curriculum-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="drawer-header">
              <div>
                <div className="drawer-pre-title">
                  <span className="drawer-tag">Curriculum Editor</span>
                  <span className="drawer-price-tag">
                    {activeCourse.priceInPaise === 0 ? 'FREE' : `₹${activeCourse.priceInPaise / 100}`}
                  </span>
                </div>
                <h2 className="drawer-course-title font-serif">{activeCourse.title}</h2>
                <p className="drawer-course-desc">
                  Add sections (chapters), organize lessons, set free previews, and upload adaptive CDN videos.
                </p>
              </div>
              <button onClick={() => setIsCurriculumOpen(false)} className="drawer-close" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* Video Upload Live Banner */}
            {uploadingLectureId && (
              <div className="upload-progress-banner">
                <div className="upload-progress-header">
                  <span className="upload-label">
                    <UploadCloud size={16} className="bounce-anim" />
                    Resumable Video Uploading to Bunny CDN
                  </span>
                  <span className="upload-val">{uploadStatusText}</span>
                </div>
                <div className="upload-track">
                  <div className="upload-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Drawer Content */}
            <div className="drawer-body">
              {/* Add New Section Form */}
              <form onSubmit={handleAddSection} className="add-section-form">
                <input
                  type="text"
                  placeholder="New section title (e.g., Section 1: Knife Skills & Preparation)"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="section-input"
                />
                <button type="submit" disabled={!newSectionTitle.trim()} className="btn-primary">
                  <Plus size={16} /> Add Section
                </button>
              </form>

              {/* Sections List */}
              <div className="sections-container">
                {activeCourse.sections.length === 0 ? (
                  <div className="empty-sections-msg">
                    <Video size={36} className="text-muted" style={{ margin: '0 auto 0.75rem' }} />
                    <p>No sections yet in this course.</p>
                    <p className="text-muted text-xs" style={{ marginTop: '0.25rem' }}>
                      Add your first section above (e.g. &quot;Module 1: Basics&quot;) to start adding video lessons.
                    </p>
                  </div>
                ) : (
                  activeCourse.sections.map((section, sIdx) => {
                    const isExpanded = expandedSections[section.id] !== false;
                    const isEditingThisSection = editingSectionId === section.id;
                    return (
                      <div key={section.id} className="section-block">
                        {/* Section Header */}
                        <div className="section-header-row">
                          {isEditingThisSection ? (
                            <div className="section-rename-row">
                              <input
                                type="text"
                                value={editingSectionTitle}
                                onChange={(e) => setEditingSectionTitle(e.target.value)}
                                className="section-rename-input"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveSectionRename(section.id)}
                                className="btn-save-sm"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSectionId(null)}
                                className="btn-cancel-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExpandedSections((prev) => ({ ...prev, [section.id]: !isExpanded }))}
                              className="section-title-toggle"
                            >
                              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              <span className="section-num-label">
                                {sIdx + 1}. {section.title}
                              </span>
                              <span className="section-lesson-count">
                                ({section.lectures.length} lessons)
                              </span>
                            </button>
                          )}

                          <div className="section-header-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setAddingLectureToSectionId(section.id);
                                setNewLectureTitle('');
                                setNewLectureIsPreview(false);
                              }}
                              className="btn-add-lesson-trigger"
                            >
                              <Plus size={14} /> Lesson
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSectionId(section.id);
                                setEditingSectionTitle(section.title);
                              }}
                              className="icon-subtle"
                              title="Rename section"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(section.id)}
                              className="icon-subtle icon-subtle--danger"
                              title="Delete section"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Section Body (Lectures) */}
                        {isExpanded && (
                          <div className="section-content-box">
                            {/* Inline Add Lesson Form */}
                            {addingLectureToSectionId === section.id && (
                              <div className="add-lesson-card">
                                <div className="add-lesson-card-header">
                                  <span className="add-lesson-card-title font-serif">New Lesson Details</span>
                                  <span className="add-lesson-card-hint">Step 1: Enter title &bull; Step 2: Upload or link video</span>
                                </div>
                                <input
                                  type="text"
                                  placeholder="Lesson title (e.g., Understanding Pan Heat & Maillard Reaction)"
                                  value={newLectureTitle}
                                  onChange={(e) => setNewLectureTitle(e.target.value)}
                                  className="lesson-title-input"
                                  autoFocus
                                />
                                <div className="add-lesson-controls">
                                  <label className="preview-checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={newLectureIsPreview}
                                      onChange={(e) => setNewLectureIsPreview(e.target.checked)}
                                    />
                                    <span>Free Preview Lesson (Students can watch without purchasing)</span>
                                  </label>

                                  <div className="add-lesson-btn-group">
                                    <button
                                      type="button"
                                      onClick={() => setAddingLectureToSectionId(null)}
                                      className="btn-cancel-sm"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddLecture(section.id)}
                                      disabled={!newLectureTitle.trim()}
                                      className="btn-save-sm"
                                    >
                                      Save &amp; Continue to Upload Video &rarr;
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Lectures Listing */}
                            {section.lectures.length === 0 && addingLectureToSectionId !== section.id ? (
                              <div className="empty-section-prompt">
                                <p className="no-lessons-text">
                                  No lessons in this section yet.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingLectureToSectionId(section.id);
                                    setNewLectureTitle('');
                                    setNewLectureIsPreview(false);
                                  }}
                                  className="btn-add-first-lesson"
                                >
                                  <Plus size={14} /> Add Lesson &amp; Upload Video
                                </button>
                              </div>
                            ) : (
                              section.lectures.map((lecture, lIdx) => (
                                <div key={lecture.id} className="lecture-card">
                                  <div className="lecture-info">
                                    <div className="lecture-header-line">
                                      <span className="lecture-index">
                                        {sIdx + 1}.{lIdx + 1}
                                      </span>
                                      <span className="lecture-title">{lecture.title}</span>
                                      {lecture.isFreePreview && (
                                        <span className="preview-badge">FREE PREVIEW</span>
                                      )}
                                      {renderBadge(lecture.status)}
                                    </div>

                                    <div className="lecture-meta-line">
                                      <span>
                                        {lecture.durationSec ? (
                                          `Duration: ${Math.floor(lecture.durationSec / 60)}m ${lecture.durationSec % 60}s`
                                        ) : (
                                          'No video duration yet'
                                        )}
                                      </span>
                                      {lecture.videoId && (
                                        <span title={`Bunny Video GUID: ${lecture.videoId}`}>
                                          • GUID: {lecture.videoId.slice(0, 8)}...
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Lesson Video Actions */}
                                  <div className="lecture-actions">
                                    {lecture.videoId ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleRefreshStatus(lecture.id)}
                                          title="Re-query status from Bunny CDN"
                                          className="icon-btn-sm"
                                        >
                                          <RefreshCw size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPasteVideoModal({
                                              lectureId: lecture.id,
                                              lectureTitle: lecture.title,
                                            });
                                            setPastedVideoId(lecture.videoId || '');
                                          }}
                                          title="Update Bunny Video GUID"
                                          className="btn-outline-sm"
                                        >
                                          <LinkIcon size={12} /> Link ID
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => triggerVideoUpload(lecture.id, true)}
                                          title="Replace video file with new upload"
                                          className="btn-outline-sm"
                                        >
                                          <UploadCloud size={13} /> Replace
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setPasteVideoModal({
                                              lectureId: lecture.id,
                                              lectureTitle: lecture.title,
                                            });
                                            setPastedVideoId('');
                                          }}
                                          className="btn-outline-sm"
                                          title="Paste existing Bunny Video GUID if already uploaded"
                                        >
                                          <LinkIcon size={13} /> Paste ID
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => triggerVideoUpload(lecture.id, false)}
                                          className="btn-upload-lesson"
                                        >
                                          <UploadCloud size={14} /> Upload Video
                                        </button>
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLecture(lecture.id)}
                                      className="icon-subtle icon-subtle--danger"
                                      title="Delete lecture"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ─── Modal 1: Create / Edit Course ─── */}
      {isCourseModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCourseModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title font-serif">
                {activeCourse ? 'Edit Course Profile' : 'Create New Masterclass'}
              </h3>
              <button onClick={() => setIsCourseModalOpen(false)} className="drawer-close" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {/* Helpful explanation box */}
            <div className="modal-hint-box">
              <Sparkles size={16} className="text-terracotta" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>How courses work:</strong> Create your course profile here first. Once saved, open <strong>&quot;Manage Lessons&quot;</strong> on your course to upload video files or paste Bunny CDN links!
              </div>
            </div>

            <form onSubmit={handleSaveCourse} className="modal-form">
              <div className="form-field">
                <label className="form-label">Course Title *</label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={handleTitleChange}
                  placeholder="e.g., Artisan Sourdough & Crusty Breads"
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label className="form-label">
                  Website URL Slug * (e.g. nehas-institute.com/courses/<strong>{courseForm.slug || 'your-slug'}</strong>)
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.slug}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="artisan-sourdough-crusty-breads"
                  className="form-input font-mono text-xs"
                />
                <span className="field-hint">Auto-generated from course title. Unique web path for this course.</span>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">Category *</label>
                  <select
                    value={courseForm.category}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="form-select"
                  >
                    <option value="Cooking Essentials">Cooking Essentials</option>
                    <option value="Regional Indian">Regional Indian</option>
                    <option value="Bakery & Pastry">Bakery & Pastry</option>
                    <option value="Advanced Culinary Arts">Advanced Culinary Arts</option>
                    <option value="Indian Heritage Cuisine">Indian Heritage Cuisine</option>
                    <option value="Street Classics">Street Classics</option>
                    <option value="Mithai & Sweets">Mithai & Sweets</option>
                    <option value="Beverages & Mixology">Beverages & Mixology</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">Skill Level *</label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, level: e.target.value as any }))}
                    className="form-select"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Price in Rupees (₹) * (Set 0 for Free Course)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={courseForm.priceInRupees}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, priceInRupees: e.target.value }))}
                  className="form-input"
                />
                <span className="field-hint">
                  Free courses (₹0) allow instant 1-click student enrollment without Razorpay checkout.
                </span>
              </div>

              <div className="form-field">
                <label className="form-label">Short Hook / Tagline</label>
                <input
                  type="text"
                  maxLength={300}
                  value={courseForm.shortDescription}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
                  placeholder="The definitive culinary guide to authentic hotel-style gravies and spice balancing."
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Full Syllabus Description *</label>
                <textarea
                  required
                  rows={4}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what students will master, special techniques taught by Neha Ma'am, and course prerequisites..."
                  className="form-textarea"
                />
              </div>

              <div className="checkbox-field">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={courseForm.isPublished}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />
                <label htmlFor="isPublished">
                  Publish immediately (Visible in the public course catalog)
                </label>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: activeCourse ? 'space-between' : 'flex-end', alignItems: 'center' }}>
                {activeCourse ? (
                  <button
                    type="button"
                    onClick={() => {
                      const toDelete = activeCourse;
                      setIsCourseModalOpen(false);
                      setDeleteCourseModal(toDelete);
                    }}
                    className="icon-btn icon-btn--danger"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '6px',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Course</span>
                  </button>
                ) : (
                  <div />
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setIsCourseModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {activeCourse ? 'Save Changes' : 'Create Course'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Paste Bunny Video ID / Link ─── */}
      {pasteVideoModal && (
        <div className="modal-overlay" onClick={() => setPasteVideoModal(null)}>
          <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title font-serif">Attach Bunny Video ID</h3>
              <button onClick={() => setPasteVideoModal(null)} className="drawer-close" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <p className="text-secondary text-sm" style={{ marginBottom: '1rem' }}>
              Lesson: <strong>{pasteVideoModal.lectureTitle}</strong>
            </p>

            <form onSubmit={handleSavePastedVideoId} className="modal-form">
              <div className="form-field">
                <label className="form-label">Bunny Stream Video GUID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 9b88421b-4171-460d-8524-78bb71234567"
                  value={pastedVideoId}
                  onChange={(e) => setPastedVideoId(e.target.value)}
                  className="form-input font-mono text-xs"
                  autoFocus
                />
                <span className="field-hint">
                  Copy the Video ID / GUID from your Bunny Stream dashboard and paste it here.
                </span>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setPasteVideoModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingVideoId || !pastedVideoId.trim()} className="btn-primary">
                  {isSavingVideoId ? 'Saving...' : 'Link Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 3: Grant Student Access ─── */}
      {isEnrollmentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEnrollmentModalOpen(false)}>
          <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-align-gap">
                <UserCheck size={20} className="text-terracotta" />
                <h3 className="modal-title font-serif">Grant Course Access</h3>
              </div>
              <button onClick={() => setIsEnrollmentModalOpen(false)} className="drawer-close" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGrantEnrollment} className="modal-form">
              <div className="form-field">
                <label className="form-label">Select Masterclass *</label>
                <select
                  value={grantForm.courseId}
                  onChange={(e) => setGrantForm((prev) => ({ ...prev, courseId: e.target.value }))}
                  className="form-select"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">User ID *</label>
                <input
                  type="text"
                  required
                  placeholder="Paste student's User ID (from Users & Roles)"
                  value={grantForm.userId}
                  onChange={(e) => setGrantForm((prev) => ({ ...prev, userId: e.target.value }))}
                  className="form-input font-mono text-xs"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., WhatsApp direct UPI payment, complimentary pass"
                  value={grantForm.reason}
                  onChange={(e) => setGrantForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="form-input"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Access Expiration (Optional)</label>
                <input
                  type="date"
                  value={grantForm.expiresAt}
                  onChange={(e) => setGrantForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                  className="form-input"
                />
                <span className="field-hint">Leave blank for lifetime access.</span>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsEnrollmentModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 4: Delete / Archive Course Confirmation ─── */}
      {deleteCourseModal && (
        <div className="modal-overlay" onClick={() => !isDeletingCourse && setDeleteCourseModal(null)}>
          <div className="modal-card modal-card--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="modal-title font-serif" style={{ margin: 0, color: '#1c1917', fontSize: '1.15rem' }}>
                    {(deleteCourseModal._count?.enrollments || 0) > 0 ? 'Archive Masterclass' : 'Delete Masterclass'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => !isDeletingCourse && setDeleteCourseModal(null)}
                className="drawer-close"
                aria-label="Close"
                disabled={isDeletingCourse}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '0.75rem 0 1.25rem' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: '#44403c', lineHeight: 1.5 }}>
                Are you sure you want to remove <strong>&ldquo;{deleteCourseModal.title}&rdquo;</strong>?
              </p>

              {(deleteCourseModal._count?.enrollments || 0) > 0 ? (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    display: 'flex',
                    gap: '0.65rem',
                    fontSize: '0.85rem',
                    color: '#92400e',
                    lineHeight: 1.45,
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#b45309' }} />
                  <div>
                    <strong>Active Enrollments Detected:</strong> This course has{' '}
                    <strong>{deleteCourseModal._count?.enrollments}</strong> enrolled student(s). To protect student access and order history, it will be <strong>archived</strong> and hidden from catalog listings, but existing students will retain their access.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    display: 'flex',
                    gap: '0.65rem',
                    fontSize: '0.85rem',
                    color: '#991b1b',
                    lineHeight: 1.45,
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
                  <div>
                    This course has no paid enrollments. It will be{' '}
                    <strong>permanently deleted</strong> along with all sections (
                    {deleteCourseModal.sections?.length || 0}) and lesson entries.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteCourseModal(null)}
                className="btn-secondary"
                disabled={isDeletingCourse}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCourse}
                disabled={isDeletingCourse}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: isDeletingCourse ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isDeletingCourse ? 0.7 : 1,
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                }}
              >
                {isDeletingCourse ? (
                  <>
                    <RefreshCw size={15} className="spinning" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>
                      {(deleteCourseModal._count?.enrollments || 0) > 0 ? 'Archive Course' : 'Delete Course'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Embedded Scoped CSS Styles ─── */}
      <style>{`
        .courses-admin-page {
          max-width: 1100px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .courses-header {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding-bottom: 1.75rem;
          border-bottom: 1px solid var(--border, rgba(120, 113, 108, 0.16));
          margin-bottom: 2rem;
        }
        @media (min-width: 768px) {
          .courses-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .courses-header-title-wrap {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .courses-header-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(194, 65, 12, 0.1);
          color: var(--accent, #c2410c);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .courses-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary, #1c1917);
          line-height: 1.2;
          margin-bottom: 0.25rem;
        }
        .courses-subtitle {
          font-size: 0.88rem;
          color: var(--text-secondary, #44403c);
        }
        .courses-header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        /* ── Buttons ── */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 10px;
          background: var(--accent, #c2410c);
          color: #ffffff !important;
          font-size: 0.88rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          box-shadow: 0 4px 14px rgba(194, 65, 12, 0.25);
        }
        .btn-primary:hover:not(:disabled) {
          background: var(--accent-hover, #9a3412);
        }
        .btn-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.1rem;
          border-radius: 10px;
          background: var(--bg-surface, #ffffff);
          color: var(--text-primary, #1c1917);
          font-size: 0.88rem;
          font-weight: 600;
          border: 1px solid var(--border, rgba(120, 113, 108, 0.25));
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .btn-secondary:hover {
          background: var(--bg-surface-2, #f7f2eb);
          border-color: var(--border-strong, rgba(120, 113, 108, 0.4));
        }

        .btn-curriculum {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          background: rgba(194, 65, 12, 0.08);
          color: var(--accent, #c2410c);
          border: 1px solid rgba(194, 65, 12, 0.2);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .btn-curriculum:hover {
          background: rgba(194, 65, 12, 0.16);
          border-color: var(--accent, #c2410c);
        }

        .btn-upload-lesson {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          background: var(--accent, #c2410c);
          color: #ffffff !important;
          font-size: 0.78rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .btn-upload-lesson:hover {
          background: var(--accent-hover, #9a3412);
        }

        .btn-outline-sm {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
          background: var(--bg-surface, #ffffff);
          color: var(--text-secondary, #44403c);
          border: 1px solid var(--border, rgba(120, 113, 108, 0.25));
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-outline-sm:hover {
          background: var(--bg-surface-2, #f7f2eb);
          border-color: var(--accent, #c2410c);
          color: var(--accent, #c2410c);
        }

        .icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, rgba(120, 113, 108, 0.2));
          color: var(--text-secondary, #44403c);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .icon-btn:hover {
          background: var(--bg-surface-2, #f7f2eb);
          color: var(--text-primary, #1c1917);
          border-color: var(--border-strong, rgba(120, 113, 108, 0.4));
        }
        .icon-btn--danger:hover {
          background: #fee2e2;
          color: #b91c1c;
          border-color: #fca5a5;
        }

        .icon-btn-sm {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, rgba(120, 113, 108, 0.2));
          color: var(--text-secondary, #44403c);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .icon-btn-sm:hover {
          background: var(--bg-surface-2, #f7f2eb);
          color: var(--text-primary, #1c1917);
        }

        .icon-subtle {
          background: none;
          border: none;
          color: var(--text-muted, #78716c);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease, background 0.15s ease;
        }
        .icon-subtle:hover {
          color: var(--text-primary, #1c1917);
          background: rgba(120, 113, 108, 0.1);
        }
        .icon-subtle--danger:hover {
          color: #b91c1c;
          background: #fee2e2;
        }

        .btn-add-lesson-trigger {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.65rem;
          border-radius: 7px;
          background: #ffffff;
          border: 1px solid var(--border, rgba(120, 113, 108, 0.2));
          color: var(--text-primary, #1c1917);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-add-lesson-trigger:hover {
          background: var(--bg-surface-2, #f7f2eb);
          border-color: var(--accent, #c2410c);
        }

        .btn-save-sm {
          padding: 0.35rem 0.75rem;
          border-radius: 7px;
          background: var(--accent, #c2410c);
          color: #ffffff !important;
          font-size: 0.78rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }
        .btn-cancel-sm {
          padding: 0.35rem 0.75rem;
          border-radius: 7px;
          background: transparent;
          color: var(--text-secondary, #44403c);
          font-size: 0.78rem;
          font-weight: 500;
          border: 1px solid var(--border, rgba(120, 113, 108, 0.25));
          cursor: pointer;
        }

        /* ── Toasts ── */
        .toast-success {
          padding: 0.85rem 1.25rem;
          border-radius: 12px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
          font-size: 0.88rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1.5rem;
        }
        .toast-error {
          padding: 0.85rem 1.25rem;
          border-radius: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          font-size: 0.88rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin-bottom: 1.5rem;
        }

        /* ── Course Cards ── */
        .courses-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .course-card {
          background: var(--bg-surface, #ffffff);
          border: 1px solid var(--border, rgba(120, 113, 108, 0.16));
          border-radius: 16px;
          padding: 1.4rem 1.6rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        @media (min-width: 860px) {
          .course-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .course-card:hover {
          border-color: rgba(194, 65, 12, 0.35);
          box-shadow: 0 8px 24px rgba(194, 65, 12, 0.06);
        }
        .course-card-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .course-meta-pills {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.2rem;
        }
        .pill {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .pill-category {
          background: var(--bg-surface-2, #f7f2eb);
          color: var(--text-secondary, #44403c);
        }
        .pill-level {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #ffedd5;
        }
        .pill-published {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .pill-draft {
          background: #f5f5f4;
          color: #78716c;
          border: 1px solid #e7e5e4;
        }
        .course-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary, #1c1917);
          line-height: 1.3;
        }
        .course-card-desc {
          font-size: 0.82rem;
          color: var(--text-secondary, #44403c);
          line-height: 1.45;
          max-width: 680px;
        }
        .course-stat-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: var(--text-muted, #78716c);
          margin-top: 0.25rem;
        }
        .dot-sep {
          color: var(--border-strong, #d6d3d1);
        }
        .text-free {
          color: #059669;
          font-weight: 700;
        }

        .course-card-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border, rgba(120, 113, 108, 0.1));
        }
        @media (min-width: 860px) {
          .course-card-actions {
            padding-top: 0;
            border-top: none;
            flex-shrink: 0;
          }
        }
        .icon-actions-group {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        /* ── Empty State ── */
        .empty-course-card {
          text-align: center;
          padding: 3.5rem 1.5rem;
          background: var(--bg-surface, #ffffff);
          border: 2px dashed var(--border, rgba(120, 113, 108, 0.25));
          border-radius: 20px;
        }
        .empty-icon {
          color: var(--text-muted, #78716c);
          margin: 0 auto 0.75rem;
          opacity: 0.6;
        }
        .empty-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary, #1c1917);
        }
        .empty-desc {
          font-size: 0.88rem;
          color: var(--text-secondary, #44403c);
          max-width: 440px;
          margin: 0.35rem auto 0;
        }

        .loading-state {
          text-align: center;
          padding: 5rem 1rem;
          color: var(--text-secondary, #44403c);
        }
        .text-terracotta {
          color: var(--accent, #c2410c);
        }
        .spinning {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Drawer & Overlays ── */
        .drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.2s ease-out;
        }
        .curriculum-drawer {
          width: 760px;
          max-width: 95vw;
          background: #ffffff;
          height: 100vh;
          display: flex;
          flex-direction: column;
          box-shadow: -12px 0 40px rgba(0, 0, 0, 0.25);
          animation: slideLeft 0.25s ease-out;
          overflow: hidden;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .drawer-header {
          padding: 1.25rem 1.5rem;
          background: var(--bg-surface-2, #f7f2eb);
          border-bottom: 1px solid var(--border, rgba(120, 113, 108, 0.16));
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .drawer-pre-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }
        .drawer-tag {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.15rem 0.5rem;
          border-radius: 6px;
          background: rgba(194, 65, 12, 0.12);
          color: var(--accent, #c2410c);
        }
        .drawer-price-tag {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-secondary, #44403c);
        }
        .drawer-course-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-primary, #1c1917);
        }
        .drawer-course-desc {
          font-size: 0.8rem;
          color: var(--text-muted, #78716c);
          margin-top: 0.2rem;
        }
        .drawer-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: var(--text-muted, #78716c);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .drawer-close:hover {
          background: rgba(120, 113, 108, 0.15);
          color: var(--text-primary, #1c1917);
        }

        .upload-progress-banner {
          background: #fff7ed;
          border-bottom: 1px solid #ffedd5;
          padding: 0.85rem 1.5rem;
        }
        .upload-progress-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 0.4rem;
        }
        .upload-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          color: #c2410c;
        }
        .upload-val {
          color: #9a3412;
        }
        .upload-track {
          width: 100%;
          height: 6px;
          background: #fed7aa;
          border-radius: 999px;
          overflow: hidden;
        }
        .upload-fill {
          height: 100%;
          background: #c2410c;
          border-radius: 999px;
          transition: width 0.2s ease;
        }
        .bounce-anim {
          animation: bounce 1s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          background: #ffffff;
        }

        .add-section-form {
          display: flex;
          gap: 0.6rem;
        }
        .section-input {
          flex: 1;
          padding: 0.65rem 0.95rem;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(120, 113, 108, 0.25));
          font-size: 0.88rem;
          background: #ffffff;
          color: var(--text-primary, #1c1917);
          outline: none;
        }
        .section-input:focus {
          border-color: var(--accent, #c2410c);
          box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.12);
        }

        .sections-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .empty-sections-msg {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--text-secondary, #44403c);
        }

        .section-block {
          border: 1px solid var(--border, rgba(120, 113, 108, 0.2));
          border-radius: 14px;
          overflow: hidden;
          background: #ffffff;
        }
        .section-header-row {
          background: var(--bg-surface-2, #f7f2eb);
          border-bottom: 1px solid var(--border, rgba(120, 113, 108, 0.15));
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .section-title-toggle {
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-primary, #1c1917);
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          flex: 1;
        }
        .section-lesson-count {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted, #78716c);
        }
        .section-rename-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex: 1;
        }
        .section-rename-input {
          flex: 1;
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          border: 1px solid var(--accent, #c2410c);
          font-size: 0.85rem;
        }
        .section-header-actions {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .section-content-box {
          padding: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          background: #ffffff;
        }

        .add-lesson-card {
          padding: 0.85rem;
          border-radius: 10px;
          border: 1px solid #fbd38d;
          background: #fffaf0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .lesson-title-input {
          width: 100%;
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          border: 1px solid var(--border, rgba(120, 113, 108, 0.25));
          font-size: 0.82rem;
          outline: none;
        }
        .lesson-title-input:focus {
          border-color: var(--accent, #c2410c);
        }
        .add-lesson-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .preview-checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: var(--text-secondary, #44403c);
          cursor: pointer;
        }
        .add-lesson-btn-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .add-lesson-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(194, 65, 12, 0.15);
          padding-bottom: 0.4rem;
          margin-bottom: 0.25rem;
        }
        .add-lesson-card-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--accent, #c2410c);
        }
        .add-lesson-card-hint {
          font-size: 0.72rem;
          color: var(--text-muted, #78716c);
        }
        .empty-section-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.25rem 1rem;
          gap: 0.5rem;
        }
        .btn-add-first-lesson {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.95rem;
          border-radius: 8px;
          background: rgba(194, 65, 12, 0.08);
          border: 1px dashed rgba(194, 65, 12, 0.4);
          color: var(--accent, #c2410c);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-add-first-lesson:hover {
          background: rgba(194, 65, 12, 0.15);
          border-style: solid;
        }
        .no-lessons-text {
          font-size: 0.78rem;
          color: var(--text-muted, #78716c);
          text-align: center;
        }

        .lecture-card {
          padding: 0.75rem 0.95rem;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(120, 113, 108, 0.16));
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
        }
        @media (min-width: 640px) {
          .lecture-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .lecture-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .lecture-header-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .lecture-index {
          font-family: monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted, #78716c);
        }
        .lecture-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary, #1c1917);
        }
        .preview-badge {
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          background: #fef3c7;
          color: #92400e;
        }
        .lecture-meta-line {
          font-size: 0.72rem;
          font-family: monospace;
          color: var(--text-muted, #78716c);
        }
        .lecture-actions {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          align-self: flex-end;
        }
        @media (min-width: 640px) {
          .lecture-actions {
            align-self: center;
          }
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.12rem 0.45rem;
          border-radius: 999px;
        }
        .badge-ready {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .badge-processing {
          background: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
          animation: pulse 1.8s infinite;
        }
        .badge-uploading {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .badge-failed {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* ── Modals ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.2s ease-out;
        }
        .modal-card {
          width: 580px;
          max-width: 95vw;
          max-height: 90vh;
          overflow-y: auto;
          background: #ffffff;
          border-radius: 18px;
          padding: 1.75rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .modal-card--sm {
          width: 460px;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border, rgba(120, 113, 108, 0.16));
          padding-bottom: 0.75rem;
        }
        .modal-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text-primary, #1c1917);
        }
        .flex-align-gap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .modal-hint-box {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          font-size: 0.8rem;
          color: #9a3412;
          line-height: 1.45;
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .form-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-secondary, #44403c);
        }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 0.65rem 0.9rem;
          border-radius: 10px;
          border: 1px solid var(--border, rgba(120, 113, 108, 0.25));
          background: #ffffff;
          color: var(--text-primary, #1c1917);
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: var(--accent, #c2410c);
          box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.12);
        }
        .field-hint {
          font-size: 0.72rem;
          color: var(--text-muted, #78716c);
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .checkbox-field {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-secondary, #44403c);
          cursor: pointer;
        }
        .checkbox-field input {
          accent-color: var(--accent, #c2410c);
        }
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border, rgba(120, 113, 108, 0.16));
        }
      `}</style>
    </div>
  );
}
