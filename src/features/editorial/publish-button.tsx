"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PublishButtonProps = {
  contentId: string;
  contentType: "dish" | "recipe";
};

export function PublishButton({
  contentId,
  contentType,
}: PublishButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  async function publish() {
    setIsPublishing(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/editorial/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentId, contentType }),
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
        contentType === "recipe"
          ? "Recette publiée sur l’accueil."
          : "Plat publié. Il peut maintenant accueillir une recette publique.",
      );
      router.refresh();
    } catch {
      setMessage("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="editorial-publish-control">
      <button
        className="media-upload-submit editorial-publish-button"
        disabled={isPublishing}
        onClick={publish}
        type="button"
      >
        {isPublishing ? "Publication…" : "Publier"}
      </button>
      <p aria-live="polite" className="media-upload-status" role="status">
        {message}
      </p>
    </div>
  );
}
