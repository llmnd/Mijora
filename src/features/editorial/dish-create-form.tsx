"use client";

import { useState, type FormEvent } from "react";

type CreatedDish = {
  id: string;
  name: string;
  slug: string;
};

type DishCreateFormProps = {
  onCreated: (dish: CreatedDish) => void;
};

type FormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

function isCreatedDish(value: unknown): value is { data: CreatedDish } {
  if (typeof value !== "object" || value === null || !("data" in value)) {
    return false;
  }
  const data = value.data;
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "string" &&
    "name" in data &&
    typeof data.name === "string" &&
    "slug" in data &&
    typeof data.slug === "string"
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

export function DishCreateForm({ onCreated }: DishCreateFormProps) {
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "idle" });
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      sourceTitle: String(formData.get("sourceTitle") ?? "").trim(),
      sourceUrl: String(formData.get("sourceUrl") ?? "").trim(),
      sourceFact: String(formData.get("sourceFact") ?? "").trim(),
    };

    try {
      const response = await fetch("/api/v1/editorial/dishes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result: unknown = await response.json();

      if (!response.ok) {
        setFormState({
          status: "error",
          message:
            getErrorMessage(result) ??
            "Le plat n’a pas pu être enregistré. Réessayez.",
        });
        return;
      }

      if (!isCreatedDish(result)) {
        setFormState({
          status: "error",
          message: "Réponse inattendue du serveur.",
        });
        return;
      }

      onCreated(result.data);
      form.reset();
      setFormState({
        status: "success",
        message: "Plat enregistré en brouillon. Il est prêt à recevoir une image.",
      });
    } catch {
      setFormState({
        status: "error",
        message: "Impossible de joindre le serveur. Vérifiez votre connexion.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="media-upload-form" onSubmit={handleSubmit}>
      <label className="media-upload-field">
        <span>Nom du plat</span>
        <input maxLength={120} minLength={2} name="name" required />
      </label>

      <label className="media-upload-field">
        <span>Description originale</span>
        <textarea
          maxLength={2000}
          minLength={20}
          name="description"
          required
          rows={4}
        />
      </label>

      <label className="media-upload-field">
        <span>Titre de la source</span>
        <input maxLength={200} name="sourceTitle" required />
      </label>

      <label className="media-upload-field">
        <span>URL de la source</span>
        <input maxLength={2000} name="sourceUrl" required type="url" />
      </label>

      <label className="media-upload-field">
        <span>Fait vérifié dans cette source</span>
        <textarea
          maxLength={1000}
          minLength={10}
          name="sourceFact"
          required
          rows={3}
        />
      </label>

      <p className="media-upload-hint">
        Chaque nouveau plat est enregistré en brouillon avec sa source; rien
        n’est publié automatiquement.
      </p>

      <button
        className="media-upload-submit"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Enregistrement…" : "Créer le plat"}
      </button>

      <p
        aria-live="polite"
        className={`media-upload-status media-upload-status-${formState.status}`}
        role={formState.status === "error" ? "alert" : "status"}
      >
        {formState.status === "idle" ? null : formState.message}
      </p>
    </form>
  );
}
