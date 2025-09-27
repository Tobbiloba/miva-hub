import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { pgDb } from "lib/db/pg/db.pg";
import { headers } from "next/headers";
import { toast } from "sonner";
import { eq } from "drizzle-orm";
import {
  AccountSchema,
  SessionSchema,
  UserSchema,
  VerificationSchema,
} from "lib/db/pg/schema.pg";
import { getAuthConfig } from "./config";
import { 
  validateSchoolEmail, 
  prepareUserRegistrationData
} from "lib/utils/email-validation";

import logger from "logger";
import { redirect } from "next/navigation";

const {
  emailAndPasswordEnabled,
  signUpEnabled,
  socialAuthenticationProviders,
} = getAuthConfig();

export const auth = betterAuth({
  plugins: [nextCookies()],
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  database: drizzleAdapter(pgDb, {
    provider: "pg",
    schema: {
      user: UserSchema,
      session: SessionSchema,
      account: AccountSchema,
      verification: VerificationSchema,
    },
  }),
  emailAndPassword: {
    enabled: emailAndPasswordEnabled,
    disableSignUp: !signUpEnabled,
    requireEmailVerification: true,
    onValidate: async ({ email }) => {
      // Validate school email before registration
      const validation = validateSchoolEmail(email);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
    },
    onSignUp: async ({ user }) => {
      try {
        // Prepare academic user data
        const userData = prepareUserRegistrationData({
          email: user.email,
          name: user.name,
        });
        
        // Update the user record with academic fields
        await pgDb
          .update(UserSchema)
          .set({
            studentId: userData.studentId,
            role: userData.role,
            academicYear: userData.academicYear,
            enrollmentStatus: userData.enrollmentStatus,
          })
          .where(eq(UserSchema.id, user.id));
          
        logger.info(`User ${user.id} registered with academic fields:`, {
          role: userData.role,
          academicYear: userData.academicYear,
          studentId: userData.studentId,
        });
      } catch (error) {
        logger.error("Failed to set academic fields for user:", error);
        // Don't throw here as the user is already created
      }
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60,
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },

  advanced: {
    useSecureCookies:
      process.env.NO_HTTPS == "1"
        ? false
        : process.env.NODE_ENV === "production",
    database: {
      generateId: false,
    },
  },
  account: {
    accountLinking: {
      trustedProviders: (
        Object.keys(
          socialAuthenticationProviders,
        ) as (keyof typeof socialAuthenticationProviders)[]
      ).filter((key) => socialAuthenticationProviders[key]),
    },
  },
  fetchOptions: {
    onError(e) {
      if (e.error.status === 429) {
        toast.error("Too many requests. Please try again later.");
      }
    },
  },
  socialProviders: socialAuthenticationProviders,
});

export const getSession = async () => {
  "use server";
  const session = await auth.api
    .getSession({
      headers: await headers(),
    })
    .catch((e) => {
      logger.error(e);
      return null;
    });
  if (!session) {
    logger.error("No session found");
    redirect("/sign-in");
  }
  return session!;
};
