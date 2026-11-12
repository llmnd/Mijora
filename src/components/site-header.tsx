import { headers } from "next/headers";
import Link from "next/link";
import { SiteNavigation } from "@/components/site-navigation";
import { auth } from "@/server/auth";
import { hasPermission } from "@/server/policies/permissions";

export async function SiteHeader() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <header className="site-header">
      <Link aria-label="Mijora, accueil" className="brand" href="/">
        mijora<span aria-hidden="true">.</span>
      </Link>
      <SiteNavigation
        isEditor={
          session
            ? hasPermission(session.user.role, "editorial:edit")
            : false
        }
        userName={session?.user.name ?? null}
      />
    </header>
  );
}
