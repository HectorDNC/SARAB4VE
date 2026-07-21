# 🎨 Visualización Final: Cómo se verá la aplicación

## 📱 PÁGINA PRINCIPAL: Antes vs Después

### ❌ ANTES (Actual)

```
┌────────────────────────────────────────────────────────────────────┐
│ SARA [logo]    Inicio  Mapa  Refugios  ...         NECESITO AYUDA │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         HOME PAGE SARA                             │
│                                                                    │
│  🎯 Plataforma de Emergencia Accesible                            │
│                                                                    │
│  "Asistencia inmediata para personas con discapacidad"            │
│                                                                    │
│              [SOS — Emergencia]  (botón rojo grande)              │
│                                                                    │
│         [Solicitar Apoyo]      [Ver mapa]                         │
│                                                                    │
│  2,450 voluntarios activos hoy en la Red SARA                     │
│                                                                    │
│                     ┌──────────────────────┐                      │
│                     │  SARA                │                      │
│                     │                      │                      │
│                     │  Sistema Autónomo de │                      │
│                     │  Respuesta y         │                      │
│                     │  Asistencia          │                      │
│                     │                      │                      │
│                     │ ✓ 3 puntos de auxilio│                      │
│                     │ ✓ Voluntarios <15min │                      │
│                     │ ✓ 100% accesible     │                      │
│                     └──────────────────────┘                      │
└────────────────────────────────────────────────────────────────────┘

[Resto de la página...]
```

---

### ✅ DESPUÉS (Con escala de fuente)

```
┌────────────────────────────────────────────────────────────────────┐
│ SARA [logo] [🔤 100%]   Inicio  Mapa  Refugios  ...  NECESITO AYUDA │
│                    ↑ NUEVO: Botón de escala aquí
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         HOME PAGE SARA                             │
│                                                                    │
│  🎯 Plataforma de Emergencia Accesible                            │
│                                                                    │
│  "Asistencia inmediata para personas con discapacidad"            │
│                                                                    │
│              [SOS — Emergencia]  (botón rojo grande)              │
│                                                                    │
│         [Solicitar Apoyo]      [Ver mapa]                         │
│                                                                    │
│  2,450 voluntarios activos hoy en la Red SARA                     │
│                                                                    │
│                     ┌──────────────────────┐                      │
│                     │  SARA                │                      │
│                     │                      │                      │
│                     │  Sistema Autónomo de │                      │
│                     │  Respuesta y         │                      │
│                     │  Asistencia          │                      │
│                     │                      │                      │
│                     │ ✓ 3 puntos de auxilio│                      │
│                     │ ✓ Voluntarios <15min │                      │
│                     │ ✓ 100% accesible     │                      │
│                     └──────────────────────┘                      │
└────────────────────────────────────────────────────────────────────┘

[Resto de la página...]
```

---

## 🔤 Interacción: Click en botón de escala

### Paso 1: Usuario ve el botón 🔤 al lado del logo

```
┌────────────────────────────────────────────────────────────────────┐
│ SARA [logo] [🔤 100%]   Inicio  Mapa  Refugios  ...  NECESITO AYUDA │
│                ↑
│          Click aquí para cambiar tamaño
└────────────────────────────────────────────────────────────────────┘
```

### Paso 2: Dropdown aparece

```
┌────────────────────────────────────────────────────────────────────┐
│ SARA [logo] [🔤 100%]   Inicio  Mapa  Refugios  ...  NECESITO AYUDA │
│                │
│                └─ ┌───────────┐
│                   │ 100% ✓    │ ← Seleccionado (azul)
│                   │ 125%      │
│                   │ 150%      │
│                   │ 200%      │
│                   └───────────┘
└────────────────────────────────────────────────────────────────────┘
```

### Paso 3: Usuario selecciona 150%

```
Click en 150%
     ↓
┌───────────┐
│ 100%      │
│ 125%      │
│ 150% ✓    │ ← Ahora aquí está el checkmark
│ 200%      │
└───────────┘
     ↓
Dropdown se cierra
     ↓
Botón muestra [🔤 150%]
     ↓
TODA la página se hace más grande 1.5x
```

---

## 📐 Tamaños Antes y Después (Ejemplo)

### Con escala 100% (Original)
```
Navbar height:        64px (h-16)
Logo font-size:       20px
Título h1:            48px (lg:80px)
Párrafo:              16px
Botón SOS:            32px font-size

Nota: 1rem = 16px
```

### Con escala 150% (Usuario hace click en 150%)
```
Navbar height:        ~80px  (todavía h-16 pero 16 * 1.5 = 24px base)
Logo font-size:       30px (20px * 1.5)
Título h1:            72px (48px * 1.5)
Párrafo:              24px (16px * 1.5)
Botón SOS:            48px (32px * 1.5)

Nota: 1rem = 24px (porque html { font-size: 24px })
```

---

## 🔄 Persistencia en Navegación

### Caso 1: Usuario pone escala en 200%

```
1. Click en 🔤
2. Selecciona 200%
3. Página se escala 2x
4. localStorage.setItem("fontScale", "200")
   └─ Se guarda en el navegador
```

### Caso 2: Usuario navega a otra página (/mapa)

