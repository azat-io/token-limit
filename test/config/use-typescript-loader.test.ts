import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { useTypescriptLoader } from '../../config/use-typescript-loader'

describe('useTypescriptLoader', () => {
  let testDirectory = join(process.cwd(), 'temp-test-ts-configs')

  beforeAll(async () => {
    await mkdir(testDirectory, { recursive: true })
  })

  afterAll(async () => {
    await rm(testDirectory, { recursive: true, force: true })
  })

  it('should load TypeScript configuration with default export', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'ts-config.ts')
    let configContent = `export default [
      {
        path: ['**/*.ts', '**/*.tsx'],
        model: 'gpt-4',
        limit: 50000
      }
    ]`

    await writeFile(configPath, configContent)

    let result = await useTypescriptLoader(configPath)
    expect(result).toEqual([
      {
        path: ['**/*.ts', '**/*.tsx'],
        model: 'gpt-4',
        limit: 50000,
      },
    ])
  })

  it('should handle TypeScript configuration with named export (no default)', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'named-export.ts')
    let configContent = `export const config = {
      include: ['src/**/*.ts'],
      model: 'claude-3-sonnet'
    }`

    await writeFile(configPath, configContent)

    let result = await useTypescriptLoader(configPath)
    expect(result).toBeUndefined()
  })

  it('should handle complex TypeScript configuration', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'complex-ts.ts')
    let configContent = `export default [
      {
        path: ['**/*.{ts,tsx,js,jsx}'],
        model: 'gpt-4-turbo',
        limit: 100000,
        name: 'Source files'
      },
      {
        path: ['docs/**/*.md'],
        model: 'claude-3-sonnet',
        limit: 50000,
        name: 'Documentation'
      }
    ]`

    await writeFile(configPath, configContent)

    let result = await useTypescriptLoader(configPath)
    expect(result).toEqual([
      {
        path: ['**/*.{ts,tsx,js,jsx}'],
        model: 'gpt-4-turbo',
        name: 'Source files',
        limit: 100000,
      },
      {
        model: 'claude-3-sonnet',
        path: ['docs/**/*.md'],
        name: 'Documentation',
        limit: 50000,
      },
    ])
  })

  it('should handle TypeScript with imports', async () => {
    expect.assertions(1)

    let helperPath = join(testDirectory, 'helper.ts')
    let helperContent = `export const defaultModel = 'gpt-4'
export const defaultLimit = 75000`

    await writeFile(helperPath, helperContent)

    let configPath = join(testDirectory, 'with-imports.ts')
    let configContent = `import { defaultModel, defaultLimit } from './helper'

export default [
  {
    path: ['**/*.ts'],
    model: defaultModel,
    limit: defaultLimit
  }
]`

    await writeFile(configPath, configContent)

    let result = await useTypescriptLoader(configPath)
    expect(result).toEqual([
      {
        path: ['**/*.ts'],
        model: 'gpt-4',
        limit: 75000,
      },
    ])
  })

  it('should throw error for non-existent TypeScript file', async () => {
    expect.assertions(1)

    await expect(
      useTypescriptLoader('/non-existent/path/config.ts'),
    ).rejects.toThrow()
  })

  it('should throw error for invalid TypeScript syntax', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'invalid-ts.ts')
    let configContent = `export default {
      include: ['**/*.ts'
      // Missing closing bracket and comma
      model: 'gpt-4'
    `

    await writeFile(configPath, configContent)

    await expect(useTypescriptLoader(configPath)).rejects.toThrow()
  })

  it('should handle TypeScript file without default export', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'no-default-ts.ts')
    let configContent = `export const someConfig = {
      include: ['**/*.ts']
    }

export const anotherConfig = {
      model: 'gpt-4'
    }`

    await writeFile(configPath, configContent)

    let result = await useTypescriptLoader(configPath)
    expect(result).toBeUndefined()
  })

  it('should handle TypeScript with type annotations', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'typed-config.ts')
    let configContent = `import type { TokenLimitConfig } from '../../types/token-limit-config'

type ModelType = 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-sonnet'

const config: TokenLimitConfig = [
  {
    path: ['**/*.ts', '**/*.js'],
    model: 'claude-3-sonnet' as ModelType,
    limit: 80000,
    name: 'Source files'
  }
]

export default config`

    await writeFile(configPath, configContent)

    let result = await useTypescriptLoader(configPath)
    expect(result).toEqual([
      {
        path: ['**/*.ts', '**/*.js'],
        model: 'claude-3-sonnet',
        name: 'Source files',
        limit: 80000,
      },
    ])
  })
})
