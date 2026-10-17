import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite configuration for the Navetra frontend.
// - The dev server listens on 0.0.0.0 so it can be reached through the
//   sandbox live-preview proxy (https://{port}-{sandbox}.e2b.app).
// - `allowedHosts` lets that preview host reach the dev server.
// - Backend calls use VITE_API_BASE_URL (see .env.example); no localhost URLs are hardcoded.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
  build: {
    // Recharts is shared by the Overview page (the landing route), so the entry chunk is large by design.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
