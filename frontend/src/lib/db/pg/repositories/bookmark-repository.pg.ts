import { and, eq } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { BookmarkSchema } from "../schema.pg";
import { pgAgentRepository } from "./agent-repository.pg";

export interface BookmarkRepository {
  createBookmark(
    userId: string,
    itemId: string,
    itemType: "agent" | "workflow",
  ): Promise<void>;

  removeBookmark(
    userId: string,
    itemId: string,
    itemType: "agent" | "workflow",
  ): Promise<void>;

  toggleBookmark(
    userId: string,
    itemId: string,
    itemType: "agent" | "workflow",
    isCurrentlyBookmarked: boolean,
  ): Promise<boolean>;

  checkItemAccess(
    itemId: string,
    itemType: "agent" | "workflow",
    userId: string,
  ): Promise<boolean>;
}

export const pgBookmarkRepository: BookmarkRepository = {
  async createBookmark(userId, itemId, itemType) {
    await db
      .insert(BookmarkSchema)
      .values({
        userId,
        itemId,
        itemType,
      })
      .onConflictDoNothing();
  },

  async removeBookmark(userId, itemId, itemType) {
    await db
      .delete(BookmarkSchema)
      .where(
        and(
          eq(BookmarkSchema.userId, userId),
          eq(BookmarkSchema.itemId, itemId),
          eq(BookmarkSchema.itemType, itemType),
        ),
      );
  },

  async toggleBookmark(userId, itemId, itemType, isCurrentlyBookmarked) {
    if (isCurrentlyBookmarked) {
      await this.removeBookmark(userId, itemId, itemType);
      return false;
    } else {
      await this.createBookmark(userId, itemId, itemType);
      return true;
    }
  },

  async checkItemAccess(itemId, itemType, userId) {
    if (itemType === "agent") {
      // Same rule as viewing: own agent, or a shared (public/readonly) agent
      // whose owner is in the user's university (or is super_admin)
      return pgAgentRepository.checkAccess(itemId, userId);
    }

    // TODO: Add workflow access check when workflows support bookmarking
    return false;
  },
};
