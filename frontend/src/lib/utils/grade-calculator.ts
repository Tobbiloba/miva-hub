/**
 * Grade Calculation Engine for MIVA University
 *
 * Nigerian University Grading System (5.0 scale):
 *   A  = 70-100  → 5.0 grade points
 *   B  = 60-69   → 4.0
 *   C  = 50-59   → 3.0
 *   D  = 45-49   → 2.0
 *   E  = 40-44   → 1.0
 *   F  = 0-39    → 0.0
 *
 * Degree Classification:
 *   First Class          → CGPA >= 4.50
 *   Second Class Upper   → CGPA >= 3.50
 *   Second Class Lower   → CGPA >= 2.40
 *   Third Class          → CGPA >= 1.50
 *   Pass                 → CGPA >= 1.00
 *   Fail                 → CGPA <  1.00
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradeEntry {
  points: number;
  totalPoints: number;
  creditHours?: number;
  weight?: number;
}

export interface CourseGrade {
  courseId: string;
  courseCode: string;
  courseName: string;
  creditHours: number;
  letterGrade: string;
  gradePoints: number;
  percentage: number;
  assignments: GradeEntry[];
}

export interface GPACalculation {
  gpa: number;
  totalCreditHours: number;
  totalGradePoints: number;
  semesterGPA?: number;
  cumulativeGPA?: number;
}

export interface GradeDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
  totalStudents: number;
}

export type LetterGrade = "A" | "B" | "C" | "D" | "E" | "F";

export type DegreeClassification =
  | "First Class"
  | "Second Class Upper"
  | "Second Class Lower"
  | "Third Class"
  | "Pass"
  | "Fail";

// ─── Nigerian Grading Scale ───────────────────────────────────────────────────

/**
 * Nigerian University Grading Scale (5-point system)
 */
export const GRADING_SCALE: Record<LetterGrade, { min: number; max: number; points: number }> = {
  A: { min: 70, max: 100, points: 5.0 },
  B: { min: 60, max: 69, points: 4.0 },
  C: { min: 50, max: 59, points: 3.0 },
  D: { min: 45, max: 49, points: 2.0 },
  E: { min: 40, max: 44, points: 1.0 },
  F: { min: 0, max: 39, points: 0.0 },
};

// ─── Core Conversion Functions ────────────────────────────────────────────────

/**
 * Convert a percentage score to a letter grade.
 * @param score - Percentage (0-100)
 * @returns Letter grade: A, B, C, D, E, or F
 */
export function scoreToLetter(score: number): LetterGrade {
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
}

/**
 * Convert a letter grade to its grade point value (5.0 scale).
 * @param letter - Letter grade (A/B/C/D/E/F)
 * @returns Grade points: 5.0, 4.0, 3.0, 2.0, 1.0, or 0.0
 */
export function letterToGradePoint(letter: string): number {
  const entry = GRADING_SCALE[letter.toUpperCase() as LetterGrade];
  return entry?.points ?? 0.0;
}

/**
 * Convert a percentage score directly to grade points.
 * @param score - Percentage (0-100)
 * @returns Grade points on 5.0 scale
 */
export function scoreToGradePoint(score: number): number {
  return letterToGradePoint(scoreToLetter(score));
}

// ─── Backward-compatible aliases (used by student pages) ──────────────────────

/** Alias for scoreToLetter — used by existing pages */
export function percentageToLetterGrade(percentage: number): string {
  return scoreToLetter(percentage);
}

/** Alias for scoreToGradePoint — used by existing pages */
export function percentageToGradePoints(percentage: number): number {
  return scoreToGradePoint(percentage);
}

/** Alias for letterToGradePoint */
export function letterGradeToGradePoints(letterGrade: string): number {
  return letterToGradePoint(letterGrade);
}

// ─── GPA Calculation ──────────────────────────────────────────────────────────

/**
 * Calculate GPA for a set of courses (credit-weighted average of grade points).
 * @param courses - Array of CourseGrade objects
 * @returns GPA calculation result
 */
export function calculateGPA(courses: CourseGrade[]): GPACalculation {
  if (courses.length === 0) {
    return { gpa: 0, totalCreditHours: 0, totalGradePoints: 0 };
  }

  let totalGradePoints = 0;
  let totalCreditHours = 0;

  for (const course of courses) {
    totalGradePoints += course.gradePoints * course.creditHours;
    totalCreditHours += course.creditHours;
  }

  const gpa = totalCreditHours > 0 ? totalGradePoints / totalCreditHours : 0;

  return {
    gpa: Math.round(gpa * 100) / 100,
    totalCreditHours,
    totalGradePoints,
  };
}

