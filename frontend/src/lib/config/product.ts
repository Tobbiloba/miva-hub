/**
 * Product-shape flags.
 *
 * CHAT_FIRST hides the university-management (SIS) surface so Askly reads as one
 * grounded chat — "ChatGPT for students." Nothing is deleted: the routes still
 * exist, they're just not linked. Reversible at runtime by setting
 * NEXT_PUBLIC_CHAT_FIRST=false to restore the full-platform navigation.
 *
 * Default: chat-first ON.
 */
export const CHAT_FIRST = process.env.NEXT_PUBLIC_CHAT_FIRST !== "false";

/**
 * The student launch surface (docs/PRODUCT-FOCUS.md). With CHAT_FIRST on, a
 * student gets the chat plus these pages; every other /student page is
 * archived (redirects to the chat) and its feature API answers 404. Archived
 * code and tables stay, so turning a feature back on is a list edit here.
 */
export const STUDENT_PAGES = [
  { title: "My Courses", href: "/student/courses" },
  { title: "Deadlines", href: "/student/deadlines" },
  { title: "Flashcards", href: "/student/flashcards" },
] as const;

/** /student paths that stay open: the nav pages above plus their sub-pages. */
const STUDENT_OPEN_PREFIXES = [
  ...STUDENT_PAGES.map((p) => p.href),
  // Material viewer, opened from My Courses, deadlines and chat citations
  "/student/lecture-study",
  // Lecturer assignment detail/submit, opened from Deadlines
  "/student/assignments",
];

/** APIs whose only callers are archived student features. */
const ARCHIVED_API_PREFIXES = [
  "/api/student/viva",
  "/api/student/professor",
  "/api/student/credentials",
  "/api/student/whatsapp",
  "/api/student/plan",
  "/api/student/dashboard",
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isArchivedStudentPage(pathname: string): boolean {
  if (!CHAT_FIRST || !matchesPrefix(pathname, "/student")) return false;
  return !STUDENT_OPEN_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

export function isArchivedApi(pathname: string): boolean {
  if (!CHAT_FIRST) return false;
  return ARCHIVED_API_PREFIXES.some((p) => matchesPrefix(pathname, p));
}
