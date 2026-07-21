# 📐 Diagrama Visual: Ubicación Exacta de Cambios

## 1️⃣ ARCHIVO: `Navbar.tsx` - Primeras 32 líneas

```typescript
┌─────────────────────────────────────────────────────────────────┐
│ "use client";                                                   │ L1
│                                                                 │
│ import Link from "next/link";                                   │ L3
│ import { usePathname } from "next/navigation";                  │ L4
│ import { useState } from "react";                               │ L5
│ import FontScaleControl from "@/components/ui/FontScaleControl";│ L6 ← AGREGAR
│                                                                 │
│ const navLinks = [                                              │ L8
│   { href: "/", label: "Inicio" },                              │
│   { href: "/mapa", label: "Mapa" },                            │
│   // ... resto de links                                         │
│ ];                                                              │
│                                                                 │
│ export default function Navbar() {                              │
│   const pathname = usePathname();                              │
│   const [menuOpen, setMenuOpen] = useState(false);             │
│                                                                 │
│   return (                                                      │
│     <header className="sticky top-0 z-50 ...">                │
│       <div className="max-w-7xl mx-auto ...">                 │
│                                                                 │
│         {/* Logo - MODIFICAR ESTA SECCIÓN */}                  │
│         <div className="flex items-center gap-2">     ← NUEVO  │ L24
│           <Link                                       ← ENDENTADO│ L25
│             href="/"                                            │ L26
│             className="flex items-center gap-2 ..."           │ L27
│             aria-label="SARA — Ir al inicio"                  │ L28
│           >                                                     │ L29
│             <img src="/logo.webp" alt="SARA" ... />           │ L30
│             <span>SARA</span>                                  │ L31
│           </Link>                                              │ L32
│           <FontScaleControl />        ← NUEVO: El botón aquí  │ L33
│         </div>                                                  │ L34
│                                                                 │
│         {/* Desktop nav */}                                    │
│         <nav className="hidden lg:flex ...">                  │
│         ...resto del código...                                 │
└─────────────────────────────────────────────────────────────────┘

VISUALIZACIÓN EN NAVEGADOR:
┌─────────────────────────────────┐
│ [SARA logo] [🔤 100%]           │  ← Botón aquí
│                                 │
└─────────────────────────────────┘
```

---

## 2️⃣ ARCHIVO: `FontScaleControl.tsx` - NUEVO ARCHIVO

```
Ubicación:
frontend/src/components/ui/FontScaleControl.tsx  ← Crear este archivo

Contenido completo: Ver archivo IMPLEMENTACION_ESCALA_FUENTE.md (Paso 1)

Estructura del componente:
┌──────────────────────────────────────────────┐
│ FontScaleControl                             │
├──────────────────────────────────────────────┤
│ State:                                       │
│ • scale = 100, 125, 150, 200                │
│ • isOpen = true/false (dropdown visible)    │
│                                              │
│ useEffect:                                   │
│ • Cargar preferencia de localStorage al     │
│   montar el componente                       │
│                                              │
│ Render:                                      │
│ • Button: <span>🔤</span> + <span>100%</span>
│   └─ onClick: abre dropdown                 │
│                                              │
│ • Dropdown (si isOpen):                     │
│   ├─ 100% ✓ (activo)                        │
│   ├─ 125%                                   │
│   ├─ 150%                                   │
│   └─ 200%                                   │
│     └─ onClick: aplica escala + localStorage│
└──────────────────────────────────────────────┘
```

---

## 3️⃣ ARCHIVO: `globals.css` - Sección "Base"

```css
┌───────────────────────────────────────────────────────────────┐
│ /* ── Base ── */                                               │
│                                                                │
│ html {                                 ← AGREGAR ESTA LÍNEA   │
│   font-size: 16px;                     ← Y ESTAS              │
│ }                                      ← Y ESTA               │
│                                                                │
│ body {                                                         │
│   background-color: var(--color-background);                 │
│   color: var(--color-on-surface);                            │
│   font-family: var(--font-sans);                             │
│   -webkit-font-smoothing: antialiased;                       │
│ }                                                              │
│                                                                │
│ /* ── Material Symbols ── */                                  │
│ .material-symbols-rounded {                                  │
│   // ... estilos existentes ...                              │
│ }                                                              │
└───────────────────────────────────────────────────────────────┘

EXPLICACIÓN:
┌──────────────────────────────────────────────────────┐
│ El tamaño base del navegador es 16px por defecto    │
│                                                      │
│ Cuando usuario selecciona 150% en FontScaleControl: │
│ document.documentElement.style.fontSize = "24px"    │
│ (Eso es 16px * 150% = 24px)                         │
│                                                      │
│ Todos los elementos que usan 'rem' se escalan:      │
│ 1rem = 24px en lugar de 16px                        │
│                                                      │
│ Tailwind usa rem, así que TODO se escala            │
│ automáticamente (h1, p, button, etc.)               │
└──────────────────────────────────────────────────────┘
```

---

## 🔍 VISTA COMPLETA DEL NAVBAR MODIFICADO

