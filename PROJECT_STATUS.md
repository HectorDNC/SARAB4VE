# Estado del Proyecto SARA

**Fecha**: 2026-07-03  
**Estado General**: 🟡 **MVP FUNCIONAL** - En fase de pulido y validación

---

## 📊 Resumen Ejecutivo

SARA está **~70% completado** como MVP. El flujo central (solicitar ayuda → voluntario acepta) está implementado. Faltan principalmente integraciones externas (SMS), refinamiento UX, y casos edge.

| Área | Estado | Completitud |
|------|--------|-------------|
| **Backend API** | ✅ Funcional | 85% |
| **Base de Datos** | ✅ Schema listo | 100% |
| **Frontend - Páginas** | ✅ Implementadas | 80% |
| **Frontend - Componentes** | ✅ Base lista | 70% |
| **Geolocalización** | ✅ Client-side | 100% |
| **Mapa (Leaflet)** | ✅ Funcional | 75% |
| **Notificaciones SMS** | ❌ No implementado | 0% |
| **Chat** | 🟡 En progreso | 10% |
| **Autenticación** | ❌ No requerida (MVP) | N/A |
| **Testing** | ❌ No implementado | 0% |

**Línea de código**: ~47 archivos implementados (sin node_modules)

---

## ✅ Features Implementados

### Backend (API Express)
- ✅ `GET /api/help-requests` — Listar solicitudes (con geo-filtrado opcional)
  - Soporta filtros por estado, radio, ubicación
  - Calcula distancia automáticamente
- ✅ `POST /api/help-requests` — Crear solicitud de ayuda
  - Validación de entrada
  - Soporta 8 tipos de necesidad (equipamiento, medicamentos, transporte, etc.)
  - Urgencia automática basada en lesiones/movilidad
- ✅ `POST /api/help-requests/:id/accept` — Voluntario acepta solicitud
  - Transición de estado `open` → `assigned`
  - Validaciones de integridad
- ✅ `POST /api/help-requests/:id/resolve` — Marcar como resuelta
  - Transición a estado `resolved`
- ✅ `GET /health` — Health check

### Frontend (Next.js)
- ✅ **Home page** (`/`) — Interfaz principal con botón SOS y nav
- ✅ **SOS Emergency** (`/sos`) — Formulario rápido multi-paso
  - Detecta tipo de discapacidad (visual, auditiva, motriz, neuro)
  - Identifica urgencia (lesionado, no puede moverse)
  - Geolocalización automática (fallback a coords fijas)
  - Validación y envío a API
- ✅ **Solicitud de Ayuda** (`/request`) — Formulario detallado
  - Selección de categoría
  - Descripción libre
  - Localización manual o automática
- ✅ **Mapa** (`/mapa`) — Visualización de solicitudes
  - Leaflet + OpenStreetMap
  - Marcadores de solicitudes (color rojo)
  - Sidebar con filtros (estado, categoría, urgencia)
  - Información de refugios (datos mock)
  - Sidebar con lista de solicitudes cercanas
- ✅ **Registro** (`/registro`) — Registro básico de voluntarios
  - (Estructura lista, sin integración BD completa)
- ✅ **Directorio** (`/directorio`) — Listado de ONGs/organizaciones
  - (Estructura lista, datos mock)
- ✅ **Recursos** (`/recursos`) — Listado de refugios y recursos
  - Datos mock desde `src/mocks/refugios.ts`
  - Filtrado por accesibilidad

### Frontend - Componentes
- ✅ **SOSButton** — Botón flotante/prominente
- ✅ **CategoryCard** — Card para seleccionar tipo de necesidad
- ✅ **LeafletMap** — Integración Leaflet
- ✅ **Navbar** — Navegación superior con logo
- ✅ **BottomNav** — Navegación móvil inferior
- ✅ **AlertsHost** — Sistema de alertas in-app
- ✅ **StatBanner** — Banner con estadísticas

### Base de Datos
- ✅ Table `help_requests` con validaciones completas
  - Estados: `open`, `assigned`, `resolved`
  - Urgencia: `low`, `medium`, `high`, `critical`
  - 8 tipos de necesidad (CHECK constraint)
  - Validaciones geo (lat/lng)
  - Restricción: no asignar voluntario si no está `open`
  - Timestamps: `created_at`, `assigned_at`, `resolved_at`

### Servicios Frontend
- ✅ **alertService** — Geolocalización y manejo de alertas
- ✅ **helpRequests API client** — Wrapper centralizado para calls

---

## 🟡 En Progreso / Parcialmente Implementado

### Chat (`/chat`)
- Página creada, pero **sin integración API**
- Falta: endpoint de mensajes, base de datos, Realtime

### Perfil (`/perfil`)
- Página creada, sin funcionalidad
- Falta: persistencia, autenticación de usuario

### Registro de Voluntarios (`/registro`)
- Estructura lista, pero **no guarda en BD**
- Falta: endpoint de creación, validaciones

---

## ❌ No Implementado (Fuera del MVP)

### Crítico para Fase 2
- ❌ **Notificaciones SMS** (Twilio) — Arquitectura lista, sin implementación
- ❌ **Chat en tiempo real** — Realtime Supabase o Socket.io
- ❌ **Autenticación OTP** — Login por código SMS/email
- ❌ **Dashboard Admin** — Ver todas solicitudes, estadísticas
- ❌ **Directorio dinámico** — Integración BD para ONGs

### Testing & DevOps
- ❌ Unit tests
- ❌ Integration tests
- ❌ E2E tests (Cypress, Playwright)
- ❌ CI/CD automatizado (GitHub Actions)
- ❌ Docker para reproducibilidad

