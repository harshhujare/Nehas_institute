'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BookOpen, Plus, Edit2, Trash2, Video, Eye, EyeOff, RefreshCw, 
  UploadCloud, CheckCircle2, Clock, AlertTriangle, ArrowUpDown, 
  X, ChevronDown, ChevronRight, UserCheck, ShieldAlert, Sparkles,
  FileVideo, Lock, Unlock, PlayCircle
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

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/admin/courses');
      setCourses(res.data.data || []);
      // Refresh activeCourse if curriculum is open
      if (activeCourse) {
        const updated = (res.data.data || []).find((c: Course) => c.id === activeCourse.id);
        if (updated) setActiveCourse(updated);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, [activeCourse]);

  useEffect(() => {
    fetchCourses();
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
      // Auto generate slug for new courses
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
        title: courseForm.title,
        slug: courseForm.slug,
        description: courseForm.description,
        shortDescription: courseForm.shortDescription || undefined,
        category: courseForm.category,
        level: courseForm.level,
        priceInPaise: Math.round(parseFloat(courseForm.priceInRupees || '0') * 100),
        isPublished: courseForm.isPublished,
      };

      if (activeCourse) {
        await apiClient.put(`/api/admin/courses/${activeCourse.id}`, payload);
        showNotification('Course updated successfully.');
      } else {
        await apiClient.post('/api/admin/courses', payload);
        showNotification('Course created successfully.');
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
      showNotification(`Course ${!course.isPublished ? 'published' : 'unpublished'}.`);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to change publish state.');
    }
  };

  const handleArchiveCourse = async (course: Course) => {
    if (!confirm(`Are you sure you want to archive "${course.title}"? Students with existing enrollments will retain access, but it will be hidden from new purchases.`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/admin/courses/${course.id}`);
      showNotification('Course archived.');
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to archive course.');
    }
  };

  // ─── Curriculum Handlers ────────────────────────────────────────────────────
  const openCurriculum = (course: Course) => {
    setActiveCourse(course);
    setIsCurriculumOpen(true);
    // Expand all sections by default
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

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      await apiClient.delete(`/api/admin/courses/sections/${sectionId}`);
      fetchCourses();
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
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add lecture.');
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm('Are you sure you want to delete this lecture?')) return;
    try {
      await apiClient.delete(`/api/admin/courses/lectures/${lectureId}`);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete lecture.');
    }
  };

  const handleRefreshStatus = async (lectureId: string) => {
    try {
      const res = await apiClient.post(`/api/admin/courses/lectures/${lectureId}/refresh-status`);
      showNotification(`Video status refreshed: ${res.data.data?.status || 'UPDATED'}`);
      fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to refresh video status.');
    }
  };

  // ─── TUS Browser-Direct Upload ──────────────────────────────────────────────
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
      setUploadStatusText('Authorizing secure direct upload...');

      // 1. Get signed TUS upload credentials from our server
      const endpoint = isReplacement
        ? `/api/admin/courses/lectures/${lectureId}/replace-video`
        : `/api/admin/courses/lectures/${lectureId}/upload-auth`;

      const authRes = await apiClient.post(endpoint);
      const auth = authRes.data.data;

      setUploadStatusText('Uploading directly to CDN...');

      // 2. Perform Resumable TUS upload directly from browser to Bunny
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
          alert(`Upload failed: ${err.message}. You can retry and it will resume.`);
          setUploadingLectureId(null);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setUploadProgress(percentage);
          setUploadStatusText(`${percentage}% (${(bytesUploaded / 1024 / 1024).toFixed(1)}MB / ${(bytesTotal / 1024 / 1024).toFixed(1)}MB)`);
        },
        onSuccess: () => {
          setUploadProgress(100);
          setUploadStatusText('Upload complete! Video is now processing.');
          showNotification('Upload complete! Video is queued for adaptive transcoding.');
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

  const getStatusBadge = (status: Lecture['status']) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Ready
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock size={12} /> Processing
          </span>
        );
      case 'UPLOADING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <UploadCloud size={12} /> Uploading
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle size={12} /> Failed
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hidden file input for TUS video upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="video/*"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-950/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <BookOpen size={24} />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight font-serif">
              Culinary Masterclasses & Video
            </h1>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Manage video courses, sections, adaptive CDN streams, and student enrollments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setGrantForm({ userId: '', courseId: courses[0]?.id || '', reason: '', expiresAt: '' });
              setIsEnrollmentModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium transition-all shadow-sm"
          >
            <UserCheck size={16} className="text-amber-600" />
            Grant Access
          </button>
          <button
            onClick={openCreateCourseModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-all shadow-sm shadow-amber-600/20"
          >
            <Plus size={16} />
            New Course
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Course Cards / Table */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="animate-spin mx-auto text-amber-600 mb-2" size={28} />
          <p className="text-stone-500 text-sm">Loading masterclasses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 p-8">
          <BookOpen className="mx-auto text-stone-300 mb-3" size={48} />
          <h3 className="text-base font-semibold text-stone-800">No courses created yet</h3>
          <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto">
            Get started by creating your first culinary course and uploading lesson videos.
          </p>
          <button
            onClick={openCreateCourseModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition"
          >
            <Plus size={16} /> Create Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {courses.map((course) => {
            const totalLectures = course.sections.reduce((acc, s) => acc + s.lectures.length, 0);
            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm hover:border-amber-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 font-medium rounded-full bg-stone-100 text-stone-600 uppercase tracking-wider">
                      {course.category}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 font-medium rounded-full bg-amber-50 text-amber-700">
                      {course.level}
                    </span>
                    {course.isPublished ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 font-semibold rounded-full bg-stone-100 text-stone-600">
                        Draft
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-stone-900 font-serif">
                    {course.title}
                  </h3>

                  <p className="text-xs text-stone-500 line-clamp-1 max-w-2xl">
                    {course.shortDescription || course.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1">
                    <span><strong>{course.sections.length}</strong> sections</span>
                    <span>•</span>
                    <span><strong>{totalLectures}</strong> lessons</span>
                    <span>•</span>
                    <span>
                      {course.priceInPaise === 0 ? (
                        <strong className="text-emerald-600">FREE</strong>
                      ) : (
                        <strong>₹{(course.priceInPaise / 100).toLocaleString('en-IN')}</strong>
                      )}
                    </span>
                    <span>•</span>
                    <span><strong>{course._count?.enrollments || 0}</strong> students enrolled</span>
                  </div>
                </div>

                {/* Course Actions */}
                <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                  <button
                    onClick={() => openCurriculum(course)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-800 text-xs font-semibold transition"
                  >
                    <Video size={14} className="text-amber-600" />
                    Manage Lessons ({totalLectures})
                  </button>

                  <button
                    onClick={() => handleTogglePublish(course)}
                    title={course.isPublished ? 'Unpublish course' : 'Publish course'}
                    className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs transition"
                  >
                    {course.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>

                  <button
                    onClick={() => openEditCourseModal(course)}
                    title="Edit course metadata"
                    className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs transition"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => handleArchiveCourse(course)}
                    title="Archive course"
                    className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Curriculum Editor Drawer / Modal ─────────────────────────────────── */}
      {isCurriculumOpen && activeCourse && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold uppercase">
                    Curriculum Editor
                  </span>
                  <h2 className="text-lg font-bold text-stone-900 font-serif">
                    {activeCourse.title}
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Manage sections, lecture order, free previews, and upload CDN videos directly.
                </p>
              </div>
              <button
                onClick={() => setIsCurriculumOpen(false)}
                className="p-2 rounded-lg hover:bg-stone-200/60 text-stone-500 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Upload Progress Banner */}
            {uploadingLectureId && (
              <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 text-stone-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2">
                    <UploadCloud size={16} className="text-amber-600 animate-bounce" />
                    Resumable Video Uploading
                  </span>
                  <span className="text-amber-700">{uploadStatusText}</span>
                </div>
                <div className="w-full bg-amber-200/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Add New Section Form */}
              <form onSubmit={handleAddSection} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New section title (e.g., Section 1: Knife Skills & Preparation)"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!newSectionTitle.trim()}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium transition"
                >
                  Add Section
                </button>
              </form>

              {/* Sections List */}
              <div className="space-y-4">
                {activeCourse.sections.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-sm">
                    No sections yet. Add your first section above.
                  </div>
                ) : (
                  activeCourse.sections.map((section, sIdx) => {
                    const isExpanded = expandedSections[section.id] !== false;
                    return (
                      <div
                        key={section.id}
                        className="rounded-2xl border border-stone-200 bg-stone-50/50 overflow-hidden"
                      >
                        {/* Section Header */}
                        <div className="p-3.5 bg-stone-100/70 border-b border-stone-200/60 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSections((prev) => ({
                                ...prev,
                                [section.id]: !isExpanded,
                              }))
                            }
                            className="flex items-center gap-2 text-left flex-1 font-semibold text-stone-800 text-sm"
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span>
                              {sIdx + 1}. {section.title}
                            </span>
                            <span className="text-xs text-stone-400 font-normal">
                              ({section.lectures.length} lessons)
                            </span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAddingLectureToSectionId(section.id);
                                setNewLectureTitle('');
                                setNewLectureIsPreview(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50"
                            >
                              <Plus size={12} className="inline mr-1" /> Lesson
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSection(section.id)}
                              className="p-1 rounded text-stone-400 hover:text-rose-600"
                              title="Delete section"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Lectures inside Section */}
                        {isExpanded && (
                          <div className="p-3 space-y-2">
                            {/* Add Lecture Inline Box */}
                            {addingLectureToSectionId === section.id && (
                              <div className="p-3 bg-white rounded-xl border border-amber-300 space-y-2.5">
                                <input
                                  type="text"
                                  placeholder="Lesson title (e.g., Understanding Pan Heat & Maillard Reaction)"
                                  value={newLectureTitle}
                                  onChange={(e) => setNewLectureTitle(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-amber-500"
                                  autoFocus
                                />
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={newLectureIsPreview}
                                      onChange={(e) => setNewLectureIsPreview(e.target.checked)}
                                      className="rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    <span>Free Preview Lesson (Watchable without purchase)</span>
                                  </label>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setAddingLectureToSectionId(null)}
                                      className="px-2.5 py-1 rounded text-xs text-stone-500 hover:bg-stone-100"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAddLecture(section.id)}
                                      disabled={!newLectureTitle.trim()}
                                      className="px-3 py-1 rounded bg-amber-600 text-white text-xs font-medium hover:bg-amber-700"
                                    >
                                      Save Lesson
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {section.lectures.length === 0 ? (
                              <p className="text-xs text-stone-400 py-3 text-center">
                                No lessons in this section yet.
                              </p>
                            ) : (
                              section.lectures.map((lecture, lIdx) => (
                                <div
                                  key={lecture.id}
                                  className="p-3 bg-white rounded-xl border border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-mono text-stone-400 font-medium">
                                        {sIdx + 1}.{lIdx + 1}
                                      </span>
                                      <span className="text-xs font-semibold text-stone-800">
                                        {lecture.title}
                                      </span>
                                      {lecture.isFreePreview && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                          FREE PREVIEW
                                        </span>
                                      )}
                                      {getStatusBadge(lecture.status)}
                                    </div>

                                    <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono">
                                      {lecture.durationSec ? (
                                        <span>Duration: {Math.floor(lecture.durationSec / 60)}m {lecture.durationSec % 60}s</span>
                                      ) : (
                                        <span>No duration yet</span>
                                      )}
                                      {lecture.videoId && (
                                        <span>Video GUID: {lecture.videoId.slice(0, 8)}...</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Lecture Action Buttons */}
                                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                                    {lecture.videoId ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleRefreshStatus(lecture.id)}
                                          title="Re-query CDN video status"
                                          className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs"
                                        >
                                          <RefreshCw size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => triggerVideoUpload(lecture.id, true)}
                                          title="Replace video (safe zero-downtime swap)"
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-medium"
                                        >
                                          <UploadCloud size={13} /> Replace
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => triggerVideoUpload(lecture.id, false)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium"
                                      >
                                        <UploadCloud size={14} /> Upload Video
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLecture(lecture.id)}
                                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600"
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
          </div>
        </div>
      )}

      {/* ─── Create/Edit Course Modal ────────────────────────────────────────── */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-stone-900 font-serif">
                {activeCourse ? 'Edit Course' : 'Create New Masterclass'}
              </h3>
              <button
                onClick={() => setIsCourseModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={handleTitleChange}
                  placeholder="e.g., Artisan Sourdough & Viennoiserie Mastery"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  URL Slug * (Unique, lowercase alphanumeric & hyphens)
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.slug}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="artisan-sourdough-mastery"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-mono text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={courseForm.category}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white"
                  >
                    <option value="Cooking Essentials">Cooking Essentials</option>
                    <option value="Bakery & Pastry">Bakery & Pastry</option>
                    <option value="Advanced Culinary Arts">Advanced Culinary Arts</option>
                    <option value="Indian Heritage Cuisine">Indian Heritage Cuisine</option>
                    <option value="Beverages & Mixology">Beverages & Mixology</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Skill Level *
                  </label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, level: e.target.value as any }))}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Price in Rupees (₹) * (Set 0 for Free Course)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={courseForm.priceInRupees}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, priceInRupees: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200"
                />
                <span className="text-[11px] text-stone-400 mt-1 block">
                  Free courses allow 1-click student enrollment without Razorpay checkout.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Short Hook / Tagline
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={courseForm.shortDescription}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
                  placeholder="Master the science of wild yeast, hydration, and high-heat baking."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed curriculum overview, required tools, and chef notes..."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={courseForm.isPublished}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="isPublished" className="text-xs font-medium text-stone-700 cursor-pointer">
                  Publish immediately (visible to all students on the course catalog)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  {activeCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Grant Enrollment Modal ─────────────────────────────────────────── */}
      {isEnrollmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <UserCheck size={20} className="text-amber-600" />
                <h3 className="text-lg font-bold text-stone-900 font-serif">
                  Grant Student Access
                </h3>
              </div>
              <button
                onClick={() => setIsEnrollmentModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGrantEnrollment} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  User ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste student's User ID (from Users & Roles)"
                  value={grantForm.userId}
                  onChange={(e) => setGrantForm((prev) => ({ ...prev, userId: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Select Course *
                </label>
                <select
                  required
                  value={grantForm.courseId}
                  onChange={(e) => setGrantForm((prev) => ({ ...prev, courseId: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Audit Reason * (Required for audit log)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Scholarship recipient, Workshop attendee, Manual payment"
                  value={grantForm.reason}
                  onChange={(e) => setGrantForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Optional Expiration Date
                </label>
                <input
                  type="date"
                  value={grantForm.expiresAt}
                  onChange={(e) => setGrantForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEnrollmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  Grant Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
