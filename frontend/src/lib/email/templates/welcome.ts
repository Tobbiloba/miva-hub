const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface WelcomeEmailParams {
  firstName: string;
  courseCount: number;
  semester: string;
  academicYear: string;
}

export function buildWelcomeEmail({
  firstName,
  courseCount,
  semester,
  academicYear,
}: WelcomeEmailParams): { subject: string; html: string; text: string } {
  const ctaUrl = `${APP_URL}/student`;
  const semesterLabel =
    semester === "first" ? "First Semester" : "Second Semester";

  const subject = `Welcome to Askly, ${firstName}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background-color:#1e293b;padding:28px 24px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Welcome to Askly</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 24px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
              Hi ${firstName},
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
              Your account is set up and you're enrolled in <strong>${courseCount} course${courseCount !== 1 ? "s" : ""}</strong> for ${semesterLabel} ${academicYear}. You can start studying now.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr><td style="background-color:#2563eb;border-radius:6px;padding:12px 28px;">
                <a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">
                  Open your dashboard
                </a>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
              Questions? Reply to this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Askly &mdash; MIVA University
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hi ${firstName},

Your account is set up and you're enrolled in ${courseCount} course${courseCount !== 1 ? "s" : ""} for ${semesterLabel} ${academicYear}. You can start studying now.

Open your dashboard: ${ctaUrl}

Questions? Reply to this email.

Askly — MIVA University`;

  return { subject, html, text };
}
