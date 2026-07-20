# Flujo Asíncrono de Emergencias por Voz

## Resumen

El endpoint de registro de emergencias por voz (`POST /api/emergencies/voice`) ha sido refactorizado para proporcionar una respuesta **inmediata** al usuario, mientras el procesamiento pesado (transcripción y extracción de datos) se ejecuta en **background**.

## Flujo del Usuario

### 1. Registro Inmediato

```bash
POST /api/emergencies/voice
Content-Type: multipart/form-data

# Campos mínimos requeridos:
# - audio (archivo de audio)
# - latitude, longitude (ubicación)
# - disabilityType (opcional, default: 'motriz')
```

**Respuesta inmediata (~100ms):**

```json
{
  "data": {
    "id": "uuid-de-la-emergencia",
    "processingStatus": "recibida",
    "latitude": 10.123456,
    "longitude": -67.123456,
    "status": "received",
    "createdAt": "2026-07-19T10:00:00Z"
  }
}
```

La emergencia queda registrada inmediatamente con estado `processingStatus: "recibida"`.

### 2. Procesamiento en Background

El sistema procesa la emergencia de forma asíncrona en estos pasos:

1. **Subir audio** a almacenamiento (R2/S3)
2. **Transcribir** el audio:
   - Si el cliente envió transcripción (`transcript`), se usa esa
   - Si no, se intenta con **Gemini** (IA)
   - Si Gemini falla, se usa **diccionario de palabras clave** como fallback
3. **Extraer datos** de la transcripción:
   - Gemini extrae: tipo de emergencia, severidad, discapacidad, modo de comunicación, etc.
   - Si Gemini falla, el diccionario proporciona datos básicos
4. **Actualizar emergencia** con los datos extraídos
5. **Notificar** al frontend vía WebSocket en cada paso

### 3. Suscripción WebSocket

