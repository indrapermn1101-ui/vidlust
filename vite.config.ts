import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Path relatif agar bisa dibuka via file:// di Electron packaged,
  // sekaligus tetap normal saat di-hosting statis / localhost.
  base: './',
  plugins: [react()],
})
