import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import * as sass from 'sass';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'assets/**/*'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/node_modules/**/*'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 günlük cache
              }
            }
          }
        ],
        // Service worker'ın kök dizinde kaydedilmesini sağla
        swDest: 'dist/sw.js', // Doğru çıktı yolu
        navigateFallback: '/index.html'
      },
      // PWA Ayarlarını düzenleme
      injectManifest: false,
      manifest: false,
      // Strict mode kapatılıyor build hatalarını önlemek için
      selfDestroying: false,
      strategies: 'generateSW',
      buildBase: '/'
    })
  ],
  base: '/', // Base URL'i kök dizin olarak ayarla
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    assetsInlineLimit: 4096, // 4KB'den küçük dosyaları inline et
    chunkSizeWarningLimit: 1000, // Chunk boyutu uyarı limitini yükselt
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-chart': ['chart.js'],
          'vendor-bootstrap': ['bootstrap']
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'src': path.resolve(__dirname, 'src'),
      'vue': 'vue/dist/vue.esm-bundler.js'
    }
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios', 'mitt', 'chart.js']
  },
  server: {
    port: 3000,
    open: true
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        // Modern SASS API kullanımı
        implementation: sass,
        sassOptions: {
          outputStyle: 'compressed',
          charset: false
        }
      }
    }
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none'
  }
});