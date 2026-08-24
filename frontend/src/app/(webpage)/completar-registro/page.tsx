import { Suspense } from "react";
import CompletarRegistroForm from "./CompletarRegistroForm";

export default function CompletarRegistroPage() {
  return (
    <Suspense fallback={<p className="text-on-surface-variant text-sm">Cargando...</p>}>
      <CompletarRegistroForm />
    </Suspense>
  );
}
