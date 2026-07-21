# 🔤 Guía de Implementación: Control de Escala de Fuente

## 📍 Ubicación en la Arquitectura

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Aquí: actualizar globals.css
│   │   └── page.tsx            ← Página principal (SARA Home)
│   ├── components/
│   │   └── layout/
│   │       ├── Navbar.tsx      ← Aquí: agregar <FontScaleControl />
│   │       └── BottomNav.tsx   (sin cambios)
│   ├── ui/
│   │   └── (CREAR) FontScaleControl.tsx  ← Nuevo componente
│   └── app/
│       └── globals.css         ← Aquí: cambiar tamaño base
```

---

## ✅ Paso 1: Crear el componente `FontScaleControl.tsx`

### 📁 Archivo: `frontend/src/components/ui/FontScaleControl.tsx`

Crea un **nuevo archivo** con este contenido:

```typescript
"use client";

import { useEffect, useState } from "react";

export default function FontScaleControl() {
  const [scale, setScale] = useState(100);
  const [isOpen, setIsOpen] = useState(false);

  const scales = [100, 125, 150, 200];

  useEffect(() => {
    // Cargar preferencia del localStorage al montar el componente
    const saved = localStorage.getItem("fontScale");
    if (saved) {
      const value = parseInt(saved, 10);
      setScale(value);
      applyScale(value);
    }
  }, []);

  const applyScale = (value: number) => {
    // Cambiar tamaño base del HTML (todos heredan)
    document.documentElement.style.fontSize = `${(value / 100) * 16}px`;
    // Guardar en localStorage
    localStorage.setItem("fontScale", value.toString());
  };

  const handleChange = (newScale: number) => {
    setScale(newScale);
    applyScale(newScale);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Ajustar tamaño de fuente: ${scale}%`}
        title={`Tamaño de fuente: ${scale}%`}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="material-symbols-rounded text-lg" aria-hidden="true">
          text_increase
        </span>
        <span className="text-xs font-semibold hidden sm:inline">{scale}%</span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-surface-container-low border border-outline-variant rounded-lg shadow-card p-2 z-50 min-w-[120px]">
          {scales.map((s) => (
            <button
              key={s}
              onClick={() => handleChange(s)}
              className={`block w-full text-left px-4 py-2.5 rounded text-sm font-semibold transition-colors ${
                scale === s
                  ? "bg-primary text-on-primary"
                  : "text-on-surface hover:bg-surface-container"
              }`}
              aria-current={scale === s ? "true" : undefined}
            >
              {s}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Paso 2: Modificar `Navbar.tsx`

### 📁 Archivo: `frontend/src/components/layout/Navbar.tsx`

**AGREGAR esta línea en el `import`** (línea 5):

```typescript
// ANTES:
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// DESPUÉS:
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import FontScaleControl from "@/components/ui/FontScaleControl";  // ← AGREGAR ESTA LÍNEA
```

**MODIFICAR la sección del Logo** (líneas 23-31):

Cambia esto:
```typescript
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-primary font-bold text-xl min-h-0"
          aria-label="SARA — Ir al inicio"
        >
          <img src="/logo.webp" alt="SARA" className="h-8 w-auto" />
          <span>SARA</span>
        </Link>
```

Por esto:
```typescript
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-primary font-bold text-xl min-h-0"
            aria-label="SARA — Ir al inicio"
          >
            <img src="/logo.webp" alt="SARA" className="h-8 w-auto" />
            <span>SARA</span>
          </Link>
          {/* Botón de escala de fuente */}
          <FontScaleControl />
        </div>
```

**Resultado visual en el Navbar:**
```
┌──────────────────────────────────────────────────────┐
│ SARA [logo] [🔤 100%]    Inicio  Mapa  ...  NECESITO AYUDA
└──────────────────────────────────────────────────────┘
              ↑ El botón va aquí, al lado del logo
```

---

## ✅ Paso 3: Actualizar `globals.css`

### 📁 Archivo: `frontend/src/app/globals.css`

**BUSCA esta sección** (alrededor de línea 73-79):

```css
/* ── Base ── */
body {
  background-color: var(--color-background);
  color: var(--color-on-surface);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

**REEMPLÁZALO CON:**

```css
/* ── Base ── */
html {
  font-size: 16px; /* Base por defecto. El componente FontScaleControl lo modifica */
}

body {
  background-color: var(--color-background);
  color: var(--color-on-surface);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  /* Ahora hereda el tamaño del html y escala automáticamente */
}
```

**Por qué funciona:**
- `html { font-size: 16px }` = Base por defecto
- `FontScaleControl` modifica `document.documentElement.style.fontSize`
- Todos los elementos que usan `rem` escalan automáticamente
- Tailwind ya usa `rem`, así que todo se escala

---

## 🎨 Resultado Visual en Home

La página principal (`/`) se verá así:

```
┌──────────────────────────────────────────────────────────┐
│ SARA [logo] [🔤 100%]    Inicio  Mapa  Refugios  ...     │
│              ↑ Botón de escala aquí
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      HERO SECTION                        │
│                                                          │
│  Asistencia inmediata para personas con discapacidad    │
│                                                          │
│           [SOS — Emergencia]  (botón grande)            │
│   [Solicitar Apoyo]  [Ver Mapa]                         │
│                                                          │
│         🎨 Caja azul con logo (lado derecho)           │
└─────────────────────────────────────────────────────────┘

¿Qué puedes encontrar?
┌──────────────┬──────────────┬──────────────┐
│ Puntos Seguros│ Recursos de  │ Directorio   │
│              │ Guía         │              │
└──────────────┴──────────────┴──────────────┘

Cerca de ti
┌─────────────────────────────────────────────┐
│ Centro de Salud Chacao        350 m         │
│ Refugio Municipal #3          1.2 km        │
│ Cruz Roja Venezolana          800 m         │
└─────────────────────────────────────────────┘

¿Quieres colaborar?
┌─────────────────────────────────────────────┐
│ [Soy voluntario]  [Soy organización]        │
└─────────────────────────────────────────────┘
```

---

## 🔄 Cómo funciona la escala

### Al hacer click en el botón 🔤:

1. **Despliega dropdown** con opciones:
   ```
   ┌───────────┐
   │ 100% ✓    │ ← Actualmente seleccionado
   │ 125%      │
   │ 150%      │
   │ 200%      │
   └───────────┘
   ```

2. **Al seleccionar 150%:**
   - `applyScale(150)` se ejecuta
   - `fontSize = (150/100) * 16px = 24px` en `<html>`
   - Todos los elementos que usan `rem` se multiplican por 1.5x
   - Se guarda en `localStorage` para persistencia

3. **La escala se aplica a TODA la página:**
   - Títulos (h1, h2, h3)
   - Párrafos (p)
   - Botones
   - Etiquetas
   - Inputs
   - Todo que use `rem` o `em`

---

## 📋 Checklist de Implementación

- [ ] **Paso 1:** Crear `FontScaleControl.tsx` (nuevo archivo)
- [ ] **Paso 2:** Importar en `Navbar.tsx` (agregar import)
- [ ] **Paso 2b:** Wrappear Logo con div y agregar `<FontScaleControl />`
- [ ] **Paso 3:** Actualizar `globals.css` (agregar `html { font-size: 16px }`)
- [ ] **Testing:** 
  - [ ] Abrir http://localhost:3000
  - [ ] Ver botón 🔤 al lado del logo
  - [ ] Click en botón → Aparece dropdown
  - [ ] Seleccionar 200% → Toda la página se hace más grande
  - [ ] Refrescar página → Sigue en 200% (localStorage)
  - [ ] Seleccionar 100% → Vuelve al tamaño normal

---

## 🧪 Testing Manual

```bash
# 1. Levantar la app
cd frontend && npm run dev

# 2. Abrir en navegador
http://localhost:3000

# 3. Probar:
# - Click en 🔤 botón
# - Selecciona 150%
# - Verifica que todo se hace más grande
# - Abre DevTools (F12) → Storage → LocalStorage
# - Verifica que haya "fontScale: 150"
# - Refrescar página
# - Debe mantener 150%
```

---

## 🎯 Componentes Afectados

Todo en la página se escala automáticamente porque usan **Tailwind CSS con `rem`**:

✅ Navbar  
✅ Home page (hero, features, nearby, collab)  
✅ Botones SOS  
✅ Todas las páginas (mapa, chat, registro, etc.)  
✅ BottomNav móvil  

---

## 🔒 Consideraciones de Accesibilidad

El componente tiene:
- ✅ `aria-label` en el botón principal
- ✅ `aria-current="true"` en la opción seleccionada
- ✅ `focus-visible:outline` para navegación por teclado
- ✅ `title` con tooltip del tamaño actual
- ✅ Compatible con lectores de pantalla

---

## 📊 Archivos a Modificar (Resumen)

| Archivo | Acción | Líneas |
|---------|--------|--------|
| `FontScaleControl.tsx` | Crear | Nuevo archivo |
| `Navbar.tsx` | Modificar | Línea ~5 (import) + Línea ~23-31 (Logo section) |
| `globals.css` | Modificar | Línea ~73-79 (Base section) |

---

## 🚀 Próximos Pasos

1. ✅ Implementar esto
2. ✅ Testing en navegadores (Chrome, Firefox, Safari)
3. ✅ Testing en móvil (iOS, Android)
4. ✅ Testing con lectores de pantalla (NVDA, JAWS)
5. ⏭️ Commit y PR

---

**Documento creado:** 2026-07-12  
**Estado:** Listo para copiar y pegar
