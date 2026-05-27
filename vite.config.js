import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/PokemonChampionsPokedex/',
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
