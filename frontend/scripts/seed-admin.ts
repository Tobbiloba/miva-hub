import "load-env";
import { pgDb as db } from "lib/db/pg/db.pg";
import { UserSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "oluwatobi.salau@miva.edu.ng";

async function seedAdmin() {
  console.log(`🔑 Ensuring ${ADMIN_EMAIL} has admin role...`);

  const [user] = await db
    .select({ id: UserSchema.id, email: UserSchema.email, role: UserSchema.role })
    .from(UserSchema)
    .where(eq(UserSchema.email, ADMIN_EMAIL));

  if (!user) {
    console.error(`❌ No user found with email ${ADMIN_EMAIL}. Register first.`);
    process.exit(1);
  }

  if (user.role === "admin") {
    console.log(`✅ ${ADMIN_EMAIL} already has admin role. No changes needed.`);
    process.exit(0);
  }

  await db
    .update(UserSchema)
    .set({ role: "admin" })
    .where(eq(UserSchema.email, ADMIN_EMAIL));

  console.log(`✅ Updated ${ADMIN_EMAIL} role: ${user.role} → admin`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Failed to seed admin:", err);
  process.exit(1);
});
