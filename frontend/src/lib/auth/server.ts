import "server-only";
import { sendEmail } from "@/lib/email/smtp-service";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { pgDb } from "lib/db/pg/db.pg";
import {
  AccountSchema,
  SessionSchema,
  UserSchema,
  VerificationSchema,
} from "lib/db/pg/schema.pg";
import { headers } from "next/headers";
import { toast } from "sonner";
import { getAuthConfig } from "./config";

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
  trustedOrigins: ["chrome-extension://*"],
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
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/forget-password": { window: 60, max: 3 },
      "/request-password-reset": { window: 60, max: 3 },
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 24 hours
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendEmail({
          to: user.email,
          subject: "Verify your email address",
          html: `
            <h2>Welcome to Askly!</h2>
            <p>Please verify your email address to complete your registration.</p>
            <p><a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
            <p>Or copy and paste this link in your browser:</p>
            <p>${url}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
          `,
          text: `Verify your email: ${url}`,
        });
        logger.info(`Verification email sent to ${user.email}`);
      } catch (error) {
        logger.error(
          `Failed to send verification email to ${user.email}:`,
          error,
        );
        throw error;
      }
    },
  },
  user: {
    additionalFields: {
      // input: false — these are set server-side only; never accepted from
      // client signup/update payloads (prevents role self-escalation).
      role: {
        type: "string",
        nullable: true,
        defaultValue: null,
        input: false,
      },
      enrollmentStatus: {
        type: "string",
        nullable: true,
        defaultValue: null,
        input: false,
      },
      studentId: {
        type: "string",
        nullable: true,
        defaultValue: null,
        input: false,
      },
      academicYear: {
        type: "string",
        nullable: true,
        defaultValue: null,
        input: false,
      },
      year: {
        type: "string",
        nullable: true,
        defaultValue: null,
        input: false,
      },
      major: {
        type: "string",
        nullable: true,
        defaultValue: null,
        input: false,
      },
      isVerified: { type: "boolean", defaultValue: false, input: false },
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
    disableCSRFCheck: process.env.NODE_ENV !== "production",
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
