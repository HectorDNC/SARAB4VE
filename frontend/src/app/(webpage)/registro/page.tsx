import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registro — SARA",
  description:
    "Elige cómo quieres unirte a la red SARA: como voluntario o como organización.",
};

type RegistroOption = {
  href: string;
  title: string;
  description: string;
  icon: string;
  variant: "filled" | "outlined";
};

const registroOptions: RegistroOption[] = [
  {
    href: "/registro/volunteer",
    title: "Soy voluntario",
    description:
      "Quiero ayudar a personas con discapacidad y necesidades de accesibilidad durante emergencias.",
    icon: "volunteer_activism",
    variant: "filled",
  },
  {
    href: "/registro/organization",
    title: "Soy organización",
    description:
      "Represento a una ONG, fundación o colectivo que ofrece recursos y apoyo en desastres.",
    icon: "inventory_2",
    variant: "outlined",
  },
];

export default function RegistroPage() {
  return (
    <section className="px-5 lg:px-10 py-10 lg:py-12">
      <div className="max-w-3xl mx-auto min-h-[80dvh] flex items-center">
        <div>
          <div className="text-center mb-10 lg:mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-on-surface">
              Únete a la red SARA
            </h1>
            <p className="mt-3 text-on-surface-variant text-base lg:text-lg max-w-xl mx-auto">
              Selecciona el tipo de registro que mejor describe tu rol. Podrás
              cambiarlo más adelante si es necesario.
            </p>
          </div>

          <ul
            role="list"
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6"
          >
            {registroOptions.map((option) => {
              const isFilled = option.variant === "filled";
              return (
                <li key={option.href}>
                  <Link
                    href={option.href}
                    aria-label={`Registrarse como ${option.title}`}
                    className={[
                      "group flex items-center gap-3 rounded-full px-6 py-4",
                      "font-semibold text-base transition-all",
                      "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
                      isFilled
                        ? "bg-primary text-on-primary shadow-md hover:brightness-110"
                        : "border-2 border-primary text-primary bg-transparent hover:bg-primary/10",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "material-symbols-rounded text-2xl shrink-0",
                        isFilled ? "text-on-primary" : "text-primary",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {option.icon}
                    </span>
                    <span className="truncate">{option.title}</span>
                  </Link>

                  <p className="mt-2 px-2 text-sm text-on-surface-variant text-center sm:text-left">
                    {option.description}
                  </p>
                </li>
              );
            })}
          </ul>

          <p className="mt-10 text-center text-sm text-on-surface-variant">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
