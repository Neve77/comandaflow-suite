import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('react-router-dom') || id.includes('react') || id.includes('react-dom')) {
            return 'vendor';
          }
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'charts';
          }
          if (id.includes('exceljs')) {
            return 'excel';
          }
          if (id.includes('jspdf')) {
            return 'pdf';
          }
          if (id.includes('socket.io-client')) {
            return 'socket';
          }
        }
      }
    }
  }
});
