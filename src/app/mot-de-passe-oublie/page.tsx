import type { Metadata } from "next";
import { AuthPage } from "@/features/auth/auth-page";

export const metadata: Metadata = {
  title: "Mot de passe oublié — Mijora",
  description: "Demandez un lien pour réinitialiser votre mot de passe Mijora.",
};

export default function RequestPasswordResetPage() {
  return <AuthPage mode="request-reset" />;
}