```typescript
// ❌ ANTES (Original)
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 ...">
      <div className="max-w-7xl mx-auto ...">
        
        <Link href="/" className="flex items-center gap-2 ...">
          <img src="/logo.webp" alt="SARA" className="h-8 w-auto" />
          <span>SARA</span>
        </Link>
        
        <nav className="hidden lg:flex ...">
          {/* nav links */}
        </nav>
        
        {/* resto del navbar */}
      </div>
    </header>
  );
}


// ✅ DESPUÉS (Con cambios)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import FontScaleControl from "@/components/ui/FontScaleControl"; // ← NUEVO

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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-surface-container-low border-b border-outline-variant shadow-card">
      <div className="max-w-7xl mx-auto px-5 lg:px-10 h-16 flex items-center justify-between gap-4">
        
        {/* Logo - AQUÍ CAMBIÓ */}
        <div className="flex items-center gap-2">  {/* ← NUEVO: div wrapper */}
          <Link
            href="/"
            className="flex items-center gap-2 text-primary font-bold text-xl min-h-0"
            aria-label="SARA — Ir al inicio"
          >
            <img src="/logo.webp" alt="SARA" className="h-8 w-auto" />
            <span>SARA</span>
          </Link>
          <FontScaleControl />  {/* ← NUEVO: El botón aquí */}
        </div>
        
        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Navegación principal">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors min-h-0 ${
                pathname === link.href
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
            className="flex items-center gap-2 bg-secondary-container text-on-secondary px-5 py-2 rounded-full font-bold text-sm hover:opacity-90 transition-opacity min-h-0"
          >
            <span className="material-symbols-rounded text-lg" aria-hidden="true">
              crisis_alert
            </span>
            NECESITO AYUDA
          </Link>
        </div>

        {/* Mobile menu button y dropdown... resto del código igual */}
      </div>
    </header>
  );
}
```

---

## 📱 Resultado Visual en Diferentes Pantallas

### Desktop (≥1024px)
```
┌──────────────────────────────────────────────────────────────────────┐
│ SARA [logo] [🔤 100%]    Inicio  Mapa  Refugios  ...    NECESITO AYUDA
└──────────────────────────────────────────────────────────────────────┘
         ↑ El botón está aquí
```

### Tablet (640px - 1024px)
```
┌─────────────────────────────────────┐
│ SARA [logo] [🔤 100%]        ☰      │
└─────────────────────────────────────┘
         ↑ Botón visible
         
Al hacer click en ☰:
┌──────────────────┐
│ Inicio           │
│ Mapa             │
│ Refugios         │
│ Recursos         │
│ Directorio       │
│ Chat             │
│ NECESITO AYUDA   │
└──────────────────┘
(El dropdown de escala se abre en la esquina del botón 🔤)
```

### Mobile (<640px)
```
┌──────────────────────┐
│ SARA [🔤]      ☰    │  ← Botón visible
└──────────────────────┘

Cuando hace click en 🔤:
┌──────────────┐
│ 100% ✓       │
│ 125%         │
│ 150%         │
│ 200%         │
└──────────────┘
```

---

## 🔄 Flujo de Ejecución

```
1. Usuario carga http://localhost:3000
   └─ Navbar renderiza
      ├─ Logo (Link a /)
      └─ FontScaleControl
         ├─ useEffect corre:
         │  └─ Lee localStorage.getItem("fontScale")
         │     └─ Si existe: applyScale(valor guardado)
         │        └─ document.documentElement.style.fontSize = "..."
         └─ Botón 🔤 muestra el valor actual

2. Usuario hace click en botón 🔤
   └─ setIsOpen(true)
      └─ Dropdown aparece

3. Usuario selecciona 150%
   └─ handleChange(150)
      ├─ setScale(150)
      ├─ applyScale(150)
      │  ├─ document.documentElement.style.fontSize = "24px" (16 * 1.5)
      │  └─ localStorage.setItem("fontScale", "150")
      └─ setIsOpen(false)

4. TODA la página se hace más grande automáticamente
   └─ Porque todos los elementos usan rem
      └─ 1rem ahora es 24px en lugar de 16px

5. Usuario refrescar página
   └─ FontScaleControl useEffect corre otra vez
      ├─ Lee localStorage.getItem("fontScale") → "150"
      └─ applyScale(150)
         └─ Página mantiene tamaño 150%
```

---

## 🎯 Resumen de Cambios

| Acción | Archivo | Qué Cambiar | Líneas |
|--------|---------|-------------|--------|
| **Crear** | `FontScaleControl.tsx` | Archivo nuevo completo | N/A |
| **Modificar** | `Navbar.tsx` | Agregar import | ~L6 |
| **Modificar** | `Navbar.tsx` | Wrappear Logo en div | ~L23-34 |
| **Modificar** | `globals.css` | Agregar `html { font-size: 16px }` | ~L74-76 |

---

**Total de cambios:** 4 operaciones (1 archivo nuevo + 3 modificaciones)  
**Tiempo estimado:** 5-10 minutos  
**Complejidad:** Baja
