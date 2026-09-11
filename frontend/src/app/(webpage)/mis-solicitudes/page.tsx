"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/layout/dashboard/RequireAuth";
import { listMyHelpRequests, type HelpRequestListItem } from "@/api/helpRequests";
import { RequestCard } from "./RequestCard";

/** Sección con título e ícono — mismo patrón que en dashboard/organizaciones/[id]. */
function SectionTitle({ icon, title }: { icon: string; title: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="material-symbols-rounded text-xl text-primary" aria-hidden="true">{icon}</span>
            <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
        </div>
    );
}

function MisSolicitudesContent() {
    const [requests, setRequests] = useState<HelpRequestListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        listMyHelpRequests()
            .then((data) => {
                if (!cancelled) setRequests(data);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "No se pudieron cargar tus solicitudes.");
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section className="px-5 lg:px-10 py-8 lg:py-12">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <SectionTitle icon="handshake" title="Mis solicitudes" />
                    <Link
                        href="/request"
                        className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                        <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
                        Nueva solicitud
                    </Link>
                </div>

                <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6">
                    {isLoading && (
                        <div className="space-y-3">
                            <div className="h-20 rounded-2xl bg-surface-container animate-pulse" />
                            <div className="h-20 rounded-2xl bg-surface-container animate-pulse" />
                        </div>
                    )}

                    {!isLoading && error && (
                        <p className="text-sm text-error">{error}</p>
                    )}

                    {!isLoading && !error && requests.length > 0 ? (
                        <div className="space-y-3">
                            {requests.map((req) => (
                                <RequestCard key={req.id} item={req} />
                            ))}
                        </div>
                    ) : (
                        !isLoading && !error && (
                            <p className="text-sm text-on-surface-variant">Aún no has enviado solicitudes de apoyo.</p>
                        )
                    )}
                </div>
            </div>
        </section>
    );
}

export default function MisSolicitudesPage() {
    return (
        <RequireAuth roles={["citizen"]}>
            <MisSolicitudesContent />
        </RequireAuth>
    );
}
