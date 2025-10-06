import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy API calls to backend during development
      '/login': 'http://localhost:8081',
      '/register': 'http://localhost:8081',
      '/register-organization': 'http://localhost:8081',
      '/branches': 'http://localhost:8081',
      '/inventory': 'http://localhost:8081',
      '/products': 'http://localhost:8081',
      '/sales': 'http://localhost:8081',
      '/admin': 'http://localhost:8081',
      '/manager': 'http://localhost:8081',
      '/product-stock': 'http://localhost:8081',
      '/api': 'http://localhost:8081',
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})