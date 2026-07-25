# Propuesta: Control de Escala de Fuente en Navbar

## 📋 Historia de Usuario (HU) Refinada

### HU-001: Incrementar tamaño de fuente para mejor legibilidad

**Como** usuario con baja visión o dificultad para leer texto pequeño  
**Quiero** poder incrementar el tamaño de la fuente en toda la aplicación hasta 200%  
**Para que** pueda leer el contenido con mayor claridad y comodidad

---

## Criterios de Aceptación

### Funcionalidad
- [ ] Botón visible y accesible en la barra superior (Navbar) en todas las páginas
- [ ] Control que permita 4 niveles de escala: 100%, 125%, 150%, 200%
- [ ] La escala se persiste en localStorage (recuerda la preferencia del usuario)
- [ ] Se aplica instantáneamente a todo el contenido de la página
- [ ] Funciona en dispositivos móviles y desktop

### Accesibilidad
- [ ] El botón tiene aria-label descriptivo ("Ajustar tamaño de fuente")
- [ ] El botón tiene focus visible (outline)
- [ ] El control es operable con teclado (Tab + Enter/Space)
- [ ] No interfiere con lectores de pantalla
- [ ] La escala se aplica a todas las fuentes: títulos, párrafos, botones, etiquetas

### Experiencia de Usuario
- [ ] Indicador visual del nivel actual (ej: "125%" mostrado en el botón)
- [ ] Tooltip al pasar el mouse: "Tamaño de fuente: 100%"
- [ ] No hay saltos o cambios bruscos de layout al cambiar escala
- [ ] Responsive: en móvil, el botón no ocupa espacio excesivo

### Diseño
- [ ] Visualmente consistente con la barra superior
- [ ] Usa iconografía Material Symbols (ej: `text_increase` o `format_size`)
- [ ] Color y tamaño apropiado para no distraer del logo/navegación

---

## Opciones de Ubicación

### Opción A: A la derecha del botón "NECESITO AYUDA" (Desktop) / En el menú móvil

**Ventajas:**
- Agrupa controles de accesibilidad en una zona
- Desktop: accesible sin abrir menú
- Móvil: no compete por espacio

**Desventajas:**
- En desktop, pequeño espacio a la derecha
- Menos visible en primera mirada

**Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ SARA [logo]    Inicio Mapa Refugios ...    NECESITO AYUDA [A]
└─────────────────────────────────────────────────────────┘
                                             [A] = botón escala
```

---

### Opción B: Dentro del menú desplegable (móvil) / Como un pequeño botón flotante a la derecha del Navbar (desktop)

**Ventajas:**
- No interfiere con el flujo principal
- Visible pero no invasivo
- Móvil: en el mismo menú de navegación

**Desventajas:**
- Usuario tiene que hacer click para encontrarlo
- Menos visible

**Mockup:**
```
Desktop:
┌──────────────────────────────────────────────────────────┐
│ SARA    Inicio Mapa Refugios    NECESITO AYUDA        [A]
└──────────────────────────────────────────────────────────┘
                                                      (esquina)

Móvil (menú desplegado):
┌──────────────────────┐
│ Inicio               │
│ Mapa                 │
│ Refugios             │
│ Recursos             │
│ Directorio           │
│ Chat                 │
│ NECESITO AYUDA — SOS │
│ ─────────────────── │
│ 🔤 Tamaño de fuente │
└──────────────────────┘
```

---

### Opción C: Junto al logo SARA (izquierda de la barra) **← RECOMENDADO**

**Ventajas:**
- Accesibilidad es una prioridad: ubicación prominente
- Se asocia con la marca SARA (enfoque en inclusión)
- Visible inmediatamente sin buscar
- No compite con navegación ni CTA principal
- Móvil: siempre visible al lado del logo

**Desventajas:**
- Ligeramente más competencia visual con el logo

**Mockup:**
```
┌────────────────────────────────────────────────────────┐
│ SARA [logo] [A]    Inicio Mapa Refugios    NECESITO AYUDA
└────────────────────────────────────────────────────────┘
              ↑ Botón escala aquí (pequeño, al lado del logo)
