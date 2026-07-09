const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001";

function wrapInLayout(
  title: string,
  bodyContent: string,
  ctaUrl: string,
  ctaLabel: string,
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background-color:#1e293b;padding:24px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px;">
            ${bodyContent}
            <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
              <tr><td style="background-color:#2563eb;border-radius:6px;padding:10px 24px;">
                <a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">
                  ${ctaLabel}
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 24px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">Askly</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildNewContentEmail(params: {
  firstName: string;
  courseCode: string;
  materialTitle: string;
}): { subject: string; html: string; text: string } {
  const { firstName, courseCode, materialTitle } = params;
  const ctaUrl = `${APP_URL}/student/materials`;

  const subject = `New material in ${courseCode}`;

  const html = wrapInLayout(
    `New material in ${courseCode}`,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Hi ${firstName},</p>
     <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">'${materialTitle}' was just added to ${courseCode}. Open it in Askly.</p>`,
    ctaUrl,
    "View materials",
  );

  const text = `Hi ${firstName},

'${materialTitle}' was just added to ${courseCode}. Open it in Askly.

View materials: ${ctaUrl}

Askly`;

  return { subject, html, text };
}

export function buildCourseNeglectedEmail(params: {
  firstName: string;
  courseCode: string;
  daysSince: number;
}): { subject: string; html: string; text: string } {
  const { firstName, courseCode, daysSince } = params;
  const ctaUrl = `${APP_URL}/student/progress`;

  const subject = `Haven't seen you in ${courseCode}`;

  const bodyText =
    daysSince >= 999
      ? `You haven't opened anything in ${courseCode} yet.`
      : `You haven't opened anything in ${courseCode} for ${daysSince} days.`;

  const html = wrapInLayout(
    `Haven't seen you in ${courseCode}`,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">Hi ${firstName},</p>
     <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">${bodyText}</p>`,
    ctaUrl,
    "Check your progress",
  );

  const text = `Hi ${firstName},

${bodyText}

Check your progress: ${ctaUrl}

Askly`;

  return { subject, html, text };
}
