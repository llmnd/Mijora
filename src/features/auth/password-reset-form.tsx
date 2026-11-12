"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type PasswordResetFormProps = {
  mode: "request" | "reset";
};

type FormMessage =
  | { type: "idle" }
  | { type: "error"; text: string }
  | { type: "success"; text: string };

export function PasswordResetForm({ mode }: PasswordResetFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<FormMessage>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ type: "idle" });
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      if (mode === "request") {
        const email = String(formData.get("email") ?? "").trim();
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: new URL(
            "/reinitialiser-mot-de-passe",
            window.location.origin,
          ).toString(),
        });

        if (result.error) {
          setMessage({
            type: "error",
            text:
              result.error.status === 429
                ? "Trop de demandes. Réessayez dans quelques instants."
                : "Impossible de traiter la demande pour le moment.",
          });
          return;
        }

        setMessage({
          type: "success",
          text: "Si cette adresse correspond à un compte, un lien de réinitialisation va être envoyé. En développement, vérifiez le terminal du serveur.",
        });
        return;
      }

      const token = new URLSearchParams(window.location.search).get("token");
      if (!token) {
        setMessage({
          type: "error",
          text: "Ce lien est absent ou invalide. Demandez un nouveau lien.",
        });
        return;
      }

      const newPassword = String(formData.get("newPassword") ?? "");
      const passwordConfirmation = String(
        formData.get("passwordConfirmation") ?? "",
      );
      if (newPassword !== passwordConfirmation) {
        setMessage({
          type: "error",
          text: "Les deux mots de passe ne correspondent pas.",
        });
        return;
      }

      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) {
        setMessage({
          type: "error",
          text:
            result.error.status === 400
              ? "Ce lien est invalide ou expiré. Demandez-en un nouveau."
              : "Impossible de modifier le mot de passe pour le moment.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Votre mot de passe a été modifié. Vous pouvez vous connecter.",
      });
      router.replace("/connexion");
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

  return (
    <div className="auth-form-card">
      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "request" ? (
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
        ) : (
          <>
            <label className="auth-field">
              <span>Nouveau mot de passe</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="newPassword"
                required
                type="password"
              />
            </label>
            <label className="auth-field">
              <span>Confirmer le mot de passe</span>
              <input
                autoComplete="new-password"
                minLength={8}
                name="passwordConfirmation"
                required
                type="password"
              />
            </label>
          </>
        )}

        <button
          className="auth-submit"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting
            ? "Veuillez patienter…"
            : mode === "request"
              ? "Envoyer un lien"
              : "Enregistrer le nouveau mot de passe"}
        </button>

        <p
          aria-live="polite"
          className={`auth-message auth-message-${message.type}`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.type === "idle" ? "" : message.text}
        </p>
      </form>

      <p className="auth-switch">
        <Link href="/connexion">Retour à la connexion</Link>
      </p>
    </div>
  );
}
