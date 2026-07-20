"use client";

/**
 * Clasificador de emergencia client-side.
 *
 * Porta la lógica de diccionario del backend (`extractorEmergencia.js`) para
 * pre-clasificar localmente en el navegador. Esto permite autocompletar el
 * formulario SIN enviar nada al servidor — el usuario siempre revisa antes.
 *
 * El backend tiene su propia clasificación (Gemini → Groq → diccionario) que
 * se ejecuta en `POST /api/emergencies/voice`, pero como el flujo de voz aquí
 * usa el endpoint estándar `POST /api/emergencies` (después de revisión),
 * el clasificador local solo sirve como *pre-llenado*.
 */

// ── Tipos ─────────────────────────────────────────────────────────────────

export interface InfoEmergencia {
  tipo: string | null;
  severidad: "baja" | "media" | "alta" | null;
  personasAfectadas: number | null;
  resumen: string;
  palabrasClaveDetectadas: string[];
  isInjured: boolean;
  cannotMove: boolean;
  /** Urgencia derivada para el formulario SOS. */
  urgency: "low" | "medium" | "high" | "critical";
}

// ── Utilidades ────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsWord(text: string, term: string): boolean {
  if (term.includes(" ")) return text.includes(term);
  const regex = new RegExp(`(?:^|\\s)${term}(?:\\s|$|[^a-z0-9])`);
  return regex.test(text);
}

// ── Diccionario de clasificación (portado del backend) ────────────────────

const KEYWORD_DICT: Record<string, { keywords: string[]; severityHint: "baja" | "media" | "alta" }> = {
  incendio: {
    keywords: [
      "incendio", "fuego", "candela", "llamas", "quemando", "quemazon",
      "ardiendo", "se quema", "humo", "explosion", "combustion",
      "cortocircuito",
    ],
    severityHint: "media",
  },
  medica: {
    keywords: [
      "herido", "herida", "heridos", "sangre", "sangrando", "desmayo",
      "desmayado", "inconsciente", "no respira", "respirar", "infarto",
      "ataque", "convulsion", "fiebre", "enfermo", "enferma",
      "medica", "medico", "doctor", "hospital", "emergencia medica",
      "dolor de pecho", "dificultad para respirar", "accidente",
      "atropellado", "fractura", "golpe", "contusion",
    ],
    severityHint: "alta",
  },
  inundacion: {
    keywords: [
      "inundacion", "inundado", "inundada", "agua", "crecida", "desborde",
      "desbordamiento", "lluvia fuerte", "rio", "quebrada", "torrente",
      "drenaje", "subio el agua", "anegado",
    ],
    severityHint: "media",
  },
  violencia: {
    keywords: [
      "violencia", "golpes", "pelea", "agresion", "agredido", "maltrato",
      "abuso", "amenaza", "amenazado", "pistola", "arma", "cuchillo",
      "navaja", "robo", "asalto", "secuestro", "secuestrado",
      "disparos", "tiros", "balacera", "apunialado",
    ],
    severityHint: "alta",
  },
  estructural: {
    keywords: [
      "derrumbe", "derrumbado", "colapso", "grieta", "grietas",
      "edificio", "estructura", "terremoto", "sismo", "temblor",
      "desplome",
    ],
    severityHint: "alta",
  },
};

const INJURED_KEYWORDS = [
  "herido", "herida", "sangre", "sangrando", "fractura",
  "golpe", "lesion", "lesionado", "accidente",
  "atropellado", "atropellada", "quemadura", "quemado",
];

const CANNOT_MOVE_KEYWORDS = [
  "no puedo caminar", "no puedo moverme", "no me puedo mover",
  "inmovil", "postrado", "postrada", "paralitico", "paralisis",
  "silla de ruedas", "no tiene fuerza",
];

// ── Mapeo de severidad → urgency ──────────────────────────────────────────

function severityToUrgency(
  severidad: "baja" | "media" | "alta" | null,
  isInjured: boolean,
  cannotMove: boolean,
): "low" | "medium" | "high" | "critical" {
  if (isInjured || cannotMove) return "critical";
  if (severidad === "alta") return "high";
  if (severidad === "media") return "medium";
  return "low";
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useClasificadorEmergencia() {
  /**
   * Clasifica un transcript y devuelve información estructurada para
   * autocompletar el formulario de emergencia.
   */
  function clasificar(transcript: string): InfoEmergencia {
    if (!transcript.trim()) {
      return {
        tipo: null,
        severidad: null,
        personasAfectadas: null,
        resumen: "",
        palabrasClaveDetectadas: [],
        isInjured: false,
        cannotMove: false,
        urgency: "low",
      };
    }

    const normalizedText = normalize(transcript);

    // ── Clasificar tipo ──
    let bestType: string | null = null;
    let bestScore = 0;
    let bestSeverityHint: "baja" | "media" | "alta" | null = null;
    const matchedKeywords: string[] = [];

    for (const [tipo, config] of Object.entries(KEYWORD_DICT)) {
      let score = 0;
      for (const keyword of config.keywords) {
        const normalizedKw = normalize(keyword);
        if (containsWord(normalizedText, normalizedKw)) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestType = tipo;
        bestSeverityHint = config.severityHint;
      }
    }

    // ── Personas afectadas ──
    let personasAfectadas: number | null = null;
    const personasMatch = normalizedText.match(
      /(\d+)\s*(persona[s]?|gente|afectado[s]?|herido[s]?|victim[a|as])/i,
    );
    if (personasMatch) {
      personasAfectadas = parseInt(personasMatch[1], 10);
    } else {
      const plurales = ["personas", "heridos", "afectados", "victimas", "gente"];
      if (plurales.some((p) => containsWord(normalizedText, p))) {
        personasAfectadas = 2;
      }
    }

    // ── Herido / inmovilizado ──
    const isInjured = INJURED_KEYWORDS.some((kw) =>
      containsWord(normalizedText, normalize(kw)),
    );
    const cannotMove = CANNOT_MOVE_KEYWORDS.some((kw) =>
      containsWord(normalizedText, normalize(kw)),
    );

    // ── Severidad ──
    const severidad: "baja" | "media" | "alta" | null =
      bestScore >= 3 ? "alta" : bestScore >= 2 ? "media" : bestSeverityHint;

    // ── Resumen ──
    const resumen =
      transcript.length > 150
        ? transcript.slice(0, 147).trim() + "..."
        : transcript.trim();

    const urgency = severityToUrgency(severidad, isInjured, cannotMove);

    return {
      tipo: bestType || "otro",
      severidad,
      personasAfectadas,
      resumen,
      palabrasClaveDetectadas: [...new Set(matchedKeywords)],
      isInjured,
      cannotMove,
      urgency,
    };
  }

  return { clasificar };
}
