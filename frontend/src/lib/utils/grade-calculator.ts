/**
 * Grade Calculation Engine for MIVA University Academic System
 * Handles GPA calculations, grade distributions, and academic performance metrics
 */

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
  F: number;
  totalStudents: number;
}

/**
 * MIVA University Grading Scale
 * Based on standard 4.0 scale
 */
export const GRADING_SCALE = {
  'A+': { min: 97, max: 100, points: 4.0 },
  'A': { min: 93, max: 96, points: 4.0 },
  'A-': { min: 90, max: 92, points: 3.7 },
  'B+': { min: 87, max: 89, points: 3.3 },
  'B': { min: 83, max: 86, points: 3.0 },
  'B-': { min: 80, max: 82, points: 2.7 },
  'C+': { min: 77, max: 79, points: 2.3 },
  'C': { min: 73, max: 76, points: 2.0 },
  'C-': { min: 70, max: 72, points: 1.7 },
  'D+': { min: 67, max: 69, points: 1.3 },
  'D': { min: 63, max: 66, points: 1.0 },
  'D-': { min: 60, max: 62, points: 0.7 },
  'F': { min: 0, max: 59, points: 0.0 },
};

/**
 * Convert percentage to letter grade
 * @param percentage - Grade percentage (0-100)
 * @returns Letter grade
 */
export function percentageToLetterGrade(percentage: number): string {
  for (const [letter, scale] of Object.entries(GRADING_SCALE)) {
    if (percentage >= scale.min && percentage <= scale.max) {
      return letter;
    }
  }
  return 'F';
}

/**
 * Convert percentage to grade points
 * @param percentage - Grade percentage (0-100)
 * @returns Grade points (0.0-4.0)
 */
export function percentageToGradePoints(percentage: number): number {
  const letterGrade = percentageToLetterGrade(percentage);
  return GRADING_SCALE[letterGrade as keyof typeof GRADING_SCALE]?.points || 0.0;
}

/**
 * Convert letter grade to grade points
 * @param letterGrade - Letter grade (A, B, C, etc.)
 * @returns Grade points (0.0-4.0)
 */
export function letterGradeToGradePoints(letterGrade: string): number {
  return GRADING_SCALE[letterGrade as keyof typeof GRADING_SCALE]?.points || 0.0;
}

/**
 * Calculate weighted average for assignments
 * @param grades - Array of grade entries with weights
 * @returns Weighted percentage (0-100)
 */
export function calculateWeightedAverage(grades: GradeEntry[]): number {
  if (grades.length === 0) return 0;

  let totalWeightedPoints = 0;
  let totalWeight = 0;

  for (const grade of grades) {
    const percentage = (grade.points / grade.totalPoints) * 100;
    const weight = grade.weight || 1; // Default weight of 1 if not specified
    
    totalWeightedPoints += percentage * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalWeightedPoints / totalWeight : 0;
}

/**
 * Calculate GPA for a set of courses
 * @param courses - Array of course grades
 * @returns GPA calculation result
 */
export function calculateGPA(courses: CourseGrade[]): GPACalculation {
  if (courses.length === 0) {
    return {
      gpa: 0,
      totalCreditHours: 0,
      totalGradePoints: 0,
    };
  }

  let totalGradePoints = 0;
  let totalCreditHours = 0;

  for (const course of courses) {
    const gradePoints = course.gradePoints * course.creditHours;
    totalGradePoints += gradePoints;
    totalCreditHours += course.creditHours;
  }

  const gpa = totalCreditHours > 0 ? totalGradePoints / totalCreditHours : 0;

  return {
    gpa: Math.round(gpa * 100) / 100, // Round to 2 decimal places
    totalCreditHours,
    totalGradePoints,
  };
}

/**
 * Calculate semester and cumulative GPA
 * @param currentSemesterCourses - Current semester courses
 * @param allCourses - All courses for cumulative GPA
 * @returns GPA calculation with semester and cumulative breakdown
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
 * Calculate grade distribution for a set of grades
 * @param percentages - Array of grade percentages
 * @returns Grade distribution breakdown
 */
export function calculateGradeDistribution(percentages: number[]): GradeDistribution {
  const distribution: GradeDistribution = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    F: 0,
    totalStudents: percentages.length,
  };

  for (const percentage of percentages) {
    const letterGrade = percentageToLetterGrade(percentage);
    
    if (letterGrade.startsWith('A')) {
      distribution.A++;
    } else if (letterGrade.startsWith('B')) {
      distribution.B++;
    } else if (letterGrade.startsWith('C')) {
      distribution.C++;
    } else if (letterGrade.startsWith('D')) {
      distribution.D++;
    } else {
      distribution.F++;
    }
  }

  return distribution;
}

/**
 * Calculate course final grade from assignments
 * @param assignments - Array of assignment grades
 * @param courseSettings - Course-specific grading settings
 * @returns Final course percentage and letter grade
 */
