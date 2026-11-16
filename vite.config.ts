/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { firebaseMessagingSw } from './vite-plugins/firebaseMessagingSw'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), firebaseMessagingSw()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'functions/**/*.test.js'],
    env: { TZ: 'Europe/Rome' },
  },
})
