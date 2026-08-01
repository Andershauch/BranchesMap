import "server-only";

import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY mangler i miljøet.");
  }

  return new Resend(apiKey);
}

function getMailFromAddress() {
  return process.env.APP_MAIL_FROM?.trim() || "JOBVEJ <onboarding@resend.dev>";
}

export async function sendUserInvitationEmail({
  to,
  inviteUrl,
  locale,
  role,
}: {
  to: string;
  inviteUrl: string;
  locale: string;
  role: "user" | "admin";
}) {
  const resend = getResendClient();
  const subject =
    locale === "da" ? "Du er inviteret til JOBVEJ" : "You have been invited to JOBVEJ";
  const intro =
    locale === "da"
      ? `Du er inviteret til JOBVEJ som ${role === "admin" ? "admin" : "bruger"}.`
      : `You have been invited to JOBVEJ as ${role === "admin" ? "an admin" : "a user"}.`;
  const cta = locale === "da" ? "Opret din konto" : "Create your account";
  const fallback =
    locale === "da"
      ? "Hvis knappen ikke virker, kan du kopiere dette link ind i din browser:"
      : "If the button does not work, copy this link into your browser:";

  const { error } = await resend.emails.send({
    from: getMailFromAddress(),
    to: [to],
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="margin:0 0 16px;font-size:24px;">JOBVEJ</h1>
        <p style="margin:0 0 16px;line-height:1.6;">${intro}</p>
        <p style="margin:0 0 24px;line-height:1.6;">
          <a href="${inviteUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">${cta}</a>
        </p>
        <p style="margin:0 0 8px;line-height:1.6;">${fallback}</p>
        <p style="margin:0;word-break:break-all;line-height:1.6;">${inviteUrl}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Kunne ikke sende invitationsmail.");
  }
}
