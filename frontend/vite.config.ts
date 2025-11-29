import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Plugin to fix Three.js compatibility issue with mp-react-components
// TubeBufferGeometry was renamed to TubeGeometry in Three.js r125+
const fixThreeJsCompatibility = () => {
  return {
    name: 'fix-threejs-compatibility',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      // Only transform files from mp-react-components
      if (id.includes('@materialsproject/mp-react-components')) {
        // Replace TubeBufferGeometry with TubeGeometry
        if (code.includes('TubeBufferGeometry')) {
          return {
            code: code.replace(/TubeBufferGeometry/g, 'TubeGeometry'),
            map: null,
          }
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), fixThreeJsCompatibility()],
  define: {
    // Polyfill for 'global' variable used by some dependencies (e.g., react-graph-vis/uuid)
    // This replaces 'global' with 'globalThis' in the code
    global: 'globalThis',
    // Polyfill for 'process' variable used by MP React Components
    'process.env': '{}',
    'process.browser': 'true',
    'process.version': '"v18.0.0"',
  },
  resolve: {
    // Force all dependencies to use the same React version
    // This prevents "Invalid hook call" errors from multiple React instances
    dedupe: ['react', 'react-dom', 'three'],
    alias: {
      // Fix Three.js examples imports - add .js extension automatically
      // MP React Components has its own Three.js version, so we need to point to that
      'three/examples/jsm/exporters/ColladaExporter': resolve(
        __dirname,
        'node_modules/@materialsproject/mp-react-components/node_modules/three/examples/jsm/exporters/ColladaExporter.js'
      ),
    },
  },
  optimizeDeps: {
    // Ensure proper handling of dependencies that use 'global' and 'process'
    esbuildOptions: {
      define: {
        global: 'globalThis',
        'process.env': '{}',
      },
      // Fix Three.js compatibility: replace TubeBufferGeometry with TubeGeometry
      plugins: [
        {
          name: 'fix-tube-buffer-geometry',
          setup(build) {
            build.onLoad({ filter: /@materialsproject\/mp-react-components.*\.js$/ }, (args) => {
              const contents = readFileSync(args.path, 'utf8')
              return {
                contents: contents.replace(/TubeBufferGeometry/g, 'TubeGeometry'),
                loader: 'js',
              }
            })
          },
        },
      ],
    },
    // Force Vite to use our React version for all dependencies
    include: ['react', 'react-dom', 'three'],
  },
})
