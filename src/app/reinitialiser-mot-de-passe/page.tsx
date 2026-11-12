import type { Metadata } from "next";
import { AuthPage } from "@/features/auth/auth-page";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — Mijora",
  description: "Choisissez un nouveau mot de passe Mijora.",
};

export default function ResetPasswordPage() {
  return <AuthPage mode="reset-password" />;
}
