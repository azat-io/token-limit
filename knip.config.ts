import type { KnipConfig } from 'knip'

export default {
  entry: ['cli/index.ts', 'core/index.ts'],
  ignore: ['token-limit.config.ts'],
  ignoreDependencies: ['jiti'],
} satisfies KnipConfig
