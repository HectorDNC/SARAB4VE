This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

## PWA (Progressive Web App)

Este proyecto está configurado como PWA (instalable en dispositivos móviles), usando [Serwist](https://serwist.pages.dev/) para generar el service worker.

### Importante: build de producción

`next dev` funciona normal con Turbopack, sin cambios. Pero **`next build` requiere el flag `--webpack`**, porque Serwist todavía no soporta Turbopack de forma estable:

```bash
pnpm build   # ya incluye --webpack en el script
pnpm start
```

Si corrés `next build` manualmente sin pasar por el script de `package.json`, acordate de agregar el flag:

```bash
pnpm next build --webpack
```

Sin este flag, el build va a fallar con un error de conflicto entre Turbopack y la configuración de webpack de Serwist.

### Archivos relevantes

- `app/manifest.ts` — configuración del manifest (nombre, íconos, colores)
- `app/sw.ts` — configuración del service worker
- `public/icons/` — íconos de la PWA (no editar directamente sin regenerar todos los tamaños)
- `public/sw.js` — **generado automáticamente en cada build, no se commitea** (está en `.gitignore`)

### Probar la instalación localmente

El service worker requiere HTTPS (excepto en `localhost`), así que para probar la instalación desde un celular hace falta exponer el localhost con un túnel (ngrok, localtunnel) o hacer un deploy de prueba en Vercel.

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
