import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DishCarousel,
  type CarouselDish,
} from "@/features/discovery/dish-carousel";

const dishes: CarouselDish[] = [
  {
    id: "dish-1",
    name: "Ceebu jën",
    description: "Riz au poisson et légumes.",
    imageUrl: null,
    imageAlt: "Ceebu jën",
    recipe: { title: "Ceebu jën maison", slug: "ceebu-jen-maison" },
  },
  {
    id: "dish-2",
    name: "Yassa",
    description: null,
    imageUrl: null,
    imageAlt: "Yassa",
    recipe: null,
  },
];

describe("dish carousel", () => {
  it("shows published dishes and links only to available recipes", () => {
    render(<DishCarousel dishes={dishes} />);

    expect(screen.getByRole("region", { name: "Plats publiés" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Ceebu jën" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Cuisiner ce plat" }),
    ).toHaveAttribute("href", "/recettes/ceebu-jen-maison");
    expect(screen.getByText("Recette bientôt disponible")).toBeVisible();
  });

  it("scrolls the carousel from its accessible controls", () => {
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollBy", {
      configurable: true,
      value: scrollBy,
    });
    render(<DishCarousel dishes={dishes} />);
    Object.defineProperty(
      screen.getByRole("region", { name: "Plats publiés" }),
      "clientWidth",
      {
        configurable: true,
        value: 1000,
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Plats suivants" }));

    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
    expect(scrollBy.mock.calls[0]?.[0].left).toBeGreaterThan(0);
  });

  it("omits carousel controls when there is only one dish", () => {
    render(<DishCarousel dishes={[dishes[0]!]} />);

    expect(
      screen.queryByRole("button", { name: "Plats suivants" }),
    ).not.toBeInTheDocument();
  });
});
