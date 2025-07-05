import { defineConfig } from '.'

export default defineConfig([
  {
    name: 'Cost limit example',
    model: 'claude-sonnet-4',
    path: 'readme.md',
    limit: '2k',
  },
])