export function calculateCourseFinalGrade(
  assignments: GradeEntry[],
  courseSettings?: {
    dropLowest?: number; // Number of lowest grades to drop
    extraCredit?: number; // Extra credit points to add
    curve?: number; // Curve percentage to add
  }
): { percentage: number; letterGrade: string; gradePoints: number } {
  if (assignments.length === 0) {
    return { percentage: 0, letterGrade: 'F', gradePoints: 0 };
  }

  let workingAssignments = [...assignments];

  // Drop lowest grades if specified
  if (courseSettings?.dropLowest && courseSettings.dropLowest > 0) {
    const sortedByPercentage = workingAssignments
      .map(a => ({ ...a, percentage: (a.points / a.totalPoints) * 100 }))
      .sort((a, b) => a.percentage - b.percentage);
    
    workingAssignments = sortedByPercentage
      .slice(courseSettings.dropLowest)
      .map(({ percentage, ...rest }) => rest);
  }

  // Calculate weighted average
  let percentage = calculateWeightedAverage(workingAssignments);

  // Apply extra credit
  if (courseSettings?.extraCredit) {
    percentage += courseSettings.extraCredit;
  }

  // Apply curve
  if (courseSettings?.curve) {
    percentage += courseSettings.curve;
  }

  // Cap at 100%
  percentage = Math.min(percentage, 100);

  const letterGrade = percentageToLetterGrade(percentage);
  const gradePoints = percentageToGradePoints(percentage);

  return {
    percentage: Math.round(percentage * 100) / 100,
    letterGrade,
    gradePoints,
  };
}

/**
 * Calculate academic standing based on GPA
 * @param gpa - Current GPA
 * @param creditHours - Total credit hours
 * @returns Academic standing classification
 */
export function calculateAcademicStanding(gpa: number, creditHours: number): {
  standing: string;
  description: string;
  warning?: string;
} {
  if (creditHours < 12) {
    return {
      standing: 'Part-Time',
      description: 'Enrolled in less than 12 credit hours',
    };
  }

  if (gpa >= 3.5) {
    return {
      standing: 'Dean\'s List',
      description: 'Outstanding academic performance',
    };
  }

  if (gpa >= 3.0) {
    return {
      standing: 'Good Standing',
      description: 'Meeting satisfactory academic progress',
    };
  }

  if (gpa >= 2.0) {
    return {
      standing: 'Academic Warning',
      description: 'Below standard academic performance',
      warning: 'GPA below 3.0 - consider academic support resources',
    };
  }

  return {
    standing: 'Academic Probation',
    description: 'Serious academic difficulty',
    warning: 'GPA below 2.0 - immediate intervention required',
  };
}

/**
 * Calculate progress toward degree completion
 * @param completedCreditHours - Credit hours completed
 * @param totalRequiredHours - Total credit hours required for degree
 * @param currentGPA - Current cumulative GPA
 * @returns Degree progress information
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
  const estimatedSemestersRemaining = Math.ceil(remainingHours / 15); // Assuming 15 hours per semester
  const minGPAForGraduation = 2.0; // Standard minimum GPA for graduation
  const onTrackForGraduation = currentGPA >= minGPAForGraduation;

  return {
    percentageComplete: Math.round(percentageComplete * 100) / 100,
    remainingHours,
    estimatedSemestersRemaining,
    onTrackForGraduation,
    minGPAForGraduation,
  };
}

/**
 * Generate grade analytics for faculty
 * @param studentGrades - Array of student grade percentages
 * @returns Comprehensive grade analytics
 */
export function generateGradeAnalytics(studentGrades: number[]): {
  distribution: GradeDistribution;
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    min: number;
    max: number;
  };
  insights: string[];
} {
  if (studentGrades.length === 0) {
    return {
      distribution: { A: 0, B: 0, C: 0, D: 0, F: 0, totalStudents: 0 },
      statistics: { mean: 0, median: 0, standardDeviation: 0, min: 0, max: 0 },
      insights: ['No grades available for analysis'],
    };
  }

  const distribution = calculateGradeDistribution(studentGrades);
  
  // Calculate statistics
  const sorted = [...studentGrades].sort((a, b) => a - b);
  const mean = studentGrades.reduce((sum, grade) => sum + grade, 0) / studentGrades.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = studentGrades.reduce((sum, grade) => sum + Math.pow(grade - mean, 2), 0) / studentGrades.length;
  const standardDeviation = Math.sqrt(variance);
  const min = Math.min(...studentGrades);
  const max = Math.max(...studentGrades);

  // Generate insights
  const insights: string[] = [];
  const aPercentage = (distribution.A / distribution.totalStudents) * 100;
  const fPercentage = (distribution.F / distribution.totalStudents) * 100;

  if (mean >= 85) {
    insights.push('Class performance is excellent overall');
  } else if (mean >= 75) {
    insights.push('Class performance is above average');
  } else if (mean >= 65) {
    insights.push('Class performance is average');
  } else {
    insights.push('Class performance may need attention');
  }

  if (aPercentage > 30) {
    insights.push('High percentage of A grades - consider if standards are appropriate');
  }

  if (fPercentage > 20) {
    insights.push('High failure rate - consider additional support for struggling students');
  }

  if (standardDeviation > 20) {
    insights.push('Wide grade distribution - students have varied performance levels');
  }

  return {
    distribution,
    statistics: {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      min,
      max,
    },
    insights,
  };
}