import { useEffect, useCallback, useState, useRef } from 'react';
import type { SaveStatus } from './useAutoSave';

interface QuizProgressData {
  answers: Record<number, string>;
  currentQuestion: number;
  mode: 'preview' | 'interactive' | 'results';
}

interface UseQuizProgressOptions {
  quizId?: string;
  studentId?: string;
  data: QuizProgressData;
  debounceMs?: number;
}

export function useQuizProgress({
  quizId,
  studentId,
  data,
  debounceMs = 1000
}: UseQuizProgressOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: 'idle' });
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const storageKey = quizId ? `quiz-progress-${quizId}` : `quiz-progress-temp-${Date.now()}`;

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
    if (!quizId || !studentId) return false;

    try {
      const response = await fetch('http://localhost:8083/progress/quiz/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          student_id: studentId,
          answers: dataRef.current.answers,
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
  }, [quizId, studentId]);

  const performSave = useCallback(async () => {
    setSaveStatus({ status: 'saving' });

    const localSaved = saveToLocalStorage();

    if (!quizId || !studentId) {
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
  }, [saveToLocalStorage, saveToBackend, quizId, studentId]);

  useEffect(() => {
    if (data.mode === "results") return;
    
    if (!data || !data.answers || Object.keys(data.answers).length === 0) return;

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

export function useLoadQuizProgress(quizId?: string, studentId?: string) {
  const [progress, setProgress] = useState<QuizProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      setLoading(true);

      if (quizId && studentId) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 500);

          const response = await fetch(`http://localhost:8083/progress/quiz/load/${quizId}/${studentId}`, {
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (response.ok) {
            const result = await response.json();
            if (result.has_progress) {
              setProgress({
                answers: result.answers,
                currentQuestion: result.current_question,
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

      const storageKey = quizId ? `quiz-progress-${quizId}` : null;
      if (storageKey) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const data = JSON.parse(saved);
            setProgress({
              answers: data.answers,
              currentQuestion: data.currentQuestion,
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
  }, [quizId, studentId]);

  return { progress, loading };
}

export async function clearQuizProgress(quizId?: string, studentId?: string) {
  const storageKey = quizId ? `quiz-progress-${quizId}` : null;
  if (storageKey) {
    localStorage.removeItem(storageKey);
  }
  
  if (quizId && studentId) {
    try {
      await fetch(`http://localhost:8083/progress/quiz/clear/${quizId}/${studentId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Backend clear failed:', error);
    }
  }
}
