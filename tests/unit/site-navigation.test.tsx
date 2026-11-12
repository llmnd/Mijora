import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteNavigation } from "@/components/site-navigation";

vi.mock("@/components/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Déconnexion</button>,
}));

describe("site navigation", () => {
  it("opens and closes the mobile navigation accessibly", () => {
    render(<SiteNavigation isEditor={false} userName={null} />);

    const openButton = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(openButton);
    expect(
      screen.getByRole("button", { name: "Fermer le menu" }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("link", { name: "Idées repas" }));
    expect(
      screen.getByRole("button", { name: "Ouvrir le menu" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("shows account actions and the editor route only when appropriate", () => {
    const { rerender } = render(
      <SiteNavigation isEditor={false} userName={null} />,
    );
    expect(
      screen.getByRole("link", { name: "Créer un compte" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Espace éditorial" })).toBeNull();

    rerender(<SiteNavigation isEditor userName="Awa" />);
    expect(screen.getByText("Awa")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Espace éditorial" }),
    ).toHaveAttribute("href", "/editorial");
    expect(screen.getByRole("button", { name: "Déconnexion" })).toBeInTheDocument();
  });
});
