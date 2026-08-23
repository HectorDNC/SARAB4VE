// Página oculta temporalmente mientras no haya datos reales de refugios
// cargados en la plataforma. Reactivar cuando exista una fuente de datos
// real (endpoint backend) para reemplazar este placeholder.
export default function RefugiosPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 lg:px-10 py-16 lg:py-24 text-center">
      <span className="material-symbols-rounded text-5xl text-on-surface-variant" aria-hidden="true">
        holiday_village
      </span>
      <h1 className="mt-4 text-2xl font-bold text-on-surface">Refugios — Próximamente</h1>
      <p className="mt-2 text-sm text-on-surface-variant max-w-md mx-auto">
        Estamos cargando información real de refugios y puntos de auxilio. Esta sección
        estará disponible en cuanto se registren datos verificados en la plataforma.
      </p>
    </div>
  );
}