El frontend puede suscribirse a actualizaciones en tiempo real:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // Suscribirse a una emergencia específica
  ws.send(JSON.stringify({
    type: 'subscribe',
    emergencyId: 'uuid-de-la-emergencia'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'emergency_update') {
    console.log('Estado:', data.data.processingStatus);
    // 'recibida' -> 'procesando' -> 'completa' | 'pendiente_revision'
  }
};
```

### 4. Consulta de Estado (Polling Alternativo)

Si WebSocket no está disponible, se puede consultar el estado vía REST:

```bash
GET /api/emergencies/:id/processing-status
Authorization: Bearer <token>
```

**Respuesta:**

```json
{
  "data": {
    "id": "uuid",
    "processingStatus": "procesando",  // recibida | procesando | completa | pendiente_revision | error
    "transcript": "Hay una persona atrapada...",
    "transcriptMethod": "gemini",
    "needType": "Rescate",
    "description": "Persona atrapada en edificio colapsado",
    "urgency": "critical",
    "updatedAt": "2026-07-19T10:00:05Z"
  }
}
```

## Estados de Procesamiento

| Estado | Descripción |
|--------|-------------|
| `recibida` | Emergencia registrada, pendiente de procesamiento |
| `procesando` | Procesamiento en curso (transcripción/extracción) |
| `completa` | Procesamiento exitoso, datos extraídos |
| `pendiente_revision` | Procesamiento falló o datos insuficientes, requiere revisión manual |
| `error` | Error crítico durante el procesamiento |

## Arquitectura

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ POST /voice
       │ (audio + ubicación)
       ▼
┌─────────────────┐
│  Emergencia     │
│  Controller     │
└────────┬────────┘
         │
         ├─► INSERT inmediato (processing_status='recibida')
         │   └─► Respuesta al cliente (~100ms)
         │
         └─► processVoiceEmergency() [background]
             │
             ├─► Subir audio a R2
             │
             ├─► Transcribir
             │   ├─ Cliente envió transcript? → usar
             │   ├─ Gemini disponible? → usar Gemini
             │   └─ Fallback → diccionario
             │
             ├─► Extraer datos
             │   ├─ Gemini → datos completos
             │   └─ Fallback → diccionario (datos básicos)
             │
             ├─► UPDATE emergencia con datos extraídos
             │
             └─► Notificar WebSocket en cada paso
                 ├─ processingStatus: 'procesando'
                 ├─ step: 'transcribing'
                 ├─ step: 'extracting'
                 └─ processingStatus: 'completa' | 'pendiente_revision'
```

## Resiliencia

### La emergencia NUNCA se pierde

- **Transcripción falla**: Se usa el diccionario de palabras clave
- **Extracción falla**: Se guardan datos mínimos (ubicación + audio URL)
- **Todo falla**: `processing_status = 'pendiente_revision'`, un operador revisa manualmente
- **Error crítico**: `processing_status = 'error'`, se registra en logs

### Fallbacks

1. **Transcripción**:
   - Web Speech API (cliente) → Gemini → Diccionario
2. **Extracción de datos**:
   - Gemini → Diccionario de palabras clave

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `emergencies.voice.js` | Refactorizado: INSERT inmediato + procesamiento async |
| `emergencies.processor.js` | **Nuevo**: Lógica de procesamiento en background |
| `websocket.js` | **Nuevo**: Servicio de notificaciones WebSocket |
| `emergencies.repository.js` | Agregado `getProcessingStatus()` |
| `emergencies.service.js` | Agregado `getProcessingStatus()` |
| `emergencies.controller.js` | Agregado handler `getProcessingStatus()` |
| `emergencies.routes.js` | Agregada ruta `GET /:id/processing-status` |
| `server.js` | Inicialización de servidor WebSocket |
| `schema.sql` | Agregada columna `processing_status` |
| `002_emergency_processing.sql` | **Nueva**: Migración para columna processing_status |

## Dependencias Agregadas

```json
{
  "ws": "^8.13.1"  // WebSocket server
}
```

## Ejemplo de Uso Completo

### Frontend (JavaScript)

```javascript
// 1. Enviar emergencia por voz
const formData = new FormData();
formData.append('audio', audioBlob, 'emergency.webm');
formData.append('latitude', '10.123456');
formData.append('longitude', '-67.123456');
formData.append('disabilityType', 'motriz');

const response = await fetch('/api/emergencies/voice', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { data } = await response.json();
const emergencyId = data.id;

console.log('Emergencia registrada:', emergencyId);
console.log('Estado:', data.processingStatus); // 'recibida'

// 2. Suscribirse a actualizaciones vía WebSocket
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    emergencyId: emergencyId
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'emergency_update' && message.emergencyId === emergencyId) {
    const { processingStatus, step, transcript, extractedData } = message.data;
    
    console.log(`Estado: ${processingStatus}`);
    
    if (step === 'transcribing') {
      console.log('Transcribiendo audio...');
    } else if (step === 'extracting') {
      console.log('Extrayendo datos...');
    } else if (processingStatus === 'completa') {
      console.log('Procesamiento completado');
      console.log('Transcripción:', transcript);
      console.log('Datos extraídos:', extractedData);
    } else if (processingStatus === 'pendiente_revision') {
      console.log('Requiere revisión manual');
    }
  }
};
```

### Backend (Consultar estado vía REST)

```bash
# Verificar estado de procesamiento
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/emergencies/UUID/processing-status

# Respuesta mientras procesa:
# { "data": { "processingStatus": "procesando", ... } }

# Respuesta cuando completa:
# { "data": { "processingStatus": "completa", "transcript": "...", ... } }
```

## Testing

Para probar el flujo:

```bash
# 1. Iniciar servidor
npm start

# 2. Enviar emergencia de prueba
curl -X POST http://localhost:3000/api/emergencies/voice \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@emergency.webm" \
  -F "latitude=10.123456" \
  -F "longitude=-67.123456" \
  -F "disabilityType=motriz"

# Respuesta inmediata con processingStatus='recibida'

# 3. Consultar estado
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/emergencies/UUID/processing-status

# 4. Ver logs de procesamiento
# [PROCESSOR] Iniciando procesamiento asíncrono...
# [PROCESSOR] Transcripción obtenida (gemini): "Hay una persona atrapada..."
# [PROCESSOR] Datos extraídos: rescate alta
# [PROCESSOR] Procesamiento completado. Estado: completa
```

## Próximos Pasos

- [ ] Implementar reintentos automáticos si Gemini falla
- [ ] Agregar métricas de tiempo de procesamiento
- [ ] Notificar a operadores cuando `processing_status = 'pendiente_revision'`
- [ ] Dashboard de emergencias pendientes de revisión
- [ ] Integración con sistema de alertas (SMS, email)