```

---

## 🎯 Recomendación

**Opción C** es la mejor:
1. Enfatiza que la accesibilidad es core de SARA
2. Siempre visible (no requiere click extra)
3. Funciona bien en móvil (al lado del logo)
4. Deja el flujo SOS/navegación intacto

---

## 🔧 Implementación Técnica Propuesta

### 1. Crear componente `FontScaleControl.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";

export default function FontScaleControl() {
  const [scale, setScale] = useState(100);
  const [isOpen, setIsOpen] = useState(false);

  const scales = [100, 125, 150, 200];

  useEffect(() => {
    // Cargar preferencia del localStorage
    const saved = localStorage.getItem("fontScale");
    if (saved) {
      const value = parseInt(saved, 10);
      setScale(value);
      applyScale(value);
    }
  }, []);

  const applyScale = (value: number) => {
    document.documentElement.style.fontSize = `${(value / 100) * 16}px`;
    localStorage.setItem("fontScale", value.toString());
  };

  const handleChange = (newScale: number) => {
    setScale(newScale);
    applyScale(newScale);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Ajustar tamaño de fuente: ${scale}%`}
        title={`Tamaño de fuente: ${scale}%`}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="material-symbols-rounded text-lg">text_increase</span>
        <span className="text-xs font-semibold">{scale}%</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-surface-container-low border border-outline-variant rounded-lg shadow-card p-2 z-50">
          {scales.map((s) => (
            <button
              key={s}
              onClick={() => handleChange(s)}
              className={`block w-full text-left px-4 py-2 rounded text-sm font-semibold transition-colors ${
                scale === s
                  ? "bg-primary text-on-primary"
                  : "text-on-surface hover:bg-surface-container"
              }`}
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

### 2. Integrar en `Navbar.tsx`

```typescript
// En Navbar.tsx, agregar al lado del logo:

import FontScaleControl from "@/components/ui/FontScaleControl";

// Dentro del header, después del logo:
<FontScaleControl />
```

### 3. Actualizar `globals.css`

```css
/* Agregar esta regla al inicio de globals.css */
html {
  font-size: 16px; /* Base por defecto */
}

body {
  font-size: 1rem; /* Hereda el tamaño del html */
}

/* Todos los elementos usan rem o em, que escalan con el tamaño base */
```

---

## 📊 Comparativa de Opciones

| Aspecto | Opción A | Opción B | Opción C |
|---------|----------|----------|----------|
| **Visibilidad** | Media | Baja | ⭐ Alta |
| **Accesibilidad** | Media | Baja | ⭐ Alta |
| **Impacto visual** | Bajo | Bajo | ⭐ Medio |
| **Esfuerzo usuario** | Bajo | Medio | ⭐ Bajo |
| **Consistencia SARA** | Media | Media | ⭐ Alta |
| **Móvil friendly** | Medio | Media | ⭐ Alta |

---

## ✅ Definición de Hecho

- [ ] Componente `FontScaleControl` creado
- [ ] Integrado en Navbar
- [ ] localStorage persiste escala
- [ ] Funciona en Chrome, Firefox, Safari, Edge
- [ ] Responsive (desktop y móvil)
- [ ] Tests de accesibilidad (WCAG AA)
- [ ] Documentado en CLAUDE.md
- [ ] Revisión UX con equipo

---

## 🚀 Próximos Pasos

1. **Validar opción** con equipo (recomendación: Opción C)
2. **Crear componente** `FontScaleControl.tsx`
3. **Integrar** en `Navbar.tsx`
4. **Testing manual**: verificar en 3+ navegadores
5. **Testing de accesibilidad**: Axe DevTools, WAVE, lectores de pantalla
6. **Documentar** el change en CLAUDE.md

---

**Documento creado**: 2026-07-12  
**Estado**: Listo para implementación
