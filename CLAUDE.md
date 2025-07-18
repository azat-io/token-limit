# Token-Limit Configuration & Usage Guide

## Overview
Token-limit is a CLI tool that monitors how many tokens your AI context files consume. It helps you set token budgets for prompts, documentation, and configs, then alerts you when limits are exceeded to prevent unexpected API costs and context window overruns.

## Quick Start

### Installation
```bash
npm install --save-dev token-limit
```

### Basic Usage
```bash
# Check specific files
npx token-limit README.md docs/**/*.md

# Set limits and models
npx token-limit --limit 10k --model gpt-4o docs/**/*.md

# Cost-based limits
npx token-limit --limit '$0.25' --model claude-sonnet-4 prompts/**/*.txt
```

## Configuration

### Configuration File Formats
Choose from multiple formats:
- `token-limit.config.{ts,js,mjs,cjs}`
- `.token-limit.{ts,js,mjs,cjs,json}`
- `.token-limit`
- `package.json` (under `token-limit` field)

### Example Configuration
```typescript
// token-limit.config.ts
import { defineConfig } from 'token-limit'

export default defineConfig([
  {
    name: 'AI Context Files',
    path: '.context/**/*.md',
    limit: '100k',
    model: 'gpt-4o',
    warnThreshold: 0.8,
  },
  {
    name: 'Documentation',
    path: ['docs/**/*.md', 'README.md'],
    limit: '$0.05',
    model: 'claude-sonnet-4',
    showCost: true,
  },
  {
    name: 'Prompts',
    path: ['prompts/**/*.txt', '!prompts/archived/**'],
    limit: { tokens: 50000, cost: 0.10 },
    model: 'gpt-4o',
  },
])
```

## Configuration Options

### Required Fields

#### `path` (string | string[])
Files to analyze using glob patterns:
- Single path: `"docs/README.md"`
- Multiple paths: `["docs/**/*.md", "prompts/*.txt"]`
- With exclusions: `["**/*.md", "!internal/**"]`

