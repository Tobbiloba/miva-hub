import { useCallback, useEffect, useRef, useState } from "react";

// Generic localStorage auto-save. Server-backed drafts go through the
// typed, session-scoped hooks (useQuizProgress / useExamProgress /
// useAssignmentProgress) and /api/study-buddy/progress — the generic
// /progress/{save,load,clear} endpoints this used to call never existed.
interface AutoSaveOptions {
  key: string;
  data: any;
  onSave?: (success: boolean) => void;
  debounceMs?: number;
}

export interface SaveStatus {
  status: "idle" | "saving" | "saved" | "error" | "offline";
  lastSavedAt?: string;
  error?: string;
}

export function useAutoSave({
  key,
  data,
  onSave,
  debounceMs = 1000,
}: AutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ status: "idle" });
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveToLocalStorage = useCallback(() => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          data: dataRef.current,
          timestamp: new Date().toISOString(),
        }),
      );
      return true;
    } catch (error) {
      console.error("localStorage save failed:", error);
      return false;
    }
  }, [key]);

  const performSave = useCallback(async () => {
    setSaveStatus({ status: "saving" });

    const localSaved = saveToLocalStorage();
    setSaveStatus({
      status: localSaved ? "saved" : "error",
      lastSavedAt: new Date().toISOString(),
    });
    onSave?.(localSaved);
  }, [saveToLocalStorage, onSave]);

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
    forceSave: performSave,
  };
}

export function useLoadProgress(key: string) {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const { data } = JSON.parse(saved);
        setProgress(data);
      }
    } catch (error) {
      console.error("localStorage load failed:", error);
    }
    setLoading(false);
  }, [key]);

  return { progress, loading };
}

export function clearProgress(key: string) {
  localStorage.removeItem(key);
}
