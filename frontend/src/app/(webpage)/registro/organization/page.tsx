"use client";

import Label from "@/components/ui/Label";
import Button from "@/components/ui/Button";
import { useId, useState } from 'react';
import { iOrganizationForm, WORK_AREAS } from "@/types/index";
import { sendOrganization } from "@/api/organization";
import { organizationSchema, getFieldErrors, type OrganizationFormData } from "./schema";
import { alertService } from "@/services/alertService";
import dynamic from "next/dynamic";
import TermsModal from "@/components/ui/TermsModal";
import PhoneField from "@/components/ui/PhoneField";


const Location = dynamic(() => import("@/components/ui/Location"), {
    ssr: false,
    loading: () => <div className="h-[300px] md:h-[360px] rounded-xl bg-surface-container animate-pulse" />,
});

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

const fieldClass =
    "w-full rounded-xl border border-outline-variant bg-background px-4 py-3 " +
    "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 " +
    "focus:border-primary transition-colors";

const errorClass = "text-error text-sm mt-1";

export default function OrganizationRegister() {

    const [formData, setFormData] = useState<iOrganizationForm>(InitOrganizationForm);
    const [errors, setErrors] = useState<Partial<Record<keyof OrganizationFormData, string>>>({});
    const [showTermsModal, setShowTermsModal] = useState(false);

    const ids = {
        fullName: useId(),
        email: useId(),
        phone: useId(),
        password: useId(),
        organizationName: useId(),
        legalDocument: useId(),
        location: useId(),
        zone: useId(),
        workArea: useId(),
    } as const;

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
                <header className="mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold text-on-surface">
                        Registro de Organización / ONG
                    </h1>
                    <p className="text-on-surface-variant mt-2 text-base">
                        Formulario inicial para unirte a la red SARA como organización.
                    </p>
                </header>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 sm:p-6 lg:p-8 space-y-8"
                >
                    {/* DATOS DE LA ORGANIZACIÓN */}
                    <fieldset className="space-y-4">
                        <legend className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                            Datos de la organización
                        </legend>

                        <div>
                            <Label htmlFor={ids.organizationName} name="Nombre de la organización" />
                            <input
                                id={ids.organizationName}
                                className={`${fieldClass} mt-2 ${errors.organizationName ? "border-error" : ""}`}
                                placeholder="Ej. Fundación Esperanza Activa"
                                value={formData.organizationName}
                                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                aria-invalid={!!errors.organizationName}
                                aria-describedby={errors.organizationName ? `${ids.organizationName}-err` : undefined}
                            />
                            {errors.organizationName && (
                                <p id={`${ids.organizationName}-err`} className={errorClass}>{errors.organizationName}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor={ids.legalDocument} name="Documento legal (RIF o equivalente)" />
                            <input
                                id={ids.legalDocument}
                                className={`${fieldClass} mt-2 ${errors.legalDocument ? "border-error" : ""}`}
                                placeholder="Ej. J-12345678-9"
                                value={formData.legalDocument}
                                onChange={(e) => setFormData({ ...formData, legalDocument: e.target.value })}
                                aria-invalid={!!errors.legalDocument}
                                aria-describedby={errors.legalDocument ? `${ids.legalDocument}-err` : undefined}
                            />
                            {errors.legalDocument && (
                                <p id={`${ids.legalDocument}-err`} className={errorClass}>{errors.legalDocument}</p>
                            )}
                        </div>
                    </fieldset>

                    {/* REPRESENTANTE */}
                    <fieldset className="space-y-4">
                        <legend className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                            Datos del representante
                        </legend>

                        <div>
                            <Label htmlFor={ids.fullName} name="Nombre completo del representante" />
                            <input
                                id={ids.fullName}
                                className={`${fieldClass} mt-2 ${errors.fullName ? "border-error" : ""}`}
                                placeholder="Ej. Carlos Pérez"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                aria-invalid={!!errors.fullName}
                                aria-describedby={errors.fullName ? `${ids.fullName}-err` : undefined}
                            />
                            {errors.fullName && (
                                <p id={`${ids.fullName}-err`} className={errorClass}>{errors.fullName}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor={ids.email} name="Correo electrónico institucional" />
                                <input
                                    id={ids.email}
                                    type="email"
                                    className={`${fieldClass} mt-2 ${errors.email ? "border-error" : ""}`}
                                    placeholder="contacto@organizacion.org"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    aria-invalid={!!errors.email}
                                    aria-describedby={errors.email ? `${ids.email}-err` : undefined}
                                />
                                {errors.email && (
                                    <p id={`${ids.email}-err`} className={errorClass}>{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor={ids.phone} name="Teléfono de contacto" />
                                <div id={ids.phone} className="mt-2">
                                    <PhoneField
                                        value={formData.phone}
                                        onChange={(phone) => setFormData({ ...formData, phone })}
                                    />
                                </div>
                                {errors.phone && (
                                    <p className={errorClass}>{errors.phone}</p>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    {/* CREDENCIALES */}
                    <fieldset className="space-y-4">
                        <legend className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                            Credenciales
                        </legend>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor={ids.password} name="Contraseña" />
                                <input
                                    id={ids.password}
                                    type="password"
                                    className={`${fieldClass} mt-2 ${errors.password ? "border-error" : ""}`}
                                    placeholder="Mínimo 8 caracteres"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? `${ids.password}-err` : undefined}
                                />
                                {errors.password && (
                                    <p id={`${ids.password}-err`} className={errorClass}>{errors.password}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor={ids.zone} name="Zona / distrito de cobertura" />
                                <input
                                    id={ids.zone}
                                    className={`${fieldClass} mt-2 ${errors.zone ? "border-error" : ""}`}
                                    placeholder="Ej. Área metropolitana de Caracas"
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                    aria-invalid={!!errors.zone}
                                    aria-describedby={errors.zone ? `${ids.zone}-err` : undefined}
                                />
                                {errors.zone && (
                                    <p id={`${ids.zone}-err`} className={errorClass}>{errors.zone}</p>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    {/* UBICACIÓN */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                            Ubicación
                        </legend>
                        <Label htmlFor={ids.location} name="Marca en el mapa la zona / cobertura geográfica" />
                        <div id={ids.location} className="mt-2">
                            <Location
                                value={formData.location}
                                onChange={(loc) => setFormData({ ...formData, location: loc })}
                            />
                        </div>
                        {errors.location && (
                            <p className={errorClass}>{errors.location}</p>
                        )}
                    </fieldset>

                    {/* ÁREA DE TRABAJO */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                            Operación
                        </legend>
                        <Label htmlFor={ids.workArea} name="Áreas de trabajo" />
                        <div
                            id={ids.workArea}
                            role="group"
                            aria-labelledby={ids.workArea}
                            className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
                        >
                            {WORK_AREAS.map((area) => {
                                const checked = formData.workArea.includes(area.value);
                                return (
                                    <label
                                        key={area.value}
                                        className={[
                                            "flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 text-sm cursor-pointer transition-colors",
                                            checked
                                                ? "border-primary bg-primary-fixed"
                                                : "border-outline-variant hover:border-primary/60",
                                        ].join(" ")}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleWorkArea(area.value)}
                                            className="accent-primary shrink-0"
                                        />
                                        <span className="leading-tight">{area.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                        {errors.workArea && (
                            <p className={errorClass}>{errors.workArea}</p>
                        )}
                    </fieldset>

                    {/* TÉRMINOS */}
                    <div>
                        <label className="flex items-start gap-3 text-sm text-on-surface-variant cursor-pointer">
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
                                className="mt-0.5 shrink-0 accent-primary"
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
                            <p className={errorClass}>{errors.acceptedTerms}</p>
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

                    <div className="pt-2 flex justify-end">
                        <Button type="submit" variant="filled" size="lg" icon="send">
                            Enviar solicitud
                        </Button>
                    </div>
                </form>
            </div>
        </section>
    );
}
