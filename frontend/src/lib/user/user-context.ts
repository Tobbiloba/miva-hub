/**
 * User Context Service for Better Chatbot
 * Maps Better Chatbot users to academic student IDs and provides session-based context
 */

import { safe } from "ts-safe";

interface UserAcademicContext {
  studentId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface UserContextCache {
  [userId: string]: {
    context: UserAcademicContext | null;
    timestamp: number;
  };
}

class UserContextService {
  private cache: UserContextCache = {};
  private cacheTTL = 5 * 60 * 1000; // 5 minutes cache TTL

  /**
   * Get academic context for a Better Chatbot user
   * Maps user email to academic student ID
   */
  async getUserAcademicContext(userEmail: string): Promise<UserAcademicContext | null> {
    const cacheKey = userEmail;
    const cached = this.cache[cacheKey];
    
    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.context;
    }

    try {
      // Query academic database to find student by email
      const result = await this.queryAcademicDatabase(userEmail);
      
      // Cache the result
      this.cache[cacheKey] = {
        context: result,
        timestamp: Date.now(),
      };
      
      return result;
    } catch (error) {
      console.error(`[UserContext] Failed to get academic context for ${userEmail}:`, error);
      
      // Cache null result to avoid repeated failures
      this.cache[cacheKey] = {
        context: null,
        timestamp: Date.now(),
      };
      
      return null;
    }
  }

  /**
   * Query the Better Chatbot database to find student by email
   * Maps Better Chatbot users to academic context
   */
  private async queryAcademicDatabase(email: string): Promise<UserAcademicContext | null> {
    // Import PostgreSQL client dynamically to avoid loading issues
    const { Pool } = await import('pg');
    
    // Query the Better Chatbot database (not miva_academic)
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'better_chatbot',
      user: 'postgres',
      password: '',
    });

    try {
      // Query Better Chatbot user table for academic info
      const query = `
        SELECT 
          u.email,
          u.name,
          u.student_id,
          u.role,
          u.year,
          u.major
        FROM "user" u
        WHERE u.email = $1
        LIMIT 1
      `;
      
      const result = await pool.query(query, [email]);
      
      if (result.rows.length === 0) {
        console.log(`[UserContext] No user found with email: ${email}`);
        return null;
      }
      
      const row = result.rows[0];
      
      // If no student record exists, return null
      if (!row.student_id) {
        console.log(`[UserContext] User ${email} has no student record`);
        return null;
      }
      
      const context = {
        studentId: row.student_id,
        email: row.email,
        firstName: row.name?.split(' ')[0] || 'Student',
        lastName: row.name?.split(' ').slice(1).join(' ') || '',
        role: row.role,
        year: row.year,
        major: row.major,
      };
      
      console.log(`[UserContext] Successfully mapped ${email} to studentId: ${row.student_id}`);
      return context;
    } finally {
      await pool.end();
    }
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userEmail: string): void {
    delete this.cache[userEmail];
  }

  /**
   * Clear all cached contexts (useful for testing)
   */
  clearAllCache(): void {
    this.cache = {};
  }
}

// Singleton instance
export const userContextService = new UserContextService();

/**
 * Helper function to get user academic context safely
 */
export const getUserAcademicContext = (userEmail: string) => {
  return safe(() => userContextService.getUserAcademicContext(userEmail))
    .orElse(null);
};

export type { UserAcademicContext };