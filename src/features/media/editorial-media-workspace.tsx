"use client";

import { useState } from "react";
import { ImageUploadForm } from "@/features/media/image-upload-form";
import type { MediaOwnerType } from "@/features/media/types";

export type EditorialMediaTarget = {
  id: string;
  label: string;
  ownerType: MediaOwnerType;
};

type EditorialMediaWorkspaceProps = {
  targets: EditorialMediaTarget[];
};

const ownerTypeLabels: Record<MediaOwnerType, string> = {
  dish: "Plat",
  ingredient: "Ingrédient",
  recipe: "Recette",
};

export function EditorialMediaWorkspace({
  targets,
}: EditorialMediaWorkspaceProps) {
  const [selectedKey, setSelectedKey] = useState("");
  const selectedTarget = targets.find(
    (target) => `${target.ownerType}:${target.id}` === selectedKey,
  );

  return (
    <div className="editorial-workspace">
      {targets.length ? (
        <label className="media-upload-field">
          <span>Associer l’image à un contenu</span>
          <select
            onChange={(event) => setSelectedKey(event.currentTarget.value)}
            value={selectedKey}
          >
            <option value="">Choisir un plat, un ingrédient ou une recette</option>
            {targets.map((target) => (
              <option
                key={`${target.ownerType}:${target.id}`}
                value={`${target.ownerType}:${target.id}`}
              >
                {ownerTypeLabels[target.ownerType]} · {target.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="editorial-empty">
          Créez d’abord un plat, un ingrédient ou une recette pour y associer
          une image.
        </p>
      )}
      {selectedTarget ? (
        <ImageUploadForm
          key={selectedKey}
          ownerId={selectedTarget.id}
          ownerType={selectedTarget.ownerType}
        />
      ) : null}
    </div>
  );
}
