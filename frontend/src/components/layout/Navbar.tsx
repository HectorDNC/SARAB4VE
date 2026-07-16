"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { alertService } from "@/services/alertService";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/mapa", label: "Mapa" },
  { href: "/refugios", label: "Refugios" },
  { href: "/recursos", label: "Recursos" },
  { href: "/directorio", label: "Directorio" },
  { href: "/chat", label: "Chat" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    alertService.info("Sesión cerrada correctamente");
    setUserMenuOpen(false);
    router.push("/");
  };

  const userInitial = user?.fullName?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-50 bg-surface-container-low border-b border-outline-variant shadow-card">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-primary font-bold text-xl min-h-0"
          aria-label="SARA — Ir al inicio"
        >
          <img src="/logo.webp" alt="SARA" className="h-8 w-auto" />
          <span>SARA</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 flex items-center rounded-lg text-sm font-semibold transition-colors min-h-0 ${pathname === link.href
                ? "bg-primary-fixed text-primary"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop SOS CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/sos"
            className="flex items-center gap-3 bg-error text-on-error px-6 py-2.5 rounded-full font-extrabold text-base shadow-lg shadow-error/25 hover:brightness-110 active:scale-95 transition-all min-h-0 animate-pulse"
          >
            <span className="material-symbols-rounded text-2xl" aria-hidden="true">
              crisis_alert
            </span>
            NECESITO AYUDA - SOS
          </Link>
        </div>

        <div className="hidden lg:flex items-center">
          {/* Botón de usuario: sesión iniciada vs no iniciada */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 group"
                aria-label="Menú de usuario"
                aria-expanded={userMenuOpen}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 text-on-primary font-bold text-sm flex items-center justify-center ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all shadow-sm">
                  {userInitial}
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 rounded-2xl border border-outline-variant/60 bg-surface-container-low shadow-xl shadow-black/10 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Cabecera */}
                  <div className="px-4 py-3 border-b border-outline-variant/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 text-on-primary font-bold flex items-center justify-center shrink-0">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Opciones */}
                  <div className="py-1">
                    <Link
                      href="/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-rounded text-xl text-on-surface-variant" aria-hidden="true">
                        person
                      </span>
                      Mi perfil
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-error hover:bg-error/10 transition-colors"
                    >
                      <span className="material-symbols-rounded text-xl" aria-hidden="true">
                        logout
                      </span>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 flex items-center rounded-lg text-blue-800 font-bold gap-2 hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-rounded text-blue-800" aria-hidden="true">
                contacts_product
              </span>
              Iniciar sesión
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="lg:hidden flex items-center justify-center w-12 h-12 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav
          className="lg:hidden border-t border-outline-variant bg-surface-container-low"
          aria-label="Menú móvil"
        >
          <ul className="flex flex-col divide-y divide-outline-variant">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-5 py-4 text-base font-medium transition-colors ${pathname === link.href
                    ? "text-primary bg-primary-fixed"
                    : "text-on-surface hover:bg-surface-container"
                    }`}
                  aria-current={pathname === link.href ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/sos"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-3 mx-4 my-2 px-5 py-3 rounded-full bg-error text-on-error font-extrabold text-base shadow-lg shadow-error/25 active:scale-95 animate-pulse transition-all"
              >
                <span className="material-symbols-rounded text-2xl" aria-hidden="true">
                  crisis_alert
                </span>
                NECESITO AYUDA - SOS
              </Link>
            </li>
            {user ? (
              <>
                <li>
                  <Link
                    href="/perfil"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-5 py-4 text-base font-medium text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-rounded" aria-hidden="true">person</span>
                    Perfil
                  </Link>
                </li>
                <li>
                  {user && (
                    <button
                      onClick={() => { handleLogout(); setMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-5 py-4 text-base font-medium text-error hover:bg-surface-container transition-colors"
                    >
                      <span className="material-symbols-rounded" aria-hidden="true">logout</span>
                      Cerrar sesión
                    </button>
                  )}
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-4 text-base font-medium text-blue-800 hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-rounded" aria-hidden="true">contacts_product</span>
                  Iniciar sesión
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
