"use client";

import Label from "@/components/ui/Label";
import { useState } from 'react';
import { iOrganizationForm, WORK_AREAS } from "@/types/index";
import { sendOrganization } from "@/api/organization";
import { organizationSchema, getFieldErrors, type OrganizationFormData } from "./schema";
import { alertService } from "@/services/alertService";
import dynamic from "next/dynamic";
import TermsModal from "@/components/ui/TermsModal";
import PhoneField from "@/components/ui/PhoneField";


const Location = dynamic(() => import("@/components/ui/Location"), {
    ssr: false,
    loading: () => <div className="h-[300px] rounded-xl bg-surface-container animate-pulse" />,
});;

const InitOrganizationForm: iOrganizationForm = {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    location: null,
    zone: "",
    organizationName: "",
    legalDocument: "",
    workArea: [],
    acceptedTerms: false,
}

export default function OrganizationRegister() {

    const [formData, setFormData] = useState<iOrganizationForm>(InitOrganizationForm);
    const [errors, setErrors] = useState<Partial<Record<keyof OrganizationFormData, string>>>({});
    const [showTermsModal, setShowTermsModal] = useState(false);

    function toggleArray<T>(array: T[], value: T): T[] {
        return array.includes(value)
            ? array.filter((v) => v !== value)
            : [...array, value];
    }

    const toggleWorkArea = (area: string) => {
        setFormData(prev => ({
            ...prev,
            workArea: toggleArray(prev.workArea, area),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = organizationSchema.safeParse(formData);

        if (!result.success) {
            setErrors(getFieldErrors(formData));
            alertService.warning("Revisa los campos marcados en rojo.");
            return;
        }

        setErrors({});

        try {
            await sendOrganization({
                fullName: result.data.fullName,
                email: result.data.email,
                phone: result.data.phone,
                password: result.data.password,
                location: result.data.location,
                zone: result.data.zone,
                organizationName: result.data.organizationName,
                legalDocument: result.data.legalDocument,
                workArea: result.data.workArea,
                acceptedTerms: result.data.acceptedTerms,
            });

            alertService.success("Tu solicitud fue enviada. Te contactaremos pronto.");
            setFormData(InitOrganizationForm);

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
                        <input
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="Nombre de la organización"
                            value={formData.organizationName}
                            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                        />
                        {errors.organizationName && (
                            <p className="text-red-500 text-sm mt-1">{errors.organizationName}</p>
                        )}
                    </div>

                    <div>
                        <input
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="Documento legal (RIF o equivalente)"
                            value={formData.legalDocument}
                            onChange={(e) => setFormData({ ...formData, legalDocument: e.target.value })}
                        />
                        {errors.legalDocument && (
                            <p className="text-red-500 text-sm mt-1">{errors.legalDocument}</p>
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
                        <Label name={'Área de trabajo'}></Label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {WORK_AREAS.map((area) => (
                                <label
                                    key={area.value}
                                    className="flex items-center gap-2 rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.workArea.includes(area.value)}
                                        onChange={() => toggleWorkArea(area.value)}
                                    />
                                    {area.label}
                                </label>
                            ))}
                        </div>
                        {errors.workArea && (
                            <p className="text-red-500 text-sm mt-1">{errors.workArea}</p>
                        )}
                    </div>

                    <div>
                        <label className="flex items-start gap-2 text-sm text-on-surface-variant">
                            <input
                                type="checkbox"
                                checked={formData.acceptedTerms}
                                readOnly
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (!formData.acceptedTerms) {
                                        setShowTermsModal(true);
                                    } else {
                                        setFormData({ ...formData, acceptedTerms: false });
                                    }
                                }}
                                className="mt-0.5 shrink-0"
                            />
                            <span className="leading-relaxed">
                                Acepto los{" "}
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTermsModal(true);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setShowTermsModal(true);
                                        }
                                    }}
                                    className="underline font-semibold text-primary hover:opacity-80 cursor-pointer"
                                >
                                    términos y el código de conducta
                                </span>{" "}
                                de SARA.
                            </span>
                        </label>
                        {errors.acceptedTerms && (
                            <p className="text-red-500 text-sm mt-1">{errors.acceptedTerms}</p>
                        )}
                    </div>
                    <TermsModal
                        open={showTermsModal}
                        onClose={() => setShowTermsModal(false)}
                        onAccept={() => {
                            setFormData({ ...formData, acceptedTerms: true });
                            setShowTermsModal(false);
                        }}
                    />

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