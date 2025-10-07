import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If plugin-react isn’t installed, Vite still runs without it.
// Install it if you want fast refresh: npm i -D @vitejs/plugin-react
export default defineConfig({
  plugins: [react()]
})
