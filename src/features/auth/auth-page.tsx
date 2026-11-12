import Link from "next/link";
import { AuthForm } from "@/features/auth/auth-form";
import { PasswordResetForm } from "@/features/auth/password-reset-form";

type AuthPageProps = {
  mode: "sign-in" | "sign-up" | "request-reset" | "reset-password";
};

const pageContent = {
  "sign-in": {
    title: "Ravi de vous retrouver.",
    eyebrow: "Votre espace Mijora",
    description:
      "Connectez-vous pour retrouver votre espace et vos préférences.",
  },
  "sign-up": {
    title: "Bienvenue chez Mijora.",
    eyebrow: "Créer un compte",
    description:
      "Inscrivez-vous pour préparer votre espace de découverte culinaire.",
  },
  "request-reset": {
    title: "Retrouvons votre accès.",
    eyebrow: "Mot de passe oublié",
    description:
      "Indiquez l’adresse associée au compte. Si elle existe, nous enverrons un lien de réinitialisation.",
  },
  "reset-password": {
    title: "Choisissez un nouveau mot de passe.",
    eyebrow: "Sécuriser votre compte",
    description:
      "Choisissez un mot de passe que vous n’utilisez pas déjà ailleurs.",
  },
} as const;

export function AuthPage({ mode }: AuthPageProps) {
  const content = pageContent[mode];

  return (
    <main className="page-shell auth-page">
      <header className="auth-page-header">
        <Link aria-label="Mijora, accueil" className="brand" href="/">
          mijora<span aria-hidden="true">.</span>
        </Link>
        <Link className="auth-back-link" href="/">
          Retour à l’accueil
        </Link>
      </header>

      <section aria-labelledby="auth-title" className="auth-content">
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 id="auth-title">{content.title}</h1>
        <p className="auth-description">{content.description}</p>
        {mode === "sign-in" || mode === "sign-up" ? (
          <AuthForm mode={mode} />
        ) : (
          <PasswordResetForm
            mode={mode === "request-reset" ? "request" : "reset"}
          />
        )}
      </section>
    </main>
  );
}
