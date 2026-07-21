"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

type RequireAuthProps = {
  roles?: ("admin" | "organization" | "volunteer" | "citizen")[];
  children: React.ReactNode;
};

export default function RequireAuth({ roles, children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }

    if (roles && user && !roles.includes(user.role)) {
      router.push("/");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-on-surface-variant text-sm">Verificando sesión...</p>
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}