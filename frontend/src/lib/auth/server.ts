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
import { sendEmail } from "@/lib/email/smtp-service";

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
    sendVerificationEmail: async ({ email, url }) => {
      try {
        const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}${url}`;
        await sendEmail({
          to: email,
          subject: "Verify your MIVA University email",
          html: `
            <h2>Welcome to MIVA University Study Hub!</h2>
            <p>Please verify your email address to complete your registration.</p>
            <p><a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
            <p>Or copy and paste this link in your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
          `,
          text: `Verify your email: ${verificationUrl}`,
        });
        logger.info(`Verification email sent to ${email}`);
      } catch (error) {
        logger.error(`Failed to send verification email to ${email}:`, error);
        throw error;
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
