/**
 * Academic Conversation Memory Service
 * Tracks academic conversations and provides context continuity for MIVA University students
 */

import { safe } from "ts-safe";
import { pgAcademicRepository } from "lib/db/pg/repositories/academic-repository.pg";

interface AcademicConversationContext {
  studentId: string;
  recentCourses: string[];
  currentAssignments: string[];
  studyTopics: string[];
  academicGoals: string[];
  lastDiscussedConcepts: string[];
  learningDifficulties: string[];
  preferredStudyMethods: string[];
}

interface ConversationEntry {
  timestamp: number;
  topic: string;
  courseCode?: string;
  concepts: string[];
  questionsAsked: string[];
  toolsUsed: string[];
  confidence: number;
}

class AcademicConversationMemoryService {
  private conversationCache = new Map<string, ConversationEntry[]>();
  private contextCache = new Map<string, AcademicConversationContext>();
  private cacheTTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get academic conversation context for a student
   */
  async getAcademicContext(studentId: string): Promise<AcademicConversationContext | null> {
    const cached = this.contextCache.get(studentId);
    if (cached) {
      return cached;
    }

    try {
      // Get student's current academic situation
      const [enrolledCourses, upcomingAssignments] = await Promise.all([
        this.getCurrentEnrolledCourses(studentId),
        this.getUpcomingAssignments(studentId)
      ]);

      const context: AcademicConversationContext = {
        studentId,
        recentCourses: enrolledCourses.map(c => c.courseCode),
        currentAssignments: upcomingAssignments.map(a => a.title),
        studyTopics: this.extractTopicsFromCourses(enrolledCourses),
        academicGoals: [], // Will be enhanced based on conversation history
        lastDiscussedConcepts: this.getRecentDiscussedConcepts(studentId),
        learningDifficulties: [], // Will be enhanced based on conversation patterns
        preferredStudyMethods: [] // Will be enhanced based on tool usage patterns
      };

      // Cache the context
      this.contextCache.set(studentId, context);
      
      // Auto-expire cache
      setTimeout(() => {
        this.contextCache.delete(studentId);
      }, this.cacheTTL);

      return context;
    } catch (error) {
      console.error(`[AcademicMemory] Failed to get context for ${studentId}:`, error);
      return null;
    }
  }

  /**
   * Record a conversation entry for academic context building
   */
  recordConversation(
    studentId: string,
    topic: string,
    concepts: string[],
    questionsAsked: string[],
    toolsUsed: string[] = [],
    courseCode?: string,
    confidence: number = 0.8
  ): void {
    const entry: ConversationEntry = {
      timestamp: Date.now(),
      topic,
      courseCode,
      concepts,
      questionsAsked,
      toolsUsed,
      confidence
    };

    const conversations = this.conversationCache.get(studentId) || [];
    conversations.push(entry);

    // Keep only last 20 conversations
    if (conversations.length > 20) {
      conversations.shift();
    }

    this.conversationCache.set(studentId, conversations);

    // Update context based on new conversation
    this.updateContextFromConversation(studentId, entry);
  }

