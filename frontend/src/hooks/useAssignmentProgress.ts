import { useEffect, useCallback, useState, useRef } from 'react';
import type { SaveStatus } from './useAutoSave';

interface AssignmentProgressData {
  submissionText?: string;
  submissionFiles?: Array<{
    name: string;
    size: number;
    type: string;
    url?: string;
  }>;
  submissionLink?: string;
}

interface UseAssignmentProgressOptions {
  assignmentId?: string;
  studentId?: string;
  data: AssignmentProgressData;
  debounceMs?: number;
}

export function useAssignmentProgress({
  assignmentId,
  studentId,
  data,
  debounceMs = 2000
}: UseAssignmentProgressOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: 'idle' });
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const storageKey = assignmentId ? `assignment-progress-${assignmentId}` : `assignment-progress-temp-${Date.now()}`;

  const saveToLocalStorage = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...dataRef.current,
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('localStorage save failed:', error);
      return false;
    }
  }, [storageKey]);

  const saveToBackend = useCallback(async () => {
    if (!assignmentId || !studentId) return false;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_API_URL || 'http://localhost:8083'}/progress/assignment/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: assignmentId,
          student_id: studentId,
          submission_text: dataRef.current.submissionText,
          submission_files: dataRef.current.submissionFiles || [],
          submission_link: dataRef.current.submissionLink
        })
      });

      if (!response.ok) throw new Error('Backend save failed');
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Backend save failed:', error);
      return false;
    }
  }, [assignmentId, studentId]);

  const performSave = useCallback(async () => {
    setSaveStatus({ status: 'saving' });

    const localSaved = saveToLocalStorage();

    if (!assignmentId || !studentId) {
      setSaveStatus({
        status: localSaved ? 'saved' : 'error',
        lastSavedAt: new Date().toISOString()
      });
      return;
    }

    const backendSaved = await saveToBackend();

    if (backendSaved) {
      setSaveStatus({
        status: 'saved',
        lastSavedAt: new Date().toISOString()
      });
    } else {
      setSaveStatus({
        status: localSaved ? 'offline' : 'error',
        lastSavedAt: new Date().toISOString(),
        error: 'Saved locally only'
      });
    }
  }, [saveToLocalStorage, saveToBackend, assignmentId, studentId]);

  useEffect(() => {
    const hasContent = 
      (data.submissionText && data.submissionText.trim().length > 0) ||
      (data.submissionFiles && data.submissionFiles.length > 0) ||
      (data.submissionLink && data.submissionLink.trim().length > 0);

    if (!hasContent) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, debounceMs, performSave]);

  return {
    saveStatus,
    forceSave: performSave,
    storageKey
  };
}

export function useLoadAssignmentProgress(assignmentId?: string, studentId?: string) {
  const [progress, setProgress] = useState<AssignmentProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      setLoading(true);

      if (assignmentId && studentId) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 500);

          const response = await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_API_URL || 'http://localhost:8083'}/progress/assignment/load/${assignmentId}/${studentId}`, {
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (response.ok) {
            const result = await response.json();
            if (result.has_progress) {
              setProgress({
                submissionText: result.submission_text,
                submissionFiles: result.submission_files,
                submissionLink: result.submission_link
              });
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.warn('Backend load failed, using localStorage:', error);
        }
      }

      const storageKey = assignmentId ? `assignment-progress-${assignmentId}` : null;
      if (storageKey) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const data = JSON.parse(saved);
            setProgress({
              submissionText: data.submissionText,
              submissionFiles: data.submissionFiles,
              submissionLink: data.submissionLink
            });
          }
        } catch (error) {
          console.error('localStorage load failed:', error);
        }
      }

      setLoading(false);
    };

    loadProgress();
  }, [assignmentId, studentId]);

  return { progress, loading };
}

export async function clearAssignmentProgress(assignmentId?: string, studentId?: string) {
  const storageKey = assignmentId ? `assignment-progress-${assignmentId}` : null;
  if (storageKey) {
    localStorage.removeItem(storageKey);
  }
  
  if (assignmentId && studentId) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_API_URL || 'http://localhost:8083'}/progress/assignment/clear/${assignmentId}/${studentId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Backend clear failed:', error);
    }
  }
}
