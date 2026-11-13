"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ArchiveContentButtonProps = {
  contentId: string;
  contentTitle: string;
  contentType: "dish" | "recipe";
  isArchived: boolean;
};

function getErrorMessage(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return undefined;
  }
  const error = value.error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return undefined;
}

export function ArchiveContentButton({
  contentId,
  contentTitle,
  contentType,
  isArchived,
}: ArchiveContentButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updateArchiveStatus() {
    if (
      !isArchived &&
      !window.confirm(
        contentType === "dish"
          ? `Archiver « ${contentTitle} » ? Ses recettes publiées seront aussi retirées de l’accueil. Le contenu restera récupérable.`
          : `Archiver « ${contentTitle} » ? La recette ne sera plus visible sur l’accueil. Le contenu restera récupérable.`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/editorial/archive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentId,
          contentType,
          action: isArchived ? "restore" : "archive",
        }),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        setMessage(
          getErrorMessage(result) ?? "L’action a échoué. Réessayez.",
        );
        return;
      }

      setMessage(isArchived ? "Contenu restauré en brouillon." : "Contenu archivé.");
      router.refresh();
    } catch {
      setMessage("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="editorial-archive-control">
      <button
        aria-label={`${isArchived ? "Restaurer" : "Archiver"} ${contentTitle}`}
        className={`editorial-action-button${isArchived ? "" : " editorial-archive-button"}`}
        disabled={isSubmitting}
        onClick={updateArchiveStatus}
        type="button"
      >
        {isSubmitting
          ? isArchived
            ? "Restauration…"
            : "Archivage…"
          : isArchived
            ? "Restaurer"
            : "Archiver"}
      </button>
      <p aria-live="polite" className="media-upload-status" role="status">
        {message}
      </p>
    </div>
  );
}
