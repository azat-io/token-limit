import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { useBaseLoader } from '../../config/use-base-loader'

describe('useBaseLoader', () => {
  let testDirectory = join(process.cwd(), 'temp-test-configs')

  beforeAll(async () => {
    await mkdir(testDirectory, { recursive: true })
  })

  afterAll(async () => {
    await rm(testDirectory, { recursive: true, force: true })
  })

  it('should load ES module with default export', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'es-config.mjs')
    let configContent = `export default {
      include: ['**/*.ts', '**/*.js'],
      exclude: ['node_modules/**'],
      model: 'gpt-4'
    }`

    await writeFile(configPath, configContent)

    let result = await useBaseLoader(configPath)
    expect(result).toEqual({
      include: ['**/*.ts', '**/*.js'],
      exclude: ['node_modules/**'],
      model: 'gpt-4',
    })
  })

  it('should load CommonJS module with module.exports', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'cjs-config.cjs')
    let configContent = `module.exports = {
      include: ['src/**/*.ts'],
      model: 'gpt-3.5-turbo'
    }`

    await writeFile(configPath, configContent)

    let result = await useBaseLoader(configPath)
    expect(result).toEqual({
      include: ['src/**/*.ts'],
      model: 'gpt-3.5-turbo',
    })
  })

  it('should handle complex configuration objects', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'complex-config.mjs')
    let configContent = `export default {
      include: ['**/*.{ts,js,tsx,jsx}'],
      exclude: ['**/*.test.*', 'dist/**', 'node_modules/**'],
      model: 'claude-3-sonnet',
      maxTokens: 100000,
      outputFormat: 'detailed'
    }`

    await writeFile(configPath, configContent)

    let result = await useBaseLoader(configPath)
    expect(result).toEqual({
      exclude: ['**/*.test.*', 'dist/**', 'node_modules/**'],
      include: ['**/*.{ts,js,tsx,jsx}'],
      model: 'claude-3-sonnet',
      outputFormat: 'detailed',
      maxTokens: 100000,
    })
  })

  it('should throw error for non-existent file', async () => {
    expect.assertions(1)

    await expect(
      useBaseLoader('/non-existent/path/config.js'),
    ).rejects.toThrow()
  })

  it('should throw error for invalid JavaScript syntax', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'invalid-syntax.mjs')
    let configContent = `export default {
      include: ['**/*.ts'
      // Missing closing bracket
    `

    await writeFile(configPath, configContent)

    await expect(useBaseLoader(configPath)).rejects.toThrow()
  })

  it('should handle module without default export', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'no-default.mjs')
    let configContent = `export const config = {
      include: ['**/*.ts']
    }`

    await writeFile(configPath, configContent)

    let result = await useBaseLoader(configPath)
    expect(result).toBeUndefined()
  })

  it('should handle file paths with special characters', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'config with spaces & symbols.mjs')
    let configContent = `export default {
      include: ['**/*.ts'],
      model: 'gpt-4'
    }`

    await writeFile(configPath, configContent)

    let result = await useBaseLoader(configPath)
    expect(result).toEqual({
      include: ['**/*.ts'],
      model: 'gpt-4',
    })
  })

  it('should test path conversion without mocking', async () => {
    expect.assertions(1)

    let configPath = join(testDirectory, 'url-test.mjs')
    let configContent = `export default { include: ['**/*.ts'] }`

    await writeFile(configPath, configContent)

    let result = await useBaseLoader(configPath)
    expect(result).toEqual({ include: ['**/*.ts'] })
  })
})
