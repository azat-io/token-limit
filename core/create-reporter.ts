import pc from 'picocolors'

import type { TokenCheckResult } from '../types/token-check-result'
import type { ReporterConfig } from '../types/reporter-config'
import type { ModelConfig } from '../types/model-config'
import type { Reporter } from '../types/reporter'

import { formatTokens, formatCost } from './parse-limits'
import { supportedModels } from '../data'

/**
 * ANSI escape sequence to clear the current line and move cursor up. Used for
 * cleaning console output in silent mode.
 */
let consoleClear = '\u001B[1A\u001B[2K'

/**
 * Represents a row in the formatted output table. Format: [label, value,
 * optional_note].
 */
type TableRow = [string, string, string?]

/**
 * Factory function that creates the appropriate reporter based on output format
 * preference. Main entry point for creating reporters with different output
 * formats and modes.
 *
 * @example
 *   // Create JSON reporter
 *   let jsonReporter = createReporter(process, true)
 *
 *   // Create human-readable reporter
 *   let humanReporter = createReporter(process, false)
 *
 *   // Create silent human reporter (only shows failures)
 *   let silentReporter = createReporter(process, false, true)
 *
 * @param process - Node.js process object for stdout/stderr access.
 * @param isJSON - Whether to create a JSON reporter (true) or human reporter
 *   (false).
 * @param isSilentMode - Whether to operate in silent mode (only applies to
 *   human reporter).
 * @returns Reporter instance configured for the specified output format.
 */
export function createReporter(
  process: NodeJS.Process,
  isJSON: boolean,
  isSilentMode = false,
): Reporter {
  if (isJSON) {
    return createJsonReporter(process)
  }
  return createHumanReporter(process, isSilentMode)
}

/**
 * Creates a human-readable reporter that outputs formatted, colored results to
 * the console. Provides detailed feedback with status messages, tables, and
 * helpful error information.
 *
 * @example
 *   let humanReporter = createHumanReporter(process, false)
 *   humanReporter.results(config) // Outputs formatted text to stdout
 *
 *   // Silent mode example
 *   let silentReporter = createHumanReporter(process, true)
 *   silentReporter.results(config) // Only shows failures, clears if nothing to show
 *
 * @param process - Node.js process object for stdout/stderr access.
 * @param isSilentMode - Whether to operate in silent mode (only show failures).
 * @returns Reporter instance that formats output for human consumption.
 */
function createHumanReporter(
  process: NodeJS.Process,
  isSilentMode = false,
): Reporter {
  let output = ''

  function print(...lines: string[]): void {
    let value = `${lines.join('\n')}\n`
    output += value
    process.stdout.write(value)
  }

  return {
    results: (config: ReporterConfig): void => {
      print('')

      for (let check of config.checks) {
        if (!shouldShowCheck(check, config, isSilentMode)) {
          continue
        }

        if (check.missed) {
          print(
            pc.red(`Token Limit can't find files at ${check.files.join(', ')}`),
          )
          continue
        }

        if (config.checks.length > 1) {
          print(pc.bold(check.name))
          print('')
        }

        let statusMessages = formatStatusMessage(check)
        for (let message of statusMessages) {
          print(message)
        }

        let rows = buildCheckRows(check)
        let tableLines = formatTable(rows, check)
        for (let line of tableLines) {
          print(line)
        }

        print('')
      }

      if (config.failed) {
        let fix = getFixText(
          'Try to reduce token usage or increase limit',
          config,
        )
        print(pc.yellow(fix))
      }

      if (isSilentMode && !output.trim()) {
        process.stdout.write(consoleClear)
      }
    },

    error: (error: Error): void => {
      if (error.name === 'TokenLimitError') {
        let message = error.message
          .split('. ')
          .map(i =>
            i.replaceAll(/\*(?<message>[^*]+)\*/gu, (_match, content: string) =>
              pc.yellow(content),
            ),
          )
          .join('.\n        ')
        process.stderr.write(
          `${pc.bgRed(pc.black(' ERROR '))} ${pc.red(message)}\n`,
        )
      } else {
        process.stderr.write(
          `${pc.bgRed(pc.black(' ERROR '))} ${pc.red(error.stack)}\n`,
        )
      }
    },
  }
}

/**
 * Creates a JSON reporter that outputs results in machine-readable JSON format.
 * Useful for CI/CD pipelines and automated processing of token limit results.
 *
 * @example
 *   let jsonReporter = createJsonReporter(process)
 *   jsonReporter.results(config) // Outputs formatted JSON to stdout
 *
 * @param process - Node.js process object for stdout/stderr access.
 * @returns Reporter instance that formats output as JSON.
 */