/**
 * Calculate semester GPA and cumulative GPA.
 * @param currentSemesterCourses - Current semester courses
 * @param allCourses - All completed courses
 * @returns GPA with semester + cumulative breakdown
 */
export function calculateSemesterGPA(
  currentSemesterCourses: CourseGrade[],
  allCourses: CourseGrade[]
): GPACalculation {
  const semesterGPA = calculateGPA(currentSemesterCourses);
  const cumulativeGPA = calculateGPA(allCourses);

  return {
    gpa: cumulativeGPA.gpa,
    totalCreditHours: cumulativeGPA.totalCreditHours,
    totalGradePoints: cumulativeGPA.totalGradePoints,
    semesterGPA: semesterGPA.gpa,
    cumulativeGPA: cumulativeGPA.gpa,
  };
}

/**
 * Calculate cumulative GPA from enrollment records.
 * @param enrollments - Array of { gradePoints: number, credits: number }
 * @returns CGPA on 5.0 scale
 */
export function calculateCumulativeGPA(
  enrollments: { gradePoints: number; credits: number }[]
): number {
  if (enrollments.length === 0) return 0;

  let totalWeighted = 0;
  let totalCredits = 0;

  for (const e of enrollments) {
    totalWeighted += e.gradePoints * e.credits;
    totalCredits += e.credits;
  }

  return totalCredits > 0 ? Math.round((totalWeighted / totalCredits) * 100) / 100 : 0;
}

// ─── Degree Classification ────────────────────────────────────────────────────

/**
 * Classify degree based on cumulative GPA (Nigerian system).
 * @param cgpa - Cumulative GPA on 5.0 scale
 * @returns Degree classification string
 */
export function classifyDegree(cgpa: number): DegreeClassification {
  if (cgpa >= 4.50) return "First Class";
  if (cgpa >= 3.50) return "Second Class Upper";
  if (cgpa >= 2.40) return "Second Class Lower";
  if (cgpa >= 1.50) return "Third Class";
  if (cgpa >= 1.00) return "Pass";
  return "Fail";
}

// ─── Academic Standing ────────────────────────────────────────────────────────

/**
 * Calculate academic standing based on GPA (Nigerian thresholds on 5.0 scale).
 * @param gpa - Current GPA (0-5.0)
 * @param creditHours - Total credit hours enrolled
 */
export function calculateAcademicStanding(gpa: number, creditHours: number): {
  standing: string;
  description: string;
  warning?: string;
} {
  if (creditHours < 12) {
    return {
      standing: "Part-Time",
      description: "Enrolled in less than 12 credit hours",
    };
  }

  if (gpa >= 4.50) {
    return {
      standing: "Dean's List",
      description: "Outstanding academic performance (First Class standing)",
    };
  }

  if (gpa >= 3.50) {
    return {
      standing: "Good Standing",
      description: "Strong academic performance (Second Class Upper)",
    };
  }

  if (gpa >= 2.40) {
    return {
      standing: "Satisfactory",
      description: "Meeting minimum academic requirements",
    };
  }

  if (gpa >= 1.50) {
    return {
      standing: "Academic Warning",
      description: "Below expected academic performance",
      warning: "GPA below 2.40 — consider academic support resources",
    };
  }

  return {
    standing: "Academic Probation",
    description: "Serious academic difficulty",
    warning: "GPA below 1.50 — immediate intervention required",
  };
}

// ─── Degree Progress ──────────────────────────────────────────────────────────

/**
 * Calculate progress toward degree completion.
 * @param completedCreditHours - Credits completed
 * @param totalRequiredHours - Total credits required for degree
 * @param currentGPA - Current cumulative GPA (5.0 scale)
 */
