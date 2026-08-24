"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumen", icon: "dashboard" },
  { href: "/dashboard/voluntarios", label: "Voluntarios", icon: "volunteer_activism" },
  { href: "/dashboard/organizaciones", label: "Organizaciones", icon: "corporate_fare" },
  { href: "/dashboard/administradores", label: "Administradores", icon: "admin_panel_settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };


  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 flex items-center justify-center w-11 h-11 rounded-xl bg-surface-container-low border border-outline-variant shadow-sm"
        aria-label="Abrir menú"
      >
        <span className="material-symbols-rounded text-2xl text-on-surface" aria-hidden="true">
          menu
        </span>
      </button>

      {isOpen && (
        <div
          onClick={closeMenu}
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          flex flex-col w-72 lg:w-64 shrink-0 border-r border-outline-variant bg-surface-container-low
          fixed lg:sticky top-0 left-0 h-screen z-50
          transition-transform duration-200 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="SARA"
              width={36}
              height={36}
              className="rounded-lg shrink-0"
            />
            <div>
              <span className="text-xl font-bold text-primary leading-none">SARA</span>
              <p className="text-xs text-on-surface-variant mt-0.5">Panel administrativo</p>
            </div>
          </div>

          {/* Botón cerrar — solo visible en móvil */}
          <button
            type="button"
            onClick={closeMenu}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-container transition-colors"
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-rounded text-xl text-on-surface-variant" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(`${item.href}/`); return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${isActive
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                    }`}
                >
                  <span className="material-symbols-rounded text-xl" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-outline-variant">
          <Link
            href="/"
             className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150
                text-on-surface-variant hover:bg-primary/10 hover:text-primary`}
          >
            <span className="material-symbols-rounded text-xl" aria-hidden="true">
              home
            </span>
            Inicio
          </Link>
          <button
            type="button"
            onClick={() => {
              handleLogout();
              closeMenu();
            }}
            className="flex items-center gap-3 rounded-xl w-full px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors duration-150"
          >
            <span className="material-symbols-rounded text-xl" aria-hidden="true">
              logout
            </span>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}