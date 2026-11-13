"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type EditorialContentType = "dish" | "recipe";

type EditContentFormProps = {
  contentId: string;
  contentType: EditorialContentType;
  description: string | null;
  title: string;
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

export function EditContentForm({
  contentId,
  contentType,
  description,
  title,
}: EditContentFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const updatedTitle = String(formData.get("title") ?? "").trim();
    const updatedDescription = String(formData.get("description") ?? "").trim();
    const body =
      contentType === "dish"
        ? { id: contentId, name: updatedTitle, description: updatedDescription }
        : { id: contentId, title: updatedTitle, description: updatedDescription };

    try {
      const response = await fetch(
        `/api/v1/editorial/${contentType === "dish" ? "dishes" : "recipes"}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result: unknown = await response.json();

      if (!response.ok) {
        setMessage(
          getErrorMessage(result) ?? "La modification a échoué. Réessayez.",
        );
        return;
      }

      setMessage("Modifications enregistrées.");
      router.refresh();
    } catch {
      setMessage("Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="editorial-inline-form" onSubmit={handleSubmit}>
      <label className="media-upload-field">
        <span>{contentType === "dish" ? "Nom du plat" : "Titre de la recette"}</span>
        <input
          defaultValue={title}
          maxLength={contentType === "dish" ? 120 : 160}
          minLength={2}
          name="title"
          required
        />
      </label>
      <label className="media-upload-field">
        <span>Description</span>
        <textarea
          defaultValue={description ?? ""}
          maxLength={2000}
          minLength={20}
          name="description"
          required
          rows={4}
        />
      </label>
      <button
        className="media-upload-submit"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Enregistrement…" : "Enregistrer"}
      </button>
      <p aria-live="polite" className="media-upload-status" role="status">
        {message}
      </p>
    </form>
  );
}
