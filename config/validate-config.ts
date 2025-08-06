import type { TokenLimitConfig, TokenCheck } from '../types/token-limit-config'

import { supportedModels } from '../data'

/** The result of validating a token limit configuration. */
interface ValidationResult {
  /** List of validation errors that must be fixed. */
  errors: ValidationError[]

  /** Whether the configuration is valid (no errors). */
  isValid: boolean
}

/** Represents a validation error found in the configuration. */
interface ValidationError {
  /** The error message. */
  message: string

  /** The path to the field that has an issue. */
  path: string
}

/** All known models across all providers. */
let knownModels = Object.values(supportedModels).flatMap(provider =>
  Object.keys(provider),
)

/**
 * Validates the token limit configuration object.
 *
 * @example
 *   let config = [{ path: 'CLAUDE.md', limit: '200k' }]
 *   let result = validateConfig(config)
 *
 *   if (!result.isValid) {
 *     console.error('Configuration errors:', result.errors)
 *   }
 *
 * @param config - The configuration object to validate.
 * @returns Validation result with errors.
 */
export function validateConfig(config: TokenLimitConfig): ValidationResult {
  let errors: ValidationError[] = []

  if (!Array.isArray(config)) {
    errors.push({
      message: 'Configuration must be an array of check objects',
      path: 'root',
    })
    return { isValid: false, errors }
  }

  if (config.length === 0) {
    errors.push({
      message: 'Configuration is empty - no checks will be performed',
      path: 'root',
    })
  }

  for (let [index, check] of config.entries()) {
    let basePath = `checks[${index}]`

    validateCheck(check, basePath, errors)
  }

  let names = config.map(check => check.name).filter(Boolean) as string[]

  let duplicateNames = names.filter(
    (name, index) => names.indexOf(name) !== index,
  )
  if (duplicateNames.length > 0) {
    errors.push({
      message: `Duplicate check names found: ${duplicateNames.join(', ')}`,
      path: 'checks',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates the limit field format and value.
 *
 * @param limit - The limit value to validate.
 * @param fieldPath - The field path for error reporting.
 * @param errors - Array to collect validation errors.
 */
function validateLimit(
  limit: string | number,
  fieldPath: string,
  errors: ValidationError[],
): void {
  if (typeof limit === 'number') {
    if (limit <= 0) {
      errors.push({
        message: 'Numeric limit must be positive',
        path: fieldPath,
      })
    }
  } else if (typeof limit === 'string') {
    let numericPattern = /^\d+(?:\.\d+)?[KMkm]?$/u
    let costPattern = /^\$\d+(?:\.\d+)?$/u
    let tokenTypePattern = /^\d+(?:\.\d+)?[km]?\s+(?:input|output|total)$/iu

    let isValid =
      numericPattern.test(limit) ||
      costPattern.test(limit) ||
      tokenTypePattern.test(limit) ||
      knownModels.includes(limit)

    if (!isValid) {
      errors.push({
        message: `Invalid limit format. Supported formats:
- Numbers: "1000", "50K", "2M"
- Cost: "$0.01", "$1.50"
- Token types: "1000 input", "500 output", "2K total"
- Model names: ${knownModels.join(', ')}`,
        path: fieldPath,
      })
    }
  } else {
    errors.push({
      message: 'Limit must be a string or number',
      path: fieldPath,
    })
  }
}

/**
 * Validates the path field of a token check configuration.
 *
 * @param path - The path value to validate (string or string array).
 * @param fieldPath - The field path for error reporting.
 * @param errors - Array to collect validation errors.
 */
function validatePath(
  path: string[] | string,
  fieldPath: string,
  errors: ValidationError[],
): void {
  if (typeof path === 'string') {
    if (path.trim() === '') {
      errors.push({
        message: 'Path cannot be empty',
        path: fieldPath,
      })
    }
  } else if (Array.isArray(path)) {
    if (path.length === 0) {
      errors.push({
        message: 'Path array cannot be empty',
        path: fieldPath,
      })
    }

    for (let [index, pathElement] of path.entries()) {
      if (typeof pathElement !== 'string') {
        errors.push({
          message: 'All path elements must be strings',
          path: `${fieldPath}[${index}]`,
        })
      } else if (pathElement.trim() === '') {
        errors.push({
          message: 'Path element cannot be empty',
          path: `${fieldPath}[${index}]`,
        })
      }
    }
  } else {
    errors.push({
      message: 'Path must be a string or array of strings',
      path: fieldPath,
    })
  }
}

/**
 * Validates a single token check configuration object.
 *
 * @param check - The check object to validate.
 * @param basePath - The base path for error reporting.
 * @param errors - Array to collect validation errors.
 */
function validateCheck(
  check: TokenCheck,
  basePath: string,
  errors: ValidationError[],
): void {
  // eslint-disable-next-line typescript/no-unnecessary-condition
  if (check.path === undefined) {
    errors.push({
      message: 'Path is required for each check',
      path: `${basePath}.path`,
    })
  } else {
    validatePath(check.path, `${basePath}.path`, errors)
  }

  if (check.limit !== undefined) {
    validateLimit(check.limit as string | number, `${basePath}.limit`, errors)
  }

  if (check.model !== undefined) {
    validateModel(check.model, `${basePath}.model`, errors)
  }
}

/**
 * Validates the model field and errors on unknown models.
 *
 * @param model - The model name to validate.
 * @param fieldPath - The field path for error reporting.
 * @param errors - Array to collect validation errors.
 */
function validateModel(
  model: string,
  fieldPath: string,
  errors: ValidationError[],
): void {
  if (!knownModels.includes(model)) {
    errors.push({
      message: `Unknown model "${model}". Known models: ${knownModels.join(', ')}`,
      path: fieldPath,
    })
  }
}
