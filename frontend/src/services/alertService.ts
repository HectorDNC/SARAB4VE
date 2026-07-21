export type AlertType = "info" | "warning" | "error" | "success";

export type AlertMessage = {
  id: string;
  type: AlertType;
  message: string;
  durationMs?: number;
};

type AlertInput = Omit<AlertMessage, "id">;
type AlertListener = (alert: AlertMessage) => void;

// ── Patrones de vibración háptica (WCAG 2.1 AA — Discapacidad Auditiva) ──
const HAPTIC_PATTERNS: Record<AlertType, VibratePattern> = {
  success: [100, 50, 100],
  error:   [200, 100, 200, 100, 200],
  warning: [150, 50, 150],
  info:    [50],
};

function triggerHaptic(type: AlertType): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(HAPTIC_PATTERNS[type]);
    } catch {
      // Silencioso — algunos navegadores bloquean vibración sin gesto de usuario
    }
  }
}

class AlertService {
  private listeners = new Set<AlertListener>();

  subscribe(listener: AlertListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  push(input: AlertInput) {
    const alert: AlertMessage = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };

    // Disparar vibración háptica para discapacidad auditiva
    triggerHaptic(input.type);

    this.listeners.forEach((listener) => listener(alert));
  }

  info(message: string, durationMs = 4000) {
    this.push({ type: "info", message, durationMs });
  }

  warning(message: string, durationMs = 4500) {
    this.push({ type: "warning", message, durationMs });
  }

  error(message: string, durationMs = 5000) {
    this.push({ type: "error", message, durationMs });
  }

  success(message: string, durationMs = 5000) {
    this.push({ type: "success", message, durationMs });
  }
}

export const alertService = new AlertService();
