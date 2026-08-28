# SARA — Plantillas de correo del flujo de validación

*Registro y validación de organizaciones y voluntariado por enlaces de acción*

> **Estado de uso:** Correo 1 y Correo 2 son los únicos necesarios para
> HU-1 (actual). Correo 3 es de HU-2. Correo 4A/4B son de HU-3. No
> implementar el envío de estos últimos 4 hasta llegar a esas historias.

## Variables usadas en las plantillas

Estas variables se reemplazan al momento de enviar cada correo:

| Variable | Descripción |
|---|---|
| `{{nombre_solicitante}}` | nombre de la organización o de la persona voluntaria |
| `{{tipo_solicitud}}` | Organización o Voluntariado |
| `{{id_solicitud}}` | identificador (UUID existente, `ownerId`) |
| `{{fecha_envio}}` | fecha y hora del envío |
| `{{resumen_datos}}` | bloque con los campos principales del formulario |
| `{{lista_documentos}}` | lista de documentos adjuntos |
| `{{link_iniciar_revision}}` | enlace de un solo uso, token de acción 'iniciar' |
| `{{link_aprobar}}` | enlace de un solo uso, token de acción 'aprobar' (HU-3) |
| `{{link_rechazar}}` | enlace de un solo uso, token de acción 'rechazar' (HU-3) |
| `{{link_completar_registro}}` | enlace con token para definir contraseña en la UI (HU-4) |
| `{{motivo_rechazo}}` | motivo indicado por el validador, o mensaje genérico en v1 (HU-3) |

---

## Correo 1 · Confirmación de envío (estado: ENTREGADA)

**Usado en: HU-1 — implementar ahora**

Se dispara al solicitante inmediatamente después de guardar la solicitud.

**Asunto:** `Hemos recibido tu solicitud — {{id_solicitud}}`

Hola {{nombre_solicitante}},

Confirmamos que recibimos tu solicitud de registro en SARA correctamente.

Estos son los datos:
Tipo de solicitud: {{tipo_solicitud}}
ID de solicitud: {{id_solicitud}}
Fecha de envío: {{fecha_envio}}
Estado actual: ENTREGADA

En los próximos días nuestro equipo de validación revisará tu
información y documentación. Te avisaremos por este mismo correo en
cada cambio de estado, hasta llegar a un resultado final.

No necesitas responder este correo ni realizar ninguna acción
adicional por ahora.

Equipo SARA

---

## Correo 2 · Aviso a validadores (nueva solicitud para revisar)

**Usado en: HU-1 — implementar ahora**

Se envía a la lista de correos de validadores junto con los documentos adjuntos.

**Asunto:** `Nueva solicitud para revisar — {{id_solicitud}}`

Hola,

Llegó una nueva solicitud de {{tipo_solicitud}} que requiere validación:

Solicitante: {{nombre_solicitante}}
ID de solicitud: {{id_solicitud}}
Fecha de envío: {{fecha_envio}}

{{resumen_datos}}

Documentos adjuntos: {{lista_documentos}}

Cuando comiences a revisar el caso, haz clic en el siguiente botón
para marcarlo como en estudio y avisar automáticamente al solicitante:

[ Iniciar revisión ] → {{link_iniciar_revision}}

Este enlace es de un solo uso y solo funciona mientras la solicitud
esté en estado ENTREGADA.

Equipo SARA

---

## Correo 3 · Aviso de "Pendiente – EN ESTUDIO"

**Usado en: HU-2 — no implementar todavía**

Se dispara automáticamente al solicitante cuando el validador hace clic en "Iniciar revisión".

**Asunto:** `Tu solicitud está en revisión — {{id_solicitud}}`

Hola {{nombre_solicitante}},

Tu solicitud {{id_solicitud}} ya está siendo revisada por nuestro
equipo de validación.

Estado actual: Pendiente – EN ESTUDIO

Te escribiremos de nuevo en cuanto tengamos un resultado. No es
necesario que hagas nada mientras tanto.

Equipo SARA

---

## Correo 4A · Resultado — Aceptada

**Usado en: HU-3 — no implementar todavía**

Se dispara al solicitante cuando el validador hace clic en "Aprobar".

**Asunto:** `¡Tu solicitud fue aceptada! — {{id_solicitud}}`

Hola {{nombre_solicitante}},

Tenemos buenas noticias: tu solicitud {{id_solicitud}} fue aceptada.

Estado final: ACEPTADA

Solo falta un paso para activar tu cuenta: define tu contraseña en
el siguiente enlace.

[ Completar registro ] → {{link_completar_registro}}

Este enlace es personal, de un solo uso, y te llevará directamente a
la pantalla para crear tu contraseña.

¡Bienvenido/a a SARA!

---

## Correo 4B · Resultado — Rechazada

**Usado en: HU-3 — no implementar todavía**

Se dispara al solicitante cuando el validador hace clic en "Rechazar".

**Asunto:** `Resultado de tu solicitud — {{id_solicitud}}`

Hola {{nombre_solicitante}},

Después de revisar tu solicitud {{id_solicitud}}, no fue posible
aprobarla en esta ocasión.

Estado final: RECHAZADA
Motivo: {{motivo_rechazo}}

Si consideras que esto fue un error o quieres corregir la información
indicada, puedes volver a enviar una nueva solicitud desde el
formulario de SARA.

Equipo SARA