import type { TokenLimitConfig } from '../types/token-limit-config'

/**
 * This function is used to define the configuration for token limit checks. It
 * can be used in a config file to provide a structured way to set up checks.
 *
 * @param {TokenLimitConfig} config - The configuration object for token limit
 *   checks.
 * @returns {TokenLimitConfig} The provided configuration object.
 */
export let defineConfig = (config: TokenLimitConfig): TokenLimitConfig => config
