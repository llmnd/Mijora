"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PublishButtonProps = {
  contentId: string;
  contentType: "dish" | "recipe";
  contentTitle: string;
  isPublished: boolean;
};

export function PublishButton({
  contentId,
  contentType,
  contentTitle,
  isPublished,
}: PublishButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updatePublication() {
    if (
      isPublished &&
      !window.confirm(
        contentType === "dish"
          ? `Dépublier « ${contentTitle} » ? Les recettes publiées associées seront aussi retirées de l’accueil.`
          : `Dépublier « ${contentTitle} » ? Cette recette ne sera plus visible sur l’accueil.`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/editorial/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentId,
          contentType,
          action: isPublished ? "unpublish" : "publish",
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "object" &&
          result.error !== null &&
          "message" in result.error &&
          typeof result.error.message === "string"
            ? result.error.message
            : "La publication a échoué. Réessayez.";
        setMessage(errorMessage);
        return;
      }
      setMessage(
        isPublished
          ? contentType === "dish"
            ? "Plat dépublié. Ses recettes publiées ont également été retirées de l’accueil."
            : "Recette dépubliée."
          : contentType === "recipe"
            ? "Recette publiée sur l’accueil."
            : "Plat publié. Il peut maintenant accueillir une recette publique.",
      );
      router.refresh();
    } catch {
      setMessage("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="editorial-publish-control">
      <button
        aria-label={`${isPublished ? "Dépublier" : "Publier"} ${contentTitle}`}
        className={`media-upload-submit editorial-publish-button${isPublished ? " editorial-unpublish-button" : ""}`}
        disabled={isSubmitting}
        onClick={updatePublication}
        type="button"
      >
        {isSubmitting
          ? isPublished
            ? "Dépublication…"
            : "Publication…"
          : isPublished
            ? "Dépublier"
            : "Publier"}
      </button>
      <p aria-live="polite" className="media-upload-status" role="status">
        {message}
      </p>
    </div>
  );
}
