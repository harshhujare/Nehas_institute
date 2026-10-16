import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';
import type {
  CourseSummary,
  CourseDetail,
  PlaybackAuthResponse,
  LectureProgress,
  CourseQueryInput,
} from '@neha/shared';

export function useCourses(params?: Partial<CourseQueryInput>) {
  return useQuery({
    queryKey: ['courses', params],
    networkMode: 'offlineFirst',
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data } = await apiClient.get<{
        data: CourseSummary[];
        pagination: { totalCount: number; page: number; totalPages: number };
      }>('/api/courses', { params });
      return data;
    },
  });
}

export function useCourse(slugOrId: string) {
  return useQuery({
    queryKey: ['course', slugOrId],
    networkMode: 'offlineFirst',
    staleTime: 2 * 60 * 1000,
    enabled: Boolean(slugOrId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: CourseDetail }>(`/api/courses/${slugOrId}`);
      return data.data;
    },
  });
}

export function useLecturePlay(lectureId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ['lecture-play', lectureId],
    enabled: Boolean(lectureId && enabled),
    staleTime: 30 * 60 * 1000, // Token is valid for 4 hours
    retry: false, // Don't loop on paywall 403s
    queryFn: async () => {
      if (!lectureId) throw new Error('No lectureId provided');
      const { data } = await apiClient.get<{ data: PlaybackAuthResponse }>(
        `/api/lectures/${lectureId}/play`
      );
      return data.data;
    },
  });
}

export function useLectureProgress(courseId?: string) {
  const queryClient = useQueryClient();

  const progressQuery = useQuery({
    queryKey: ['course-progress', courseId],
    enabled: Boolean(courseId),
    networkMode: 'offlineFirst',
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data } = await apiClient.get<{
        data: {
          totalLectures: number;
          completedCount: number;
          percentComplete: number;
          lastWatchedLectureId: string | null;
          completedLectureIds: string[];
        };
      }>(`/api/courses/${courseId}/progress`);
      return data.data;
    },
  });

  const recordProgressMutation = useMutation({
    mutationFn: async ({
      lectureId,
      positionSec,
      completed,
    }: {
      lectureId: string;
      positionSec: number;
      completed?: boolean;
    }) => {
      const { data } = await apiClient.post<{ data: LectureProgress }>(
        `/api/lectures/${lectureId}/progress`,
        { positionSec, completed }
      );
      return data.data;
    },
    onSuccess: () => {
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] });
        queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      }
    },
  });

  return {
    ...progressQuery,
    recordProgress: recordProgressMutation.mutate,
    recordProgressAsync: recordProgressMutation.mutateAsync,
  };
}
