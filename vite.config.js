import { defineConfig } from "vite";
import react from '@vitejs/react-refresh';

export default defineConfig({
  plugins: [react()],
  base: "/PokemonChampionsPokedex/",
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
