"use client";

import { useState, type FormEvent } from "react";
import type {
  MediaOwnerType,
  MediaUploadResult,
} from "@/features/media/types";

const maxImageSizeBytes = 10 * 1024 * 1024;

type ImageUploadFormProps = {
  ownerType: MediaOwnerType;
  ownerId: string;
  onUploaded?: (image: MediaUploadResult) => void;
};

type FormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; image: MediaUploadResult };

function isUploadResult(value: unknown): value is { data: MediaUploadResult } {
  if (typeof value !== "object" || value === null || !("data" in value)) {
    return false;
  }
  const data = value.data;
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "string" &&
    "key" in data &&
    typeof data.key === "string" &&
    "url" in data &&
    typeof data.url === "string"
  );
}

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

export function ImageUploadForm({
  ownerType,
  ownerId,
  onUploaded,
}: ImageUploadFormProps) {
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "idle" });

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      setFormState({ status: "error", message: "Choisissez une image." });
      return;
    }
    if (file.size > maxImageSizeBytes) {
      setFormState({
        status: "error",
        message: "L’image doit faire 10 Mo ou moins.",
      });
      return;
    }

    formData.set("ownerType", ownerType);
    formData.set("ownerId", ownerId);
    setIsUploading(true);

    try {
      const response = await fetch("/api/v1/media", {
        method: "POST",
        body: formData,
      });
      const body: unknown = await response.json();

      if (!response.ok) {
        setFormState({
          status: "error",
          message:
            getErrorMessage(body) ??
            "L’image n’a pas pu être téléversée. Réessayez.",
        });
        return;
      }

      if (!isUploadResult(body)) {
        setFormState({
          status: "error",
          message: "Réponse inattendue du serveur.",
        });
        return;
      }

      setFormState({ status: "success", image: body.data });
      onUploaded?.(body.data);
    } catch {
      setFormState({
        status: "error",
        message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="media-upload-form" onSubmit={handleSubmit}>
      <label className="media-upload-field">
        <span>Image</span>
        <input
          accept="image/avif,image/jpeg,image/png,image/webp"
          name="file"
          required
          type="file"
        />
        <span className="media-upload-hint">
          JPEG, PNG, WebP ou AVIF · 10 Mo max.
        </span>
      </label>

      <label className="media-upload-field">
        <span>Type de média</span>
        <select defaultValue="PHOTO" name="kind" required>
          <option value="PHOTO">Photographie</option>
          <option value="ILLUSTRATION">Illustration</option>
        </select>
      </label>

      <label className="media-upload-field">
        <span>Créateur ou photographe</span>
        <input autoComplete="name" maxLength={200} name="creator" required />
      </label>

      <label className="media-upload-field">
        <span>Provenance</span>
        <textarea maxLength={2000} name="provenance" required rows={3} />
      </label>

      <label className="media-upload-field">
        <span>Licence ou autorisation</span>
        <input maxLength={200} name="license" required />
      </label>

      <label className="media-upload-field">
        <span>Attribution (facultatif)</span>
        <input maxLength={1000} name="attribution" />
      </label>

      <label className="media-upload-field">
        <span>Conditions d’utilisation (facultatif)</span>
        <textarea maxLength={2000} name="usageTerms" rows={2} />
      </label>

      <label className="media-upload-field">
        <span>Description alternative (facultatif)</span>
        <textarea maxLength={500} name="altText" rows={2} />
      </label>

      <button
        className="media-upload-submit"
        disabled={isUploading}
        type="submit"
      >
        {isUploading ? "Envoi en cours…" : "Téléverser l’image"}
      </button>

      <p
        aria-live="polite"
        className={`media-upload-status media-upload-status-${formState.status}`}
        role={formState.status === "error" ? "alert" : "status"}
      >
        {formState.status === "error" ? formState.message : null}
        {formState.status === "success" ? (
          <>
            Image enregistrée.{" "}
            <a href={formState.image.url} rel="noreferrer" target="_blank">
              Ouvrir l’aperçu temporaire
            </a>
          </>
        ) : null}
      </p>
    </form>
  );
}
