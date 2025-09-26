import { defineConfig } from 'vite';

export default defineConfig({
  // When deploying to GitHub Pages at https://<USER>.github.io/<REPO>/
  // set base to '/<REPO>/' so asset URLs are correct.
  // Assumption: repository name is 'PinkPuffQuest' (owner: jamesmontemagno).
  base: '/PinkPuffQuest/',
  root: '.',
  server: {
    open: true,
  },
});
