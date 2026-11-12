import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PasswordResetForm } from "@/features/auth/password-reset-form";

const resetMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: resetMocks.replace,
    refresh: resetMocks.refresh,
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: resetMocks.requestPasswordReset,
    resetPassword: resetMocks.resetPassword,
  },
}));

describe("Better Auth password recovery", () => {
  beforeEach(() => {
    resetMocks.requestPasswordReset.mockResolvedValue({
      data: { status: true, message: "ok" },
      error: null,
    });
    resetMocks.resetPassword.mockResolvedValue({
      data: { status: true },
      error: null,
    });
  });

  it("requests a reset link with a generic success message", async () => {
    const user = userEvent.setup();
    render(<PasswordResetForm mode="request" />);

    await user.type(
      screen.getByLabelText("Adresse e-mail"),
      "awa@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Envoyer un lien" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /si cette adresse correspond à un compte/i,
    );
    expect(resetMocks.requestPasswordReset).toHaveBeenCalledWith({
      email: "awa@example.com",
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
  });

  it("requires matching passwords before calling Better Auth", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      {},
      "",
      "/reinitialiser-mot-de-passe?token=reset-token",
    );
    render(<PasswordResetForm mode="reset" />);

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "new-pass-123");
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "different-pass-123",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Enregistrer le nouveau mot de passe",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Les deux mots de passe ne correspondent pas.",
    );
    expect(resetMocks.resetPassword).not.toHaveBeenCalled();
  });

  it("submits a valid token and redirects to sign-in", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      {},
      "",
      "/reinitialiser-mot-de-passe?token=reset-token",
    );
    render(<PasswordResetForm mode="reset" />);

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "new-pass-123");
    await user.type(
      screen.getByLabelText("Confirmer le mot de passe"),
      "new-pass-123",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Enregistrer le nouveau mot de passe",
      }),
    );

    await waitFor(() => {
      expect(resetMocks.resetPassword).toHaveBeenCalledWith({
        newPassword: "new-pass-123",
        token: "reset-token",
      });
    });
    expect(resetMocks.replace).toHaveBeenCalledWith("/connexion");
    expect(resetMocks.refresh).toHaveBeenCalled();
  });
});
