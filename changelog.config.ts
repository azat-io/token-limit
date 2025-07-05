import type { ChangelogConfig } from 'changelogen'

export default {
  types: {
    perf: {
      title: '🏎 Performance Improvements',
    },
    fix: {
      title: '🐞 Bug Fixes',
    },
    feat: {
      title: '🚀 Features',
    },
  },
  templates: {
    commitMessage: 'build: publish v{{newVersion}}',
  },
} satisfies Partial<ChangelogConfig>
