import { eq, and, desc, asc, sql, gte, lte, between } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import {
  PerformanceHistorySchema,
  ConceptMasterySchema,
  StudentStudySessionsSchema,
  GradePredictionsSchema,
  CourseSchema,
  type PerformanceHistoryEntity,
  type ConceptMasteryEntity,
  type StudentStudySessionsEntity,
  type GradePredictionsEntity,
} from "../schema.pg";

export const performanceRepository = {
  async getStudentPerformanceHistory(
    studentId: string,
    courseId?: string,
    semester?: string
  ): Promise<PerformanceHistoryEntity[]> {
    const conditions = [eq(PerformanceHistorySchema.studentId, studentId)];
    
    if (courseId) {
      conditions.push(eq(PerformanceHistorySchema.courseId, courseId));
    }
    
    if (semester) {
      conditions.push(eq(PerformanceHistorySchema.semester, semester));
    }

    return db
      .select()
      .from(PerformanceHistorySchema)
      .where(and(...conditions))
      .orderBy(desc(PerformanceHistorySchema.weekNumber));
  },

  async createPerformanceRecord(
    data: Omit<typeof PerformanceHistorySchema.$inferInsert, "id" | "createdAt" | "updatedAt">
  ): Promise<PerformanceHistoryEntity> {
    const [record] = await db
      .insert(PerformanceHistorySchema)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return record;
  },

  async updatePerformanceRecord(
    studentId: string,
    courseId: string,
    weekNumber: number,
    semester: string,
    updates: Partial<typeof PerformanceHistorySchema.$inferInsert>
  ): Promise<PerformanceHistoryEntity | null> {
    const [updated] = await db
      .update(PerformanceHistorySchema)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(PerformanceHistorySchema.studentId, studentId),
          eq(PerformanceHistorySchema.courseId, courseId),
          eq(PerformanceHistorySchema.weekNumber, weekNumber),
          eq(PerformanceHistorySchema.semester, semester)
        )
      )
      .returning();
    return updated ?? null;
  },

  async getStudentConceptMastery(
    studentId: string,
    courseId?: string
  ): Promise<ConceptMasteryEntity[]> {
    const conditions = [eq(ConceptMasterySchema.studentId, studentId)];
    
    if (courseId) {
      conditions.push(eq(ConceptMasterySchema.courseId, courseId));
    }

    return db
      .select()
      .from(ConceptMasterySchema)
      .where(and(...conditions))
      .orderBy(desc(ConceptMasterySchema.lastPracticedAt));
  },

  async getWeakConcepts(
    studentId: string,
    courseId?: string,
    threshold: number = 0.6
  ): Promise<ConceptMasteryEntity[]> {
    const conditions = [
      eq(ConceptMasterySchema.studentId, studentId),
      lte(ConceptMasterySchema.masteryLevel, threshold.toString()),
    ];
    
    if (courseId) {
      conditions.push(eq(ConceptMasterySchema.courseId, courseId));
    }

    return db
      .select()
      .from(ConceptMasterySchema)
      .where(and(...conditions))
      .orderBy(asc(ConceptMasterySchema.masteryLevel));
  },

  async updateConceptMastery(
    studentId: string,
    courseId: string,
    conceptName: string,
    wasCorrect: boolean
  ): Promise<ConceptMasteryEntity> {
    const existing = await db
      .select()
      .from(ConceptMasterySchema)
      .where(
        and(
          eq(ConceptMasterySchema.studentId, studentId),
          eq(ConceptMasterySchema.courseId, courseId),
          eq(ConceptMasterySchema.conceptName, conceptName)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      const newCorrectAttempts = current.correctAttempts + (wasCorrect ? 1 : 0);
      const newTotalAttempts = current.totalAttempts + 1;
      const newMasteryLevel = (newCorrectAttempts / newTotalAttempts).toFixed(2);

      const [updated] = await db
        .update(ConceptMasterySchema)
        .set({
          correctAttempts: newCorrectAttempts,
          totalAttempts: newTotalAttempts,
          masteryLevel: newMasteryLevel,
          lastPracticedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ConceptMasterySchema.studentId, studentId),
            eq(ConceptMasterySchema.courseId, courseId),
            eq(ConceptMasterySchema.conceptName, conceptName)
          )
        )
        .returning();
      
      return updated;
    } else {
      const [created] = await db
        .insert(ConceptMasterySchema)
        .values({
          studentId,
          courseId,
          conceptName,
          correctAttempts: wasCorrect ? 1 : 0,
          totalAttempts: 1,
          masteryLevel: wasCorrect ? "1.00" : "0.00",
          lastPracticedAt: new Date(),
          firstLearnedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      return created;
    }
  },

  async getStudySessions(
    studentId: string,
    options?: {
      courseId?: string;
      sessionType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<StudentStudySessionsEntity[]> {
    const conditions = [eq(StudentStudySessionsSchema.studentId, studentId)];
    
    if (options?.courseId) {
      conditions.push(eq(StudentStudySessionsSchema.courseId, options.courseId));
    }
    
    if (options?.sessionType) {
      conditions.push(eq(StudentStudySessionsSchema.sessionType, options.sessionType));
    }
    
    if (options?.startDate) {
      conditions.push(gte(StudentStudySessionsSchema.startedAt, options.startDate));
    }
    
    if (options?.endDate) {
      conditions.push(lte(StudentStudySessionsSchema.endedAt, options.endDate));
    }

    let query = db
      .select()
      .from(StudentStudySessionsSchema)
      .where(and(...conditions))
      .orderBy(desc(StudentStudySessionsSchema.startedAt));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query;
  },

  async createStudySession(
    data: Omit<typeof StudentStudySessionsSchema.$inferInsert, "id" | "createdAt">
  ): Promise<StudentStudySessionsEntity> {
    const [session] = await db
      .insert(StudentStudySessionsSchema)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return session;
  },

  async getStudyTimeStats(
    studentId: string,
    courseId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalMinutes: number;
    sessionCount: number;
    averageSessionLength: number;
    byType: Record<string, number>;
  }> {
    const conditions = [eq(StudentStudySessionsSchema.studentId, studentId)];
    
    if (courseId) {
      conditions.push(eq(StudentStudySessionsSchema.courseId, courseId));
    }
    
    if (startDate) {
      conditions.push(gte(StudentStudySessionsSchema.startedAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(StudentStudySessionsSchema.endedAt, endDate));
    }

    const sessions = await db
      .select()
      .from(StudentStudySessionsSchema)
      .where(and(...conditions));

    const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const sessionCount = sessions.length;
    const averageSessionLength = sessionCount > 0 ? totalMinutes / sessionCount : 0;

    const byType: Record<string, number> = {};
    sessions.forEach((s) => {
      byType[s.sessionType] = (byType[s.sessionType] || 0) + s.durationMinutes;
    });

    return {
      totalMinutes,
      sessionCount,
      averageSessionLength,
      byType,
    };
  },

  async getGradePredictions(
    studentId: string,
    courseId?: string,
    semester?: string
  ): Promise<GradePredictionsEntity[]> {
    const conditions = [eq(GradePredictionsSchema.studentId, studentId)];
    
    if (courseId) {
      conditions.push(eq(GradePredictionsSchema.courseId, courseId));
    }
    
    if (semester) {
      conditions.push(eq(GradePredictionsSchema.semester, semester));
    }

    return db
      .select()
      .from(GradePredictionsSchema)
      .where(and(...conditions))
      .orderBy(desc(GradePredictionsSchema.predictedAt));
  },

  async createGradePrediction(
    data: Omit<typeof GradePredictionsSchema.$inferInsert, "id" | "createdAt">
  ): Promise<GradePredictionsEntity> {
    const [prediction] = await db
      .insert(GradePredictionsSchema)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return prediction;
  },

  async getLatestGradePrediction(
    studentId: string,
    courseId: string,
    semester: string
  ): Promise<GradePredictionsEntity | null> {
    const [result] = await db
      .select()
      .from(GradePredictionsSchema)
      .where(
        and(
          eq(GradePredictionsSchema.studentId, studentId),
          eq(GradePredictionsSchema.courseId, courseId),
          eq(GradePredictionsSchema.semester, semester)
        )
      )
      .orderBy(desc(GradePredictionsSchema.predictedAt))
      .limit(1);
    
    return result ?? null;
  },

  async getDashboardData(
    studentId: string,
    semester: string
  ): Promise<{
    performanceHistory: PerformanceHistoryEntity[];
    conceptMastery: ConceptMasteryEntity[];
    recentSessions: StudentStudySessionsEntity[];
    gradePredictions: GradePredictionsEntity[];
    studyTimeStats: {
      totalMinutes: number;
      sessionCount: number;
      averageSessionLength: number;
      byType: Record<string, number>;
    };
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      performanceHistory,
      conceptMastery,
      recentSessions,
      gradePredictions,
      studyTimeStats,
    ] = await Promise.all([
      this.getStudentPerformanceHistory(studentId, undefined, semester),
      this.getStudentConceptMastery(studentId),
      this.getStudySessions(studentId, { limit: 20 }),
      this.getGradePredictions(studentId, undefined, semester),
      this.getStudyTimeStats(studentId, undefined, thirtyDaysAgo),
    ]);

    return {
      performanceHistory,
      conceptMastery,
      recentSessions,
      gradePredictions,
      studyTimeStats,
    };
  },

  async getPerformanceTrends(
    studentId: string,
    courseId: string,
    semester: string
  ): Promise<{
    weeklyGrades: Array<{ week: number; grade: number }>;
    studyTimeByWeek: Array<{ week: number; minutes: number }>;
    completionRate: number;
    trend: "improving" | "declining" | "stable";
  }> {
    const history = await this.getStudentPerformanceHistory(studentId, courseId, semester);

    const weeklyGrades = history
      .filter((h) => h.averageGrade !== null)
      .map((h) => ({
        week: h.weekNumber,
        grade: parseFloat(h.averageGrade || "0"),
      }))
      .sort((a, b) => a.week - b.week);

    const studyTimeByWeek = history
      .map((h) => ({
        week: h.weekNumber,
        minutes: h.studyTimeMinutes,
      }))
      .sort((a, b) => a.week - b.week);

    const totalCompleted = history.reduce((sum, h) => sum + h.assignmentsCompleted, 0);
    const totalAssignments = history.reduce((sum, h) => sum + h.assignmentsTotal, 0);
    const completionRate = totalAssignments > 0 ? (totalCompleted / totalAssignments) * 100 : 0;

    let trend: "improving" | "declining" | "stable" = "stable";
    if (weeklyGrades.length >= 3) {
      const recent = weeklyGrades.slice(-3);
      const first = recent[0].grade;
      const last = recent[recent.length - 1].grade;
      const diff = last - first;
      
      if (diff > 5) trend = "improving";
      else if (diff < -5) trend = "declining";
    }

    return {
      weeklyGrades,
      studyTimeByWeek,
      completionRate,
      trend,
    };
  },

  async getStrengthsAndWeaknesses(
    studentId: string,
    courseId?: string
  ): Promise<{
    strengths: ConceptMasteryEntity[];
    weaknesses: ConceptMasteryEntity[];
    needsPractice: ConceptMasteryEntity[];
  }> {
    const allConcepts = await this.getStudentConceptMastery(studentId, courseId);

    const strengths = allConcepts.filter(
      (c) => parseFloat(c.masteryLevel || "0") >= 0.8
    );

    const weaknesses = allConcepts.filter(
      (c) => parseFloat(c.masteryLevel || "0") < 0.5
    );

    const needsPractice = allConcepts.filter(
      (c) => parseFloat(c.masteryLevel || "0") >= 0.5 && parseFloat(c.masteryLevel || "0") < 0.8
    );

    return {
      strengths: strengths.sort((a, b) => parseFloat(b.masteryLevel || "0") - parseFloat(a.masteryLevel || "0")),
      weaknesses: weaknesses.sort((a, b) => parseFloat(a.masteryLevel || "0") - parseFloat(b.masteryLevel || "0")),
      needsPractice: needsPractice.sort((a, b) => parseFloat(a.masteryLevel || "0") - parseFloat(b.masteryLevel || "0")),
    };
  },
};

export default performanceRepository;
