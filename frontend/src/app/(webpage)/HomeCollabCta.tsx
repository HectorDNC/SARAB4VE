"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

type Props = {
    activeVolunteersCount: number | null;
};

/**
 * Tarjeta completa "¿Quieres colaborar en la red de apoyo?". Se oculta por
 * completo si ya hay una sesión activa — registrar una segunda cuenta de
 * voluntario/organización desde dentro de un perfil ya logueado no tiene
 * sentido, y dejar la tarjeta sin botones se veía como un cuadro vacío.
 */
export default function HomeCollabCta({ activeVolunteersCount }: Props) {
    const { user, isLoading } = useAuth();
    const hasAccount = !isLoading && user != null;

    if (hasAccount) return null;

    return (
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
    );
}
