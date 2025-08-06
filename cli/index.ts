import 'node:worker_threads'
import cac from 'cac'

import type { TokenLimitConfig, TokenCheck } from '../types/token-limit-config'
import type { SupportedModelNames } from '../types/supported-model-names'

import { normalizeFilePaths } from '../core/normalize-file-paths'
import { validateConfig } from '../config/validate-config'
import { createReporter } from '../core/create-reporter'
import { loadConfig } from '../config/load-config'
import { runChecks } from '../core/run-checks'
import { version } from '../package.json'

/** Defines the command-line options for the token-limit CLI. */
interface TokenLimitOptions {
  /** Model for token calculation (gpt-4, claude-4-sonnet, etc.). */
  model?: SupportedModelNames

  /** Set token limit for files. */
  limit?: string | number

  /** Hide passed checks in output. */
  'hide-passed'?: boolean

  /** Show only failed limits. */
  silent?: boolean

  /** Path to configuration file. */
  config?: string

  /** Show internal configs for issue report. */
  debug?: boolean

  /** Output results in JSON format. */
  json?: boolean

  /** Name for the check when using files from command line. */
  name?: string
}

/** Initializes and runs the command-line interface for the Token Limit tool. */
export function run(): void {
  let cli = cac('token-limit')

  cli.version(version).help()

  cli
    .command(
      '[...files]',
      'Check the real token cost of your project files for AI tools',
    )
    .option('--config <path>', 'Path to configuration file')
    .option('--limit <limit>', 'Set token limit for files')
    .option('--model <model>', 'Model for token calculation')
    .option(
      '--name <name>',
      'Name for the check when using files from command line',
    )
    .option('--silent', 'Show only failed limits')
    .option('--json', 'Output results in JSON format')
    .option('--hide-passed', 'Hide passed checks in output')
    .option('--debug', 'Show internal configs for issue report')
    .example('token-limit')
    .example('token-limit .context/**/*.md')
    .example('token-limit --limit 1000 claude.md')
    .example('token-limit --model claude-3.5-sonnet')
    .example('token-limit --name "docs" --limit 100k docs/**/*.md')
    .example('token-limit --json --hide-passed')
    .action(async (files: string[], options: TokenLimitOptions) => {
      try {
        let config: TokenLimitConfig
        let configPath: undefined | string

        if (files.length > 0) {
          let checkConfig: TokenCheck = {
            path: normalizeFilePaths(files),
            model: 'gpt-4o',
          }

          if (options.limit !== undefined) {
            checkConfig.limit = options.limit
          }

          if (options.model) {
            checkConfig.model = options.model
          }

          if (options.name) {
            checkConfig.name = options.name
          }

          config = [checkConfig]
        } else {
          ;({ configPath, config } = await loadConfig(options.config))

          if (options.debug) {
            console.info(
              'Loaded configuration:',
              JSON.stringify(config, null, 2),
            )
          }
        }

        let validationResult = validateConfig(config)
        if (!validationResult.isValid) {
          let reporter = createReporter(process, false)
          let error = new Error('Configuration validation failed')
          error.name = 'TokenLimitError'
          error.message = validationResult.errors
            .map(error_ => `*${error_.path}*: ${error_.message}`)
            .join('. ')

          reporter.error(error)
          process.exit(1)
        }

        if (options.debug) {
          console.info('Validated config:', JSON.stringify(config, null, 2))
        }

        let results
        try {
          results = await runChecks(config, configPath)
        } catch (checkError) {
          throw new Error(
            `Failed to run token limit checks: ${checkError instanceof Error ? checkError.message : String(checkError)}`,
          )
        }

        if (options['hide-passed']) {
          results.hidePassed = true
        }

        let reporter = createReporter(
          process,
          Boolean(options.json),
          Boolean(options.silent),
        )

        reporter.results(results)

        if (results.failed) {
          process.exit(1)
        }
      } catch (error) {
        let errorValue = error as Error
        let reporter = createReporter(process, options.json ?? false)

        if (!errorValue.message) {
          errorValue.message = 'An unknown error occurred'
        }

        if (options.debug) {
          let debugError = new Error(errorValue.message)
          debugError.stack = errorValue.stack ?? 'No stack trace available'
          debugError.name = errorValue.name
          reporter.error(debugError)
        } else {
          reporter.error(errorValue)
        }

        process.exit(1)
      }
    })

  cli.parse()
}
