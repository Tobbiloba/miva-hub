import { User, UserPreferences, UserRepository } from "app-types/user";
import { eq } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import { type UserEntity, UserSchema } from "../schema.pg";

export const pgUserRepository: UserRepository = {
  existsByEmail: async (email: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.email, email));
    return result.length > 0;
  },
  updateUser: async (
    id: string,
    user: Pick<User, "name" | "image">,
  ): Promise<User> => {
    const [result] = await db
      .update(UserSchema)
      .set({
        name: user.name,
        image: user.image,
        updatedAt: new Date(),
      })
      .where(eq(UserSchema.id, id))
      .returning();
    const row = result as UserEntity;
    return {
      ...row,
      preferences: row.preferences ?? undefined,
    };
  },
  updatePreferences: async (
    userId: string,
    preferences: UserPreferences,
  ): Promise<User> => {
    const [result] = await db
      .update(UserSchema)
      .set({
        preferences,
        updatedAt: new Date(),
      })
      .where(eq(UserSchema.id, userId))
      .returning();
    const row = result as UserEntity;
    return {
      ...row,
      preferences: row.preferences ?? undefined,
    };
  },
  getPreferences: async (userId: string) => {
    const [result] = await db
      .select({ preferences: UserSchema.preferences })
      .from(UserSchema)
      .where(eq(UserSchema.id, userId));
    return result?.preferences ?? null;
  },
  findById: async (userId: string) => {
    const [result] = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, userId));
    return (result as User) ?? null;
  },
};
