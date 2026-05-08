import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordReset(to: string, resetUrl: string) {
  await resend.emails.send({
    from: "DevPortal <noreply@devportal.dev>",
    to,
    subject: "Reset your DevPortal password",
    html: `
      <p>You requested a password reset for your DevPortal account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}
