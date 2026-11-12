"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setError(false);
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(true);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <span className="site-sign-out">
      <button
        className="site-sign-out-button"
        disabled={isSigningOut}
        onClick={handleSignOut}
        type="button"
      >
        {isSigningOut ? "Déconnexion…" : "Déconnexion"}
      </button>
      {error ? (
        <span className="site-sign-out-error" role="alert">
          Déconnexion impossible. Réessayez.
        </span>
      ) : null}
    </span>
  );
}
