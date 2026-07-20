# Backend - SARA

API Node.js para el MVP de SARA.

## Stack

- Node.js
- Express
- PostgreSQL

## Arranque local

1. Instala dependencias:

```bash
npm install
```

2. Crea variables de entorno:

```bash
cp .env.example .env
```

3. Crea la base y aplica el esquema:

```bash
createdb sara
psql "$DATABASE_URL" -f sql/schema.sql
```

Si vas a usar Supabase, puedes apuntar `DATABASE_URL` al pooler y saltarte la base local:

```bash
DATABASE_URL=postgresql://postgres.svvdcvjtytfsuqeveyza:<password>@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

4. Arranca la API:

```bash
npm start
```

## Endpoints

- `GET /health`
- `GET /api/help-requests`
- `POST /api/help-requests`
- `POST /api/help-requests/:id/accept`
- `POST /api/help-requests/:id/resolve`
- `POST /api/emergencies/voice` — reporte de emergencia por voz (audio + transcript)

## Reporte de emergencias por voz

El endpoint `POST /api/emergencies/voice` acepta `multipart/form-data` con
un archivo de audio (campo `audio`, hasta 10 MB) y los demás campos del
formulario de emergencia. El audio se sube a Cloudflare R2 y el
registro queda con `report_origin = 'voz'`.

### Cascada de transcripción

Si el cliente NO envía el campo `transcript` (o lo envía vacío) pero
adjunta el audio, el backend intenta transcribirlo en este orden:

| # | Método                     | Dependencias                 | Cuándo se usa                          |
|---|----------------------------|------------------------------|----------------------------------------|
| 1 | **cliente-webspeech** (frontend) | Ninguna en backend          | Si el cliente ya envió `transcript`     |
| 2 | **Gemini** (Google AI Studio) | `GEMINI_API_KEY` en `.env`   | Si el cliente no envió transcript pero hay audio |
| 3 | **ninguno** (registro manual)    | —                       | Si Gemini falla, no hay key, o el audio > 20 MB |

El método usado se guarda en la columna `transcript_method` del
registro (`cliente-webspeech`, `gemini` o `ninguno`). El registro
SIEMPRE se crea, incluso si la transcripción falla — queda pendiente
de revisión manual del usuario.

### Variables de entorno relevantes

```bash
# Gemini — Transcripción de audio (Nivel 1) + clasificación de texto
GEMINI_API_KEY=...              # https://aistudio.google.com/apikey (gratis)
GEMINI_MODEL=gemini-1.5-flash   # default; soporta audio inline

# Groq — Fallback de clasificación de texto (sin audio)
GROQ_API_KEY=...                # https://console.groq.com (gratis)
GROQ_MODEL=llama-3.3-70b-versatile
```

### Limitación conocida

**El backend no tiene transcripción offline (sin internet).** Si
Gemini no responde y el cliente no envió `transcript` (no usó Web
Speech API), el registro se guarda con `transcript_method='ninguno'`
para que el operador lo complete manualmente.

Razón: agregar Whisper local con `@huggingface/transformers` requiere
~250 MB de bundle y > 1.5 GB de RAM en frío, lo que excede los
límites de Vercel Hobby y añade complejidad innecesaria para el
tamaño actual del proyecto. Si en el futuro se necesita, se puede
reactivar como dependencia opcional.

## Geolocalizacion en listado

`GET /api/help-requests` acepta estos query params opcionales:

- `status`: `open`, `assigned`, `resolved`
- `latitude`
- `longitude`
- `radiusKm`

Reglas:

- `latitude` y `longitude` deben enviarse juntos
- `radiusKm` es opcional y por defecto vale `10`
- `radiusKm` maximo: `100`
- cuando hay geofiltro, la respuesta se ordena por cercania e incluye `distanceKm`

Ejemplo:

```http
GET /api/help-requests?status=open&latitude=10.4806&longitude=-66.9036&radiusKm=10
```

## Aceptar solicitud

`POST /api/help-requests/:id/accept` acepta una solicitud solo si sigue en estado `open`.

Payload:

```json
{
  "volunteerName": "Luis Perez",
  "volunteerContactMethod": "phone",
  "volunteerContactValue": "+584121112233"
}
```

Respuestas:

- `200` si la solicitud se asigna correctamente
- `400` si el `id` o el payload son invalidos
- `404` si la solicitud no existe
- `409` si la solicitud ya no esta disponible

## Resolver solicitud

`POST /api/help-requests/:id/resolve` marca una solicitud como resuelta solo si sigue en estado `assigned`.

Respuestas:

- `200` si la solicitud se cierra correctamente
- `400` si el `id` es invalido
- `404` si la solicitud no existe
- `409` si la solicitud no esta asignada o ya fue resuelta

## Ejemplo de payload

```json
{
  "requesterName": "Ana Perez",
  "contactMethod": "phone",
  "contactValue": "+584141234567",
  "needType": "transport",
  "description": "Necesito llegar a un refugio accesible",
  "latitude": 10.4806,
  "longitude": -66.9036,
  "urgency": "high"
}
```

## Tipos de necesidad

- `equipment`
- `medication`
- `transport`
- `companionship`
- `interpreter`
- `accessible_information`
- `neurodivergent_support`
- `psychosocial_support`
