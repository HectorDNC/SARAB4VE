export type DisabilityType = "visual" | "auditiva" | "neuro" | "motriz";

// Subcategorías de comunicación para Discapacidad Auditiva (DISC_AUD)
export type CommunicationMode =
  | "lengua_senas"     // DISC_AUD_01 – Intérprete / video accesible
  | "audifono"         // DISC_AUD_02 – Usa audífonos
  | "implante_coclear" // DISC_AUD_03 – Alerta de riesgo: hardware médico
  | "vibrador_oseo";   // DISC_AUD_04 – Comunicación sensorial alternativa

// Subcategorías para Discapacidad Visual
export type VisualSubcategory =
  | "guia_voz"         // Priorizar guía por voz
  | "braille"          // Material en braille
  | "perro_guia";      // Usa perro guía

// Subcategorías para Neurodivergencia
export type NeuroSubcategory =
  | "ambiente_calmado" // Entorno sin sobrecarga sensorial
  | "comunicacion_clara" // Instrucciones literales y directas
  | "acompanamiento";  // Acompañamiento presencial

// Subcategorías para Discapacidad Motriz
export type MotrizSubcategory =
  | "silla_ruedas"     // Usa silla de ruedas
  | "traslado_asistido" // Necesita ayuda para traslado
  | "evacuacion_accesible"; // Ruta de evacuación accesible

export type LocationStatus = "idle" | "loading" | "ready" | "error";

// Audio grabado como nota de voz opcional
export interface VoiceNote {
  blob: Blob;
  url: string;
  durationSec: number;
}

export const disabilityOptions: Array<{ id: DisabilityType; title: string; icon: string; hint: string }> = [
  {
    id: "visual",
    title: "Visual",
    icon: "visibility_off",
    hint: "Priorizar guia por voz y apoyo presencial.",
  },
  {
    id: "auditiva",
    title: "Auditiva",
    icon: "hearing_disabled",
    hint: "Canales de comunicacion accesibles para sordera o hipoacusia.",
  },
  {
    id: "neuro",
    title: "Neuro",
    icon: "neurology",
    hint: "Comunicacion clara, ambiente calmado y acompanamiento.",
  },
  {
    id: "motriz",
    title: "Motriz",
    icon: "accessible",
    hint: "Apoyo para movilidad, traslado y evacuacion accesible.",
  },
];

export const communicationOptions: Array<{ id: CommunicationMode; label: string; icon: string; riskAlert?: boolean }> = [
  { id: "lengua_senas", label: "Lengua de señas", icon: "sign_language" },
  { id: "audifono", label: "Usa audífonos", icon: "hearing" },
  { id: "implante_coclear", label: "Implante coclear", icon: "graphic_eq", riskAlert: true },
  { id: "vibrador_oseo", label: "Vibrador óseo", icon: "vibration" },
];

export const visualSubcategoryOptions: Array<{ id: VisualSubcategory; label: string; icon: string }> = [
  { id: "guia_voz", label: "Guía por voz", icon: "record_voice_over" },
  { id: "braille", label: "Material en braille", icon: "touch_app" },
  { id: "perro_guia", label: "Perro guía", icon: "pets" },
];

export const neuroSubcategoryOptions: Array<{ id: NeuroSubcategory; label: string; icon: string }> = [
  { id: "ambiente_calmado", label: "Ambiente calmado", icon: "self_improvement" },
  { id: "comunicacion_clara", label: "Comunicación clara", icon: "chat" },
  { id: "acompanamiento", label: "Acompañamiento", icon: "diversity_3" },
];

export const motrizSubcategoryOptions: Array<{ id: MotrizSubcategory; label: string; icon: string }> = [
  { id: "silla_ruedas", label: "Silla de ruedas", icon: "wheelchair_pickup" },
  { id: "traslado_asistido", label: "Traslado asistido", icon: "assist_walker" },
  { id: "evacuacion_accesible", label: "Evacuación accesible", icon: "escalator_warning" },
];
