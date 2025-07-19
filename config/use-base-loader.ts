import { pathToFileURL } from 'node:url'

import type { TokenLimitConfig } from '../types/token-limit-config'

/**
 * Loader for dynamic import of ES modules and CommonJS.
 *
 * @param {string} filePath - Path to the file to import.
 * @returns {Promise<TokenLimitConfig>} The default export from the module.
 */
export async function useBaseLoader(
  filePath: string,
): Promise<TokenLimitConfig> {
  let module = (await import(pathToFileURL(filePath).href)) as {
    default: TokenLimitConfig
  }
  return module.default
}
