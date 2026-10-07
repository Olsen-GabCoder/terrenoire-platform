import process from 'node:process'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Version de l'application : une seule source, le fichier VERSION à la racine
 * du dépôt (lu aussi par l'API). Repli sur package.json si le fichier manque.
 */
function readAppVersion() {
  try {
    return readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim()
  } catch {
    return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
  }
}

// Commit déployé : fourni par Render pendant le build, sinon lu dans git.
function readCommit() {
  const fromEnv = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT
  if (fromEnv) return fromEnv.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

const APP_VERSION = readAppVersion()
const APP_COMMIT = readCommit()
// Identifiant unique de chaque build : sert à détecter qu'une nouvelle
// version a été mise en ligne pendant qu'un onglet était ouvert.
const APP_BUILD_ID = `${APP_VERSION}+${APP_COMMIT || 'local'}.${Date.now().toString(36)}`

/** Publie /version.json à côté du site, consulté par les onglets ouverts. */
function versionManifest() {
  return {
    name: 'tn-version-manifest',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: APP_VERSION, commit: APP_COMMIT, build: APP_BUILD_ID }),
      })
    },
  }
}

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
  plugins: [react(), contentSecurityPolicy(loadEnv(mode, process.cwd(), '').VITE_API_URL), versionManifest()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_COMMIT__: JSON.stringify(APP_COMMIT),
    __APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
  },
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
