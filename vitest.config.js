import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.js',
      'src/**/*.spec.js',
      'server/**/*.test.js',
      /* The CLI lives in scripts/ and is .mjs; without this line its tests
         would sit in the repo never running, which is the exact failure that
         let build-harbor-demo.mjs rot. */
      'scripts/**/*.test.mjs',
    ],
  },
})
