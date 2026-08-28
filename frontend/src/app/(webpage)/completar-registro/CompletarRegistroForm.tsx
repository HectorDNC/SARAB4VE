"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { completarRegistroSchema, getFieldErrors, type CompletarRegistroFormData } from "./schema";
import { completeRegistration, validateCompletionToken } from "@/api/auth";
import { alertService } from "@/services/alertService";

type TokenStatus = "loading" | "invalid" | "valid";

export default function CompletarRegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(() => (token ? "loading" : "invalid"));

  const initialForm: CompletarRegistroFormData = { password: "", confirmPassword: "" };
  const [formData, setFormData] = useState<CompletarRegistroFormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CompletarRegistroFormData, string>>>({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function checkToken() {
      try {
        const result = await validateCompletionToken(token as string);
        setTokenStatus(result.valid ? "valid" : "invalid");
      } catch {
        setTokenStatus("invalid");
      }
    }
    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const result = completarRegistroSchema.safeParse(formData);
    if (!result.success) {
      setErrors(getFieldErrors(formData));
      return;
    }

    setErrors({});
    setIsSubmit(true);

    try {
      await completeRegistration({ token, password: result.data.password });
      alertService.success("Tu cuenta quedó activada. Ya puedes iniciar sesión.");
      router.push("/login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar el registro";
      alertService.error(message);
    } finally {
      setIsSubmit(false);
    }
  };

  if (tokenStatus === "loading") {
    return <p className="text-on-surface-variant text-sm">Verificando enlace...</p>;
  }

  if (tokenStatus === "invalid") {
    return (
      <main className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-6">
            <p className="text-on-surface-variant text-sm">
              Este enlace no es válido o ya expiró.
            </p>
            <Link href="/login" className="text-primary flex justify-center font-semibold text-sm mt-4">
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <span className="material-symbols-rounded text-3xl text-primary" aria-hidden="true">
              lock_open
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
            Completa tu registro
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm sm:text-base">
            Define una contraseña para activar tu cuenta en SARA
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-outline-variant bg-surface-container-low p-6 sm:p-8 shadow-sm space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3 pr-11"
                placeholder="Ingresa tu contraseña"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
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

          <div>
            <label className="text-sm font-medium text-on-surface-variant mb-1.5 block">
              Confirmar contraseña
            </label>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="w-full rounded-xl border border-outline-variant bg-background px-4 py-3"
              placeholder="Repite tu contraseña"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmit}
            className="w-full min-h-12 rounded-full bg-primary text-on-primary px-6 py-3 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmit ? "Guardando..." : "Activar cuenta"}
          </button>
        </form>
      </div>
    </main>
  );
}
