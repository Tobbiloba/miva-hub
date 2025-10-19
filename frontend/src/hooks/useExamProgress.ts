import { useEffect, useCallback, useState, useRef } from 'react';
import type { SaveStatus } from './useAutoSave';

interface ExamProgressData {
  answers: Record<number, string>;
  currentQuestion: number;
  timeRemaining: number;
  mode: 'preview' | 'interactive' | 'results';
}

interface UseExamProgressOptions {
  examId?: string;
  studentId?: string;
  data: ExamProgressData;
  debounceMs?: number;
}

export function useExamProgress({
  examId,
  studentId,
  data,
  debounceMs = 1000
}: UseExamProgressOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: 'idle' });
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const storageKey = examId ? `exam-progress-${examId}` : `exam-progress-temp-${Date.now()}`;

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
    if (!examId || !studentId) return false;

    try {
      const response = await fetch('http://localhost:8083/progress/exam/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: examId,
          student_id: studentId,
          answers: dataRef.current.answers,
          time_remaining_seconds: dataRef.current.timeRemaining,
          current_question: dataRef.current.currentQuestion,
          mode: dataRef.current.mode
        })
      });

      if (!response.ok) throw new Error('Backend save failed');
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Backend save failed:', error);
      return false;
    }
  }, [examId, studentId]);

  const performSave = useCallback(async () => {
    setSaveStatus({ status: 'saving' });

    const localSaved = saveToLocalStorage();

    if (!examId || !studentId) {
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
  }, [saveToLocalStorage, saveToBackend, examId, studentId]);

  useEffect(() => {
    if (data.mode === "results") return;
    
    if (!data || !data.answers) return;

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

export function useLoadExamProgress(examId?: string, studentId?: string) {
  const [progress, setProgress] = useState<ExamProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      setLoading(true);

      if (examId && studentId) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 500);

          const response = await fetch(`http://localhost:8083/progress/exam/load/${examId}/${studentId}`, {
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (response.ok) {
            const result = await response.json();
            if (result.has_progress) {
              setProgress({
                answers: result.answers,
                currentQuestion: result.current_question,
                timeRemaining: result.time_remaining_seconds,
                mode: result.mode
              });
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.warn('Backend load failed, using localStorage:', error);
        }
      }

      const storageKey = examId ? `exam-progress-${examId}` : null;
      if (storageKey) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const data = JSON.parse(saved);
            setProgress({
              answers: data.answers,
              currentQuestion: data.currentQuestion,
              timeRemaining: data.timeRemaining,
              mode: data.mode
            });
          }
        } catch (error) {
          console.error('localStorage load failed:', error);
        }
      }

      setLoading(false);
    };

    loadProgress();
  }, [examId, studentId]);

  return { progress, loading };
}

export async function clearExamProgress(examId?: string, studentId?: string) {
  const storageKey = examId ? `exam-progress-${examId}` : null;
  if (storageKey) {
    localStorage.removeItem(storageKey);
  }
  
  if (examId && studentId) {
    try {
      await fetch(`http://localhost:8083/progress/exam/clear/${examId}/${studentId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Backend clear failed:', error);
    }
  }
}
