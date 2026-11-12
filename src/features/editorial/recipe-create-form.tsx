"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type DishOption = {
  id: string;
  label: string;
};

type CreatedRecipe = {
  id: string;
  title: string;
  slug: string;
  dishId: string;
};

type RecipeCreateFormProps = {
  dishes: DishOption[];
  onCreated: (recipe: CreatedRecipe) => void;
};

type FormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

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

function isCreatedRecipe(value: unknown): value is { data: CreatedRecipe } {
  if (typeof value !== "object" || value === null || !("data" in value)) {
    return false;
  }
  const data = value.data;
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    typeof data.id === "string" &&
    "title" in data &&
    typeof data.title === "string" &&
    "slug" in data &&
    typeof data.slug === "string" &&
    "dishId" in data &&
    typeof data.dishId === "string"
  );
}

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function RecipeCreateForm({
  dishes,
  onCreated,
}: RecipeCreateFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "idle" });
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const optionalNumber = (name: string) => {
      const value = String(formData.get(name) ?? "").trim();
      return value ? Number(value) : undefined;
    };
    const body = {
      dishId: String(formData.get("dishId") ?? ""),
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      servings: Number(formData.get("servings")),
      preparationTimeMinutes: optionalNumber("preparationTimeMinutes"),
      cookingTimeMinutes: optionalNumber("cookingTimeMinutes"),
      ingredients: parseLines(String(formData.get("ingredients") ?? "")).map(
        (line) => {
          const [name, ...amountParts] = line.split("|");
          return { name: name?.trim() ?? "", amount: amountParts.join("|").trim() };
        },
      ),
      steps: parseLines(String(formData.get("steps") ?? "")),
      sourceTitle: String(formData.get("sourceTitle") ?? "").trim(),
      sourceUrl: String(formData.get("sourceUrl") ?? "").trim(),
      sourceFact: String(formData.get("sourceFact") ?? "").trim(),
    };

    try {
      const response = await fetch("/api/v1/editorial/recipes", {
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
            "La recette n’a pas pu être enregistrée. Réessayez.",
        });
        return;
      }
      if (!isCreatedRecipe(result)) {
        setFormState({ status: "error", message: "Réponse inattendue du serveur." });
        return;
      }

      onCreated(result.data);
      form.reset();
      router.refresh();
      setFormState({
        status: "success",
        message:
          "Recette enregistrée en brouillon. Ajoutez une image si vous en disposez.",
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
        <span>Plat associé</span>
        <select name="dishId" required>
          <option value="">Choisir un plat</option>
          {dishes.map((dish) => (
            <option key={dish.id} value={dish.id}>
              {dish.label}
            </option>
          ))}
        </select>
      </label>

      <label className="media-upload-field">
        <span>Titre de la recette</span>
        <input maxLength={160} minLength={2} name="title" required />
      </label>

      <label className="media-upload-field">
        <span>Description</span>
        <textarea
          maxLength={2000}
          minLength={20}
          name="description"
          required
          rows={3}
        />
      </label>

      <div className="editorial-form-row">
        <label className="media-upload-field">
          <span>Portions</span>
          <input max={100} min={1} name="servings" required type="number" />
        </label>
        <label className="media-upload-field">
          <span>Préparation (min)</span>
          <input
            max={1440}
            min={1}
            name="preparationTimeMinutes"
            type="number"
          />
        </label>
        <label className="media-upload-field">
          <span>Cuisson (min)</span>
          <input max={1440} min={1} name="cookingTimeMinutes" type="number" />
        </label>
      </div>

      <label className="media-upload-field">
        <span>Ingrédients (un par ligne : nom | quantité et unité)</span>
        <textarea
          name="ingredients"
          placeholder={"Nom de l’ingrédient | quantité"}
          required
          rows={6}
        />
      </label>

      <label className="media-upload-field">
        <span>Étapes (une par ligne)</span>
        <textarea name="steps" required rows={6} />
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
        <textarea maxLength={1000} minLength={10} name="sourceFact" required rows={3} />
      </label>

      <p className="media-upload-hint">
        La recette reste en brouillon jusqu’à sa publication par un administrateur.
      </p>

      <button
        className="media-upload-submit"
        disabled={isSubmitting || dishes.length === 0}
        type="submit"
      >
        {isSubmitting ? "Enregistrement…" : "Créer la recette"}
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
