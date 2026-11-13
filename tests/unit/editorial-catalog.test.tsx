import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  EditorialCatalog,
  type EditorialCatalogItem,
} from "@/features/editorial/editorial-catalog";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const items: EditorialCatalogItem[] = [
  {
    id: "dish-1",
    contentType: "dish",
    dishId: null,
    title: "Yassa",
    subtitle: "Plat sénégalais",
    description: "Poulet aux oignons et au citron.",
    status: "PUBLISHED",
    imageUrl: "https://images.example/shared.jpg",
    imageAlt: "Yassa servi dans un plat",
    imageAttribution: null,
    imageProvenance: null,
    imageLicense: null,
    source: null,
    href: null,
  },
  {
    id: "recipe-1",
    contentType: "recipe",
    dishId: "dish-1",
    title: "Yassa au poulet",
    subtitle: "Plat · Yassa",
    description: "Poulet aux oignons et au citron.",
    status: "DRAFT",
    imageUrl: "https://images.example/shared.jpg",
    imageAlt: "Yassa servi dans un plat",
    imageAttribution: null,
    imageProvenance: null,
    imageLicense: null,
    source: null,
    href: null,
  },
];

describe("editorial catalog", () => {
  it("searches and filters the catalog by publication status", async () => {
    const user = userEvent.setup();
    render(<EditorialCatalog canPublish={false} items={items} />);

    await user.type(
      screen.getByRole("searchbox", { name: "Rechercher" }),
      "yassa",
    );
    await user.selectOptions(screen.getByLabelText("Statut"), "PUBLISHED");

    expect(screen.getByRole("heading", { name: "Yassa" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Yassa au poulet" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1 contenu affiché sur 2")).toBeInTheDocument();
  });

  it("shows each recipe under its associated dish and keeps the recipe filter", async () => {
    const user = userEvent.setup();
    render(<EditorialCatalog canPublish={false} items={items} />);

    const associatedRecipes = screen.getByRole("region", {
      name: "Recettes associées à Yassa",
    });
    expect(associatedRecipes).toContainElement(
      screen.getByRole("heading", { name: "Yassa au poulet" }),
    );
    expect(
      document.querySelectorAll(".editorial-dish-grid > .editorial-dish-card"),
    ).toHaveLength(1);
    expect(
      document.querySelectorAll(".editorial-dish-grid .editorial-dish-image"),
    ).toHaveLength(1);

    await user.selectOptions(screen.getByLabelText("Type"), "recipe");

    expect(
      screen.getByRole("heading", { name: "Yassa au poulet" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Recettes associées à Yassa" }),
    ).not.toBeInTheDocument();
  });

  it("places edit, photo, archive, and restore actions at the top of each card", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ data: { id: "dish-1", status: "ARCHIVED" } }),
    );
    render(<EditorialCatalog canPublish={false} items={items} />);

    const dishHeading = screen.getByRole("heading", { name: "Yassa" });
    const card = dishHeading.closest("article");
    expect(card?.querySelector(".editorial-card-action-bar")).toBeTruthy();
    expect(
      screen.getByText("Modifier le contenu", { selector: "summary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Modifier la photo", { selector: "summary" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archiver Yassa" }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/editorial/archive",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          contentId: "dish-1",
          contentType: "dish",
          action: "archive",
        }),
      }),
    );
    expect(await screen.findByText("Contenu archivé.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
