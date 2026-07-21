# 🚀 Guía: Ejecutar SARA en Local

**Requisitos:**
- ✅ Node.js v20+ (tienes v25.4.0)
- ✅ npm v8+ (tienes v11.7.0)
- ✅ git (tienes v2.49.0)
- ❌ PostgreSQL (opcional, usamos Supabase para MVP)

---

## Paso 1: Clonar/Verificar el Proyecto

```bash
cd "/Users/julianalvarez/B4V PROJECTS/SARAB4VE"
git status
```

El proyecto ya está aquí con todo el código.

---

## Paso 2: Instalar Dependencias

```bash
# Frontend
cd frontend
npm install

# Backend (en otra terminal)
cd ../backend
npm install
```

**Tiempo esperado:** 2-3 minutos por cada carpeta

---

## Paso 3: Configurar Base de Datos

### Opción A: Usar Supabase (Recomendado - Sin instalar nada)

1. **Crear proyecto en Supabase** (gratis):
   - Ve a https://supabase.com
   - Click "Start your project"
   - Sign up con email
   - Crea un proyecto nuevo

2. **Obtener la URL de conexión:**
   - En dashboard → Project Settings → Database
   - Copia la connection string URI (debe incluir contraseña)
   - Formato: `postgresql://user:password@host:5432/postgres`

3. **Crear archivo `.env` en `backend/`:**

```bash
cd backend
cp .env.example .env
```

4. **Editar `backend/.env`:**
```env
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[database]
PORT=5000
NODE_ENV=development
```

5. **Aplicar schema de base de datos:**
```bash
# Desde carpeta backend
psql "$DATABASE_URL" -f sql/schema.sql
```

**Problema:** No tienes `psql` instalado. Soluciones:
- A) Instalar PostgreSQL (complejo en Mac)
- B) Ejecutar el schema desde Supabase dashboard (fácil)

**→ Recomendado: Opción B (Dashboard Supabase)**
- En Supabase → SQL Editor
- Copia el contenido de `backend/sql/schema.sql`
- Pégalo y ejecuta

---

### Opción B: PostgreSQL Local (Alternativa)

```bash
# Con Homebrew en Mac
brew install postgresql@15
brew services start postgresql@15

# Crear base de datos
createdb sara

# Aplicar schema
psql sara -f backend/sql/schema.sql
```

Luego en `backend/.env`:
```env
DATABASE_URL=postgresql://localhost:5432/sara
PORT=5000
NODE_ENV=development
```

---

## Paso 4: Verificar Conexión a BD

```bash
# Desde carpeta backend
npm start
```

Deberías ver:
```
Server running on http://localhost:5000
Database connected ✓
```

Si falla, revisa que `DATABASE_URL` esté correcta en `.env`

---

## Paso 5: Levantar el Frontend

En **otra terminal** (no cierres la del backend):

```bash
cd frontend
npm run dev
```

Deberías ver:
```
> frontend@0.1.0 dev
> next dev

  ▲ Next.js 16.2.9
  - Local:        http://localhost:3000
```

---

## Paso 6: Abrir en el navegador

**Frontend:** http://localhost:3000  
**Backend API:** http://localhost:5000/health

Deberías ver:
- Frontend: Página principal de SARA con botón SOS
- Backend: JSON con status OK

---

## 🧪 Probar la Aplicación

### Flujo básico:

1. **Crear solicitud SOS:**
   - Click en botón "SOS — Emergencia" en home
   - O ir a http://localhost:3000/sos
   - Llenar formulario (nombre, tipo de discapacidad, ubicación)
   - Hacer click "Enviar"

2. **Ver solicitud en mapa:**
   - Ir a http://localhost:3000/mapa
   - Deberías ver un punto rojo con tu solicitud

3. **Voluntario acepta:**
   - (Actualmente sin UI, pero puedes hacer POST manual)
   - API: `POST http://localhost:5000/api/help-requests/{id}/accept`
   - Body:
   ```json
   {
     "volunteerName": "Juan García",
     "volunteerContactMethod": "phone",
     "volunteerContactValue": "+584121234567"
   }
   ```

---

## 📊 Verificar Estado de la BD

```bash
# Conectarse a la BD
psql "$DATABASE_URL"

# Ver solicitudes creadas
SELECT * FROM help_requests;

# Contar solicitudes
SELECT COUNT(*) FROM help_requests;

# Salir
\q
```

---

## 🐛 Troubleshooting

### "Cannot find module..."
```bash
# Solución: reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### "Database connection failed"
- ✓ Verifica que `DATABASE_URL` esté en `.env`
- ✓ Verifica que la contraseña sea correcta
- ✓ Verifica que el host sea accesible

### "Port 3000/5000 already in use"
```bash
# Listar procesos en puerto
lsof -i :3000
lsof -i :5000

# Matar proceso
kill -9 <PID>
```

### "CORS blocked"
- Backend ya tiene CORS habilitado
- Si aún falla, verifica que frontend use `NEXT_PUBLIC_API_URL=http://localhost:5000`

---

## 📁 Estructura de Archivos (Para Referencia)

```
.
├── frontend/                    # Next.js app
│   ├── src/
│   │   ├── app/                # Páginas (/sos, /mapa, /request, etc.)
│   │   ├── components/         # Navbar, BottomNav, etc.
│   │   └── api/                # Cliente API (helpRequests.ts)
│   └── package.json
│
└── backend/                     # Express API
    ├── src/
    │   ├── routes/             # Rutas (helpRequests)
    │   ├── db.js              # Conexión PostgreSQL
    │   └── server.js          # Entry point
    ├── sql/
    │   └── schema.sql         # Schema BD
    └── package.json
```

---

## ✅ Checklist Final

- [ ] `npm install` completado en frontend y backend
- [ ] `.env` creado en backend con `DATABASE_URL`
- [ ] Schema aplicado a la BD (Supabase o local)
- [ ] `npm start` corriendo en backend (puerto 5000)
- [ ] `npm run dev` corriendo en frontend (puerto 3000)
- [ ] Frontend accesible en http://localhost:3000
- [ ] Backend responde en http://localhost:5000/health
- [ ] Puedes crear una solicitud SOS
- [ ] La solicitud aparece en el mapa

---

## 🚀 Próximo Paso

Una vez que esté corriendo localmente, puedes:
1. Implementar el control de escala de fuente (ver `font-scale-proposal.md`)
2. Probar el chat (en progreso)
3. Probar registro de voluntarios
4. Hacer deploy a Vercel (frontend) y Render (backend)

---

**Fecha:** 2026-07-12  
**Versión:** 1.0  
**Estado:** Listo para ejecutar
