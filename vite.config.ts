import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/gas': {
        target: 'https://script.google.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) =>
          path.replace(
            /^\/gas/,
            '/macros/s/AKfycbxYJiNFW0EWEnOjqhph9gr8Wvmjgfvgo1ZxQ0E4FlJTj9Qxd3TFuARjR0Rz1DHvdbOc/exec'
          ),
      },
      '/macros': {
        target: 'https://script.google.com',
        changeOrigin: true,
        secure: false, // Allow self-signed or insecure connections if needed
      },
    },
  },
});
