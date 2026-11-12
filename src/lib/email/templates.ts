export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createBrandedEmail({
  to,
  subject,
  heading,
  message,
  actionLabel,
  actionUrl,
}: {
  to: string;
  subject: string;
  heading: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
}): TransactionalEmail {
  const parsedUrl = new URL(actionUrl);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new TypeError("Email action URL must use HTTP or HTTPS.");
  }

  const safeHeading = escapeHtml(heading);
  const safeMessage = escapeHtml(message);
  const safeLabel = escapeHtml(actionLabel);
  const safeUrl = escapeHtml(parsedUrl.toString());

  return {
    to,
    subject,
    text: `${heading}\n\n${message}\n\n${actionLabel}: ${parsedUrl.toString()}\n\nMijora`,
    html: `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f3efe6;color:#172a3a;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf8;padding:40px 32px">
          <tr><td>
            <p style="margin:0 0 32px;color:#172a3a;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;letter-spacing:-1px">mijora<span style="color:#587261">.</span></p>
            <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:normal;line-height:1.2">${safeHeading}</h1>
            <p style="margin:0 0 28px;color:#41525d;font-size:16px;line-height:1.7">${safeMessage}</p>
            <p style="margin:0 0 32px">
              <a href="${safeUrl}" style="display:inline-block;border-radius:999px;background:#172a3a;padding:14px 22px;color:#fffdf8;font-size:14px;font-weight:bold;text-decoration:none">${safeLabel}</a>
            </p>
            <p style="margin:0;color:#41525d;font-size:12px;line-height:1.6">Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

export function createVerificationEmail(
  to: string,
  actionUrl: string,
): TransactionalEmail {
  return createBrandedEmail({
    to,
    subject: "Confirmez votre adresse — Mijora",
    heading: "Bienvenue chez Mijora",
    message:
      "Confirmez votre adresse e-mail pour terminer la création de votre compte.",
    actionLabel: "Confirmer mon adresse",
    actionUrl,
  });
}

export function createPasswordResetEmail(
  to: string,
  actionUrl: string,
): TransactionalEmail {
  return createBrandedEmail({
    to,
    subject: "Réinitialisez votre mot de passe — Mijora",
    heading: "Réinitialisation du mot de passe",
    message:
      "Une demande de réinitialisation a été faite pour votre compte. Utilisez le lien pour choisir un nouveau mot de passe.",
    actionLabel: "Choisir un nouveau mot de passe",
    actionUrl,
  });
}
