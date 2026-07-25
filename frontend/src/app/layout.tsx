import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";
import LocationProvider from "@/providers/LocationProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { AccessibilityProvider } from "@/providers/AccessibilityProvider";
import AlertsHost from "@/components/ui/AlertsHost";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-sara",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SARA — Plataforma Accesible de Emergencia",
  description:
    "SARA facilita la comunicación, ayuda y el rescate en situaciones críticas para personas con discapacidad.",
  keywords: ["emergencia", "accesibilidad", "discapacidad", "Venezuela", "voluntarios"],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SARA — Plataforma Accesible de Emergencia',
  },
};

export const viewport: Viewport = {
  themeColor: '#0040a1',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${atkinson.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-surface">
        <AccessibilityProvider>
          <AuthProvider>
            <LocationProvider>
              <AlertsHost />
              {children}
            </LocationProvider>
          </AuthProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
