import { isAbsolute, relative, dirname, resolve, join } from 'node:path'
import { lilconfig } from 'lilconfig'

import type { TokenLimitConfig } from '../types/token-limit-config'

import { useTypescriptLoader } from './use-typescript-loader'
import { useBaseLoader } from './use-base-loader'

/** The result of loading a token limit configuration. */
interface ConfigResult {
  /** The loaded and processed configuration. */
  config: TokenLimitConfig

  /** Directory containing the configuration file. */
  configDirectory: string

  /** Relative path to the configuration file that was loaded. */
  configPath: string
}

/** Configuration options for lilconfig. */
let configOptions = {
  searchPlaces: [
    'package.json',
    '.token-limit.json',
    '.token-limit',
    '.token-limit.js',
    '.token-limit.mjs',
    '.token-limit.cjs',
    '.token-limit.ts',
    '.token-limit.mts',
    '.token-limit.cts',
    'token-limit.config.js',
    'token-limit.config.ts',
    'token-limit.config.mjs',
    'token-limit.config.cjs',
  ],
  loaders: {
    '.cts': useTypescriptLoader,
    '.mts': useTypescriptLoader,
    '.ts': useTypescriptLoader,
    '.cjs': useBaseLoader,
    '.mjs': useBaseLoader,
    '.js': useBaseLoader,
  },
}

/**
 * Processes the configuration by resolving paths relative to config directory.
 *
 * @param {TokenLimitConfig} config - The raw configuration array.
 * @param {string} configDirectory - Directory containing the configuration
 *   file.
 * @returns {TokenLimitConfig} Processed configuration with resolved paths.
 */
let processConfig = (
  config: TokenLimitConfig,
  configDirectory: string,
): TokenLimitConfig =>
  config.map(check => {
    let processed = { ...check }

    if (typeof check.path === 'string') {
      processed.path = isAbsolute(check.path)
        ? check.path
        : join(configDirectory, check.path)
    } else if (Array.isArray(check.path)) {
      processed.path = check.path.map(path =>
        isAbsolute(path) ? path : join(configDirectory, path),
      )
    }

    if (!processed.name && processed.path) {
      let paths = Array.isArray(processed.path)
        ? processed.path
        : [processed.path]
      processed.name = paths
        .map(path => relative(configDirectory, path))
        .join(', ')
    }

    return processed
  })

/**
 * Loads the token limit configuration from various sources.
 *
 * Searches for configuration in standard places or loads from a specific path.
 * Supports TypeScript, JavaScript, JSON, and package.json configurations.
 *
 * @example
 *   // Search for config automatically
 *   let { config, configPath } = await loadConfig()
 *
 *   // Load specific config file
 *   let { config } = await loadConfig('./my-config.ts')
 *
 * @param {string | undefined} configPath - Optional path to a specific
 *   configuration file.
 * @param {string} searchFrom - Directory to search from (defaults to
 *   process.cwd()).
 * @returns {Promise<ConfigResult>} Promise resolving to the loaded
 *   configuration with metadata.
 * @throws Error if configuration is not found.
 */
export let loadConfig = async (
  configPath?: string,
  searchFrom: string = process.cwd(),
): Promise<ConfigResult> => {
  let explorer = lilconfig('token-limit', configOptions)

  let result

  if (configPath?.trim()) {
    let absoluteConfigPath = isAbsolute(configPath.trim())
      ? configPath.trim()
      : resolve(searchFrom, configPath.trim())

    result = await explorer.load(absoluteConfigPath)
  } else {
    result = await explorer.search(searchFrom)
  }

  if (!result) {
    throw new Error('Token limit configuration not found')
  }

  let config = result.config as TokenLimitConfig

  let configDirectory = dirname(result.filepath)
  let processedConfig = processConfig(config, configDirectory)

  return {
    configPath: relative(searchFrom, result.filepath),
    config: processedConfig,
    configDirectory,
  }
}
