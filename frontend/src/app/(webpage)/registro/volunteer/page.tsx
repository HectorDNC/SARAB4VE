"use client"

import Label from "@/components/ui/Label";
import { useState } from 'react'
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
    loading: () => <div className="h-[300px] rounded-xl bg-surface-container animate-pulse" />,
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

export default function VolunteerRegister() {

    const [formData, setFormData] = useState<iVolunteerForm>(InitVolunteerForm);
    const [errors, setErrors] = useState<Partial<Record<keyof VolunteerFormData, string>>>({});
    const [showTermsModal, setShowTermsModal] = useState(false);

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

        <section className="px-5 lg:px-10 py-8 lg:py-12 ">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-on-surface">
                    Registro de Voluntario
                </h1>
                <p className="text-on-surface-variant mt-2">
                    Formulario inicial para unirte a la red SARA.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-outline-variant bg-surface-container-low p-6"
                >
                    <div>
                        <input
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="Nombre completo"
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
                            placeholder="Correo electrónico"
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
                        <Label name={'Ubicación donde puedes operar'}></Label>
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
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3 "
                            placeholder="Zona donde puede operar"
                            value={formData.zone}
                            onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                        />
                        {errors.zone && (
                            <p className="text-red-500 text-sm mt-1">{errors.zone}</p>
                        )}
                    </div>

                    <div>
                        <Label name={'Habilidades'}></Label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {SKILLS.map((skill) => (
                                <label
                                    key={skill.value}
                                    className="flex items-center gap-2 rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.skills.includes(skill.value)}
                                        onChange={() => toggleSkill(skill.value)}
                                    />
                                    {skill.label}
                                </label>
                            ))}
                        </div>
                        {errors.skills && (
                            <p className="text-red-500 text-sm mt-1">{errors.skills}</p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label name={'Horas Disponibles a la semana'}></Label>
                        <input
                            type="number"
                            min={0}
                            className="rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="Horas disponibles a la semana"
                            value={formData.availableHours}
                            onChange={(e) =>
                                setFormData({ ...formData, availableHours: parseInt(e.target.value) || 0 })
                            }
                        />
                        {errors.availableHours && (
                            <p className="text-red-500 text-sm mt-1">{errors.availableHours}</p>
                        )}
                    </div>

                    <div>
                        <Label name={'Días disponibles'}></Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {DAYS_WEEKEND.map((dia) => (
                                <label
                                    key={dia.value}
                                    className="flex items-center gap-2 rounded-xl border border-outline-variant bg-background px-3 py-2 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={formData.availableDays.includes(dia.value)}
                                        onChange={() =>
                                            toggleAvailableDay(dia.value)
                                        }
                                    />
                                    {dia.label}
                                </label>
                            ))}
                        </div>
                        {errors.availableDays && (
                            <p className="text-red-500 text-sm mt-1">{errors.availableDays}</p>
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
