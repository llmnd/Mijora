import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicSearch } from "@/features/search/public-search";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("public catalog search", () => {
  it("renders validated dish and recipe results with recipe links", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        data: {
          dishes: [
            {
              id: "dish-1",
              name: "Ceebu jën",
              slug: "ceebu-jen",
              description: "Riz au poisson.",
              imageUrl: null,
              imageAlt: "Ceebu jën",
            },
          ],
          recipes: [
            {
              id: "recipe-1",
              title: "Yassa au poulet",
              slug: "yassa-au-poulet",
              description: "Poulet au citron.",
              dishName: "Yassa",
              imageUrl: null,
              imageAlt: "Yassa",
            },
          ],
        },
      }),
    );

    render(<PublicSearch />);
    await user.type(
      screen.getByRole("searchbox", {
        name: "Rechercher un plat ou une recette",
      }),
      "yassa",
    );
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(await screen.findByText("Ceebu jën")).toBeInTheDocument();
    expect(screen.getByText("Yassa au poulet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Yassa au poulet" }),
    ).toHaveAttribute("href", "/recettes/yassa-au-poulet");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/search?q=yassa",
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
  });

  it("shows an empty state when the search has no matches", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ data: { dishes: [], recipes: [] } }),
    );

    render(<PublicSearch />);
    await user.type(
      screen.getByRole("searchbox", {
        name: "Rechercher un plat ou une recette",
      }),
      "inconnue",
    );
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(
      await screen.findByText(
        "Aucun plat ni recette ne correspond à votre recherche.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the server error message and rejects malformed success JSON", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: "INVALID_QUERY", message: "Requête invalide." } },
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { dishes: "not-an-array" } }),
      );

    render(<PublicSearch />);
    const input = screen.getByRole("searchbox", {
      name: "Rechercher un plat ou une recette",
    });

    await user.type(input, "ab");
    await user.click(screen.getByRole("button", { name: "Rechercher" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Requête invalide.",
    );

    await user.clear(input);
    await user.type(input, "cd");
    await user.click(screen.getByRole("button", { name: "Rechercher" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La réponse reçue est inattendue.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
