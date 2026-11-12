"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  mode: AuthMode;
};

type FormMessage =
  | { type: "idle" }
  | { type: "error"; text: string }
  | { type: "success"; text: string };

function getCallbackURL(path: string): string {
  return new URL(path, window.location.origin).toString();
}

function getErrorMessage(
  status: number,
  mode: AuthMode,
  code?: string,
): string {
  if (code === "EMAIL_NOT_VERIFIED") {
    return "Votre adresse e-mail n’est pas encore vérifiée. Vous pouvez renvoyer le lien de confirmation.";
  }
  if (status === 401) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }
  if (status === 429) {
    return "Trop de tentatives. Réessayez dans quelques instants.";
  }
  return mode === "sign-up"
    ? "Impossible de créer le compte. Vérifiez les informations et réessayez."
    : "Impossible de vous connecter. Réessayez dans quelques instants.";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<FormMessage>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ type: "idle" });
    setUnverifiedEmail(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      if (isSignUp) {
        const name = String(formData.get("name") ?? "").trim();
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: getCallbackURL("/connexion"),
        });

        if (result.error) {
          setMessage({
            type: "error",
            text: getErrorMessage(result.error.status, mode),
          });
          return;
        }

        setMessage({
          type: "success",
          text: "Compte créé. Vérifiez votre adresse e-mail pour l’activer. En développement, le lien apparaît dans le terminal du serveur.",
        });
        return;
      }

      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: getCallbackURL("/"),
      });

      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(email);
        }
        setMessage({
          type: "error",
          text: getErrorMessage(
            result.error.status,
            mode,
            result.error.code,
          ),
        });
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "Le service d’authentification est momentanément indisponible.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) {
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "idle" });
    try {
      const result = await authClient.sendVerificationEmail({
        email: unverifiedEmail,
        callbackURL: getCallbackURL("/connexion"),
      });

      if (result.error) {
        setMessage({
          type: "error",
          text:
            result.error.status === 429
              ? "Trop de demandes. Réessayez dans quelques instants."
              : "Impossible d’envoyer le lien pour le moment. Réessayez plus tard.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Si cette adresse nécessite une vérification, un nouveau lien vient d’être envoyé. En développement, vérifiez le terminal du serveur.",
      });
    } catch {
      setMessage({
        type: "error",
        text: "Le service d’authentification est momentanément indisponible.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-form-card">
      <form className="auth-form" onSubmit={handleSubmit}>
        {isSignUp ? (
          <label className="auth-field">
            <span>Nom</span>
            <input
              autoComplete="name"
              maxLength={120}
              minLength={2}
              name="name"
              required
            />
          </label>
        ) : null}

        <label className="auth-field">
          <span>Adresse e-mail</span>
          <input
            autoComplete="email"
            maxLength={320}
            name="email"
            required
            type="email"
          />
        </label>

        <div className="auth-password-field">
          <label className="auth-field">
            <span>Mot de passe</span>
            <input
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          {!isSignUp ? (
            <Link className="auth-forgot-link" href="/mot-de-passe-oublie">
              Mot de passe oublié ?
            </Link>
          ) : null}
        </div>

        <button
          className="auth-submit"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Veuillez patienter…"
            : isSignUp
              ? "Créer mon compte"
              : "Me connecter"}
        </button>

        <p
          aria-live="polite"
          className={`auth-message auth-message-${message.type}`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.type === "idle" ? "" : message.text}
        </p>
      </form>

      {unverifiedEmail ? (
        <button
          className="auth-submit"
          disabled={isSubmitting}
          onClick={handleResendVerification}
          type="button"
        >
          Renvoyer le lien de vérification
        </button>
      ) : null}

      {isSignUp ? (
        <p className="auth-access-note">
          Chaque nouveau compte reçoit le rôle <code>user</code>. L’accès aux
          outils éditoriaux nécessite une attribution séparée par un
          administrateur.
        </p>
      ) : null}

      <p className="auth-switch">
        {isSignUp ? "Vous avez déjà un compte ?" : "Pas encore de compte ?"}{" "}
        <Link href={isSignUp ? "/connexion" : "/inscription"}>
          {isSignUp ? "Se connecter" : "Créer un compte"}
        </Link>
      </p>
    </div>
  );
}