#### `limit` (string | number | object)
Token or cost limits:
- **Token limits**: `1000`, `"5k"`, `"1.5M"`
- **Cost limits**: `"$0.05"`, `"5c"`, `"10 cents"`, `0.01`
- **Model context**: `"claude-sonnet-4"` (uses model's context window)
- **Combined**: `{ tokens: 1000, cost: 0.01 }`

### Optional Fields

#### `model` (string, default: 'gpt-4o')
AI model for accurate tokenization:
- **OpenAI**: `gpt-4.1`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`, `o1`, `o1-mini`, `o3-mini`
- **Anthropic**: `claude-opus-4`, `claude-sonnet-4`, `claude-3.5-sonnet`, `claude-3.5-haiku`, `claude-3-opus`

#### `name` (string)
Descriptive name for the check (auto-generated from paths if not provided)

#### `warnThreshold` (number, default: 0.8)
Warning threshold as percentage (0-1). Shows warning at 80% of limit by default.

#### `showCost` (boolean, default: false)
Always show cost information even when using token limits

## Supported Models & Pricing

### OpenAI Models
- `gpt-4.1`: $0.03 input / $0.12 output per 1K tokens (1M context)
- `gpt-4o`: $0.005 input / $0.015 output per 1K tokens (128K context)
- `gpt-4-turbo`: $0.01 input / $0.03 output per 1K tokens (128K context)
- `gpt-3.5-turbo`: $0.0005 input / $0.0015 output per 1K tokens (16K context)
- `o1`: $0.015 input / $0.06 output per 1K tokens (200K context)
- `o3-mini`: $0.004 input / $0.016 output per 1K tokens (200K context)

### Anthropic Models
- `claude-opus-4`: $0.02 input / $0.1 output per 1K tokens (500K context)
- `claude-sonnet-4`: $0.004 input / $0.02 output per 1K tokens (500K context)
- `claude-3.5-sonnet`: $0.003 input / $0.015 output per 1K tokens (200K context)
- `claude-3.5-haiku`: $0.0008 input / $0.004 output per 1K tokens (200K context)

## Common Use Cases

### AI Context Files
```typescript
{
  name: 'AI Context',
  path: ['.context/**/*.md', 'CLAUDE.md', '.cursorrules'],
  limit: '200k', // Stay under Claude's context window
  model: 'claude-sonnet-4',
}
```

### Documentation Budget
```typescript
{
  name: 'Documentation',
  path: 'docs/**/*.md',
  limit: '$0.10', // Budget constraint
  model: 'gpt-4o',
  warnThreshold: 0.7, // Early warning
}
```

### Multi-Model Setup
```typescript
[
  {
    name: 'Claude Context',
    path: '.context/claude/**/*.md',
    limit: 'claude-sonnet-4', // Use model's context window
    model: 'claude-sonnet-4',
  },
  {
    name: 'OpenAI Context',
    path: '.context/openai/**/*.md',
    limit: 'gpt-4o', // Use model's context window
    model: 'gpt-4o',
  },
]
```

## CLI Commands

### Basic Commands
```bash
# Use configuration file
npx token-limit

# Check specific files
npx token-limit README.md docs/**/*.md

# Set limits and models
npx token-limit --limit 10k --model gpt-4o docs/**/*.md

# Cost-based limits
npx token-limit --limit '$0.25' --model claude-sonnet-4 prompts/**/*.txt
```

### Advanced Options
```bash
# Hide passed checks
npx token-limit --hide-passed

# JSON output
npx token-limit --json

# Silent mode (only failures)
npx token-limit --silent

# Debug mode
npx token-limit --debug

# Named check
npx token-limit --name "API Docs" --limit 50k api/**/*.md
```

## CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/token-limit.yml
name: Token Limit Check
on: [push, pull_request]

jobs:
  token-limit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx token-limit
```

### Package.json Script
```json
{
  "scripts": {
    "token-limit": "token-limit",
    "token-limit:check": "token-limit --hide-passed",
    "token-limit:debug": "token-limit --debug"
  }
}
```

## Best Practices

### 1. **Start with Conservative Limits**
Begin with lower limits and adjust based on actual usage:
```typescript
{
  limit: '50k', // Start conservative
  warnThreshold: 0.7, // Early warning
}
```

### 2. **Separate Checks by Purpose**
Different file types may need different limits:
```typescript
[
  { name: 'Core Context', path: '.context/core/**/*.md', limit: '100k' },
  { name: 'Examples', path: '.context/examples/**/*.md', limit: '50k' },
  { name: 'Prompts', path: 'prompts/**/*.txt', limit: '$0.05' },
]
```

### 3. **Use Model-Specific Limits**
Match limits to your actual models:
```typescript
{
  model: 'claude-sonnet-4',
  limit: 'claude-sonnet-4', // Uses model's 500K context window
}
```

### 4. **Monitor Costs and Tokens**
Use combined limits for comprehensive monitoring:
```typescript
{
  limit: { tokens: 100000, cost: 0.20 },
  showCost: true,
}
```

### 5. **Exclude Unnecessary Files**
Use exclusion patterns to focus on relevant files:
```typescript
{
  path: ['**/*.md', '!node_modules/**', '!.git/**', '!dist/**'],
}
```

## Troubleshooting

### Configuration Not Found
Ensure config file is in project root and properly named:
- `token-limit.config.ts` (recommended)
- `.token-limit.json`
- `package.json` with `token-limit` field

### Unknown Model Error
Check model name against supported models list. Use exact names:
- ✅ `claude-sonnet-4`
- ❌ `claude-4-sonnet`

### Files Not Found
Verify glob patterns and file paths:
```bash
# Test glob patterns
npx token-limit --debug .context/**/*.md
```

### Large File Warnings
Files over 10MB are skipped. Break large files into smaller chunks or exclude them:
```typescript
{
  path: ['docs/**/*.md', '!docs/large-file.md'],
}
```

## Development Commands

### Build & Test
```bash
npm run build     # Build the project
npm run test      # Run tests
npm run typecheck # TypeScript checking
npm run lint      # ESLint and formatting
```

### Local Development
```bash
# Use local build
./bin/token-limit.js

# Debug mode
./bin/token-limit.js --debug
```

This guide provides everything needed to configure and use token-limit effectively for AI context management and cost control.