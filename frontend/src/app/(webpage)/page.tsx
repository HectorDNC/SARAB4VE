import Link from "next/link";
import HomeCollabCta from "./HomeCollabCta";

// TODO: conectar al conteo real de voluntarios activos cuando exista un
// endpoint público para eso. Mientras sea null, el stat del hero y el texto
// de la sección de colaboración quedan ocultos/genéricos automáticamente.
const activeVolunteersCount: number | null = null;

// Aliados de la red SARA, agrupados por continente. Para agregar uno real:
// poné su logo en frontend/public/aliados/ y agregá la entrada (name,
// country, logo) en el continente correspondiente. Mientras `logo` quede
// sin definir, se muestra un recuadro vacío en su lugar.
type Aliado = { name: string; country: string; logo?: string };

// TODO: confirmar el país real de cada uno — "Venezuela" es un supuesto,
// no un dato verificado.
const ALIADOS_AMERICA: Aliado[] = [
  { name: "Eshalom21", country: "Argentina", logo: "/aliados/logo-ESHALOM21.png" }
  
];
const ALIADOS_EUROPA: Aliado[] = [
  { name: "Manos al Mundo", country: "España", logo: "/aliados/logo-manosalmundo.png" }
];
// Continentes sin aliados todavía. Para activar uno: descomentá su array de
// datos acá y el bloque <ContinenteAliados> correspondiente más abajo, en
// el JSX de HomePage.
// 
// const ALIADOS_AFRICA: Aliado[] = [];
// const ALIADOS_ASIA: Aliado[] = [];
// const ALIADOS_OCEANIA: Aliado[] = [];

/** Un continente con su contador de organizaciones y la fila de logos. */
function ContinenteAliados({ nombre, aliados }: { nombre: string; aliados: Aliado[] }) {
  return (
    <div className="mt-10">
      <div className="flex items-center justify-start gap-2 mb-7">
        <h3 className="text-base font-bold text-on-surface">{nombre}</h3>
        <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-full">
          {aliados.length} {aliados.length === 1 ? "organización" : "organizaciones"}
        </span>
      </div>
      <ul role="list" className="flex flex-wrap items-start justify-start gap-x-14 gap-y-10">
        {aliados.map((aliado) => (
          <li key={aliado.name} className="flex flex-col items-center gap-2 w-40">
            {aliado.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={aliado.logo}
                alt={aliado.name}
                className="h-32 lg:h-40 w-auto max-w-[320px] object-contain"
              />
            ) : (
              <div className="h-32 lg:h-40 w-40 flex items-center justify-center rounded-xl border border-dashed border-outline-variant text-on-surface-variant">
                <span className="material-symbols-rounded text-3xl" aria-hidden="true">image</span>
              </div>
            )}
            <span className="text-sm font-semibold text-on-surface text-center">{aliado.name}</span>
            <span className="text-xs text-on-surface-variant text-center">{aliado.country}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
              Plataforma de emergencia accesible e inclusiva
            </div>
            <h1
              id="hero-heading"
              className="text-[2rem] lg:text-5xl font-bold text-on-surface leading-tight tracking-tight"
            >
              Asistencia inmediata para personas con discapacidades visibles y no visibles
            </h1>
            <p className="mt-4 text-base lg:text-lg text-on-surface-variant max-w-2xl mx-auto">
              SARA facilita la comunicación y ayuda con organizaciones y voluntarios, trabajando en red en países de Iberoamérica, con especial atención a las comunidades afectadas por emergencias y desastres naturales. Pulsa el botón central para alertar a los equipos de emergencia cercanos.
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

      {/* ALIADOS */}
      <section className="px-5 lg:px-10 py-14 border-t border-outline-variant" aria-labelledby="aliados-heading">
        <div className="max-w-5xl mx-auto text-center">
          <span className="material-symbols-rounded text-4xl text-primary" aria-hidden="true">public</span>
          <h2 id="aliados-heading" className="mt-3 text-xl lg:text-2xl font-bold text-on-surface">
            Trabajando en comunidad por un mundo inclusivo y sin barreras
          </h2>
          <p className="mt-2 text-on-surface-variant text-sm lg:text-base max-w-2xl mx-auto">
            SARA cuenta con organizaciones aliadas en Latinoamérica y el mundo que forman una red de apoyo para personas con discapacidad durante y después de una emergencia, promoviendo comunidades más inclusivas y sin barreras.
          </p>

          <ContinenteAliados nombre="América" aliados={ALIADOS_AMERICA} />
          <ContinenteAliados nombre="Europa" aliados={ALIADOS_EUROPA} />
          {/* Continentes sin aliados todavía — descomentar cuando haya al
             menos uno, junto con su array de datos más arriba. */}
          {/* <ContinenteAliados nombre="África" aliados={ALIADOS_AFRICA} /> */}
          {/* <ContinenteAliados nombre="Asia" aliados={ALIADOS_ASIA} /> */}
          {/* <ContinenteAliados nombre="Oceanía" aliados={ALIADOS_OCEANIA} /> */}
        </div>
      </section>

      {/* COLLAB CTA */}
      <HomeCollabCta activeVolunteersCount={activeVolunteersCount} />
    </>
  );
}
