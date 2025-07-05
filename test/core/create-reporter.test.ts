import type { Writable } from 'node:stream'

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import type { TokenCheckResult } from '../../types/token-check-result'
import type { ReporterConfig } from '../../types/reporter-config'

import { createReporter } from '../../core/create-reporter'

vi.mock('picocolors', () => ({
  default: {
    bgRed: (function_: (text: string) => string) => function_,
    yellow: (text: string) => text,
    black: (text: string) => text,
    green: (text: string) => text,
    bold: (text: string) => text,
    red: (text: string) => text,
  },
}))

let createMockProcess = (): {
  getStdout(): string
  getStderr(): string
  clearOutput(): void
} & NodeJS.Process => {
  let stdout = ''
  let stderr = ''

  return {
    stdout: {
      write: vi.fn((data: string) => {
        stdout += data
        return true
      }),
    } as unknown as Writable,
    stderr: {
      write: vi.fn((data: string) => {
        stderr += data
        return true
      }),
    } as unknown as Writable,
    clearOutput: () => {
      stdout = ''
      stderr = ''
    },
    getStdout: () => stdout,
    getStderr: () => stderr,
  } as {
    getStdout(): string
    getStderr(): string
    clearOutput(): void
  } & NodeJS.Process
}

let createTestCheck = (
  overrides: Partial<TokenCheckResult> = {},
): TokenCheckResult => ({
  name: 'Test Check',
  files: ['test.ts'],
  tokenLimit: 1000,
  tokenCount: 500,
  model: 'gpt-4',
  passed: true,
  cost: 0,
  ...overrides,
})

let createTestConfig = (
  overrides: Partial<ReporterConfig> = {},
): ReporterConfig => ({
  checks: [createTestCheck()],
  failed: false,
  ...overrides,
})

