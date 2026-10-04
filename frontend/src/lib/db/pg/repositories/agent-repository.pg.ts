import { Agent, AgentRepository, AgentSummary } from "app-types/agent";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import { pgDb as db } from "../db.pg";
import { AgentSchema, BookmarkSchema, UserSchema } from "../schema.pg";

/**
 * Tenant gate for SHARED agents (public/readonly, not owned by the viewer):
 * the owner must be in the viewer's university, or be a super_admin
 * (platform-wide agents). Requires UserSchema joined as the agent OWNER.
 */
const sharedWithinTenant = (viewerId: string) =>
  or(
    eq(UserSchema.role, "super_admin"),
    sql`${UserSchema.universityId} = (SELECT u.university_id FROM "user" u WHERE u.id = ${viewerId})`,
  );

export const pgAgentRepository: AgentRepository = {
  async insertAgent(agent) {
    const [result] = await db
      .insert(AgentSchema)
      .values({
        id: generateUUID(),
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        userId: agent.userId,
        instructions: agent.instructions,
        visibility: agent.visibility || "private",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      instructions: result.instructions ?? {},
    };
  },

  async selectAgentById(id, userId): Promise<Agent | null> {
    const [result] = await db
      .select({
        id: AgentSchema.id,
        name: AgentSchema.name,
        description: AgentSchema.description,
        icon: AgentSchema.icon,
        userId: AgentSchema.userId,
        instructions: AgentSchema.instructions,
        visibility: AgentSchema.visibility,
        createdAt: AgentSchema.createdAt,
        updatedAt: AgentSchema.updatedAt,
        isBookmarked: sql<boolean>`${BookmarkSchema.id} IS NOT NULL`,
      })
      .from(AgentSchema)
      .innerJoin(UserSchema, eq(AgentSchema.userId, UserSchema.id))
      .leftJoin(
        BookmarkSchema,
        and(
          eq(BookmarkSchema.itemId, AgentSchema.id),
          eq(BookmarkSchema.userId, userId),
          eq(BookmarkSchema.itemType, "agent"),
        ),
      )
      .where(
        and(
          eq(AgentSchema.id, id),
          or(
            eq(AgentSchema.userId, userId), // Own agent
            // Shared (public/readonly) agents — same university only
            and(
              or(
                eq(AgentSchema.visibility, "public"),
                eq(AgentSchema.visibility, "readonly"),
              ),
              sharedWithinTenant(userId),
            ),
          ),
        ),
      );

    if (!result) return null;

    return {
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      instructions: result.instructions ?? {},
      isBookmarked: result.isBookmarked ?? false,
    };
  },

  async selectAgentsByUserId(userId) {
    const results = await db
      .select({
        id: AgentSchema.id,
        name: AgentSchema.name,
        description: AgentSchema.description,
        icon: AgentSchema.icon,
        userId: AgentSchema.userId,
        instructions: AgentSchema.instructions,
        visibility: AgentSchema.visibility,
        createdAt: AgentSchema.createdAt,
        updatedAt: AgentSchema.updatedAt,
        userName: UserSchema.name,
        userAvatar: UserSchema.image,
        isBookmarked: sql<boolean>`false`,
      })
      .from(AgentSchema)
      .innerJoin(UserSchema, eq(AgentSchema.userId, UserSchema.id))
      .where(eq(AgentSchema.userId, userId))
      .orderBy(desc(AgentSchema.createdAt));

    // Map database nulls to undefined and set defaults for owned agents
    return results.map((result) => ({
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      instructions: result.instructions ?? {},
      userName: result.userName ?? undefined,
      userAvatar: result.userAvatar ?? undefined,
      isBookmarked: false, // Always false for owned agents
    }));
  },

  async updateAgent(id, userId, agent) {
    const [result] = await db
      .update(AgentSchema)
      .set({
        ...agent,
        updatedAt: new Date(),
      })
      .where(
        and(
          // Only the owner may change an agent (instructions are a prompt
          // surface — "public" grants use, never edit)
          eq(AgentSchema.id, id),
          eq(AgentSchema.userId, userId),
        ),
      )
      .returning();

    if (!result) return null;

    return {
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      instructions: result.instructions ?? {},
    };
  },

  async deleteAgent(id, userId) {
    await db
      .delete(AgentSchema)
      .where(and(eq(AgentSchema.id, id), eq(AgentSchema.userId, userId)));
  },

  async selectAgents(
    currentUserId,
    filters = ["all"],
    limit = 50,
  ): Promise<AgentSummary[]> {
    let orConditions: any[] = [];

    // Build OR conditions based on filters array
    for (const filter of filters) {
      if (filter === "mine") {
        orConditions.push(eq(AgentSchema.userId, currentUserId));
      } else if (filter === "shared") {
        orConditions.push(
          and(
            ne(AgentSchema.userId, currentUserId),
            or(
              eq(AgentSchema.visibility, "public"),
              eq(AgentSchema.visibility, "readonly"),
            ),
            sharedWithinTenant(currentUserId),
          ),
        );
      } else if (filter === "bookmarked") {
        orConditions.push(
          and(
            ne(AgentSchema.userId, currentUserId),
            or(
              eq(AgentSchema.visibility, "public"),
              eq(AgentSchema.visibility, "readonly"),
            ),
            sharedWithinTenant(currentUserId),
            sql`${BookmarkSchema.id} IS NOT NULL`,
          ),
        );
      } else if (filter === "all") {
        // All available agents (mine + shared) - this overrides other filters
        orConditions = [
          or(
            // My agents
            eq(AgentSchema.userId, currentUserId),
            // Shared agents (same university, or super_admin-owned)
            and(
              ne(AgentSchema.userId, currentUserId),
              or(
                eq(AgentSchema.visibility, "public"),
                eq(AgentSchema.visibility, "readonly"),
              ),
              sharedWithinTenant(currentUserId),
            ),
          ),
        ];
        break; // "all" overrides everything else
      }
    }

    const results = await db
      .select({
        id: AgentSchema.id,
        name: AgentSchema.name,
        description: AgentSchema.description,
        icon: AgentSchema.icon,
        userId: AgentSchema.userId,
        // Exclude instructions from list queries for performance
        visibility: AgentSchema.visibility,
        createdAt: AgentSchema.createdAt,
        updatedAt: AgentSchema.updatedAt,
        userName: UserSchema.name,
        userAvatar: UserSchema.image,
        isBookmarked: sql<boolean>`CASE WHEN ${BookmarkSchema.id} IS NOT NULL THEN true ELSE false END`,
      })
      .from(AgentSchema)
      .innerJoin(UserSchema, eq(AgentSchema.userId, UserSchema.id))
      .leftJoin(
        BookmarkSchema,
        and(
          eq(BookmarkSchema.itemId, AgentSchema.id),
          eq(BookmarkSchema.itemType, "agent"),
          eq(BookmarkSchema.userId, currentUserId),
        ),
      )
      .where(orConditions.length > 1 ? or(...orConditions) : orConditions[0])
      .orderBy(
        // My agents first, then other shared agents
        sql`CASE WHEN ${AgentSchema.userId} = ${currentUserId} THEN 0 ELSE 1 END`,
        desc(AgentSchema.createdAt),
      )
      .limit(limit);

    // Map database nulls to undefined
    return results.map((result) => ({
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      userName: result.userName ?? undefined,
      userAvatar: result.userAvatar ?? undefined,
    }));
  },

  /**
   * Read access (destructive=false): owner, or a public/readonly agent whose
   * owner is in the viewer's university (or is super_admin).
   * Write access (destructive=true: update/delete): owner only.
   */
  async checkAccess(agentId, userId, destructive = false) {
    const [agent] = await db
      .select({
        visibility: AgentSchema.visibility,
        userId: AgentSchema.userId,
        sameTenant: sql<boolean>`${sharedWithinTenant(userId)}`,
      })
      .from(AgentSchema)
      .innerJoin(UserSchema, eq(AgentSchema.userId, UserSchema.id))
      .where(eq(AgentSchema.id, agentId));
    if (!agent) {
      return false;
    }
    if (userId == agent.userId) return true;
    if (destructive) return false;
    return (
      (agent.visibility === "public" || agent.visibility === "readonly") &&
      agent.sameTenant === true
    );
  },
};
