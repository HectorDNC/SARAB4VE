"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";

type RegistroOption = {
    href: string;
    title: string;
    description: string;
    icon: string;
    variant: "filled" | "outlined" | "danger";
    /** Si es true, la opción se oculta para alguien que ya tiene una cuenta. */
    requiresNoAccount?: boolean;
};

const registroOptions: RegistroOption[] = [
    {
        href: "/registro/citizen",
        title: "Necesito ayuda",
        description:
            "Quiero crear una cuenta para solicitar apoyo o reportar una necesidad durante una emergencia.",
        icon: "sos",
        variant: "danger",
    },
    {
        href: "/registro/volunteer",
        title: "Soy voluntario",
        description:
            "Quiero ayudar a personas con discapacidad y necesidades de accesibilidad durante emergencias.",
        icon: "volunteer_activism",
        variant: "filled",
        requiresNoAccount: true,
    },
    {
        href: "/registro/organization",
        title: "Soy organización",
        description:
            "Represento a una ONG, fundación o colectivo que ofrece recursos y apoyo en desastres.",
        icon: "inventory_2",
        variant: "outlined",
        requiresNoAccount: true,
    },
];

export default function RegistroOptions() {
    // Una cuenta de voluntario/organización ya es, en sí misma, un perfil con
    // rol — no tiene sentido ofrecer crear otro desde dentro de una sesión
    // activa. Mientras se hidrata la sesión (isLoading) se asume que no hay
    // cuenta, para no ocultar las opciones de golpe a la mayoría de visitantes
    // anónimos.
    const { user, isLoading } = useAuth();
    const hasAccount = !isLoading && user != null;

    const visibleOptions = registroOptions.filter(
        (option) => !(option.requiresNoAccount && hasAccount)
    );

    return (
        <ul
            role="list"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
        >
            {visibleOptions.map((option) => {
                const isDanger = option.variant === "danger";
                return (
                    <li key={option.href}>
                        <Link
                            href={option.href}
                            aria-label={`Registrarse como ${option.title}`}
                            className={[
                                "group block rounded-2xl border-2 p-5 transition-all",
                                "hover:shadow-md active:scale-[0.98]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                                isDanger
                                    ? "border-error/40 hover:border-error focus-visible:ring-error"
                                    : "border-outline-variant hover:border-primary/50 focus-visible:ring-primary",
                            ].join(" ")}
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={[
                                        "material-symbols-rounded text-2xl shrink-0",
                                        isDanger ? "text-error" : "text-primary",
                                    ].join(" ")}
                                    aria-hidden="true"
                                >
                                    {option.icon}
                                </span>
                                <span
                                    className={[
                                        "font-semibold text-base",
                                        isDanger ? "text-error" : "text-on-surface",
                                    ].join(" ")}
                                >
                                    {option.title}
                                </span>
                            </div>

                            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                                {option.description}
                            </p>
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
