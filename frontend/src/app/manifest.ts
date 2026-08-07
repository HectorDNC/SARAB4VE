import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SARA - Sistema de Alertas y Respuesta Asistida',
    short_name: 'SARA',
    description: 'SARA facilita la comunicación, ayuda y el rescate en situaciones críticas para personas con discapacidad.',
    start_url: '/?utm_source=pwa',

    display: 'standalone',
    background_color: '#fcf9f8', 
    theme_color: '#0040a1',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}