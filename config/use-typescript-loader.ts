import type { TokenLimitConfig } from '../types/token-limit-config.js'

/**
 * Loader for TypeScript files using jiti.
 *
 * @param {string} filePath - Path to the TypeScript file to load.
 * @returns {Promise<TokenLimitConfig | undefined>} The loaded configuration or
 *   undefined if no default export.
 */
export let useTypescriptLoader = async (
  filePath: string,
): Promise<TokenLimitConfig | undefined> => {
  let jiti = (await import('jiti')).createJiti(import.meta.url, {
    interopDefault: true,
  })

  let result = await jiti.import(filePath, { default: true })

  if (Array.isArray(result)) {
    return result as TokenLimitConfig
  }

  return undefined
}
