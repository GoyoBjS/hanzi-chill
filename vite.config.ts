import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['audio/*.mp3', 'icons/*.png'],
    manifest: { name: '汉字 Chill', short_name: '汉字 Chill', description: 'Chino a tu ritmo', lang: 'es', start_url: './', scope: './', display: 'standalone', background_color: '#f5f4ee', theme_color: '#183c33', icons: [ { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' } ] },
    workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'], cleanupOutdatedCaches: true, navigateFallback: 'index.html' }
  })]
})
