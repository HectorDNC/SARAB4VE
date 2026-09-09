import { Suspense } from "react";
import CitizenRegisterForm from "./CitizenRegisterForm";

export default function CitizenRegisterPage() {
  return (
    <Suspense fallback={<p className="text-on-surface-variant text-sm">Cargando...</p>}>
      <CitizenRegisterForm />
    </Suspense>
  );
}
