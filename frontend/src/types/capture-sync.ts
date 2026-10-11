/** One course in a student's automatic capture run (stored in capture_sync). */
export type CaptureSyncCourse = {
  lmsId: number;
  code: string;
  title: string;
  /** capture: in the student's Askly courses; waiting: needs an admin to add it */
  status: "capture" | "waiting";
  total: number;
  captured: number;
  skipped: number;
  failed: number;
  done: boolean;
};
