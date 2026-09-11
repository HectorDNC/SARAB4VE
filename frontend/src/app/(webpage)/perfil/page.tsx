"use client";

import Link from "next/link";
import RequireAuth from "@/components/layout/dashboard/RequireAuth";
import { useAuth } from "@/providers/AuthProvider";

/** Bloque de dato con ícono — mismo patrón que InfoCard en dashboard/organizaciones/[id]. */
function InfoCard({
    icon,
    label,
    children,
}: {
    icon: string;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-outline-variant bg-background p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                <span className="material-symbols-rounded text-sm" aria-hidden="true">{icon}</span>
                {label}
            </div>
            <div className="mt-1.5">{children}</div>
        </div>
    );
}

function PerfilContent() {
    const { user } = useAuth();

    return (
        <section className="px-5 lg:px-10 py-8 lg:py-12">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-on-surface">Perfil</h1>

                {/* ================================================================ */}
                {/* Datos básicos                                                     */}
                {/* ================================================================ */}
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-xl font-bold text-on-surface">{user?.fullName}</h2>
                    </div>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InfoCard icon="mail" label="Correo electrónico">
                            <p className="text-sm font-medium text-on-surface truncate">{user?.email}</p>
                        </InfoCard>

                        <InfoCard icon="call" label="Teléfono">
                            <p className="text-sm font-medium text-on-surface">{user?.phone || "—"}</p>
                        </InfoCard>

                        <InfoCard icon="location_on" label="Zona">
                            <p className="text-sm font-medium text-on-surface">{user?.zone || "—"}</p>
                        </InfoCard>
                    </div>
                </div>

                <Link
                    href="/mis-solicitudes"
                    className="flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-low p-6 hover:border-primary/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-xl text-primary" aria-hidden="true">handshake</span>
                        <span className="font-bold text-on-surface">Mis solicitudes</span>
                    </div>
                    <span className="material-symbols-rounded text-on-surface-variant" aria-hidden="true">chevron_right</span>
                </Link>
            </div>
        </section>
    );
}

export default function PerfilPage() {
    return (
        <RequireAuth roles={["citizen"]}>
            <PerfilContent />
        </RequireAuth>
    );
}
