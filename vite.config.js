import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: https://<user>.github.io/creative-companion/
const base =
  process.env.GITHUB_PAGES === 'true' ? '/creative-companion/' : './'

export default defineConfig({
  plugins: [react()],
  base,
})
