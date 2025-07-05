# Contributing

Thank you for your interest in contributing to Token Limit.

This guide will help you get started with development and explain how to contribute effectively.

## Table of Contents

- [Project Overview](#project-overview)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Adding New AI Models](#adding-new-ai-models)
- [Adding New AI Providers](#adding-new-ai-providers)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Project Overview

Token Limit is a performance budget tool for AI applications that:

- Monitors token consumption across different AI models (OpenAI GPT, Anthropic Claude, etc.)
- Integrates with CI/CD pipelines to prevent token budget overruns
- Provides accurate token counting using official tokenizers
- Helps teams manage AI API costs and context window limits

## Getting Started

### Prerequisites

- **Node.js** 18.0.0 or higher
- **pnpm** (preferred package manager)
- **Git**

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/token-limit.git
   cd token-limit
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

4. **Run tests** to ensure everything works:

   ```bash
   pnpm test
   ```

5. **Build the project**:
   ```bash
   pnpm build
   ```

## Project Structure

```
token-limit/
├── core/                 # Core functionality
│   ├── count-tokens.ts   # Main token counting logic
│   ├── run-checks.ts     # Token limit checking
│   ├── get-files-content.ts
│   └── index.ts          # Public API exports
├── data/                 # Model configurations
│   └── index.ts          # Supported models database
├── types/                # TypeScript definitions
│   ├── model-config.d.ts
│   ├── token-limit-config.d.ts
│   └── ...
├── cli/                  # Command-line interface
│   └── index.ts
├── config/               # Configuration loading
│   ├── load-config.ts
│   └── define-config.ts
├── test/                 # Test suites
│   ├── core/
│   ├── config/
│   └── fixtures/
└── bin/                  # Executable scripts
    └── token-limit.js
```

### Key Files

- **`core/count-tokens.ts`** - Main tokenization logic for different AI providers
- **`data/index.ts`** - Database of supported AI models with their configurations
- **`types/model-config.d.ts`** - TypeScript interface for model configurations
- **`cli/index.ts`** - Command-line interface implementation

## Development Workflow

### Available Scripts

```bash
# Run all tests (unit, linting, type checking)
pnpm test

# Run unit tests with coverage
pnpm test:unit

# Run type checking
pnpm test:types

# Run ESLint
pnpm test:js

# Format code with Prettier
pnpm test:format

# Build the project
pnpm build
```

### Development Loop

1. Make your changes
2. Run tests: `pnpm test`
3. Fix any linting or type errors
4. Test your changes manually with the CLI
5. Add/update tests as needed
6. Commit your changes

## Adding New AI Models

To add support for a new AI model from an existing provider:

### 1. Add Model Configuration

Edit `data/index.ts` and add your model to the appropriate provider section:

```typescript
export let supportedModels = {
  openai: {
    // ... existing models
    'gpt-4-new-model': {
      costPer1kTokens: { input: 0.01, output: 0.03 },
      encoding: 'cl100k_base',
      contextWindow: 128_000,
      name: 'GPT-4 New Model',
      provider: 'openai',
      maxOutput: 4096,
    },
  },
  // ... other providers
}
```

### 2. Required Properties

Every model must include:

- **`costPer1kTokens`** - Pricing per 1000 tokens (input/output)
- **`contextWindow`** - Maximum tokens the model can process
- **`name`** - Human-readable model name
- **`provider`** - AI provider identifier
- **`maxOutput`** - Maximum tokens the model can generate

### 3. Optional Properties

- **`encoding`** - Tokenization encoding (for OpenAI models)
- **`deprecated`** - Mark model as deprecated
- **`capabilities`** - Array of special capabilities

### 4. Finding Model Information

Research the model's specifications:

- Check the provider's official documentation
- Look for context window limits
- Find current pricing information
- Identify the tokenization method used

### 5. Testing

Add tests for your new model in `test/core/count-tokens.test.ts`:

```typescript
describe('new model tokenization', () => {
  it('should count tokens for gpt-4-new-model', () => {
    const tokens = countTokens('Hello world!', 'gpt-4-new-model')
    expect(tokens).toBeGreaterThan(0)
  })
})
```

## Adding New AI Providers

To add support for a completely new AI provider:

### 1. Add Provider to Data

Create a new section in `data/index.ts`:

```typescript
export let supportedModels = {
  // ... existing providers
  newprovider: {
    'model-name': {
      costPer1kTokens: { input: 0.001, output: 0.002 },
      contextWindow: 100_000,
      name: 'New Provider Model',
      provider: 'newprovider',
      maxOutput: 4096,
    },
  },
}
```

### 2. Create Tokenizer Function

Add a tokenization function in `core/count-tokens.ts`:

```typescript
/** Counts tokens for New Provider models. */
let countNewProviderTokens = (text: string, model: string): number => {
  try {
    // Implement provider-specific tokenization
    // This might require adding a new dependency
    return actualTokenCount
  } catch (error) {
    console.error(`Error counting tokens for ${model}:`, error)
    // Fallback to approximation
    return Math.ceil(text.length / 4)
  }
}
```

### 3. Update Main Logic

Add provider handling in the `countTokens` function:

```typescript
export let countTokens = (text: string, model: string): number => {
  let modelConfig = getModelConfig(model)

  if (modelConfig) {
    // ... existing providers

    if (modelConfig.provider === 'newprovider') {
      return countNewProviderTokens(text, model)
    }
  }

  // ... rest of function
}
```

### 4. Add Dependencies

If you need a tokenization library:

```bash
pnpm add new-provider-tokenizer
```

Update `package.json` dependencies and add appropriate type definitions.

### 5. Update Documentation

- Add the new provider to README.md
- Update the "Supported Models" section
- Add usage examples

## Code Standards

### TypeScript

- Use strict TypeScript configuration
- Provide proper type annotations
- Avoid `any` types
- Use interfaces for complex objects

### ESLint

The project uses `@azat-io/eslint-config`. Run linting with:

```bash
pnpm test:js
```

### Prettier

Code formatting is enforced with Prettier:

```bash
pnpm test:format
```

### JSDoc Comments

Document public functions with JSDoc:

```typescript
/**
 * Counts tokens in text for the specified AI model.
 *
 * @example
 *   const tokens = countTokens('Hello world!', 'gpt-4')
 *
 * @param text - The text content to analyze
 * @param model - The AI model identifier
 * @returns The number of tokens in the text
 */
export let countTokens = (text: string, model: string): number => {
  // implementation
}
```

### Commit Messages

Use conventional commit format:

```
feat: add support for GPT-4 Turbo model
fix: correct token counting for Claude models
docs: update contributing guidelines
test: add tests for new tokenizer
```

## Testing Guidelines

### Unit Tests

- Write tests for all new functions
- Use Vitest as the testing framework
- Aim for high test coverage
- Test both success and error cases

### Test Structure

```typescript
import { describe, expect, it } from 'vitest'
import { countTokens } from '../core/count-tokens'

describe('countTokens', () => {
  it('should count tokens for OpenAI models', () => {
    const result = countTokens('Hello world!', 'gpt-4')
    expect(result).toBeGreaterThan(0)
  })

  it('should handle unknown models gracefully', () => {
    const result = countTokens('Hello world!', 'unknown-model')
    expect(result).toBeGreaterThan(0)
  })
})
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:unit

# Run tests in watch mode
pnpm test:unit --watch
```

### Test Coverage

Maintain high test coverage, especially for:

- Core tokenization logic
- Configuration loading
- Error handling
- CLI functionality

## Documentation

### README Updates

When adding new features:

- Update the "Supported Models" section
- Add usage examples
- Update configuration examples

### API Documentation

- Use JSDoc for all public functions
- Include parameter descriptions
- Provide usage examples
- Document return types

### Examples

Provide practical examples for new features:

```typescript
// Example: Using the new model
const tokens = countTokens('Your text here', 'new-model-name')
console.log(`Token count: ${tokens}`)
```

## Pull Request Process

### Before Submitting

1. **Run all tests**: `pnpm test`
2. **Build successfully**: `pnpm build`
3. **Update documentation** if needed
4. **Add tests** for new functionality
5. **Follow commit message conventions**

### PR Description

Include in your PR description:

- **What**: Brief description of changes
- **Why**: Reason for the changes
- **How**: Implementation approach
- **Testing**: How you tested the changes
- **Breaking Changes**: Any breaking changes

### Example PR Template

```markdown
## What

Add support for GPT-4 Turbo model

## Why

Users requested support for the new GPT-4 Turbo model with improved performance and lower costs.

## How

- Added model configuration to `data/index.ts`
- Updated tokenization logic to handle the new encoding
- Added comprehensive tests

## Testing

- Unit tests pass
- Manual testing with sample files
- Verified token counting accuracy

## Breaking Changes

None
```

### Review Process

1. **Automated checks** must pass (CI/CD)
2. **Code review** by maintainers
3. **Testing** of new functionality
4. **Documentation review**
5. **Merge** after approval

## Release Process

The project uses automated releases:

### Versioning

- Follows semantic versioning (semver)
- Automated with `changelogen`
- Triggered by maintainers

### Changelog

- Automatically generated from commit messages
- Uses conventional commit format
- Updated on each release

### Publishing

- Automated via GitHub Actions
- Published to npm registry
- Tagged releases on GitHub

## Getting Help

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the README and this contributing guide

Thank you for contributing to Token Limit! Your contributions help make AI development more predictable and cost-effective for everyone.
