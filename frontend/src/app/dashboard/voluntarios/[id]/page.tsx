"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MOCK_USERS } from "@/hooks/mockDataDashboard";
import { USE_MOCK, type ApiUser } from "@/types/index";
import StatusBadge from "@/components/layout/dashboard/StatusBadge";
import { alertService } from "@/services/alertService";
import { approveUser, getUserById, rejectUser } from "@/api/user";
import dynamic from "next/dynamic";

const Location = dynamic(() => import("@/components/ui/Location"), {
    ssr: false,
    loading: () => <div className="h-[220px] rounded-xl bg-surface-container animate-pulse" />,
});

export default function VolunteerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [volunteer, setVolunteer] = useState<ApiUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadVolunteer() {
            setIsLoading(true);

            if (USE_MOCK) {
                const found = MOCK_USERS.find((v) => v.id === id && v.role == 'volunteer');

                setVolunteer(found ?? null);
                setIsLoading(false);
                return;
            }

            try {
                const user = await getUserById(id);

                setVolunteer(user as ApiUser)
            } catch (error) {
                const message = error instanceof Error ? error.message : "No se pudo cargar el voluntario";
                alertService.error(message);
                setVolunteer(null);
            } finally {
                setIsLoading(false);
            }
        }
        loadVolunteer();
    }, [id]);

    const handleDecision = async (status: "approved" | "rejected") => {
        if (status === "approved") {
            try {
                await approveUser(id);
                alertService.success("Organización aprobado.");
            } catch (error) {
                alertService.error(`Error al registrar aprovación  del voluntario: ${error}`);

                return;
            }
        } else {
            try {
                await rejectUser(id);
                alertService.warning("Organización rechazado.");
            } catch (error) {
                alertService.error(`Error al registrar rechazo  del voluntario: ${error}`);
                return;
            }
        }
        router.push("/dashboard/voluntarios");
    };

    if (isLoading) {
        return <p className="text-on-surface-variant text-sm">Cargando...</p>;
    }

    if (!volunteer) {
        return (
            <div className="mx-auto mt-6">
                <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6">
                    <p className="text-on-surface-variant text-sm">No se encontró este voluntario.</p>
                    <Link href="/dashboard/voluntarios" className="text-primary flex justify-center font-semibold text-sm mt-4">
                        Volver al listado
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto mt-6">

            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-bold text-on-surface">{volunteer.fullName}</h1>
                    <StatusBadge status={volunteer.status} />
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-outline-variant bg-background p-4">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                            <span className="material-symbols-rounded text-lg" aria-hidden="true">mail</span>
                            <span className="text-xs font-medium uppercase tracking-wide">Correo electrónico</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                            <p className="text-sm font-medium text-on-surface truncate">{volunteer.email}</p>
                            {volunteer.emailVerified ? (
                                <span className="material-symbols-rounded text-base text-[color:var(--color-success)] shrink-0" title="Verificado" aria-hidden="true">
                                    verified
                                </span>
                            ) : (
                                <span className="material-symbols-rounded text-base text-on-surface-variant shrink-0" title="No verificado" aria-hidden="true">
                                    help
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-outline-variant bg-background p-4">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                            <span className="material-symbols-rounded text-lg" aria-hidden="true">call</span>
                            <span className="text-xs font-medium uppercase tracking-wide">Teléfono</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                            <p className="text-sm font-medium text-on-surface">{volunteer.phone}</p>
                            {volunteer.phoneVerified ? (
                                <span className="material-symbols-rounded text-base text-[color:var(--color-success)] shrink-0" title="Verificado" aria-hidden="true">
                                    verified
                                </span>
                            ) : (
                                <span className="material-symbols-rounded text-base text-on-surface-variant shrink-0" title="No verificado" aria-hidden="true">
                                    help
                                </span>
                            )}
                        </div>
                    </div>

                    {volunteer.location && (
                        <div className="rounded-xl border border-outline-variant bg-background p-4 sm:col-span-2">
                            <div className="flex items-center gap-2 text-on-surface-variant mb-2">
                                <span className="material-symbols-rounded text-lg" aria-hidden="true">map</span>
                                <span className="text-xs font-medium uppercase tracking-wide">Ubicación</span>
                            </div>
                            <Location value={volunteer.location} readOnly />
                            <p className="text-xs text-on-surface-variant mt-2">
                                {volunteer.location.lat.toFixed(5)}, {volunteer.location.lng.toFixed(5)}
                            </p>
                        </div>
                    )}

                    <div className="rounded-xl border border-outline-variant bg-background p-4 sm:col-span-2">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                            <span className="material-symbols-rounded text-lg" aria-hidden="true">location_on</span>
                            <span className="text-xs font-medium uppercase tracking-wide">Zona de cobertura</span>
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-on-surface">{volunteer.zone}</p>
                    </div>

                    <div className="rounded-xl border border-outline-variant bg-background p-4 sm:col-span-2">
                        <div className="flex items-center gap-2 text-on-surface-variant">
                            <span className="material-symbols-rounded text-lg" aria-hidden="true">event</span>
                            <span className="text-xs font-medium uppercase tracking-wide">Fecha de registro</span>
                        </div>
                        <p className="mt-1.5 text-sm font-medium text-on-surface">
                            {new Date(volunteer.createdAt).toLocaleDateString("es", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </p>
                    </div>
                </div>

                {volunteer.status === "pending" && (
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => handleDecision("rejected")}
                            className="flex-1 rounded-xl border border-outline px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
                        >
                            Rechazar
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDecision("approved")}
                            className="flex-1 rounded-xl bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            Aprobar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}