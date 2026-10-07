import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Politique de sécurité du contenu (CSP), ajoutée seulement au build de
 * production (le serveur de dev de Vite utilise des scripts inline).
 * Point clé : script-src 'self' — aucun script injecté ne peut s'exécuter,
 * ce qui protège les sessions même en cas de faille XSS.
 */
function contentSecurityPolicy(apiUrl) {
  let apiOrigin = ''
  try { apiOrigin = apiUrl ? new URL(apiUrl).origin : '' } catch { apiOrigin = '' }
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
    // Les images ne peuvent pas exécuter de code : toutes origines acceptées
    'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http:'],
    'connect-src': ["'self'", apiOrigin || 'https:'],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  }
  const content = Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ')
  return {
    name: 'tn-content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${content}" />`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), contentSecurityPolicy(loadEnv(mode, process.cwd(), '').VITE_API_URL)],
  server: {
    proxy: {
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    css: true,
  },
}))
