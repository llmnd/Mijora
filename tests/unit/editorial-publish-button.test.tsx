import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishButton } from "@/features/editorial/publish-button";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("editorial publish button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirms before unpublishing a dish and refreshes the catalog", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn().mockReturnValue(true);
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: confirm,
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        { data: { id: "dish-1", status: "DRAFT" } },
        { status: 200 },
      ),
    );

    render(
      <PublishButton
        contentId="dish-1"
        contentTitle="Yassa"
        contentType="dish"
        isPublished
      />,
    );

    await user.click(screen.getByRole("button", { name: "Dépublier Yassa" }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/editorial/publish",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          contentId: "dish-1",
          contentType: "dish",
          action: "unpublish",
        }),
      }),
    );
    expect(
      await screen.findByText(
        "Plat dépublié. Ses recettes publiées ont également été retirées de l’accueil.",
      ),
    ).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
