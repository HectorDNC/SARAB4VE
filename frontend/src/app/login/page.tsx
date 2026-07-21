"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginSchema, getFieldErrors, type LoginFormData } from "./schema";
import { login } from "@/api/login";
import { alertService } from "@/services/alertService";
import { useAuth } from "@/providers/AuthProvider";
import { UserLogin } from "@/types";


export default function Login() {

    const initialForm: UserLogin = {
        email: "",
        password: "",
    };

    const router = useRouter();
    const { login: saveSession } = useAuth();
    const [formData, setFormData] = useState<UserLogin>(initialForm);
    const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
    const [isSubmit, setIsSubmit] = useState(false);
    const [showPassword, setShowPassWord] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const result = loginSchema.safeParse(formData);

        if (!result.success) {
            setErrors(getFieldErrors(formData))
            return;
        }

        setErrors({});
        setIsSubmit(true);

        try {
            const response = await login({
                email: result.data.email,
                password: result.data.password,
            });

            saveSession(response.token, response.user);

            alertService.success(`Bienvenida , ${response.user.fullName}`);
            if (response.user.role === "admin") {
                router.push('/dashboard');
            } else {
                router.push('/');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión';
            alertService.error(message);
        } finally {
            setIsSubmit(false)
        }
    }

    return (
        <main className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                {/* Encabezado */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                        <span className="material-symbols-rounded text-3xl text-primary" aria-hidden="true">
                            login
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
                        Bienvenido/a de nuevo
                    </h1>
                    <p className="text-on-surface-variant mt-2 text-sm sm:text-base">
                        Inicia sesión para continuar en SARA
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 sm:p-8 shadow-sm space-y-4"
                >
                    <div>
                        <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
                            Correo electrónico
                        </label>
                        <input
                            type="email"
                            autoComplete="email"
                            className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
                            placeholder="tucorreo@ejemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm font-medium text-on-surface-variant">
                                Contraseña
                            </label>
                            <Link
                                href="/recuperar-contrasena"
                                className="text-sm font-semibold text-primary hover:opacity-80"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3 pr-11"
                                placeholder="Ingresa tu contraseña"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassWord((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">
                                    {showPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmit}
                        className="w-full min-h-12 rounded-full bg-primary text-on-primary px-6 py-3 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {isSubmit ? "Ingresando..." : "Iniciar sesión"}
                    </button>
                </form>

                <p className="text-center text-sm text-on-surface-variant mt-6">
                    ¿No tienes una cuenta?{" "}
                    <Link
                        href="/registro-user"
                        className="font-semibold text-primary hover:opacity-80"
                    >
                        Regístrate aquí
                    </Link>
                </p>
            </div>
        </main>
    );
}