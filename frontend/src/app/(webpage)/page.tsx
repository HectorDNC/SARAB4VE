import Link from "next/link";

// TODO: conectar al conteo real de voluntarios activos cuando exista un
// endpoint público para eso. Mientras sea null, el stat del hero y el texto
// de la sección de colaboración quedan ocultos/genéricos automáticamente.
const activeVolunteersCount: number | null = null;

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section
        className="relative bg-surface-container-low border-b border-outline-variant"
        aria-labelledby="hero-heading"
      >
        <div className="max-w-5xl min-h-[90dvh] mx-auto px-5 lg:px-10 py-10 lg:py-24 flex flex-col items-center justify-center gap-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
              <span className="material-symbols-rounded text-base" aria-hidden="true">emergency_home</span>
              Plataforma de Emergencia Accesible
            </div>
            <h1
              id="hero-heading"
              className="text-[2rem] lg:text-5xl font-bold text-on-surface leading-tight tracking-tight"
            >
              Asistencia inmediata para personas con discapacidad
            </h1>
            <p className="mt-4 text-base lg:text-lg text-on-surface-variant max-w-2xl mx-auto">
              SARA facilita la comunicación, ayuda y el rescate en situaciones críticas. Para los afectados por el terremoto en Venezuela.
              Pulsa el botón central para alertar a los equipos de emergencia cercanos.
            </p>

            {/* Boton SOS de Emergencia */}
            <div className="mt-8 flex justify-center">
              <Link
                href="/sos"
                className="flex items-center justify-center mt-2 lg:mt-1 gap-3 bg-error text-on-error px-10 py-5 rounded-full font-extrabold text-4xl shadow-2xl hover:opacity-90 transition-all hover:scale-110 active:scale-100 focus-visible:outline-3 focus-visible:outline-error border-2 border-error-container animate-pulse"
              >
                <span className="material-symbols-rounded text-4xl" aria-hidden="true">emergency</span>
                SOS — Emergencia
              </Link>
            </div>

            {activeVolunteersCount !== null && activeVolunteersCount > 0 && (
              <div className="mt-6 inline-flex items-center gap-2 text-sm text-on-surface-variant">
                <span className="material-symbols-rounded text-base text-primary" aria-hidden="true">group</span>
                <span><strong className="text-on-surface">{activeVolunteersCount.toLocaleString("es")} voluntarios</strong> activos hoy en la Red SARA</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SOLICITAR APOYO */}
      <section
        className="px-5 lg:px-10 py-10 bg-surface border-b border-outline-variant"
        aria-labelledby="solicitar-apoyo-heading"
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center gap-4">
          <h2
            id="solicitar-apoyo-heading"
            className="text-xl lg:text-2xl font-bold text-on-surface"
          >
            ¿Necesitas ayuda que no es una emergencia?
          </h2>
          <p className="text-on-surface-variant max-w-2xl">
            Envía una solicitud de apoyo detallada y un voluntario cercano se pondrá en contacto contigo.
          </p>
          <Link
            href="/request"
            className="mt-2 flex items-center justify-center gap-3 bg-orange-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-orange-600 transition-all hover:scale-105 active:scale-100 focus-visible:outline-3 focus-visible:outline-orange-500"
            aria-label="Solicitar apoyo no urgente"
          >
            <span className="material-symbols-rounded text-2xl" aria-hidden="true">power_settings_new</span>
            Solicitar Apoyo
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-5 lg:px-10 py-12" aria-labelledby="features-heading">
        <div className="max-w-5xl mx-auto">
          <h2 id="features-heading" className="text-2xl font-bold text-on-surface mb-2">
            ¿Qué puedes encontrar?
          </h2>
          <p className="text-on-surface-variant mb-8">
            Recursos diseñados para situaciones de emergencia con accesibilidad garantizada.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: "auto_stories",
                title: "Recursos de Guía",
                description: "Protocolos de evacuación para necesidades cognitivas y motrices.",
                href: "/recursos",
                bg: "bg-secondary-fixed",
                fg: "text-secondary",
                active: true,
              },
              {
                icon: "corporate_fare",
                title: "Directorio",
                description: "Organizaciones y voluntarios activos en tu zona.",
                href: "/directorio",
                bg: "bg-surface-container-high",
                fg: "text-on-surface",
                active: false,
              },
            ].map((f) =>
              f.active ? (
                <Link
                  key={f.href}
                  href={f.href}
                  className={`group flex flex-col gap-4 p-6 rounded-2xl ${f.bg} hover:shadow-md transition-all hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-primary`}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center ${f.fg}`}>
                    <span className="material-symbols-rounded text-2xl" aria-hidden="true">{f.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-on-surface group-hover:text-primary transition-colors">{f.title}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{f.description}</p>
                  </div>
                  <span className="material-symbols-rounded text-on-surface-variant text-base mt-auto" aria-hidden="true">arrow_forward</span>
                </Link>
              ) : (
                <div
                  key={f.href}
                  aria-disabled="true"
                  className={`flex flex-col gap-4 p-6 rounded-2xl ${f.bg} opacity-60 cursor-not-allowed`}
                >
                  <div className={`w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center ${f.fg}`}>
                    <span className="material-symbols-rounded text-2xl" aria-hidden="true">{f.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-on-surface">{f.title}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{f.description}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant mt-auto">
                    <span className="material-symbols-rounded text-sm" aria-hidden="true">schedule</span>
                    Próximamente
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* COLLAB CTA */}
      <section className="px-5 lg:px-10 py-12" aria-labelledby="collab-heading">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl bg-primary p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-12">
            <div className="flex-1">
              <h2 id="collab-heading" className="text-2xl font-bold text-on-primary">
                ¿Quieres colaborar en la red de apoyo?
              </h2>
              <p className="text-on-primary/80 mt-2 text-base">
                {activeVolunteersCount !== null && activeVolunteersCount > 0
                  ? `Únete a los ${activeVolunteersCount.toLocaleString("es")} voluntarios que ya forman parte de la Red SARA.`
                  : "Únete a la red de voluntarios y organizaciones que ya forman parte de SARA."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link
                href="/registro/volunteer"
                className="flex items-center justify-center gap-2 bg-on-primary text-primary px-6 py-3 rounded-full font-bold text-sm hover:bg-primary-fixed transition-colors focus-visible:outline-3 focus-visible:outline-on-primary min-h-[48px]"
              >
                <span className="material-symbols-rounded text-lg" aria-hidden="true">volunteer_activism</span>
                Soy voluntario
              </Link>
              <Link
                href="/registro/organization"
                className="flex items-center justify-center gap-2 border-2 border-on-primary/50 text-on-primary px-6 py-3 rounded-full font-bold text-sm hover:border-on-primary transition-colors focus-visible:outline-3 focus-visible:outline-on-primary min-h-[48px]"
              >
                <span className="material-symbols-rounded text-lg" aria-hidden="true">corporate_fare</span>
                Soy organización
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
