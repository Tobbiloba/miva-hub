import { desc, eq, sql } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { UniversitySchema } from "../schema.pg";

export type University = typeof UniversitySchema.$inferSelect;
export type UniversityInsert = typeof UniversitySchema.$inferInsert;

export const pgUniversityRepository = {
  async findById(id: string): Promise<University | undefined> {
    const [university] = await db
      .select()
      .from(UniversitySchema)
      .where(eq(UniversitySchema.id, id));
    return university;
  },

  async findBySlug(slug: string): Promise<University | undefined> {
    const [university] = await db
      .select()
      .from(UniversitySchema)
      .where(eq(UniversitySchema.slug, slug));
    return university;
  },

  /**
   * Resolve the university that owns an email domain (e.g. "miva.edu.ng").
   * Only active universities are matched — pending/suspended tenants must
   * not accept signups.
   */
  async findByEmailDomain(domain: string): Promise<University | undefined> {
    const normalized = domain.toLowerCase().trim();
    const [university] = await db
      .select()
      .from(UniversitySchema)
      .where(
        sql`${UniversitySchema.emailDomains}::jsonb ? ${normalized} AND ${UniversitySchema.status} = 'active'`,
      );
    return university;
  },

  /**
   * Check whether any of the given domains is already claimed by an
   * existing university (any status — pending/suspended tenants still
   * own their domains). Returns the first claimed domain, if any.
   */
  async findClaimedDomain(domains: string[]): Promise<string | undefined> {
    for (const domain of domains) {
      const normalized = domain.toLowerCase().trim();
      const [existing] = await db
        .select({ id: UniversitySchema.id })
        .from(UniversitySchema)
        .where(sql`${UniversitySchema.emailDomains}::jsonb ? ${normalized}`)
        .limit(1);
      if (existing) return normalized;
    }
    return undefined;
  },

  async create(
    data: Omit<UniversityInsert, "id" | "createdAt" | "updatedAt">,
  ): Promise<University> {
    const [university] = await db
      .insert(UniversitySchema)
      .values(data)
      .returning();
    return university;
  },

  async update(
    id: string,
    updates: Partial<Omit<UniversityInsert, "id" | "createdAt">>,
  ): Promise<University | undefined> {
    const [updated] = await db
      .update(UniversitySchema)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(UniversitySchema.id, id))
      .returning();
    return updated;
  },

  async list(): Promise<University[]> {
    return db
      .select()
      .from(UniversitySchema)
      .orderBy(desc(UniversitySchema.createdAt));
  },

  async listActive(): Promise<University[]> {
    return db
      .select()
      .from(UniversitySchema)
      .where(eq(UniversitySchema.status, "active"))
      .orderBy(UniversitySchema.name);
  },
};