function createJsonReporter(process: NodeJS.Process): Reporter {
  function print(data: unknown): void {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
  }

  return {
    results: (config: ReporterConfig): void => {
      print(
        config.checks.map(check => {
          let result: Record<string, unknown> = {
            tokenCount: check.tokenCount,
            name: check.name,
          }

          if (check.cost !== undefined) {
            result['cost'] = check.cost
          }

          if (check.passed !== undefined) {
            result['passed'] = check.passed
          }
          if (check.costPassed !== undefined) {
            result['costPassed'] = check.costPassed
          }
          if (check.tokenLimit !== undefined) {
            result['tokenLimit'] = check.tokenLimit
          }
          if (check.costLimit !== undefined) {
            result['costLimit'] = check.costLimit
          }
          if (check.model) {
            result['model'] = check.model
          }
          if (check.files.length > 0) {
            result['files'] = check.files
          }
          if (check.missed) {
            result['missed'] = check.missed
          }
          if (check.message) {
            result['message'] = check.message
          }

          return result
        }),
      )
    },

    error: (error: Error): void => {
      print({ error: error.stack ?? 'Unknown error' })
    },
  }
}

/**
 * Formats status messages for token limit checks, including success and failure
 * states. Generates colored messages indicating whether limits were exceeded or
 * met.
 *
 * @example
 *   // For exceeded limit:
 *   formatStatusMessage({
 *     passed: false,
 *     tokenCount: 1200,
 *     tokenLimit: 1000,
 *   })
 *   // Returns: [red('Token limit has exceeded by 200 tokens')]
 *
 *   // For under limit:
 *   formatStatusMessage({
 *     passed: true,
 *     tokenCount: 800,
 *     tokenLimit: 1000,
 *   })
 *   // Returns: [green('Token count is 200 tokens under limit')]
 *
 * @param check - The token check result to format messages for.
 * @returns Array of formatted status message strings.
 */
function formatStatusMessage(check: TokenCheckResult): string[] {
  let messages: string[] = []

  if (check.tokenLimit !== undefined && check.passed === false) {
    let diff = formatTokens(check.tokenCount - check.tokenLimit)
    messages.push(pc.red(`Token limit exceeded by ${diff}`))
  } else if (
    check.tokenLimit !== undefined &&
    check.tokenCount < check.tokenLimit
  ) {
    let diff = check.tokenLimit - check.tokenCount
    messages.push(pc.green(`Token count is ${formatTokens(diff)} under limit`))
  }

  messages.push('')

  if (
    check.costLimit !== undefined &&
    check.costPassed === false &&
    check.cost !== undefined
  ) {
    let diff = check.cost - check.costLimit
    messages.push(pc.red(`Cost limit has exceeded by ${formatCost(diff)}`))
  } else if (
    check.costLimit !== undefined &&
    check.cost !== undefined &&
    check.cost < check.costLimit
  ) {
    let diff = check.costLimit - check.cost
    messages.push(pc.green(`Cost is ${formatCost(diff)} under limit`))
  }

  if (check.message) {
    messages.push(check.message)
  }

  return messages
}

/**
 * Builds table rows for displaying check information in a structured format.
 * Creates rows for model, token limit, and file information.
 *
 * @example
 *   buildCheckRows({
 *     model: 'gpt-4',
 *     tokenLimit: 1000,
 *     files: ['file.ts'],
 *     // ... other properties
 *   })
 *   // Returns: [['Model', 'GPT-4'], ['Token limit', '1.0K'], ['File', 'file.ts']]
 *
 * @param check - The token check result to build rows from.
 * @returns Array of table rows with formatted information.
 */
function buildCheckRows(check: TokenCheckResult): TableRow[] {
  let rows: TableRow[] = []

  if (check.model) {
    rows.push(['Model', formatModel(check.model)])
  }

  rows.push(['Token count', formatTokens(check.tokenCount)])

  if (check.tokenLimit !== undefined) {
    rows.push(['Token limit', formatTokens(check.tokenLimit)])
  }

  if (check.cost !== undefined) {
    rows.push(['Cost', formatCost(check.cost)])
  }

  if (check.costLimit !== undefined) {
    rows.push(['Cost limit', formatCost(check.costLimit)])
  }

  if (check.files.length > 0) {
    if (check.files.length === 1) {
      rows.push(['File', formatFilePath(check.files[0]!)])
    } else {
      rows.push(['Files', `${check.files.length} files`])
    }
  }

  return rows
}

