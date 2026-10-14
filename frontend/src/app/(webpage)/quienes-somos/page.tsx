import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quiénes somos — SARA",
  description:
    "Conoce la misión, la visión y al equipo detrás de SARA, la red de apoyo accesible para personas con discapacidad durante emergencias.",
};

// Texto tomado tal cual del README del proyecto — no inventar una misión
// distinta a la ya definida ahí.
const MISION =
  "Que cualquier persona con discapacidad pueda solicitar ayuda en minutos y encontrar una red de apoyo cercana cuando más lo necesita.";
const MISION_TAGLINE = "Porque la accesibilidad también salva vidas.";

// TODO: primer borrador de visión — pendiente de ajuste por el equipo.
const VISION =
  "Ser la red de apoyo accesible de referencia en Iberoamérica: un ecosistema de voluntarios, organizaciones y tecnología donde ninguna persona con discapacidad enfrente sola una emergencia, sin importar dónde se encuentre.";

type Miembro = { name: string; role: string; country: string; photo?: string };

// Para agregar una foto real: ponela en frontend/public/equipo/ y completá
// `photo` con esa ruta (ver frontend/public/equipo/README.md). Mientras
// `photo` quede sin definir, la tarjeta muestra las iniciales en su lugar.
const LIDERAZGO: Miembro[] = [
  { name: "Candelaria Zamora", role: "Project Manager", country: "Perú" },
];

const EQUIPO_TECNICO: Miembro[] = [
  { name: "Julian Alvarez", role: "Product Owner", country: "Colombia" , photo: "/equipo/julian.jpg"},
  { name: "Hector Noguera", role: "Developer", country: "Venezuela", photo: "/equipo/hector.jpg" },
  { name: "Milagros Cáceres", role: "Developer", country: "Perú" },
];

const EQUIPO_SOCIAL: Miembro[] = [
  { name: "Carol Cayotopa", role: "Social Team", country: "España" },
  { name: "Zuli López", role: "Social Team", country: "México", photo: "/equipo/zuly.jpg" },
  { name: "Yoselyn Mendoza", role: "Social Team", country: "Argentina" },
];

/** Avatar circular: foto si existe, si no las iniciales del nombre. */
function Avatar({ name, photo }: { name: string; photo?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        className="w-24 h-24 rounded-full object-cover ring-2 ring-outline-variant/40"
      />
    );
  }

  return (
    <div
      className="w-24 h-24 rounded-full bg-gradient-to-br from-surface-container-highest to-surface-container-high text-on-surface-variant font-bold text-2xl flex items-center justify-center ring-2 ring-outline-variant/40"
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/** Un grupo del equipo (liderazgo, desarrollo, equipo social) con sus tarjetas. */
function GrupoEquipo({ nombre, miembros }: { nombre: string; miembros: Miembro[] }) {
  return (
    <div className="mt-10">
      <h3 className="text-base font-bold text-on-surface mb-6 text-center sm:text-left">
        {nombre}
      </h3>
      <ul role="list" className="flex flex-wrap items-start justify-center sm:justify-start gap-x-10 gap-y-8">
        {miembros.map((persona) => (
          <li key={persona.name} className="flex flex-col items-center gap-2 w-36 text-center">
            <Avatar name={persona.name} photo={persona.photo} />
            <span className="text-sm font-semibold text-on-surface">{persona.name}</span>
            <span className="text-xs text-on-surface-variant">{persona.role}</span>
            <span className="text-xs text-on-surface-variant">{persona.country}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function QuienesSomosPage() {
  return (
    <>
      {/* HERO */}
      <section className="px-5 lg:px-10 py-10 lg:py-14 bg-surface-container-low border-b border-outline-variant">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-on-surface">
            Quiénes somos
          </h1>
          <p className="mt-3 text-on-surface-variant text-base lg:text-lg max-w-2xl mx-auto">
            SARA nace para reducir el tiempo entre &ldquo;necesito ayuda&rdquo; y &ldquo;la ayuda llega&rdquo;,
            conectando a personas con discapacidad con voluntarios y organizaciones durante emergencias.
          </p>
        </div>
      </section>

      {/* MISIÓN Y VISIÓN */}
      <section className="px-5 lg:px-10 py-12" aria-labelledby="mision-vision-heading">
        <div className="max-w-5xl mx-auto">
          <h2 id="mision-vision-heading" className="sr-only">Misión y visión</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 lg:p-8">
              <div className="w-12 h-12 rounded-2xl bg-secondary-fixed flex items-center justify-center text-secondary">
                <span className="material-symbols-rounded text-2xl" aria-hidden="true">favorite</span>
              </div>
              <h3 className="mt-4 font-bold text-lg text-on-surface">Misión</h3>
              <p className="mt-2 text-on-surface-variant">{MISION}</p>
              <p className="mt-3 font-semibold text-on-surface">{MISION_TAGLINE}</p>
            </div>

            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 lg:p-8">
              <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface">
                <span className="material-symbols-rounded text-2xl" aria-hidden="true">visibility</span>
              </div>
              <h3 className="mt-4 font-bold text-lg text-on-surface">Visión</h3>
              <p className="mt-2 text-on-surface-variant">{VISION}</p>
            </div>
          </div>
        </div>
      </section>

      {/* EQUIPO */}
      <section className="px-5 lg:px-10 py-14 border-t border-outline-variant" aria-labelledby="equipo-heading">
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <span className="material-symbols-rounded text-4xl text-primary" aria-hidden="true">groups</span>
            <h2 id="equipo-heading" className="mt-3 text-xl lg:text-2xl font-bold text-on-surface">
              El equipo detrás de SARA
            </h2>
            <p className="mt-2 text-on-surface-variant text-sm lg:text-base max-w-2xl mx-auto">
              Un equipo distribuido en varios países de Iberoamérica, trabajando en red igual que la comunidad a la que servimos.
            </p>
          </div>

          <GrupoEquipo nombre="Liderazgo" miembros={LIDERAZGO} />
          <GrupoEquipo nombre="Equipo técnico" miembros={EQUIPO_TECNICO} />
          <GrupoEquipo nombre="Equipo social" miembros={EQUIPO_SOCIAL} />
        </div>
      </section>
    </>
  );
}
