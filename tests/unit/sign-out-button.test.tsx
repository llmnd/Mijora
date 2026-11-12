import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignOutButton } from "@/components/sign-out-button";

const signOutMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: signOutMocks.replace,
    refresh: signOutMocks.refresh,
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: signOutMocks.signOut,
  },
}));

describe("Sign-out button", () => {
  beforeEach(() => {
    signOutMocks.signOut.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("signs out and refreshes the home page", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Déconnexion" }));

    expect(signOutMocks.signOut).toHaveBeenCalledOnce();
    expect(signOutMocks.replace).toHaveBeenCalledWith("/");
    expect(signOutMocks.refresh).toHaveBeenCalledOnce();
  });

  it("shows an error when sign-out fails", async () => {
    const user = userEvent.setup();
    signOutMocks.signOut.mockResolvedValue({
      data: null,
      error: { status: 500 },
    });
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Déconnexion" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Déconnexion impossible. Réessayez.",
    );
    expect(signOutMocks.replace).not.toHaveBeenCalled();
  });
});
