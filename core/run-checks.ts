import type { TokenCheckResult } from '../types/token-check-result'
import type { TokenLimitConfig } from '../types/token-limit-config'
import type { ReporterConfig } from '../types/reporter-config'

import { calculateCost, parseLimit } from './parse-limits'
import { getFilesContent } from './get-files-content'
import { countTokens } from './count-tokens'

/**
 * Runs token limit checks for the given configuration.
 *
 * @param {TokenLimitConfig} config - Array of token checks to run
 * @param {string} [configPath] - Optional path to config file for error
 *   reporting
 * @returns {Promise<ReporterConfig>} Promise resolving to reporter
 *   configuration with results
 */
export let runChecks = async (
  config: TokenLimitConfig,
  configPath?: string,
): Promise<ReporterConfig> => {
  let checks: TokenCheckResult[] = []
  let failed = false

  let checkPromises = config.map(async check => {
    try {
      let fileContents = await getFilesContent(check.path)
      let files = fileContents.map(file => file.filePath)

      if (files.length === 0) {
        return {
          files: Array.isArray(check.path) ? check.path : [check.path],
          name: check.name ?? 'Unknown',
          model: check.model ?? 'gpt-4',
          tokenCount: 0,
          missed: true,
          cost: 0,
        }
      }

      let allContent = fileContents.map(file => file.content).join('\n')
      let tokenCount = await countTokens(allContent, check.model ?? 'gpt-4')
      let modelName = check.model ?? 'gpt-4'

      let result: TokenCheckResult = {
        name: check.name ?? files.join(', '),
        model: modelName,
        tokenCount,
        cost: 0,
        files,
      }

      if (check.limit === undefined) {
        result.cost = calculateCost(tokenCount, modelName)
      } else {
        let parsedLimit = parseLimit(check.limit)

        result.cost = calculateCost(tokenCount, modelName)

        if (parsedLimit.tokens !== undefined) {
          result.tokenLimit = parsedLimit.tokens
          result.passed = tokenCount <= parsedLimit.tokens
        }

        if (parsedLimit.cost !== undefined) {
          result.costLimit = parsedLimit.cost
          result.costPassed = result.cost <= parsedLimit.cost
        }
      }

      return result
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : 'Unknown error',
        files: Array.isArray(check.path) ? check.path : [check.path],
        name: check.name ?? 'Unknown',
        model: check.model ?? 'gpt-4',
        tokenCount: 0,
        missed: true,
        cost: 0,
      }
    }
  })

  let results = await Promise.allSettled(checkPromises)

  for (let result of results) {
    if (result.status === 'fulfilled') {
      let checkResult = result.value
      checks.push(checkResult)

      if (
        checkResult.missed ||
        (checkResult.passed !== undefined && !checkResult.passed) ||
        (checkResult.costPassed !== undefined && !checkResult.costPassed)
      ) {
        failed = true
      }
    } else {
      checks.push({
        message: 'Promise rejected unexpectedly',
        name: 'Unknown',
        model: 'gpt-4',
        tokenCount: 0,
        missed: true,
        files: [],
        cost: 0,
      })
      failed = true
    }
  }

  return {
    checks,
    failed,
    ...(configPath && { configPath }),
  }
}
