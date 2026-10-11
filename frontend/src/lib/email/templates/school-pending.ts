const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

function layout(title: string, paragraphs: string[], cta: string) {
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${p}</p>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background-color:#1e293b;padding:28px 24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${title}</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          ${body}
          <a href="${APP_URL}/" style="display:inline-block;background-color:#1e293b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:600;">${cta}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Sent at sign-up when the student's school isn't on Askly yet */
export function buildSchoolPendingEmail(input: {
  firstName: string;
  schoolName: string;
}) {
  const lines = (name: string, school: string) => [
    `Hi ${name},`,
    `Your account is ready. ${school} isn't on Askly yet, so we've noted your request and we'll email you as soon as it's added.`,
    `Until then you can already ask questions, snap a photo of a problem, make flashcards and keep track of your deadlines. Once ${school} is added, Askly will also answer from your own course materials.`,
  ];
  return {
    subject: `Welcome to Askly, ${input.firstName}`,
    html: layout(
      "Welcome to Askly",
      lines(escape(input.firstName), escape(input.schoolName)),
      "Open Askly",
    ),
    text: `${lines(input.firstName, input.schoolName).join("\n\n")}\n\n${APP_URL}/`,
  };
}

/** Sent when a super admin adds the student's school */
export function buildSchoolAddedEmail(input: {
  firstName: string;
  universityName: string;
}) {
  const lines = (name: string, uni: string) => [
    `Hi ${name},`,
    `Good news: ${uni} is now on Askly. Your account is linked to it, so you can add your courses and Askly will answer from your course materials.`,
    "Open Askly and go to My Courses to add yours.",
  ];
  return {
    subject: `${input.universityName} is now on Askly`,
    html: layout(
      `${escape(input.universityName)} is on Askly`,
      lines(escape(input.firstName), escape(input.universityName)),
      "Add my courses",
    ),
    text: `${lines(input.firstName, input.universityName).join("\n\n")}\n\n${APP_URL}/`,
  };
}
