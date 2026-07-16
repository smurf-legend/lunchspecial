import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "LunchSpecial <team@lunchspecial.com.au>";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your LunchSpecial password",
    html: `
      <p>Someone requested a password reset for your LunchSpecial account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });

  if (error) {
    console.error(`[mail] Failed to send password reset email to ${to}:`, error);
  }
}
