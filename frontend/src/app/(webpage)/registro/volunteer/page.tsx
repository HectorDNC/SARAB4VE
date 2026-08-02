"use client";

import Label from "@/components/ui/Label";
import Button from "@/components/ui/Button";
import { useId, useState } from 'react'
import { iVolunteerForm, SKILLS, DAYS_WEEKEND } from "@/types/index";
import { sendVolunteer } from "@/api/volunteer";
import { volunteerSchema, getFieldErrors, type VolunteerFormData } from "./schema";
import { alertService } from "@/services/alertService";
import dynamic from "next/dynamic";
import TermsModal from "@/components/ui/TermsModal";
import "react-phone-number-input/style.css"
import PhoneField from "@/components/ui/PhoneField";

const Location = dynamic(() => import("@/components/ui/Location"), {
    ssr: false,
    loading: () => <div className="h-[300px] md:h-[360px] rounded-xl bg-surface-container animate-pulse" />,
});

const InitVolunteerForm: iVolunteerForm = {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    location: null,
    zone: "",
    skills: [],
    availableHours: 0,
    availableDays: [],
    acceptedTerms: false,
}

const fieldClass =
    "w-full rounded-xl border border-outline-variant bg-background px-4 py-3 " +
    "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 " +
    "focus:border-primary transition-colors";

const errorClass = "text-error text-sm mt-1";

export default function VolunteerRegister() {
    const [formData, setFormData] = useState<iVolunteerForm>(InitVolunteerForm);
    const [errors, setErrors] = useState<Partial<Record<keyof VolunteerFormData, string>>>({});
    const [showTermsModal, setShowTermsModal] = useState(false);

    const ids = {
        fullName: useId(),
        email: useId(),
        phone: useId(),
        password: useId(),
        location: useId(),
        zone: useId(),
        skills: useId(),
        availableHours: useId(),
        availableDays: useId(),
    } as const;

    function toggleArray<T>(array: T[], value: T): T[] {
        return array.includes(value)
            ? array.filter((v) => v !== value)
            : [...array, value];
    }

    const toggleSkill = (skill: string) => {
        setFormData(prev => ({
            ...prev,
            skills: toggleArray(prev.skills, skill),
        }));
    };

    const toggleAvailableDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            availableDays: toggleArray(prev.availableDays, day),
        }));
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = volunteerSchema.safeParse(formData);

        if (!result.success) {
            setErrors(getFieldErrors(formData));
            return;
        }

        setErrors({});

        try {
            await sendVolunteer({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                location: formData.location,
                zone: formData.zone,
                skills: formData.skills,
                availableHours: Number(formData.availableHours),
                availableDays: formData.availableDays,
                acceptedTerms: formData.acceptedTerms,
            })

            alertService.success("Tu solicitud fue enviada. Te contactaremos pronto.");
            setFormData(InitVolunteerForm)

        } catch (error) {
            console.error("Error al enviar la solicitud de voluntariado:", error);
            return;
        }
    };


    return (
        <section className="px-5 lg:px-10 py-8 lg:py-12">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold text-on-surface">
                        Registro de Voluntario
                    </h1>
                    <p className="text-on-surface-variant mt-2 text-base">
                        Formulario inicial para unirte a la red SARA.
                    </p>
                </header>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 sm:p-6 lg:p-8 space-y-8"
                >
                    {/* DATOS PERSONALES */}
                    <fieldset className="space-y-4">
                        <legend className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                            Datos personales
                        </legend>

                        <div>
                            <Label htmlFor={ids.fullName} name="Nombre completo" />
                            <input
                                id={ids.fullName}
                                className={`${fieldClass} mt-2 ${errors.fullName ? "border-error" : ""}`}
                                placeholder="Ej. María González"
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
                                <Label htmlFor={ids.email} name="Correo electrónico" />
                                <input
                                    id={ids.email}
                                    type="email"
                                    className={`${fieldClass} mt-2 ${errors.email ? "border-error" : ""}`}
                                    placeholder="correo@ejemplo.com"
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
                                <Label htmlFor={ids.phone} name="Teléfono" />
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
                                <Label htmlFor={ids.zone} name="Zona donde puede operar" />
                                <input
                                    id={ids.zone}
                                    className={`${fieldClass} mt-2 ${errors.zone ? "border-error" : ""}`}
                                    placeholder="Ej. Chacao, Caracas"
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
                        <Label htmlFor={ids.location} name="Marca en el mapa la zona donde puedes operar" />
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

                    {/* HABILIDADES Y DISPONIBILIDAD */}
                    <fieldset className="space-y-6">
                        <legend className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
                            Habilidades y disponibilidad
                        </legend>

                        <div>
                            <Label htmlFor={ids.skills} name="Habilidades" />
                            <div
                                id={ids.skills}
                                role="group"
                                aria-labelledby={ids.skills}
                                className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"
                            >
                                {SKILLS.map((skill) => {
                                    const checked = formData.skills.includes(skill.value);
                                    return (
                                        <label
                                            key={skill.value}
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
                                                onChange={() => toggleSkill(skill.value)}
                                                className="accent-primary shrink-0"
                                            />
                                            <span className="leading-tight">{skill.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {errors.skills && (
                                <p className={errorClass}>{errors.skills}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor={ids.availableHours} name="Horas / semana" />
                                <input
                                    id={ids.availableHours}
                                    type="number"
                                    min={0}
                                    max={168}
                                    className={`${fieldClass} mt-2 ${errors.availableHours ? "border-error" : ""}`}
                                    placeholder="Ej. 10"
                                    value={formData.availableHours || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, availableHours: parseInt(e.target.value) || 0 })
                                    }
                                    aria-invalid={!!errors.availableHours}
                                    aria-describedby={errors.availableHours ? `${ids.availableHours}-err` : undefined}
                                />
                                {errors.availableHours && (
                                    <p id={`${ids.availableHours}-err`} className={errorClass}>{errors.availableHours}</p>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <Label htmlFor={ids.availableDays} name="Días disponibles" />
                                <div
                                    id={ids.availableDays}
                                    role="group"
                                    aria-labelledby={ids.availableDays}
                                    className="mt-2 flex flex-wrap gap-2"
                                >
                                    {DAYS_WEEKEND.map((dia) => {
                                        const checked = formData.availableDays.includes(dia.value);
                                        return (
                                            <label
                                                key={dia.value}
                                                className={[
                                                    "flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-sm cursor-pointer transition-colors",
                                                    checked
                                                        ? "border-primary bg-primary-fixed"
                                                        : "border-outline-variant hover:border-primary/60",
                                                ].join(" ")}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleAvailableDay(dia.value)}
                                                    className="accent-primary shrink-0"
                                                />
                                                {dia.label}
                                            </label>
                                        );
                                    })}
                                </div>
                                {errors.availableDays && (
                                    <p className={errorClass}>{errors.availableDays}</p>
                                )}
                            </div>
                        </div>
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