  /**
   * Get recent academic conversations for a student
   */
  getRecentConversations(studentId: string, limit: number = 10): ConversationEntry[] {
    const conversations = this.conversationCache.get(studentId) || [];
    return conversations
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get conversation context for enhancing responses
   */
  getConversationContext(studentId: string): string {
    const context = this.contextCache.get(studentId);
    const conversations = this.getRecentConversations(studentId, 5);

    if (!context || conversations.length === 0) {
      return "";
    }

    let contextText = `## Academic Context for ${context.studentId}\n\n`;

    // Current academic situation
    if (context.recentCourses.length > 0) {
      contextText += `**Current Courses:** ${context.recentCourses.join(', ')}\n`;
    }

    if (context.currentAssignments.length > 0) {
      contextText += `**Upcoming Assignments:** ${context.currentAssignments.slice(0, 3).join(', ')}\n`;
    }

    // Recent conversation topics
    const recentTopics = conversations
      .map(c => c.topic)
      .filter((topic, index, arr) => arr.indexOf(topic) === index)
      .slice(0, 3);

    if (recentTopics.length > 0) {
      contextText += `**Recent Discussion Topics:** ${recentTopics.join(', ')}\n`;
    }

    // Recently discussed concepts
    const recentConcepts = conversations
      .flatMap(c => c.concepts)
      .filter((concept, index, arr) => arr.indexOf(concept) === index)
      .slice(0, 5);

    if (recentConcepts.length > 0) {
      contextText += `**Recent Concepts:** ${recentConcepts.join(', ')}\n`;
    }

    // Preferred tools
    const toolUsage = conversations
      .flatMap(c => c.toolsUsed)
      .reduce((acc, tool) => {
        acc[tool] = (acc[tool] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const preferredTools = Object.entries(toolUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tool]) => tool);

    if (preferredTools.length > 0) {
      contextText += `**Preferred Study Tools:** ${preferredTools.join(', ')}\n`;
    }

    return contextText;
  }

  /**
   * Get proactive suggestions based on conversation history
   */
  getProactiveSuggestions(studentId: string): string[] {
    const context = this.contextCache.get(studentId);
    const conversations = this.getRecentConversations(studentId, 10);

    if (!context || conversations.length === 0) {
      return [];
    }

    const suggestions: string[] = [];

    // Suggest study tools based on recent topics
    const recentTopics = conversations.slice(0, 3).map(c => c.topic);
    if (recentTopics.length > 0) {
      const topic = recentTopics[0];
      suggestions.push(`Would you like me to create a study guide for ${topic}?`);
      suggestions.push(`I can generate practice questions about ${topic} if that would help.`);
    }

    // Suggest assignment help if due soon
    if (context.currentAssignments.length > 0) {
      suggestions.push(`I notice you have upcoming assignments. Would you like help organizing your study schedule?`);
    }

    // Suggest concept reinforcement
    const strugglingConcepts = conversations
      .filter(c => c.confidence < 0.6)
      .flatMap(c => c.concepts)
      .slice(0, 2);

    if (strugglingConcepts.length > 0) {
      suggestions.push(`Would you like me to explain ${strugglingConcepts[0]} in a different way?`);
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Clear conversation memory for a student
   */
  clearStudentMemory(studentId: string): void {
    this.conversationCache.delete(studentId);
    this.contextCache.delete(studentId);
  }

  // Private helper methods

  private async getCurrentEnrolledCourses(studentId: string) {
    try {
      // Get current semester courses for the student
      const { getCurrentSemester } = await import("lib/utils/semester");
      const currentSemester = await getCurrentSemester();
      
      // This would need to be implemented in the academic repository
      // For now, return empty array
      return [];
    } catch (error) {
      console.error(`[AcademicMemory] Failed to get courses for ${studentId}:`, error);
      return [];
    }
  }

  private async getUpcomingAssignments(studentId: string) {
    try {
      // Get upcoming assignments for the student
      // This would need to be implemented in the academic repository
      // For now, return empty array
      return [];
    } catch (error) {
      console.error(`[AcademicMemory] Failed to get assignments for ${studentId}:`, error);
      return [];
    }
  }

  private extractTopicsFromCourses(courses: any[]): string[] {
    // Extract common academic topics from course codes/names
    const topics: string[] = [];
    
    courses.forEach(course => {
      const courseCode = course.courseCode?.toLowerCase() || '';
      
      if (courseCode.includes('cs') || courseCode.includes('comp')) {
        topics.push('Computer Science', 'Programming', 'Algorithms');
      }
      if (courseCode.includes('math') || courseCode.includes('mat')) {
        topics.push('Mathematics', 'Calculus', 'Statistics');
      }
      if (courseCode.includes('eng')) {
        topics.push('Engineering', 'Design', 'Problem Solving');
      }
      if (courseCode.includes('bus') || courseCode.includes('mgmt')) {
        topics.push('Business', 'Management', 'Economics');
      }
    });

    return [...new Set(topics)]; // Remove duplicates
  }

  private getRecentDiscussedConcepts(studentId: string): string[] {
    const conversations = this.conversationCache.get(studentId) || [];
    return conversations
      .slice(-5) // Last 5 conversations
      .flatMap(c => c.concepts)
      .filter((concept, index, arr) => arr.indexOf(concept) === index) // Unique
      .slice(0, 10); // Limit to 10 concepts
  }

  private updateContextFromConversation(studentId: string, entry: ConversationEntry): void {
    const context = this.contextCache.get(studentId);
    if (!context) return;

    // Update last discussed concepts
    context.lastDiscussedConcepts = [
      ...entry.concepts,
      ...context.lastDiscussedConcepts
    ].slice(0, 10); // Keep only last 10

    // Track learning difficulties (low confidence topics)
    if (entry.confidence < 0.6) {
      context.learningDifficulties = [
        entry.topic,
        ...context.learningDifficulties.filter(d => d !== entry.topic)
      ].slice(0, 5);
    }

    // Track preferred study methods based on tool usage
    entry.toolsUsed.forEach(tool => {
      if (!context.preferredStudyMethods.includes(tool)) {
        context.preferredStudyMethods.push(tool);
      }
    });
    context.preferredStudyMethods = context.preferredStudyMethods.slice(0, 5);

    // Update cache
    this.contextCache.set(studentId, context);
  }
}

// Singleton instance
export const academicConversationMemory = new AcademicConversationMemoryService();

/**
 * Helper function to get conversation context safely
 */
export const getAcademicConversationContext = (studentId: string) => {
  return safe(() => academicConversationMemory.getConversationContext(studentId))
    .orElse("");
};

/**
 * Helper function to record conversation safely
 */
export const recordAcademicConversation = (
  studentId: string,
  topic: string,
  concepts: string[],
  questionsAsked: string[],
  toolsUsed: string[] = [],
  courseCode?: string,
  confidence: number = 0.8
) => {
  return safe(() => 
    academicConversationMemory.recordConversation(
      studentId, topic, concepts, questionsAsked, toolsUsed, courseCode, confidence
    )
  ).orElse(undefined);
};

export type { AcademicConversationContext, ConversationEntry };