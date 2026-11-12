import type { TransactionalEmail } from "@/lib/email/templates";

export async function sendTransactionalEmail(
  email: TransactionalEmail,
): Promise<void> {
  const mode = process.env.EMAIL_MODE ?? "console";

  if (mode === "console" && process.env.NODE_ENV !== "production") {
    console.info("[mijora:email:test]", {
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
    return;
  }

  if (mode === "console") {
    throw new Error("Console email delivery is disabled in production.");
  }

  throw new Error(
    `Email delivery mode "${mode}" has no approved provider configured.`,
  );
}