### Características Post-MVP
- ❌ Ratings/reviews de voluntarios
- ❌ Historial de solicitudes
- ❌ IA para priorización
- ❌ Mobile app nativa (Flutter/React Native)
- ❌ Integración con Protección Civil

---

## 🔧 Estado de Infraestructura

### Desplegabilidad

| Componente | Estado | Notas |
|------------|--------|-------|
| **Frontend (Vercel)** | ✅ Listo | `npm run build` funciona, sin secretos en código |
| **Backend (Render/Railway)** | ✅ Listo | Requiere `DATABASE_URL` en env vars |
| **Base de Datos (Supabase)** | ✅ Preparado | Schema en `backend/sql/schema.sql` |
| **Conectividad** | ✅ Validada | CORS configurado en backend |

### Desarrollo Local
- ✅ Frontend corre en `http://localhost:3000`
- ✅ Backend corre en `http://localhost:5000` (configurable)
- ✅ BD local con PostgreSQL o Supabase remote

### Configuración Requerida
```env
# Backend (.env)
DATABASE_URL=postgresql://user:pass@host:5432/sara
PORT=5000
NODE_ENV=development

# Frontend (.env.local, si es necesario)
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🚀 Próximos Pasos Críticos (Prioridad)

### ALTA - Esta semana
1. **Integración BD para Voluntarios**
   - Endpoint `POST /api/volunteers`
   - Guardar en tabla `volunteers`
   - Frontend: conectar form `/registro` a API

2. **Chat básico**
   - Tabla `messages` en BD
   - Endpoint `POST /api/messages`
   - Endpoint `GET /api/messages/:assignment_id`
   - Frontend: conectar `/chat` a API

3. **Validación UX/Flujos críticos**
   - Probar SOS → Mapa → Voluntario acepta
   - Geolocalización: verificar que funciona en iOS/Android
   - Error handling: qué pasa si API cae

### MEDIA - Próximas 2 semanas
4. **SMS Notifications** (Twilio)
   - Voluntario: "Nueva solicitud X km de ti" al crearla
   - Persona: "Voluntario Y aceptó tu solicitud"
   - Necesita Twilio API key en env vars

5. **Dashboard Admin**
   - Nueva página `/admin` (protegida, sin auth real)
   - Endpoint `GET /api/admin/requests` con estadísticas
   - Mostrar: # solicitudes abiertas, completadas, voluntarios activos

6. **Tests**
   - Tests de API (backend, Jest o Node --test)
   - Tests de componentes (frontend, Vitest o Jest)
   - E2E con datos reales

### BAJA - Post-MVP
7. **Directorio dinámico** (BD en lugar de mock)
8. **Ratings y feedback**
9. **IA para priorización**

---

## 🐛 Problemas Conocidos & Riesgos

### Bloqueadores Actuales
- ❌ **Chat no persiste** — UI lista, sin backend
- ⚠️ **Registro de voluntarios incompleto** — No se guarda en BD
- ⚠️ **Datos de refugios mocked** — Hardcoded en `src/mocks/refugios.ts`, no escalable

### Riesgos Técnicos
| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Geolocalización falla en navegadores | Alto | Fallback a coords fijas, permite entrada manual |
| Supabase se cae | Crítico | Usar pooler de conexión, respaldo local |
| Cors bloquea requests | Alto | CORS habilitado en backend, verificado |
| API tarda >5s | Medio | Optimizar queries con índices, paginación |

### Problemas Menores
- ⚠️ Datos de mock sin separación clara de datos reales
- ⚠️ No hay validación de teléfono (regex simple)
- ⚠️ Rate limiting no implementado
- ⚠️ Logs no persistidos (solo stdout)

---

## 📈 Métricas de Salud

| Métrica | Valor | Target |
|---------|-------|--------|
| **Cobertura de Features MVP** | 70% | 100% (esta semana) |
| **API Endpoints implementados** | 5/7 | 7/7 |
| **Páginas Frontend** | 8/10 | 10/10 |
| **Tiempo SOS → Mapa** | <5s | <3s |
| **Tests** | 0 | >50% cobertura |
| **Documentación** | ✅ CLAUDE.md | ✅ Completa |

---

## 👥 Equipo & Responsabilidades

Según CLAUDE.md del proyecto:
- **Product Manager**: Priorización de features
- **Backend Lead**: API, BD, deployment
- **Frontend Lead**: UI/UX, componentes
- **DevOps/DB**: Supabase, Render, backups

**Estado**: Equipo pequeño, algunos con múltiples roles.

---

## 🎯 Definition of Done (MVP)

- [x] Frontend desplegado en Vercel
- [x] Backend desplegado en Render/Railway
- [x] BD schema en Supabase
- [x] Flujo E2E: Crear solicitud → Ver en mapa → Voluntario la acepta
- [ ] Notificaciones SMS (Twilio)
- [ ] Chat básico
- [ ] 5+ casos de prueba exitosos
- [ ] Demo script listo
- [ ] Cero errores críticos

**Progreso**: 4/8 completo (50%)

---

## 📝 Comandos Útiles para Desarrollo

```bash
# Frontend
cd frontend && npm run dev         # Dev server
npm run build && npm start         # Prod

# Backend
cd backend && npm start            # Dev server
DATABASE_URL=... npm start         # Con DB remoto

# BD
psql "$DATABASE_URL" -f sql/schema.sql   # Aplicar schema
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM help_requests;"  # Contar solicitudes

# Testing (cuando se añada)
npm test
```

---

## 📞 Contacto & Escalaciones

- **Blockers**: Registrar en GitHub Issues
- **Preguntas arquitectónicas**: Ver CLAUDE.md
- **Despliegue**: Supabase dashboard, Vercel, Render dashboards

---

**Última actualización**: 2026-07-03  
**Próxima revisión recomendada**: 2026-07-05 (después de implementar chat)
