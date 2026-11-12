import type { Metadata } from "next";
import { AuthPage } from "@/features/auth/auth-page";

export const metadata: Metadata = {
  title: "Créer un compte — Mijora",
  description: "Créez un compte Mijora.",
};

export default function SignUpPage() {
  return <AuthPage mode="sign-up" />;
}
