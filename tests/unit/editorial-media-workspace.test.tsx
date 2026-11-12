import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditorialContentWorkspace } from "@/features/editorial/editorial-content-workspace";
import { EditorialMediaWorkspace } from "@/features/media/editorial-media-workspace";

vi.mock("@/features/media/image-upload-form", () => ({
  ImageUploadForm: ({
    ownerId,
    ownerType,
  }: {
    ownerId: string;
    ownerType: string;
  }) => (
    <output data-testid="upload-target">
      {ownerType}:{ownerId}
    </output>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("Editorial media workspace", () => {
  it("makes a newly created dish available for image upload", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          data: {
            id: "dish-1",
            name: "Ceebu jën",
            slug: "ceebu-jen",
          },
        },
        { status: 201 },
      ),
    );

    render(
      <EditorialContentWorkspace initialDishes={[]} initialTargets={[]} />,
    );

    const createDishSummary = screen.getByText("Créer un plat");
    expect(createDishSummary.closest("details")).not.toHaveAttribute("open");
    await user.click(createDishSummary);

    fireEvent.change(screen.getByLabelText("Nom du plat"), {
      target: { value: "Ceebu jën" },
    });

    fireEvent.change(screen.getByLabelText("Description originale"), {
      target: {
        value: "Un plat sénégalais de riz au poisson et aux légumes.",
      },
    });
    fireEvent.change(screen.getByLabelText("Titre de la source"), {
      target: { value: "Ceebu jën — UNESCO" },
    });
    fireEvent.change(screen.getByLabelText("URL de la source"), {
      target: {
        value:
          "https://ich.unesco.org/en/RL/ceebu-jen-a-culinary-art-of-senegal-01748",
      },
    });
    fireEvent.change(screen.getByLabelText("Fait vérifié dans cette source"), {
      target: { value: "La pratique est associée à la ville de Saint-Louis." },
    });
    await user.click(screen.getByRole("button", { name: "Créer le plat" }));
    await screen.findByText(
      "Plat enregistré en brouillon. Il est prêt à recevoir une image.",
    );

    await user.click(screen.getByText("Ajouter une image"));
    const contentSelect = screen.getByLabelText(
      "Associer l’image à un contenu",
    );
    expect(contentSelect).toHaveValue("");
    await user.selectOptions(contentSelect, "dish:dish-1");

    expect(screen.getByTestId("upload-target")).toHaveTextContent(
      "dish:dish-1",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("creates a draft recipe and makes it selectable for image upload", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          data: {
            id: "recipe-1",
            title: "Yassa au poulet",
            slug: "yassa-au-poulet",
            dishId: "dish-1",
          },
        },
        { status: 201 },
      ),
    );

    render(
      <EditorialContentWorkspace
        initialDishes={[{ id: "dish-1", label: "Yassa" }]}
        initialTargets={[{ id: "dish-1", label: "Yassa", ownerType: "dish" }]}
      />,
    );

    await user.click(screen.getByText("Créer une recette"));
    fireEvent.change(screen.getByLabelText("Plat associé"), {
      target: { value: "dish-1" },
    });
    fireEvent.change(screen.getByLabelText("Titre de la recette"), {
      target: { value: "Yassa au poulet" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: {
        value: "Une recette familiale de poulet aux oignons et au citron.",
      },
    });
    fireEvent.change(screen.getByLabelText("Portions"), {
      target: { value: "4" },
    });
    fireEvent.change(
      screen.getByLabelText("Ingrédients (un par ligne : nom | quantité et unité)"),
      { target: { value: "Poulet | 1 kg\nOignons | 4" } },
    );
    fireEvent.change(screen.getByLabelText("Étapes (une par ligne)"), {
      target: {
        value: "Mariner le poulet dans le citron.\nCuire avec les oignons.",
      },
    });
    fireEvent.change(screen.getAllByLabelText("Titre de la source")[1], {
      target: { value: "Recette de référence" },
    });
    fireEvent.change(screen.getAllByLabelText("URL de la source")[1], {
      target: { value: "https://example.org/yassa" },
    });
    fireEvent.change(
      screen.getAllByLabelText("Fait vérifié dans cette source")[1],
      { target: { value: "Le yassa se prépare avec du citron et des oignons." } },
    );

    await user.click(screen.getByRole("button", { name: "Créer la recette" }));
    await screen.findByText(/recette enregistrée en brouillon/i);
    await user.click(screen.getByText("Ajouter une image"));
    await user.selectOptions(
      screen.getByLabelText("Associer l’image à un contenu"),
      "recipe:recipe-1",
    );

    expect(screen.getByTestId("upload-target")).toHaveTextContent(
      "recipe:recipe-1",
    );
  });

  it("shows the upload form only after choosing an existing content item", async () => {
    const user = userEvent.setup();
    render(
      <EditorialMediaWorkspace
        targets={[
          { id: "dish-1", label: "Plat test", ownerType: "dish" },
          {
            id: "ingredient-1",
            label: "Ingrédient test",
            ownerType: "ingredient",
          },
        ]}
      />,
    );

    expect(screen.queryByTestId("upload-target")).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("Associer l’image à un contenu"),
      "ingredient:ingredient-1",
    );

    expect(screen.getByTestId("upload-target")).toHaveTextContent(
      "ingredient:ingredient-1",
    );
  });
});
