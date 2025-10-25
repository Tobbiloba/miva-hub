import { useEffect, useCallback, useState, useRef } from 'react';

interface AutoSaveOptions {
  key: string;
  data: any;
  studentId?: string;
  onSave?: (success: boolean) => void;
  debounceMs?: number;
  localStorageOnly?: boolean;
}

export interface SaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'offline';
  lastSavedAt?: string;
  error?: string;
}

export function useAutoSave({
  key,
  data,
  studentId,
  onSave,
  debounceMs = 1000,
  localStorageOnly = false
}: AutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: 'idle' });
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveToLocalStorage = useCallback(() => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data: dataRef.current,
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('localStorage save failed:', error);
      return false;
    }
  }, [key]);

  const saveToBackend = useCallback(async () => {
    if (!studentId) return false;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_API_URL || 'http://localhost:8083'}/progress/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          student_id: studentId,
          data: dataRef.current
        })
      });

      if (!response.ok) throw new Error('Backend save failed');
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Backend save failed:', error);
      return false;
    }
  }, [key, studentId]);

  const performSave = useCallback(async () => {
    setSaveStatus({ status: 'saving' });

    const localSaved = saveToLocalStorage();

    if (localStorageOnly || !studentId) {
      setSaveStatus({
        status: localSaved ? 'saved' : 'error',
        lastSavedAt: new Date().toISOString()
      });
      onSave?.(localSaved);
      return;
    }

    const backendSaved = await saveToBackend();

    if (backendSaved) {
      setSaveStatus({
        status: 'saved',
        lastSavedAt: new Date().toISOString()
      });
      onSave?.(true);
    } else {
      setSaveStatus({
        status: localSaved ? 'offline' : 'error',
        lastSavedAt: new Date().toISOString(),
        error: 'Saved locally only'
      });
      onSave?.(localSaved);
    }
  }, [saveToLocalStorage, saveToBackend, localStorageOnly, studentId, onSave]);

  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;

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
    forceSave: performSave
  };
}

export function useLoadProgress(key: string, studentId?: string) {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      setLoading(true);

      if (studentId) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 500);

          const response = await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_API_URL || 'http://localhost:8083'}/progress/load?key=${key}&student_id=${studentId}`, {
            signal: controller.signal
          });

          clearTimeout(timeout);

          if (response.ok) {
            const result = await response.json();
            if (result.has_progress) {
              setProgress(result.data);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.warn('Backend load failed, using localStorage:', error);
        }
      }

      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const { data } = JSON.parse(saved);
          setProgress(data);
        }
      } catch (error) {
        console.error('localStorage load failed:', error);
      }

      setLoading(false);
    };

    loadProgress();
  }, [key, studentId]);

  return { progress, loading };
}

export async function clearProgress(key: string, studentId?: string) {
  localStorage.removeItem(key);
  
  if (studentId) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_PROGRESS_API_URL || 'http://localhost:8083'}/progress/clear?key=${key}&student_id=${studentId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Backend clear failed:', error);
    }
  }
}
