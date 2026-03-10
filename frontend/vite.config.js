import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [react()],
    // 🚀 MUHIM: Serverda build vaqtida '/static/', mahalliy dev-serverda '/' ishlatiladi
    base: isBuild ? '/static/' : '/',
    server: {
      proxy: {
        // Backend so'rovlarini Django'ga (8000 port) yo'naltirish
        '/api': 'http://127.0.0.1:8000',
        '/accounts': 'http://127.0.0.1:8000',
        '/media': 'http://127.0.0.1:8000',
        '/edushare-boshqaruv-2026': 'http://127.0.0.1:8000',
        '/admin': 'http://127.0.0.1:8000',
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['framer-motion', 'react-icons'],
          },
        },
      },
    }
  };
})