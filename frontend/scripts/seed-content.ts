/**
 * Sprint 5 Phase 3 — Seed demo content: announcements, assignments,
 * submissions, and course materials.
 *
 * Targets the demo slice: Ada Okonkwo's 200L first-semester 2025-2026
 * courses (COS201, COS203, COS205, MTH201, GST112) plus a few items
 * for Bisi (100L) and Chidi (300L) to round out the demo.
 *
 * Idempotent: skips rows when title+course_id already exists.
 *
 * Usage:  pnpm tsx scripts/seed-content.ts
 */

import "load-env";
import pg from "pg";

const DATABASE_URL = process.env.POSTGRES_URL;
if (!DATABASE_URL) throw new Error("POSTGRES_URL not set");

const isLocalhost = DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1");
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ...(isLocalhost ? {} : { ssl: { rejectUnauthorized: false } }),
});

// ──────────────────────────────────────────────
// Entity IDs — resolved dynamically at runtime
// ──────────────────────────────────────────────

const USERS: Record<string, string> = {};
const COURSES: Record<string, string> = {};

async function resolveIds(client: pg.PoolClient) {
  // Look up users by email
  const userMap: Record<string, string> = {
    admin:   "admin@miva.edu.ng",
    adebayo: "adebayo.olumide@miva.edu.ng",
    kemi:    "kemi.adesanya@miva.edu.ng",
    tunde:   "tunde.ogundimu@miva.edu.ng",
    funke:   "funke.okon@miva.edu.ng",
    ada:     "ada.okonkwo@miva.edu.ng",
    chidi:   "chidi.okeke@miva.edu.ng",
    bisi:    "bisi.adeyemi@miva.edu.ng",
  };

  const emails = Object.values(userMap);
  const userRows = await client.query(
    `SELECT id, email FROM "user" WHERE email = ANY($1)`,
    [emails],
  );
  const emailToId = new Map(userRows.rows.map((r: any) => [r.email, r.id]));

  for (const [key, email] of Object.entries(userMap)) {
    const id = emailToId.get(email);
    if (!id) throw new Error(`User not found: ${email} — run seed-demo-data and seed-students first`);
    USERS[key] = id;
  }
  console.log(`✅ Resolved ${Object.keys(USERS).length} user IDs`);

  // Look up courses by course_code
  const courseCodes = [
    "COS201", "COS203", "COS205", "MTH201", "GST112",
    "COS101", "MTH101",
    "COS301", "COS303", "COS305", "COS307",
  ];
  const courseRows = await client.query(
    `SELECT id, course_code FROM "course" WHERE course_code = ANY($1)`,
    [courseCodes],
  );
  for (const row of courseRows.rows) {
    COURSES[row.course_code] = row.id;
  }
  const missing = courseCodes.filter((c) => !COURSES[c]);
  if (missing.length > 0) {
    throw new Error(`Courses not found: ${missing.join(", ")} — run seed-majors-and-courses and seed-demo-data first`);
  }
  console.log(`✅ Resolved ${Object.keys(COURSES).length} course IDs`);
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const now = new Date();
function daysAgo(n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d;
}
function hoursAgo(n: number) {
  const d = new Date(now);
  d.setHours(d.getHours() - n);
  return d;
}

async function upsert(
  client: pg.PoolClient,
  table: string,
  uniqueCheck: { column: string; value: string }[],
  row: object,
): Promise<string | null> {
  // Check existence
  const whereClauses = uniqueCheck.map((c, i) => `"${c.column}" = $${i + 1}`).join(" AND ");
  const whereValues = uniqueCheck.map((c) => c.value);
  const existing = await client.query(
    `SELECT id FROM "${table}" WHERE ${whereClauses} LIMIT 1`,
    whereValues,
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const columns = Object.keys(row);
  const values = Object.values(row);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const colStr = columns.map((c) => `"${c}"`).join(", ");
  const result = await client.query(
    `INSERT INTO "${table}" (${colStr}) VALUES (${placeholders}) RETURNING id`,
    values,
  );
  return result.rows[0].id;
}

// ──────────────────────────────────────────────
// 1. ANNOUNCEMENTS
// ──────────────────────────────────────────────

interface AnnouncementRow {
  title: string;
  content: string;
  course_id: string | null;
  created_by_id: string;
  target_audience: string;
  priority: string;
  is_active: boolean;
  expires_at: Date | null;
  created_at: Date;
}

const getAnnouncements = (): AnnouncementRow[] => [
  // University-wide
  {
    title: "Welcome to the 2025/2026 Academic Session",
    content: "Dear students, welcome back! The first semester commences on Monday 15 September 2025. Please check your course registrations and ensure all fees are settled before the end of week 1.",
    course_id: null,
    created_by_id: USERS.admin,
    target_audience: "all",
    priority: "high",
    is_active: true,
    expires_at: daysFromNow(60),
    created_at: daysAgo(14),
  },
  {
    title: "Mid-Semester Break: 27 October – 2 November",
    content: "Please note the mid-semester break runs from Monday 27 October to Sunday 2 November. No lectures or assessments will be scheduled during this period. Use this time to review and catch up on coursework.",
    course_id: null,
    created_by_id: USERS.admin,
    target_audience: "all",
    priority: "medium",
    is_active: true,
    expires_at: daysFromNow(45),
    created_at: daysAgo(10),
  },
  {
    title: "Library System Upgrade – Brief Downtime Expected",
    content: "The university library management system will undergo scheduled maintenance on Saturday 18 October from 2:00 AM to 6:00 AM. Online catalogue and e-resources will be temporarily unavailable.",
    course_id: null,
    created_by_id: USERS.admin,
    target_audience: "all",
    priority: "medium",
    is_active: true,
    expires_at: daysFromNow(30),
    created_at: daysAgo(7),
  },
  // Course-specific
  {
    title: "First Assignment Posted – Due in 2 Weeks",
    content: "Programming Lab 1 (Hello World in Python) has been posted. Please submit via the portal before the deadline. Start early and visit office hours if you need help setting up your development environment.",
    course_id: COURSES.COS201,
    created_by_id: USERS.adebayo,
    target_audience: "course_specific",
    priority: "high",
    is_active: true,
    expires_at: daysFromNow(14),
    created_at: daysAgo(12),
  },
  {
    title: "Reminder: Read Chapters 1–3 Before Next Class",
    content: "Please complete the reading for Chapters 1–3 of the Rosen textbook (Sets, Logic, and Proofs) before our next lecture. We will have a short in-class quiz on the material.",
    course_id: COURSES.COS203,
    created_by_id: USERS.kemi,
    target_audience: "course_specific",
    priority: "medium",
    is_active: true,
    expires_at: daysFromNow(7),
    created_at: daysAgo(5),
  },
  {
    title: "Lab Session Moved to Tuesday Next Week",
    content: "Due to a scheduling conflict with the Engineering building, the Digital Logic Design lab session originally on Thursday has been moved to Tuesday 14:00–16:00 in Room ENG-204. Please update your schedules.",
    course_id: COURSES.COS205,
    created_by_id: USERS.adebayo,
    target_audience: "course_specific",
    priority: "high",
    is_active: true,
    expires_at: daysFromNow(7),
    created_at: daysAgo(3),
  },
  {
    title: "Practice Problems Uploaded for Week 2",
    content: "Additional practice problems for linear algebra (matrix operations and determinants) have been uploaded to the course materials section. These are not graded but strongly recommended for exam preparation.",
    course_id: COURSES.MTH201,
    created_by_id: USERS.funke,
    target_audience: "course_specific",
    priority: "medium",
    is_active: true,
    expires_at: null,
    created_at: daysAgo(4),
  },
  {
    title: "Cultural Day Event – All Students Welcome",
    content: "The Department of General Studies is organising a Cultural Day celebration on Friday 24 October. Students are encouraged to represent their cultural heritage through dress, food, or performance. Participation counts towards class engagement.",
    course_id: COURSES.GST112,
    created_by_id: USERS.funke,
    target_audience: "course_specific",
    priority: "medium",
    is_active: true,
    expires_at: daysFromNow(21),
    created_at: daysAgo(2),
  },
  {
    title: "Extra Revision Class – Saturday 10 AM",
    content: "An optional revision class will be held on Saturday at 10:00 AM in Lecture Hall 3 to go over matrix transformations. Bring your problem sets.",
    course_id: COURSES.MTH201,
    created_by_id: USERS.funke,
    target_audience: "course_specific",
    priority: "medium",
    is_active: true,
    expires_at: daysFromNow(5),
    created_at: daysAgo(1),
  },
  {
    title: "Guest Lecture: Introduction to AI in Software Engineering",
    content: "Dr. Emeka Nwosu from CypherCrescent will deliver a guest lecture on AI applications in software engineering this Wednesday at 2 PM in the CS auditorium. Attendance is optional but highly encouraged for all CS students.",
    course_id: COURSES.COS201,
    created_by_id: USERS.adebayo,
    target_audience: "course_specific",
    priority: "medium",
    is_active: true,
    expires_at: daysFromNow(5),
    created_at: daysAgo(1),
  },
];

// ──────────────────────────────────────────────
// 2. ASSIGNMENTS
// ──────────────────────────────────────────────

interface AssignmentRow {
  course_id: string;
  title: string;
  description: string;
  instructions: string;
  assignment_type: string;
  total_points: number;
  due_date: Date;
  submission_type: string;
  allow_late_submission: boolean;
  late_submission_penalty: number | null;
  week_number: number;
  is_published: boolean;
  created_by_id: string;
  created_at: Date;
}

const getAssignments = (): AssignmentRow[] => [
  // COS201
  {
    course_id: COURSES.COS201,
    title: "Programming Lab 1: Hello World",
    description: "Write a Python program that greets the user by name, performs basic arithmetic, and demonstrates string formatting.",
    instructions: "1. Create a file named hello.py\n2. Prompt the user for their name\n3. Print a greeting with their name\n4. Demonstrate at least 3 string formatting methods\n5. Include comments explaining each section\n6. Submit as a .zip file containing your source code and a screenshot of the output.",
    assignment_type: "lab",
    total_points: 100,
    due_date: daysAgo(5),
    submission_type: "file_upload",
    allow_late_submission: true,
    late_submission_penalty: 10,
    week_number: 2,
    is_published: true,
    created_by_id: USERS.adebayo,
    created_at: daysAgo(14),
  },
  {
    course_id: COURSES.COS201,
    title: "Programming Lab 2: Variables and Operators",
    description: "Build a simple calculator that handles integer and floating-point arithmetic with proper error handling.",
    instructions: "1. Create calculator.py\n2. Support +, -, *, /, and % operators\n3. Handle division by zero gracefully\n4. Accept user input in a loop until 'quit' is entered\n5. Include type conversion between int and float\n6. Submit as a .zip file.",
    assignment_type: "lab",
    total_points: 100,
    due_date: daysFromNow(7),
    submission_type: "file_upload",
    allow_late_submission: true,
    late_submission_penalty: 10,
    week_number: 4,
    is_published: true,
    created_by_id: USERS.adebayo,
    created_at: daysAgo(3),
  },
  // COS203
  {
    course_id: COURSES.COS203,
    title: "Discrete Math Problem Set 1",
    description: "Problem set covering propositional logic, truth tables, and logical equivalences from Chapters 1–2.",
    instructions: "Answer all 10 questions. Show all working clearly. For truth tables, include all intermediate columns. For proofs, state the rule applied at each step. Handwritten submissions must be legible; typed submissions preferred.",
    assignment_type: "homework",
    total_points: 100,
    due_date: daysAgo(3),
    submission_type: "file_upload",
    allow_late_submission: false,
    late_submission_penalty: null,
    week_number: 3,
    is_published: true,
    created_by_id: USERS.kemi,
    created_at: daysAgo(10),
  },
  {
    course_id: COURSES.COS203,
    title: "Truth Tables Worksheet",
    description: "Construct truth tables for compound propositions and determine logical equivalences.",
    instructions: "For each of the 8 propositions provided, construct a complete truth table. Identify which pairs are logically equivalent. Bonus: express each in CNF and DNF form.",
    assignment_type: "homework",
    total_points: 50,
    due_date: daysFromNow(10),
    submission_type: "file_upload",
    allow_late_submission: false,
    late_submission_penalty: null,
    week_number: 5,
    is_published: true,
    created_by_id: USERS.kemi,
    created_at: daysAgo(1),
  },
  // COS205
  {
    course_id: COURSES.COS205,
    title: "Logic Gates Lab Report",
    description: "Design and simulate basic logic gate circuits (AND, OR, NOT, NAND, XOR) using Logisim and submit a lab report.",
    instructions: "1. Download and install Logisim Evolution\n2. Build each of the 5 basic gates using transistor-level design\n3. Verify with truth tables for 2-input and 3-input variants\n4. Write a 2-page report describing your designs, include circuit screenshots\n5. Submit the .circ file and PDF report as a zip.",
    assignment_type: "lab",
    total_points: 100,
    due_date: daysFromNow(5),
    submission_type: "file_upload",
    allow_late_submission: true,
    late_submission_penalty: 15,
    week_number: 4,
    is_published: true,
    created_by_id: USERS.adebayo,
    created_at: daysAgo(5),
  },
  // MTH201
  {
    course_id: COURSES.MTH201,
    title: "Linear Algebra Problem Set 1",
    description: "Exercises on matrix operations, determinants, and systems of linear equations.",
    instructions: "Solve all 12 problems from the worksheet. Show complete working for each problem. For matrix operations, write out each step. For systems of equations, use both Gaussian elimination and Cramer's rule where applicable.",
    assignment_type: "homework",
    total_points: 100,
    due_date: daysAgo(7),
    submission_type: "file_upload",
    allow_late_submission: false,
    late_submission_penalty: null,
    week_number: 2,
    is_published: true,
    created_by_id: USERS.funke,
    created_at: daysAgo(14),
  },
  {
    course_id: COURSES.MTH201,
    title: "Matrix Operations Quiz",
    description: "Timed quiz on matrix multiplication, transposition, and inverse computation.",
    instructions: "This is a 45-minute timed quiz. Answer all 6 questions. No calculators allowed. You may use one A4 sheet of handwritten notes. Submit your answer sheet as a scanned PDF.",
    assignment_type: "quiz",
    total_points: 50,
    due_date: daysFromNow(14),
    submission_type: "file_upload",
    allow_late_submission: false,
    late_submission_penalty: null,
    week_number: 6,
    is_published: true,
    created_by_id: USERS.funke,
    created_at: daysAgo(1),
  },
  // GST112
  {
    course_id: COURSES.GST112,
    title: "Essay: Cultural Diversity in Nigeria",
    description: "Write a 1500-word essay exploring the role of cultural diversity in shaping Nigeria's national identity.",
    instructions: "Your essay should:\n1. Define cultural diversity in the Nigerian context\n2. Discuss at least 3 major ethnic groups and their contributions\n3. Analyse challenges and benefits of diversity\n4. Include at least 5 academic references (APA format)\n5. Submit as a Word document or PDF.",
    assignment_type: "essay",
    total_points: 100,
    due_date: daysFromNow(21),
    submission_type: "file_upload",
    allow_late_submission: true,
    late_submission_penalty: 5,
    week_number: 7,
    is_published: true,
    created_by_id: USERS.funke,
    created_at: daysAgo(2),
  },
  // 100L courses for Bisi
  {
    course_id: COURSES.COS101,
    title: "Introduction to Computing: Short Essay",
    description: "Write a 500-word essay on the history and evolution of computing, from Babbage to modern cloud computing.",
    instructions: "Cover at least 4 major milestones in computing history. Include proper citations. Submit as PDF.",
    assignment_type: "essay",
    total_points: 50,
    due_date: daysFromNow(12),
    submission_type: "file_upload",
    allow_late_submission: true,
    late_submission_penalty: 10,
    week_number: 3,
    is_published: true,
    created_by_id: USERS.adebayo,
    created_at: daysAgo(3),
  },
  {
    course_id: COURSES.MTH101,
    title: "Algebra Problem Set 1",
    description: "Exercises on polynomials, inequalities, and basic set theory from Chapters 1–2.",
    instructions: "Solve all 15 problems. Show full working. For set problems, use Venn diagrams where appropriate.",
    assignment_type: "homework",
    total_points: 100,
    due_date: daysFromNow(9),
    submission_type: "file_upload",
    allow_late_submission: false,
    late_submission_penalty: null,
    week_number: 3,
    is_published: true,
    created_by_id: USERS.funke,
    created_at: daysAgo(2),
  },
  // 300L course for Chidi
  {
    course_id: COURSES.COS301,
    title: "Algorithm Analysis: Divide and Conquer",
    description: "Implement and analyse three divide-and-conquer algorithms: merge sort, quick sort, and binary search with performance benchmarks.",
    instructions: "1. Implement all three algorithms in Python or Java\n2. Run benchmarks on arrays of size 100, 1000, 10000, 100000\n3. Plot time complexity graphs\n4. Write a 1-page analysis comparing empirical vs theoretical complexity\n5. Submit code + report as zip.",
    assignment_type: "lab",
    total_points: 100,
    due_date: daysFromNow(8),
    submission_type: "file_upload",
    allow_late_submission: true,
    late_submission_penalty: 10,
    week_number: 4,
    is_published: true,
    created_by_id: USERS.kemi,
    created_at: daysAgo(4),
  },
  {
    course_id: COURSES.COS303,
    title: "Database Design: ER Diagram",
    description: "Design an Entity-Relationship diagram for a university course management system.",
    instructions: "1. Identify at least 8 entities with attributes\n2. Define relationships with cardinality\n3. Normalise to 3NF\n4. Use standard ER notation\n5. Submit as PDF (hand-drawn or software-generated).",
    assignment_type: "homework",
    total_points: 100,
    due_date: daysFromNow(6),
    submission_type: "file_upload",
    allow_late_submission: false,
    late_submission_penalty: null,
    week_number: 3,
    is_published: true,
    created_by_id: USERS.tunde,
    created_at: daysAgo(5),
  },
];

// ──────────────────────────────────────────────
// 3. SUBMISSIONS
// ──────────────────────────────────────────────

// Ada's submissions — keyed by assignment title so we can resolve IDs after insert
interface SubmissionSpec {
  assignment_title: string;
  student_id: string;
  submission_text: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  grade: number | null;
  feedback: string | null;
  is_late_submission: boolean;
  submitted_at: Date;
  graded_at: Date | null;
  graded_by_id: string | null;
}

const getSubmissions = (): SubmissionSpec[] => [
  // Ada — COS201 Lab 1 (graded)
  {
    assignment_title: "Programming Lab 1: Hello World",
    student_id: USERS.ada,
    submission_text: null,
    file_url: "s3://miva-university-content/submissions/ada-okonkwo/cos201-lab1-hello-world.zip",
    file_name: "cos201-lab1-hello-world.zip",
    file_size: 24576,
    mime_type: "application/zip",
    grade: 92,
    feedback: "Excellent work! Well-commented code and proper structure. Your string formatting examples were creative. Minor: consider using f-strings consistently instead of mixing .format() and %.",
    is_late_submission: false,
    submitted_at: daysAgo(6),
    graded_at: daysAgo(3),
    graded_by_id: USERS.adebayo,
  },
  // Ada — COS203 Problem Set 1 (graded)
  {
    assignment_title: "Discrete Math Problem Set 1",
    student_id: USERS.ada,
    submission_text: null,
    file_url: "s3://miva-university-content/submissions/ada-okonkwo/cos203-pset1-logic.pdf",
    file_name: "cos203-pset1-logic.pdf",
    file_size: 512000,
    mime_type: "application/pdf",
    grade: 85,
    feedback: "Good effort overall. Your truth tables are correct. Review the proof technique for logical equivalence in section 2.3 — you used an informal argument where a formal derivation was expected. Questions 7 and 9 had minor errors.",
    is_late_submission: false,
    submitted_at: daysAgo(4),
    graded_at: daysAgo(2),
    graded_by_id: USERS.kemi,
  },
  // Ada — MTH201 Problem Set 1 (graded)
  {
    assignment_title: "Linear Algebra Problem Set 1",
    student_id: USERS.ada,
    submission_text: null,
    file_url: "s3://miva-university-content/submissions/ada-okonkwo/mth201-pset1-matrices.pdf",
    file_name: "mth201-pset1-matrices.pdf",
    file_size: 384000,
    mime_type: "application/pdf",
    grade: 78,
    feedback: "Decent work. Watch out for sign errors in matrix operations — you lost marks on Q4 and Q8 due to arithmetic mistakes in determinant calculations. Your Gaussian elimination steps are well laid out. Review Cramer's rule for 4×4 systems.",
    is_late_submission: false,
    submitted_at: daysAgo(8),
    graded_at: daysAgo(5),
    graded_by_id: USERS.funke,
  },
  // Ada — COS201 Lab 2 (submitted, pending)
  {
    assignment_title: "Programming Lab 2: Variables and Operators",
    student_id: USERS.ada,
    submission_text: null,
    file_url: "s3://miva-university-content/submissions/ada-okonkwo/cos201-lab2-calculator.zip",
    file_name: "cos201-lab2-calculator.zip",
    file_size: 32768,
    mime_type: "application/zip",
    grade: null,
    feedback: null,
    is_late_submission: false,
    submitted_at: daysAgo(1),
    graded_at: null,
    graded_by_id: null,
  },
  // Ada — COS203 Truth Tables (submitted, pending)
  {
    assignment_title: "Truth Tables Worksheet",
    student_id: USERS.ada,
    submission_text: null,
    file_url: "s3://miva-university-content/submissions/ada-okonkwo/cos203-truth-tables.pdf",
    file_name: "cos203-truth-tables.pdf",
    file_size: 256000,
    mime_type: "application/pdf",
    grade: null,
    feedback: null,
    is_late_submission: false,
    submitted_at: hoursAgo(2),
    graded_at: null,
    graded_by_id: null,
  },
  // Chidi — COS301 Divide and Conquer (submitted, pending)
  {
    assignment_title: "Algorithm Analysis: Divide and Conquer",
    student_id: USERS.chidi,
    submission_text: null,
    file_url: "s3://miva-university-content/submissions/chidi-okeke/cos301-divide-conquer.zip",
    file_name: "cos301-divide-conquer.zip",
    file_size: 65536,
    mime_type: "application/zip",
    grade: null,
    feedback: null,
    is_late_submission: false,
    submitted_at: daysAgo(1),
    graded_at: null,
    graded_by_id: null,
  },
  // Chidi — COS303 ER Diagram (submitted, pending)
  {
    assignment_title: "Database Design: ER Diagram",
    student_id: USERS.chidi,
    submission_text: null,
    file_url: "s3://miva-university-content/submissions/chidi-okeke/cos303-er-diagram.pdf",
    file_name: "cos303-er-diagram.pdf",
    file_size: 1048576,
    mime_type: "application/pdf",
    grade: null,
    feedback: null,
    is_late_submission: false,
    submitted_at: daysAgo(2),
    graded_at: null,
    graded_by_id: null,
  },
];

// ──────────────────────────────────────────────
// 4. COURSE MATERIALS
// ──────────────────────────────────────────────

interface MaterialRow {
  course_id: string;
  material_type: string;
  title: string;
  description: string;
  content_url: string;
  public_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  week_number: number;
  is_public: boolean;
  uploaded_by_id: string;
}

const getMaterials = (): MaterialRow[] => [
  // ── COS201: Computer Programming I ──
  {
    course_id: COURSES.COS201,
    material_type: "lecture",
    title: "Python for Beginners – Full Course (freeCodeCamp)",
    description: "Comprehensive 4-hour video covering Python basics, variables, data types, control flow, and functions. Watch sections 1–3 for weeks 1–2.",
    content_url: "https://www.youtube.com/watch?v=rfscVS0vtbw",
    public_url: "https://www.youtube.com/watch?v=rfscVS0vtbw",
    file_name: null,
    file_size: null,
    mime_type: "video/mp4",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.adebayo,
  },
  {
    course_id: COURSES.COS201,
    material_type: "lecture",
    title: "CS50 Lecture 1: Scratch – Introduction to Programming Concepts",
    description: "Harvard CS50 introductory lecture covering computational thinking, algorithms, and pseudocode. Good foundation before diving into Python.",
    content_url: "https://www.youtube.com/watch?v=3LPJfIKxwWc",
    public_url: "https://www.youtube.com/watch?v=3LPJfIKxwWc",
    file_name: null,
    file_size: null,
    mime_type: "video/mp4",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.adebayo,
  },
  {
    course_id: COURSES.COS201,
    material_type: "reading",
    title: "Think Python 2e – Chapters 1–4 (Free Online Textbook)",
    description: "Open-access textbook by Allen B. Downey. Covers values, variables, statements, functions, and interface design. Required reading for weeks 1–3.",
    content_url: "https://greenteapress.com/thinkpython2/html/index.html",
    public_url: "https://greenteapress.com/thinkpython2/html/index.html",
    file_name: null,
    file_size: null,
    mime_type: "text/html",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.adebayo,
  },
  {
    course_id: COURSES.COS201,
    material_type: "syllabus",
    title: "COS201 Course Syllabus – First Semester 2025/2026",
    description: "Complete course outline including weekly topics, assessment breakdown, office hours, and required textbooks.",
    content_url: "s3://miva-university-content/syllabi/cos201-syllabus-2025-2026.pdf",
    public_url: null,
    file_name: "cos201-syllabus-2025-2026.pdf",
    file_size: 156000,
    mime_type: "application/pdf",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.adebayo,
  },

  // ── COS203: Discrete Structures ──
  {
    course_id: COURSES.COS203,
    material_type: "lecture",
    title: "Discrete Mathematics – MIT OpenCourseWare Lecture 1",
    description: "MIT 6.042J Mathematics for Computer Science. Covers proofs, induction, and number theory. Excellent supplement to the Rosen textbook.",
    content_url: "https://www.youtube.com/watch?v=L3LMbpZIKhQ",
    public_url: "https://www.youtube.com/watch?v=L3LMbpZIKhQ",
    file_name: null,
    file_size: null,
    mime_type: "video/mp4",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.kemi,
  },
  {
    course_id: COURSES.COS203,
    material_type: "lecture",
    title: "Truth Tables and Logical Equivalences Explained",
    description: "Clear walkthrough of constructing truth tables for compound propositions and verifying logical equivalences. Directly relevant to Problem Set 1.",
    content_url: "https://www.youtube.com/watch?v=UiGu57JzLkE",
    public_url: "https://www.youtube.com/watch?v=UiGu57JzLkE",
    file_name: null,
    file_size: null,
    mime_type: "video/mp4",
    week_number: 3,
    is_public: true,
    uploaded_by_id: USERS.kemi,
  },
  {
    course_id: COURSES.COS203,
    material_type: "reading",
    title: "Discrete Mathematics and Its Applications (Rosen) – Chapter 1 Summary",
    description: "Professor-curated summary notes for Chapter 1: The Foundations — Logic and Proofs. Print-friendly PDF.",
    content_url: "s3://miva-university-content/readings/cos203-ch1-summary.pdf",
    public_url: null,
    file_name: "cos203-ch1-summary.pdf",
    file_size: 89000,
    mime_type: "application/pdf",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.kemi,
  },
  {
    course_id: COURSES.COS203,
    material_type: "reading",
    title: "Introduction to Mathematical Proofs – A Transition to Advanced Mathematics",
    description: "Supplementary PDF covering proof techniques: direct, contrapositive, contradiction, and induction. Useful reference for all coursework.",
    content_url: "https://www.people.vcu.edu/~rhammack/BookOfProof/BookOfProof.pdf",
    public_url: "https://www.people.vcu.edu/~rhammack/BookOfProof/BookOfProof.pdf",
    file_name: null,
    file_size: null,
    mime_type: "application/pdf",
    week_number: 2,
    is_public: true,
    uploaded_by_id: USERS.kemi,
  },
  {
    course_id: COURSES.COS203,
    material_type: "syllabus",
    title: "COS203 Course Syllabus – First Semester 2025/2026",
    description: "Course outline covering sets, logic, proofs, relations, functions, counting, and graph theory. Includes assessment scheme.",
    content_url: "s3://miva-university-content/syllabi/cos203-syllabus-2025-2026.pdf",
    public_url: null,
    file_name: "cos203-syllabus-2025-2026.pdf",
    file_size: 142000,
    mime_type: "application/pdf",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.kemi,
  },

  // ── COS205: Digital Logic Design ──
  {
    course_id: COURSES.COS205,
    material_type: "lecture",
    title: "Digital Logic Design – Neso Academy: Boolean Algebra",
    description: "Video series on Boolean algebra fundamentals, logic gates, and simplification using Karnaugh maps. Covers weeks 1–4 of the course.",
    content_url: "https://www.youtube.com/watch?v=M0mx8S05v60",
    public_url: "https://www.youtube.com/watch?v=M0mx8S05v60",
    file_name: null,
    file_size: null,
    mime_type: "video/mp4",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.adebayo,
  },
  {
    course_id: COURSES.COS205,
    material_type: "lecture",
    title: "Build a Computer from Scratch – Nand2Tetris Part 1",
    description: "Project-based course building a modern computer from first principles. Excellent companion to the lab component of COS205.",
    content_url: "https://www.youtube.com/watch?v=wTl5wRDT0CU",
    public_url: "https://www.youtube.com/watch?v=wTl5wRDT0CU",
    file_name: null,
    file_size: null,
    mime_type: "video/mp4",
    week_number: 3,
    is_public: true,
    uploaded_by_id: USERS.adebayo,
  },
  {
    course_id: COURSES.COS205,
    material_type: "reading",
    title: "Logisim Evolution User Guide",
    description: "Official documentation for the Logisim circuit simulator. Required for lab assignments — install before the first lab session.",
    content_url: "https://github.com/logisim-evolution/logisim-evolution/releases",
    public_url: "https://github.com/logisim-evolution/logisim-evolution/releases",
    file_name: null,
    file_size: null,
    mime_type: "text/html",
    week_number: 2,
    is_public: true,
    uploaded_by_id: USERS.adebayo,
  },
  {
    course_id: COURSES.COS205,
    material_type: "syllabus",
    title: "COS205 Course Syllabus – First Semester 2025/2026",
    description: "Course outline covering number systems, Boolean algebra, logic gates, combinational circuits, sequential circuits, and memory elements.",
    content_url: "s3://miva-university-content/syllabi/cos205-syllabus-2025-2026.pdf",
    public_url: null,
    file_name: "cos205-syllabus-2025-2026.pdf",
    file_size: 128000,
    mime_type: "application/pdf",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.adebayo,
  },

  // ── MTH201: Mathematical Methods I ──
  {
    course_id: COURSES.MTH201,
    material_type: "lecture",
    title: "Essence of Linear Algebra – 3Blue1Brown (Full Series)",
    description: "Beautiful visual series on vectors, linear transformations, matrices, determinants, and eigenvalues. Highly recommended for building intuition.",
    content_url: "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    public_url: "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    file_name: null,
    file_size: null,
    mime_type: "video/mp4",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.funke,
  },
  {
    course_id: COURSES.MTH201,
    material_type: "lecture",
    title: "Khan Academy: Matrix Multiplication",
    description: "Step-by-step walkthrough of matrix multiplication with worked examples. Good refresher before attempting Problem Set 1.",
    content_url: "https://www.youtube.com/watch?v=OMA2Mwo0aZg",
    public_url: "https://www.youtube.com/watch?v=OMA2Mwo0aZg",
    file_name: null,
    file_size: null,
    mime_type: "video/mp4",
    week_number: 2,
    is_public: true,
    uploaded_by_id: USERS.funke,
  },
  {
    course_id: COURSES.MTH201,
    material_type: "reading",
    title: "Linear Algebra – Jim Hefferon (Free Textbook, Chapters 1–2)",
    description: "Open-source textbook covering linear systems, vector spaces, and maps between spaces. Chapters 1–2 align with weeks 1–4 of this course.",
    content_url: "https://hefferon.net/linearalgebra/",
    public_url: "https://hefferon.net/linearalgebra/",
    file_name: null,
    file_size: null,
    mime_type: "text/html",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.funke,
  },
  {
    course_id: COURSES.MTH201,
    material_type: "resource",
    title: "MTH201 Practice Problems – Weeks 1–2",
    description: "Additional practice problems on matrix operations, determinants, and linear systems. Not graded but strongly recommended for exam preparation.",
    content_url: "s3://miva-university-content/resources/mth201-practice-w1-w2.pdf",
    public_url: null,
    file_name: "mth201-practice-w1-w2.pdf",
    file_size: 67000,
    mime_type: "application/pdf",
    week_number: 2,
    is_public: true,
    uploaded_by_id: USERS.funke,
  },
  {
    course_id: COURSES.MTH201,
    material_type: "syllabus",
    title: "MTH201 Course Syllabus – First Semester 2025/2026",
    description: "Course outline covering real analysis, linear algebra, vector calculus, and ordinary differential equations. Includes grading rubric.",
    content_url: "s3://miva-university-content/syllabi/mth201-syllabus-2025-2026.pdf",
    public_url: null,
    file_name: "mth201-syllabus-2025-2026.pdf",
    file_size: 134000,
    mime_type: "application/pdf",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.funke,
  },

  // ── GST112: Nigerian People and Culture ──
  {
    course_id: COURSES.GST112,
    material_type: "lecture",
    title: "Nigeria's Cultural Heritage – Documentary (NTA)",
    description: "Documentary exploring Nigeria's diverse cultural landscape, covering the major ethnic groups, traditions, festivals, and their significance in modern Nigeria.",
    content_url: "https://www.youtube.com/watch?v=kx1P-U4cMjA",
    public_url: "https://www.youtube.com/watch?v=kx1P-U4cMjA",
    file_name: null,
    file_size: null,
    mime_type: "video/mp4",
    week_number: 2,
    is_public: true,
    uploaded_by_id: USERS.funke,
  },
  {
    course_id: COURSES.GST112,
    material_type: "reading",
    title: "Nigeria: A Country Study (Library of Congress)",
    description: "Comprehensive reference on Nigeria's history, society, economy, and culture. Chapters on ethnic groups and cultural institutions are most relevant.",
    content_url: "https://www.loc.gov/item/2008027628/",
    public_url: "https://www.loc.gov/item/2008027628/",
    file_name: null,
    file_size: null,
    mime_type: "text/html",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.funke,
  },
  {
    course_id: COURSES.GST112,
    material_type: "reading",
    title: "Essay Writing Guide – Academic Style and APA Formatting",
    description: "Guide to academic essay writing with examples of proper APA citation format. Essential reading before the Cultural Diversity essay assignment.",
    content_url: "s3://miva-university-content/readings/gst112-essay-guide.pdf",
    public_url: null,
    file_name: "gst112-essay-guide.pdf",
    file_size: 45000,
    mime_type: "application/pdf",
    week_number: 5,
    is_public: true,
    uploaded_by_id: USERS.funke,
  },
  {
    course_id: COURSES.GST112,
    material_type: "syllabus",
    title: "GST112 Course Syllabus – First Semester 2025/2026",
    description: "Course outline covering Nigerian peoples, cultural practices, national integration, citizenship, and inter-group relations.",
    content_url: "s3://miva-university-content/syllabi/gst112-syllabus-2025-2026.pdf",
    public_url: null,
    file_name: "gst112-syllabus-2025-2026.pdf",
    file_size: 98000,
    mime_type: "application/pdf",
    week_number: 1,
    is_public: true,
    uploaded_by_id: USERS.funke,
  },
];

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {
    // Resolve all entity IDs dynamically before using them
    await resolveIds(client);

    await client.query("BEGIN");

    // 1. Announcements
    const ANNOUNCEMENTS = getAnnouncements();
    let announcementsCreated = 0;
    for (const a of ANNOUNCEMENTS) {
      const check = a.course_id
        ? [
            { column: "title", value: a.title },
            { column: "course_id", value: a.course_id },
          ]
        : [
            { column: "title", value: a.title },
            { column: "target_audience", value: a.target_audience },
          ];
      const id = await upsert(client, "announcement", check, a);
      if (id) announcementsCreated++;
    }
    console.log(`Announcements: ${announcementsCreated} upserted (${ANNOUNCEMENTS.length} defined)`);

    // 2. Assignments — track title→ID for submissions
    const ASSIGNMENTS = getAssignments();
    const assignmentIds: Record<string, string> = {};
    let assignmentsCreated = 0;
    for (const a of ASSIGNMENTS) {
      const id = await upsert(
        client,
        "assignment",
        [
          { column: "title", value: a.title },
          { column: "course_id", value: a.course_id },
        ],
        a,
      );
      if (id) {
        assignmentIds[a.title] = id;
        assignmentsCreated++;
      }
    }
    console.log(`Assignments: ${assignmentsCreated} upserted (${ASSIGNMENTS.length} defined)`);

    // 3. Submissions
    const SUBMISSIONS = getSubmissions();
    let submissionsCreated = 0;
    for (const s of SUBMISSIONS) {
      const assignmentId = assignmentIds[s.assignment_title];
      if (!assignmentId) {
        console.warn(`  ⚠ Assignment not found for submission: ${s.assignment_title}`);
        continue;
      }
      const row: Record<string, unknown> = {
        assignment_id: assignmentId,
        student_id: s.student_id,
        submission_text: s.submission_text,
        file_url: s.file_url,
        file_name: s.file_name,
        file_size: s.file_size,
        mime_type: s.mime_type,
        grade: s.grade,
        feedback: s.feedback,
        is_late_submission: s.is_late_submission,
        submitted_at: s.submitted_at,
        graded_at: s.graded_at,
        graded_by_id: s.graded_by_id,
      };
      const id = await upsert(
        client,
        "assignment_submission",
        [
          { column: "assignment_id", value: assignmentId },
          { column: "student_id", value: s.student_id },
        ],
        row,
      );
      if (id) submissionsCreated++;
    }
    console.log(`Submissions: ${submissionsCreated} upserted (${SUBMISSIONS.length} defined)`);

    // 4. Course materials
    const MATERIALS = getMaterials();
    let materialsCreated = 0;
    for (const m of MATERIALS) {
      const id = await upsert(
        client,
        "course_material",
        [
          { column: "title", value: m.title },
          { column: "course_id", value: m.course_id },
        ],
        m,
      );
      if (id) materialsCreated++;
    }
    console.log(`Materials: ${materialsCreated} upserted (${MATERIALS.length} defined)`);

    await client.query("COMMIT");
    console.log("\n✓ All content seeded successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
