"use client";

import Link from "next/link";
import RequireAuth from "@/components/layout/dashboard/RequireAuth";
import ProfileForm from "./ProfileForm";

function PerfilContent() {
    return (
        <section className="px-5 lg:px-10 py-8 lg:py-12">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-on-surface">Perfil</h1>

                <ProfileForm />

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
