import { defineConfig } from 'cspell'

export default defineConfig({
  words: [
    'azat',
    'bgkmt',
    'changelogen',
    'changelogithub',
    'clinerules',
    'crosspost',
    'cursorrules',
    'humanwhocodes',
    'openrouter',
    'tiktoken',
  ],
  ignorePaths: ['.github', 'changelog.md', 'license', 'pnpm-lock.yaml'],
  dictionaries: ['css', 'html', 'node', 'npm', 'typescript'],
  useGitignore: true,
  language: 'en',
})
