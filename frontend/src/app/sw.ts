/**
 * Service Worker de SARA (Serwist).
 * Habilita PWA instalable + cacheo de assets estáticos.
 *
 * El build de producción debe correr con `next build --webpack`
 * (Serwist aún no soporta Turbopack de forma estable). Ver README → PWA.
 * En `dev` este service worker está desactivado.
 *
 * `/// <reference lib="webworker" />` carga los tipos de Web Worker
 * solo para este archivo (el resto de la app usa "dom"). Serwist inyecta
 * `__SW_MANIFEST` automáticamente durante el build; no se define acá.
 */

/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist } from "serwist"
import { defaultCache } from "@serwist/next/worker"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()