export function calculateDegreeProgress(
  completedCreditHours: number,
  totalRequiredHours: number,
  currentGPA: number
): {
  percentageComplete: number;
  remainingHours: number;
  estimatedSemestersRemaining: number;
  onTrackForGraduation: boolean;
  minGPAForGraduation: number;
} {
  const percentageComplete = (completedCreditHours / totalRequiredHours) * 100;
  const remainingHours = Math.max(0, totalRequiredHours - completedCreditHours);
  const estimatedSemestersRemaining = Math.ceil(remainingHours / 18); // ~18 credits per semester typical in Nigerian unis
  const minGPAForGraduation = 1.00; // Minimum CGPA to graduate (Pass)

  return {
    percentageComplete: Math.round(percentageComplete * 100) / 100,
    remainingHours,
    estimatedSemestersRemaining,
    onTrackForGraduation: currentGPA >= minGPAForGraduation,
    minGPAForGraduation,
  };
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Calculate weighted average for assignments.
 * @param grades - Array of grade entries with weights
 * @returns Weighted percentage (0-100)
 */
export function calculateWeightedAverage(grades: GradeEntry[]): number {
  if (grades.length === 0) return 0;

  let totalWeightedPoints = 0;
  let totalWeight = 0;

  for (const grade of grades) {
    const percentage = (grade.points / grade.totalPoints) * 100;
    const weight = grade.weight || 1;
    totalWeightedPoints += percentage * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalWeightedPoints / totalWeight : 0;
}

/**
 * Calculate grade distribution for a set of scores.
 * @param percentages - Array of grade percentages
 * @returns Grade distribution breakdown (A through F)
 */
export function calculateGradeDistribution(percentages: number[]): GradeDistribution {
  const distribution: GradeDistribution = {
    A: 0, B: 0, C: 0, D: 0, E: 0, F: 0,
    totalStudents: percentages.length,
  };

  for (const pct of percentages) {
    const letter = scoreToLetter(pct);
    distribution[letter]++;
  }

  return distribution;
}

/**
 * Calculate course final grade from assignments.
 * @param assignments - Array of assignment grades
 * @param courseSettings - Optional: drop lowest, extra credit, curve
 */
export function calculateCourseFinalGrade(
  assignments: GradeEntry[],
  courseSettings?: {
    dropLowest?: number;
    extraCredit?: number;
    curve?: number;
  }
): { percentage: number; letterGrade: string; gradePoints: number } {
  if (assignments.length === 0) {
    return { percentage: 0, letterGrade: "F", gradePoints: 0 };
  }

  let workingAssignments = [...assignments];

  if (courseSettings?.dropLowest && courseSettings.dropLowest > 0) {
    const sorted = workingAssignments
      .map((a) => ({ ...a, pct: (a.points / a.totalPoints) * 100 }))
      .sort((a, b) => a.pct - b.pct);
    workingAssignments = sorted.slice(courseSettings.dropLowest).map(({ pct, ...rest }) => rest);
  }

  let percentage = calculateWeightedAverage(workingAssignments);

  if (courseSettings?.extraCredit) percentage += courseSettings.extraCredit;
  if (courseSettings?.curve) percentage += courseSettings.curve;
  percentage = Math.min(percentage, 100);

  const letterGrade = scoreToLetter(percentage);
  const gradePoints = scoreToGradePoint(percentage);

  return {
    percentage: Math.round(percentage * 100) / 100,
    letterGrade,
    gradePoints,
  };
}

/**
 * Generate grade analytics for faculty.
 * @param studentGrades - Array of student grade percentages
 */
export function generateGradeAnalytics(studentGrades: number[]): {
  distribution: GradeDistribution;
  statistics: { mean: number; median: number; standardDeviation: number; min: number; max: number };
  insights: string[];
} {
  if (studentGrades.length === 0) {
    return {
      distribution: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, totalStudents: 0 },
      statistics: { mean: 0, median: 0, standardDeviation: 0, min: 0, max: 0 },
      insights: ["No grades available for analysis"],
    };
  }

  const distribution = calculateGradeDistribution(studentGrades);

  const sorted = [...studentGrades].sort((a, b) => a - b);
  const mean = studentGrades.reduce((sum, g) => sum + g, 0) / studentGrades.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = studentGrades.reduce((sum, g) => sum + (g - mean) ** 2, 0) / studentGrades.length;
  const standardDeviation = Math.sqrt(variance);

  const insights: string[] = [];
  const aPercentage = (distribution.A / distribution.totalStudents) * 100;
  const fPercentage = (distribution.F / distribution.totalStudents) * 100;

  if (mean >= 70) insights.push("Class performance is excellent overall");
  else if (mean >= 60) insights.push("Class performance is above average");
  else if (mean >= 50) insights.push("Class performance is average");
  else insights.push("Class performance may need attention");

  if (aPercentage > 30) insights.push("High percentage of A grades — consider if standards are appropriate");
  if (fPercentage > 20) insights.push("High failure rate — consider additional support for struggling students");
  if (standardDeviation > 20) insights.push("Wide grade distribution — students have varied performance levels");

  return {
    distribution,
    statistics: {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      min: Math.min(...studentGrades),
      max: Math.max(...studentGrades),
    },
    insights,
  };
}
