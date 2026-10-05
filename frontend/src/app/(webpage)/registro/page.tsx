import Link from "next/link";
import type { Metadata } from "next";
import RegistroOptions from "./RegistroOptions";

export const metadata: Metadata = {
  title: "Registro — SARA",
  description:
    "Elige cómo quieres unirte a la red SARA: como ciudadano, voluntario o como organización.",
};

export default function RegistroPage() {
  return (
    <section className="px-5 lg:px-10 py-10 lg:py-12">
      <div className="max-w-4xl mx-auto min-h-[80dvh] flex items-center">
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

          <RegistroOptions />

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
