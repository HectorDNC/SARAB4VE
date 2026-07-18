"use client";

import Label from "@/components/ui/Label";
import { useState } from 'react';
import { iAdmin } from "@/types/index";
import { sendAdministrator } from "@/api/administrator";
import { adminSchema, getFieldErrors, type adminFormData } from "./schema";
import { alertService } from "@/services/alertService";
import dynamic from "next/dynamic";
import PhoneField from "@/components/ui/PhoneField";


const Location = dynamic(() => import("@/components/ui/Location"), {
    ssr: false,
    loading: () => <div className="h-[300px] rounded-xl bg-surface-container animate-pulse" />,
});;

const InitAdminForm: iAdmin = {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    location: null,
    zone: "",
    adminSecret: "",
}

export default function OrganizationRegister() {

    const [formData, setFormData] = useState<iAdmin>(InitAdminForm);
    const [errors, setErrors] = useState<Partial<Record<keyof adminFormData, string>>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = adminSchema.safeParse(formData);

        if (!result.success) {
            setErrors(getFieldErrors(formData));
            alertService.warning("Revisa los campos marcados en rojo.");
            return;
        }

        setErrors({});

        try {
            await sendAdministrator({
                fullName: result.data.fullName,
                email: result.data.email,
                phone: result.data.phone,
                password: result.data.password,
                location: result.data.location,
                zone: result.data.zone,
                adminSecret: result.data.adminSecret,
            });

            alertService.success("Tu registro fue exitoso.");
            setFormData(InitAdminForm);

        } catch (error) {
            const message = error instanceof Error ? error.message : "No se pudo enviar tu solicitud.";
            alertService.error(message);
        }
    };

    return (
        <section className="px-5 lg:px-10 py-8 lg:py-12">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl font-bold text-on-surface">
                    Registro de Organización / ONG
                </h1>
                <p className="text-on-surface-variant mt-2">
                    Formulario inicial para unirte a la red SARA como organización.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-outline-variant bg-surface-container-low p-6"
                >
                    <div>
                        <input
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="Nombre completo del representante"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                        {errors.fullName && (
                            <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                        )}
                    </div>

                    <div>
                        <input
                            type="email"
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="Correo electrónico institucional"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                        )}
                    </div>

                    <div>
                        <PhoneField
                            value={formData.phone}
                            onChange={(phone) => setFormData({ ...formData, phone })}
                        />
                        {errors.phone && (
                            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                        )}
                    </div>

                    <div>
                        <input
                            type="password"
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="Contraseña"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        {errors.password && (
                            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                        )}
                    </div>

                    <div>
                        <Label name={'Zona / cobertura geográfica'}></Label>
                        <div className="mt-2">
                            <Location
                                value={formData.location}
                                onChange={(loc) => setFormData({ ...formData, location: loc })}
                            />
                        </div>
                        {errors.location && (
                            <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                        )}
                    </div>

                    <div>
                        <input
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="Zona / distrito de cobertura (texto descriptivo)"
                            value={formData.zone}
                            onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                        />
                        {errors.zone && (
                            <p className="text-red-500 text-sm mt-1">{errors.zone}</p>
                        )}
                    </div>

                    <div>
                        <input
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="Palabra secreta"
                            value={formData.adminSecret}
                            onChange={(e) => setFormData({ ...formData, adminSecret: e.target.value })}
                        />
                        {errors.adminSecret && (
                            <p className="text-red-500 text-sm mt-1">{errors.adminSecret}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="rounded-full bg-primary text-on-primary px-6 py-3 font-semibold hover:opacity-90 transition-opacity"
                    >
                        Enviar solicitud
                    </button>
                </form>
            </div>
        </section>
    );
}