/**
 * Formats an array of table rows into aligned, colored strings for console
 * output. Applies appropriate colors based on check status and handles column
 * alignment.
 *
 * @example
 *   formatTable(
 *     [
 *       ['Model', 'GPT-4'],
 *       ['Token limit', '1.0K'],
 *     ],
 *     { passed: true },
 *   )
 *   // Returns: ['Model:     GPT-4', 'Token limit: 1.0K'] (with colors)
 *
 * @param rows - Array of table rows to format.
 * @param check - Token check result for styling context.
 * @returns Array of formatted table line strings.
 */
function formatTable(rows: TableRow[], check: TokenCheckResult): string[] {
  let max0 = Math.max(...rows.map(row => row[0].length))
  let max1 = Math.max(...rows.map(row => row[1].length))
  let unlimited = check.passed === undefined

  return rows
    .filter(([name, value]) => name && value)
    .map(([name, value]) => {
      let string_ = `${`${name}:`.padEnd(max0 + 6)} `
      let formattedValue = value.padEnd(max1)

      if (unlimited) {
        string_ += pc.bold(formattedValue)
      } else {
        if (check.passed === false || check.costPassed === false) {
          string_ += pc.red(pc.bold(formattedValue))
        } else {
          string_ += pc.green(pc.bold(formattedValue))
        }
      }

      return string_
    })
}

/**
 * Formats a model identifier into a human-readable display name.
 *
 * @example
 *   formatModel('claude-3.5-sonnet') // Returns: 'Claude 3.5 Sonnet'
 *   formatModel('unknown-model') // Returns: 'unknown-model'
 *
 * @param model - The model identifier to format.
 * @returns Human-readable model name or original identifier if not found.
 */
function formatModel(model: string): string {
  for (let provider of Object.values(supportedModels)) {
    for (let [modelKey, modelConfig] of Object.entries(provider)) {
      if (
        modelKey === model &&
        typeof modelConfig === 'object' &&
        modelConfig !== null &&
        'name' in modelConfig
      ) {
        return (modelConfig as ModelConfig).name
      }
    }
  }
  return model
}

/**
 * Generates help text with configuration file path for error messages. Adapts
 * the message format based on whether the config is in package.json or a
 * dedicated configuration file.
 *
 * @example
 *   getFixText('Try to reduce usage', { configPath: 'package.json' })
 *   // Returns: 'Try to reduce usage in "token-limit" section of package.json'
 *
 *   getFixText('Try to reduce usage', { configPath: '.token-limit.js' })
 *   // Returns: 'Try to reduce usage at .token-limit.js'
 *
 * @param prefix - The base help message.
 * @param config - Reporter configuration containing the config path.
 * @returns Formatted help text with file path information.
 */
function getFixText(prefix: string, config: ReporterConfig): string {
  let result = prefix
  if (config.configPath) {
    if (config.configPath.endsWith('package.json')) {
      result += ` in ${pc.bold('"token-limit"')} section of `
    } else {
      result += ' at '
    }
    result += pc.bold(config.configPath)
  }
  return result
}

/**
 * Determines whether a token check result should be displayed based on
 * configuration settings and silent mode.
 *
 * @example
 *   shouldShowCheck(passedCheck, { hidePassed: true }, false) // Returns: false
 *   shouldShowCheck(failedCheck, { hidePassed: true }, false) // Returns: true
 *   shouldShowCheck(passedCheck, {}, true) // Returns: false (silent mode)
 *
 * @param check - The token check result to evaluate.
 * @param config - Reporter configuration with display preferences.
 * @param isSilentMode - Whether the reporter is in silent mode.
 * @returns True if the check should be displayed, false otherwise.
 */
function shouldShowCheck(
  check: TokenCheckResult,
  config: ReporterConfig,
  isSilentMode: boolean,
): boolean {
  return !(
    (check.passed && config.hidePassed && !isSilentMode) ??
    (isSilentMode && check.passed !== false)
  )
}

/**
 * Formats a file path for display, removing the current working directory
 * prefix if present. Useful for making file paths more readable in console
 * output.
 *
 * @param filePath - The file path to format.
 * @returns Formatted file path without the current working directory prefix.
 */
function formatFilePath(filePath: string): string {
  let cwd = process.cwd()
  if (filePath.startsWith(cwd)) {
    return filePath.slice(cwd.length + 1)
  }
  return filePath
}
