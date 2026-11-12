import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  EditorialCatalog,
  type EditorialCatalogItem,
} from "@/features/editorial/editorial-catalog";

const items: EditorialCatalogItem[] = [
  {
    id: "dish-1",
    contentType: "dish",
    title: "Yassa",
    subtitle: "Plat sénégalais",
    description: "Poulet aux oignons et au citron.",
    status: "PUBLISHED",
    imageUrl: null,
    imageAlt: null,
    imageAttribution: null,
    imageProvenance: null,
    imageLicense: null,
    source: null,
    href: null,
  },
  {
    id: "recipe-1",
    contentType: "recipe",
    title: "Mafé végétarien",
    subtitle: "Plat · Mafé",
    description: "Sauce à l’arachide et légumes.",
    status: "DRAFT",
    imageUrl: null,
    imageAlt: null,
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
      screen.queryByRole("heading", { name: "Mafé végétarien" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1 contenu affiché sur 2")).toBeInTheDocument();
  });
});
