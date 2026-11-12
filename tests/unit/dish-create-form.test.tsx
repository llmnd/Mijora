import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DishCreateForm } from "@/features/editorial/dish-create-form";

describe("dish create form", () => {
  it("creates a sourced draft and reports it to the editorial workspace", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const dish = {
      id: "dish-1",
      name: "Ceebu jën",
      slug: "ceebu-jen",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ data: dish }, { status: 201 }));

    render(<DishCreateForm onCreated={onCreated} />);

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

    expect(
      await screen.findByText(
        "Plat enregistré en brouillon. Il est prêt à recevoir une image.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/editorial/dishes",
      expect.objectContaining({ method: "POST" }),
    );
    expect(onCreated).toHaveBeenCalledWith(dish);
  });
});
