import { headers } from "next/headers";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/server/auth";
import { hasPermission } from "@/server/policies/permissions";

export async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="site-header">
      <Link aria-label="Mijora, accueil" className="brand" href="/">
        mijora<span aria-hidden="true">.</span>
      </Link>
      <nav aria-label="Navigation principale" className="site-navigation">
        <Link href="/#approche">Notre approche</Link>
        <Link href="/#projet">Le projet</Link>
        {session ? (
          <>
            {hasPermission(session.user.role, "editorial:edit") ? (
              <Link href="/editorial">Espace éditorial</Link>
            ) : null}
            <span className="site-user">{session.user.name}</span>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/connexion">Connexion</Link>
            <Link href="/inscription">Créer un compte</Link>
          </>
        )}
      </nav>
    </header>
  );
}
