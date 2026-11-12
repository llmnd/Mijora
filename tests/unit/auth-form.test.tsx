import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/features/auth/auth-form";

const authMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signInEmail: vi.fn(),
  signUpEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: authMocks.replace,
    refresh: authMocks.refresh,
  }),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: authMocks.signInEmail },
    signUp: { email: authMocks.signUpEmail },
    sendVerificationEmail: authMocks.sendVerificationEmail,
  },
}));

describe("Better Auth forms", () => {
  beforeEach(() => {
    authMocks.signInEmail.mockResolvedValue({ data: {}, error: null });
    authMocks.signUpEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("creates a user without accepting a role from the form", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="sign-up" />);

    await user.type(screen.getByLabelText("Nom"), "Awa Diop");
    await user.type(screen.getByLabelText("Adresse e-mail"), "awa@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /vérifiez votre adresse e-mail/i,
    );
    expect(authMocks.signUpEmail).toHaveBeenCalledWith({
      name: "Awa Diop",
      email: "awa@example.com",
      password: "password123",
      callbackURL: `${window.location.origin}/connexion`,
    });
    expect(authMocks.replace).not.toHaveBeenCalled();
  });

  it("redirects after sign-in and shows a generic error for denied credentials", async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="sign-in" />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "awa@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Me connecter" }));

    await waitFor(() => {
      expect(authMocks.signInEmail).toHaveBeenCalledWith({
        email: "awa@example.com",
        password: "wrong-password",
        callbackURL: `${window.location.origin}/`,
      });
    });
    expect(authMocks.replace).toHaveBeenCalledWith("/");
    expect(authMocks.refresh).toHaveBeenCalled();
  });

  it("does not navigate on a rejected sign-in", async () => {
    const user = userEvent.setup();
    authMocks.signInEmail.mockResolvedValue({
      data: null,
      error: { status: 401 },
    });
    render(<AuthForm mode="sign-in" />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "awa@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Me connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /adresse e-mail ou mot de passe incorrect/i,
    );
    expect(authMocks.replace).not.toHaveBeenCalled();
  });

  it("resends verification for a valid but unverified account", async () => {
    const user = userEvent.setup();
    authMocks.signInEmail.mockResolvedValue({
      data: null,
      error: { status: 403, code: "EMAIL_NOT_VERIFIED" },
    });
    authMocks.sendVerificationEmail.mockResolvedValue({
      data: { status: true },
      error: null,
    });
    render(<AuthForm mode="sign-in" />);

    await user.type(screen.getByLabelText("Adresse e-mail"), "awa@example.com");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.click(screen.getByRole("button", { name: "Me connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /adresse e-mail n’est pas encore vérifiée/i,
    );
    await user.click(
      screen.getByRole("button", { name: "Renvoyer le lien de vérification" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      /un nouveau lien vient d’être envoyé/i,
    );
    expect(authMocks.sendVerificationEmail).toHaveBeenCalledWith({
      email: "awa@example.com",
      callbackURL: `${window.location.origin}/connexion`,
    });
  });
});
