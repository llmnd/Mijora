import type { Metadata } from "next";
import { AuthPage } from "@/features/auth/auth-page";

export const metadata: Metadata = {
  title: "Connexion — Mijora",
  description: "Connectez-vous à votre espace Mijora.",
};

export default function SignInPage() {
  return <AuthPage mode="sign-in" />;
}
