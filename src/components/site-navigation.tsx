"use client";

import Link from "next/link";
import { useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";

type SiteNavigationProps = {
  isEditor: boolean;
  userName: string | null;
};

export function SiteNavigation({ isEditor, userName }: SiteNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <button
        aria-controls="primary-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        className="site-menu-toggle"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true" className="site-menu-icon">
          <span />
          <span />
          <span />
        </span>
        <span className="site-menu-label">{isOpen ? "Fermer" : "Menu"}</span>
      </button>

      <nav
        aria-label="Navigation principale"
        className={`site-navigation${isOpen ? " is-open" : ""}`}
        id="primary-navigation"
      >
        <Link href="/#inspiration" onClick={closeMenu}>
          Idées repas
        </Link>
        <Link href="/#plats" onClick={closeMenu}>
          Plats
        </Link>
        <Link href="/#recettes" onClick={closeMenu}>
          Recettes
        </Link>
        <Link href="/#recherche" onClick={closeMenu}>
          Rechercher
        </Link>
        {isEditor ? (
          <Link href="/editorial" onClick={closeMenu}>
            Espace éditorial
          </Link>
        ) : null}
        {userName ? (
          <>
            <span className="site-user">{userName}</span>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/connexion" onClick={closeMenu}>
              Connexion
            </Link>
            <Link
              className="site-navigation-signup"
              href="/inscription"
              onClick={closeMenu}
            >
              Créer un compte
            </Link>
          </>
        )}
      </nav>
    </>
  );
}
