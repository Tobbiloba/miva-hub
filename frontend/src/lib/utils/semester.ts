import { pgAcademicRepository } from "@/lib/db/pg/repositories/academic-repository.pg";

/**
 * Gets the current active semester from the academic calendar
 * If no active calendar exists, calculates based on current date
 * @returns Current semester string (e.g., "2025-spring")
 */
export async function getCurrentSemester(): Promise<string> {
  try {
    // Try to get from active academic calendar first
    const activeCalendar = await pgAcademicRepository.getActiveAcademicCalendar();
    if (activeCalendar?.semester) {
      return activeCalendar.semester;
    }

    // Fallback: calculate based on current date
    return calculateCurrentSemester();
  } catch (error) {
    console.error("Error getting current semester:", error);
    return calculateCurrentSemester();
  }
}

/**
 * Gets the current academic year (e.g., "2024-2025")
 * @returns Current academic year string
 */
export async function getCurrentAcademicYear(): Promise<string> {
  try {
    const activeCalendar = await pgAcademicRepository.getActiveAcademicCalendar();
    if (activeCalendar?.academicYear) {
      return activeCalendar.academicYear;
    }

    // Fallback: calculate based on current date
    return calculateCurrentAcademicYear();
  } catch (error) {
    console.error("Error getting current academic year:", error);
    return calculateCurrentAcademicYear();
  }
}

/**
 * Calculates the current semester based on the current date
 * Academic year runs from August to July
 * Fall: August - December
 * Spring: January - May  
 * Summer: June - July
 */
function calculateCurrentSemester(): string {
  const now = new Date();
  const month = now.getMonth() + 1; // getMonth() returns 0-11
  const year = now.getFullYear();
  
  if (month >= 8 && month <= 12) {
    // Fall semester: August - December of current year
    return `${year}-fall`;
  } else if (month >= 1 && month <= 5) {
    // Spring semester: January - May of current year
    return `${year}-spring`;
  } else {
    // Summer semester: June - July of current year
    return `${year}-summer`;
  }
}

/**
 * Calculates the current academic year based on the current date
 * Academic year runs from August to July
 */
function calculateCurrentAcademicYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  if (month >= 8) {
    // August onwards: academic year starts this year, ends next year
    return `${year}-${year + 1}`;
  } else {
    // January - July: academic year started last year, ends this year
    return `${year - 1}-${year}`;
  }
}

/**
 * Gets the current semester and academic year
 * @returns Object with current semester and academic year
 */
export async function getCurrentAcademicTerm(): Promise<{
  semester: string;
  academicYear: string;
}> {
  const [semester, academicYear] = await Promise.all([
    getCurrentSemester(),
    getCurrentAcademicYear()
  ]);
  
  return { semester, academicYear };
}

/**
 * Parses a semester string and returns its components
 * @param semester - Semester string like "2025-spring"
 * @returns Object with year and term
 */
export function parseSemester(semester: string): { year: number; term: string } | null {
  const match = semester.match(/^(\d{4})-(fall|spring|summer)$/);
  if (!match) return null;
  
  return {
    year: parseInt(match[1]),
    term: match[2]
  };
}

/**
 * Formats a semester for display
 * @param semester - Semester string like "2025-spring"
 * @returns Formatted string like "Spring 2025"
 */
export function formatSemester(semester: string): string {
  const parsed = parseSemester(semester);
  if (!parsed) return semester;
  
  const termNames = {
    fall: 'Fall',
    spring: 'Spring',
    summer: 'Summer'
  };
  
  return `${termNames[parsed.term as keyof typeof termNames]} ${parsed.year}`;
}

/**
 * Gets the next semester based on current semester
 * @param currentSemester - Current semester string
 * @returns Next semester string
 */
export function getNextSemester(currentSemester: string): string {
  const parsed = parseSemester(currentSemester);
  if (!parsed) return currentSemester;
  
  const { year, term } = parsed;
  
  switch (term) {
    case 'fall':
      return `${year + 1}-spring`;
    case 'spring':
      return `${year}-summer`;
    case 'summer':
      return `${year + 1}-fall`;
    default:
      return currentSemester;
  }
}

/**
 * Gets the previous semester based on current semester
 * @param currentSemester - Current semester string
 * @returns Previous semester string
 */
export function getPreviousSemester(currentSemester: string): string {
  const parsed = parseSemester(currentSemester);
  if (!parsed) return currentSemester;
  
  const { year, term } = parsed;
  
  switch (term) {
    case 'fall':
      return `${year}-summer`;
    case 'spring':
      return `${year - 1}-fall`;
    case 'summer':
      return `${year}-spring`;
    default:
      return currentSemester;
  }
}