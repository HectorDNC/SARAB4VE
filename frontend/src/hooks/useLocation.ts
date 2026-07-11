"use client";

import { useContext } from "react";
import { LocationContext } from "@/providers/LocationProvider";

export function useLocation() {
  const ctx = useContext(LocationContext);

  if (!ctx) {
    throw new Error("useLocation debe usarse dentro de un <LocationProvider>");
  }

  return ctx;
}