```
Click en "Mapa"
     ↓
Navega a http://localhost:3000/mapa
     ↓
FontScaleControl renderiza en nuevo page
     ↓
useEffect corre
     ↓
Lee localStorage.getItem("fontScale") → "200"
     ↓
applyScale(200)
     ↓
¡Página /mapa se carga YA en 200%!
     ↓
Botón muestra [🔤 200%]
```

### Caso 3: Usuario refrescar navegador

```
F5 o Cmd+R para refrescar
     ↓
Página recarga completamente
     ↓
FontScaleControl useEffect corre
     ↓
Lee localStorage.getItem("fontScale") → "200"
     ↓
applyScale(200)
     ↓
¡La página carga en 200% automáticamente!
```

---

## 📱 Apariencia en Diferentes Dispositivos

### Desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│ SARA [logo] [🔤 100%]   Inicio  Mapa  Refugios  ...  NECESITO AYUDA
└──────────────────────────────────────────────────────────────────┘

✓ Botón visible sin problema
✓ Al lado del logo, espacio disponible
✓ Dropdown aparece hacia abajo-izquierda
```

### Tablet (640px - 1024px)

```
┌─────────────────────────────────────────┐
│ SARA [logo] [🔤]              ☰         │
└─────────────────────────────────────────┘

✓ Botón visible (sin mostrar el %)
✓ Dropdown aparece normalizado
```

### Mobile (<640px)

```
┌──────────────────────┐
│ SARA [🔤]        ☰   │
└──────────────────────┘

✓ Botón compacto
✓ Muestra solo icono [🔤]
✓ Al hacer click aparece dropdown

Cuando hace click:
┌──────────────┐
│ 100% ✓       │
│ 125%         │
│ 150%         │
│ 200%         │
└──────────────┘
```

---

## 🎯 Flujo de Usuario Típico

### Usuario 1: Persona con baja visión
```
1. Abre http://localhost:3000
2. Ve el botón 🔤 al lado de SARA
3. "¿Qué es eso?" → Lee aria-label → "Ajustar tamaño de fuente"
4. Click en el botón
5. Aparece dropdown con opciones
6. Selecciona 200%
7. ¡Toda la página se hace ENORME!
8. Ahora puede leer cómodamente
9. Navega por toda la app en 200%
10. Refrescar o volver → Se mantiene en 200%
11. Feliz ✨
```

### Usuario 2: Persona con visión normal
```
1. Abre http://localhost:3000
2. Ni se fija en el botón 🔤
3. Usa la app normalmente (100%)
4. Si quiere, puede ajustar (pero probablemente no)
5. Sin problemas ✨
```

---

## 🔍 Qué se escala y qué NO

### ✅ Se escala (TODO con rem/em)
- Títulos (h1, h2, h3, h4, h5, h6)
- Párrafos (p)
- Botones
- Links
- Inputs
- Labels
- Iconos Material Symbols
- Espaciado Tailwind (px, py, gap, etc. que usan rem)
- TODA la interfaz

### ❌ NO se escala
- Viewport (tamaño de pantalla)
- Imágenes (width/height en px fijo)
- Position: fixed (ej: BottomNav)

---

## 💾 Almacenamiento (localStorage)

### Qué se guarda
```javascript
localStorage.getItem("fontScale")
// Devuelve: "100", "125", "150", o "200"
```

### Dónde se ve en DevTools
```
1. Abre DevTools (F12)
2. Ve a Aplicación → Storage → LocalStorage
3. Selecciona http://localhost:3000
4. Busca "fontScale"
5. Verás:
   Key: fontScale
   Value: 150 (ejemplo)
```

### Cómo limpiar (si quieres resetear)
```javascript
// En la consola del navegador:
localStorage.removeItem("fontScale");
// Luego refrescar: F5
// Volverá a 100%
```

---

## 🧪 Escenarios de Testing

### Escenario 1: Cambiar tamaño en home
```
1. http://localhost:3000
2. Click en 🔤 → 200%
3. Título se hace grande
4. Párrafos se hacen grandes
5. Botones se hacen grandes
6. Scroll necesario en móvil
```

### Escenario 2: Navegar entre páginas con escala activa
```
1. Home en 200%
2. Click en "Mapa" → /mapa
3. Mapa carga en 200%
4. Click en "Chat" → /chat
5. Chat carga en 200%
```

### Escenario 3: Completar flujo SOS con escala
```
1. Home en 150%
2. Click en "SOS — Emergencia"
3. Formulario SOS aparece en 150%
4. Llena formulario (todo está más grande)
5. Hace click en "Enviar"
6. Confirma que funciona
```

### Escenario 4: Refrescar página con escala
```
1. Home en 175%
2. F5 (refrescar)
3. Página recarga en 175%
4. localStorage funciona ✓
```

---

## 🎯 Checklist Visual Final

- [ ] Botón 🔤 visible junto al logo SARA
- [ ] Dropdown muestra 4 opciones (100%, 125%, 150%, 200%)
- [ ] Seleccionar opción aplica escala inmediatamente
- [ ] Todo texto de la página se hace más grande (h1, p, button, etc.)
- [ ] Imagen y logos responden bien al espacio
- [ ] Navbar mantiene altura coherente
- [ ] Móvil: botón se ve compacto
- [ ] localStorage persiste al navegar
- [ ] localStorage persiste al refrescar
- [ ] Accesibilidad: navegable con teclado
- [ ] Accesibilidad: compatible con lectores

---

**Visualización final creada:** 2026-07-12  
**Estado:** Listo para implementation