describe('createReporter', () => {
  let mockProcess: ReturnType<typeof createMockProcess>

  beforeEach(() => {
    mockProcess = createMockProcess()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('factory function', () => {
    it('should create JSON reporter when isJSON is true', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, true)

      expect(reporter).toBeDefined()
    })

    it('should create human reporter when isJSON is false', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)

      expect(reporter).toBeDefined()
    })

    it('should pass silent mode to human reporter', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false, true)

      expect(reporter).toBeDefined()
    })
  })

  describe('jSON reporter', () => {
    it('should output results as formatted JSON', () => {
      expect.assertions(2)

      let reporter = createReporter(mockProcess, true)
      let config = createTestConfig({
        checks: [
          createTestCheck({ name: 'Check 1', passed: true }),
          createTestCheck({ tokenCount: 1500, name: 'Check 2', passed: false }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).toContain('"name": "Check 1"')
      expect(output).toContain('"passed": false')
    })

    it('should include all relevant check properties in JSON', () => {
      expect.assertions(5)

      let reporter = createReporter(mockProcess, true)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            files: ['file1.ts', 'file2.ts'],
            model: 'claude-3.5-sonnet',
            name: 'Full Check',
            tokenLimit: 1000,
            passed: false,
          }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      let parsed = JSON.parse(output) as TokenCheckResult[]

      expect(parsed[0]?.name).toBe('Full Check')
      expect(parsed[0]?.passed).toBeFalsy()
      expect(parsed[0]?.tokenLimit).toBe(1000)
      expect(parsed[0]?.model).toBe('claude-3.5-sonnet')
      expect(parsed[0]?.files).toEqual(['file1.ts', 'file2.ts'])
    })

    it('should output error with stack trace', () => {
      expect.assertions(2)

      let reporter = createReporter(mockProcess, true)
      let error = new Error('Test error')
      error.stack = 'Error: Test error\n    at test.js:1:1'

      reporter.error(error)

      let output = mockProcess.getStdout()
      expect(output).toContain('"error"')
      expect(output).toContain('Error: Test error')
    })

    it('should exclude undefined properties from JSON output', () => {
      expect.assertions(3)

      let reporter = createReporter(mockProcess, true)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            tokenLimit: undefined,
            passed: undefined,
            model: '',
            files: [],
          } as unknown as TokenCheckResult),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).not.toContain('"passed"')
      expect(output).not.toContain('"tokenLimit"')
      expect(output).not.toContain('"files"')
    })
  })

  describe('human reporter', () => {
    describe('basic functionality', () => {
      it('should display check results in human readable format', () => {
        expect.assertions(3)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig()

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('Model:')
        expect(output).toContain('GPT-4')
        expect(output).toContain('Token limit:')
      })

      it('should show check name when multiple checks exist', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [
            createTestCheck({ name: 'First Check' }),
            createTestCheck({ name: 'Second Check' }),
          ],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('First Check')
        expect(output).toContain('Second Check')
      })

      it('should not show check name for single check', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [createTestCheck({ name: 'Single Check' })],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).not.toContain('Single Check')
      })
    })

    describe('status messages', () => {
      it('should show success message when under limit', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [
            createTestCheck({
              tokenLimit: 1000,
              tokenCount: 800,
              passed: true,
            }),
          ],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('200 under limit')
      })

      it('should show error message when limit exceeded', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [
            createTestCheck({
              tokenCount: 1200,
              tokenLimit: 1000,
              passed: false,
            }),
          ],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('exceeded by 200')
      })

      it('should include custom message when provided', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [
            createTestCheck({
              message: 'Custom error message',
              tokenCount: 1200,
              tokenLimit: 1000,
              passed: false,
            }),
          ],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('Custom error message')
      })
    })

    describe('model formatting', () => {
      it('should format known model names', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [createTestCheck({ model: 'claude-3.5-sonnet' })],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('Claude 3.5 Sonnet')
      })

      it('should display unknown model names as-is', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [createTestCheck({ model: 'custom-model' })],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('custom-model')
      })

      it('should format all supported models correctly', () => {
        expect.assertions(3)

        let reporter = createReporter(mockProcess, false)
        let testModels = [
          { expected: 'GPT-4', input: 'gpt-4' },
          { expected: 'Claude 3 Opus', input: 'claude-3-opus' },
          { expected: 'GPT-3.5 Turbo', input: 'gpt-3.5-turbo' },
        ]

        for (let { expected, input } of testModels) {
          mockProcess.clearOutput()
          let config = createTestConfig({
            checks: [createTestCheck({ model: input })],
          })

          reporter.results(config)

          let output = mockProcess.getStdout()
          expect(output).toContain(expected)
        }
      })
    })

    describe('token count formatting', () => {
      it('should format token counts with K suffix', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [createTestCheck({ tokenLimit: 15000 })],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('15.0k')
      })

      it('should format token counts with M suffix', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [createTestCheck({ tokenLimit: 2500000 })],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('2.5M')
      })

      it('should display small numbers without suffix', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [createTestCheck({ tokenLimit: 500 })],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('500')
      })
    })

    describe('file display', () => {
      it('should show single file name', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [createTestCheck({ files: ['single-file.ts'] })],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('File:')
        expect(output).toContain('single-file.ts')
      })

      it('should show file count for multiple files', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [
            createTestCheck({ files: ['file1.ts', 'file2.ts', 'file3.ts'] }),
          ],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('Files:')
        expect(output).toContain('3 files')
      })

      it('should display absolute file paths as-is when not in current directory', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [createTestCheck({ files: ['/absolute/path/to/file.ts'] })],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('File:')
        expect(output).toContain('/absolute/path/to/file.ts')
      })

      it('should format file paths relative to current working directory', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false)
        let cwd = process.cwd()
        let config = createTestConfig({
          checks: [createTestCheck({ files: [`${cwd}/src/test-file.ts`] })],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('File:')
        expect(output).toContain('src/test-file.ts')
      })
    })

    describe('missed files handling', () => {
      it('should display error message for missed files', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [
            createTestCheck({
              files: ['missing-file.ts'],
              missed: true,
            }),
          ],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain("can't find files at missing-file.ts")
      })

      it('should not show table for missed files', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [
            createTestCheck({
              files: ['missing-file.ts'],
              model: 'gpt-4',
              missed: true,
            }),
          ],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).not.toContain('Model:')
        expect(output).not.toContain('Token limit:')
      })
    })

    describe('visibility control', () => {
      it('should hide passed checks when hidePassed is true', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [
            createTestCheck({ name: 'Passed Check', passed: true }),
            createTestCheck({ name: 'Failed Check', passed: false }),
          ],
          hidePassed: true,
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).not.toContain('Passed Check')
      })

      it('should show all checks when hidePassed is false', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          checks: [
            createTestCheck({ name: 'Passed Check', passed: true }),
            createTestCheck({ name: 'Failed Check', passed: false }),
          ],
          hidePassed: false,
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('Passed Check')
        expect(output).toContain('Failed Check')
      })

      it('should handle nullish coalescing in shouldShowCheck logic', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false, true)
        let config = createTestConfig({
          checks: [
            createTestCheck({
              name: 'Test Check',
              passed: undefined, // This makes first condition undefined
            } as unknown as TokenCheckResult),
          ],
          hidePassed: false,
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        // In silent mode with passed=undefined, check should be hidden
        // Because (isSilentMode && check.passed !== false) is true
        expect(output).toContain('\u001B[1A\u001B[2K')
      })
    })

    describe('silent mode', () => {
      it('should only show failed checks in silent mode', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false, true)
        let config = createTestConfig({
          checks: [
            createTestCheck({ name: 'Passed Check', passed: true }),
            createTestCheck({ name: 'Failed Check', passed: false }),
          ],
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).not.toContain('Passed Check')
        expect(output).toContain('Failed Check')
      })

      it('should clear output when nothing to show in silent mode', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false, true)
        let config = createTestConfig({
          checks: [createTestCheck({ passed: true })],
        })

        reporter.results(config)

        expect(mockProcess.stdout.write).toHaveBeenCalledWith(
          '\u001B[1A\u001B[2K',
        )
      })
    })

    describe('fix suggestions', () => {
      it('should show fix suggestion when checks failed', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          configPath: '.token-limit.js',
          failed: true,
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain(
          'Try to reduce token usage or increase limit at .token-limit.js',
        )
      })

      it('should adapt message for package.json config', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({
          configPath: 'package.json',
          failed: true,
        })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).toContain('in "token-limit" section of package.json')
      })

      it('should not show fix suggestion when no failures', () => {
        expect.assertions(1)

        let reporter = createReporter(mockProcess, false)
        let config = createTestConfig({ failed: false })

        reporter.results(config)

        let output = mockProcess.getStdout()
        expect(output).not.toContain('Try to reduce token usage')
      })
    })

    describe('error handling', () => {
      it('should format TokenLimitError specially', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false)
        let error = new Error('Token limit exceeded for *file.ts*')
        error.name = 'TokenLimitError'

        reporter.error(error)

        let output = mockProcess.getStderr()
        expect(output).toContain('ERROR')
        expect(output).toContain('Token limit exceeded for')
      })

      it('should format generic errors with stack trace', () => {
        expect.assertions(2)

        let reporter = createReporter(mockProcess, false)
        let error = new Error('Generic error')
        error.stack = 'Error: Generic error\n    at test.js:1:1'

        reporter.error(error)

        let output = mockProcess.getStderr()
        expect(output).toContain('ERROR')
        expect(output).toContain('Error: Generic error')
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty checks array', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({ checks: [] })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output.trim()).toBe('')
    })

    it('should handle cost limit exceeded', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            costPassed: false,
            costLimit: 0.05,
            passed: true,
            cost: 0.1,
          }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).toContain('Cost limit has exceeded by $0.050')
    })

    it('should handle cost under limit', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            costPassed: true,
            costLimit: 0.05,
            passed: true,
            cost: 0.03,
          }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).toContain('Cost is $0.020 under limit')
    })

    it('should include cost and cost limit in table rows', () => {
      expect.assertions(2)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            costLimit: 0.1,
            cost: 0.05,
          }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).toContain('Cost:')
      expect(output).toContain('Cost limit:')
    })

    it('should handle check with unlimited tokens (passed undefined)', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            tokenLimit: undefined,
            passed: undefined,
          } as unknown as TokenCheckResult),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).toContain('Token count:')
    })

    it('should include missed property in JSON output', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, true)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            missed: true,
          }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      let parsed = JSON.parse(output) as TokenCheckResult[]
      expect(parsed[0]?.missed).toBeTruthy()
    })

    it('should include message property in JSON output', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, true)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            message: 'Custom test message',
          }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      let parsed = JSON.parse(output) as TokenCheckResult[]
      expect(parsed[0]?.message).toBe('Custom test message')
    })

    it('should include cost properties in JSON output', () => {
      expect.assertions(2)

      let reporter = createReporter(mockProcess, true)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            costPassed: true,
            costLimit: 0.1,
            cost: 0.05,
          }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      let parsed = JSON.parse(output) as TokenCheckResult[]
      expect(parsed[0]?.cost).toBe(0.05)
      expect(parsed[0]?.costPassed).toBeTruthy()
    })

    it('should handle fix text without config path', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        failed: true,
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).toContain('Try to reduce token usage or increase limit')
    })

    it('should handle check without token limit', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            tokenLimit: undefined,
            passed: undefined,
          } as unknown as TokenCheckResult),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).not.toContain('Token limit:')
    })

    it('should handle check without files', () => {
      expect.assertions(2)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [createTestCheck({ files: [] })],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).not.toContain('File:')
      expect(output).not.toContain('Files:')
    })

    it('should handle very large token counts', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [createTestCheck({ tokenLimit: 999999999 })],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).toContain('1000.0M')
    })

    it('should handle undefined error stack', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, true)
      let error = new Error('Error without stack')
      // @ts-ignore
      error.stack = undefined

      reporter.error(error)

      let output = mockProcess.getStdout()
      expect(output).toContain('"error": "Unknown error"')
    })

    it('should show token count under limit message', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            tokenLimit: 1000,
            tokenCount: 800,
            passed: true,
          }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).toContain('Token count is 200 under limit')
    })

    it('should handle generic error in human reporter', () => {
      expect.assertions(2)

      let reporter = createReporter(mockProcess, false)
      let error = new Error('Generic error')
      error.stack = 'Error: Generic error\n    at test.js:1:1'

      reporter.error(error)

      let output = mockProcess.getStderr()
      expect(output).toContain('ERROR')
      expect(output).toContain('Error: Generic error')
    })
  })

  describe('token count formatting edge cases', () => {
    it('should show exact token difference when formatted values are identical', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            tokenLimit: 1000,
            tokenCount: 1050,
            passed: false,
          }),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).toContain('exceeded by 50')
    })
  })

  describe('table formatting edge cases', () => {
    it('should handle empty table rows gracefully', () => {
      expect.assertions(1)

      let reporter = createReporter(mockProcess, false)
      let config = createTestConfig({
        checks: [
          createTestCheck({
            tokenLimit: undefined,
            model: '',
            files: [],
          } as unknown as TokenCheckResult),
        ],
      })

      reporter.results(config)

      let output = mockProcess.getStdout()
      expect(output).not.toContain('Model:')
    })
  })
})
