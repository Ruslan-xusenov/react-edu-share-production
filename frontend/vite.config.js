import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [react()],
    base: isBuild ? '/static/' : '/',
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
        '/accounts': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/media': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/edushare-boshqaruv-2026': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/admin': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/static': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-framer': ['framer-motion'],
            'vendor-icons': ['react-icons', 'react-icons/fa'],
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    }
  };
})