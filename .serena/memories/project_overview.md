# Token Limit Project Overview

Token Limit is a Node.js/TypeScript tool that monitors how many tokens code and configuration files consume in AI tools (like GPT-4 and Claude). It helps developers set token budgets for their prompts, documentation, and configs, and get alerts when limits are exceeded.

## Purpose

- Monitor token consumption in AI context files (`.context/`, `CLAUDE.md`, `.clinerules`, `.cursorrules`, etc.)
- Set token budgets and cost limits
- Integrate with CI/CD pipelines to catch budget overruns
- Support multiple AI models from OpenAI and Anthropic

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js (>=18.0.0)
- **Package Manager**: pnpm
- **Build Tool**: Vite
- **Test Framework**: Vitest
- **Linter**: ESLint
- **Formatter**: Prettier
- **Type Checking**: TypeScript
- **Main Dependencies**:
  - `tiktoken`: For OpenAI token counting
  - `@anthropic-ai/tokenizer`: For Anthropic token counting (currently v0.0.4 - outdated)
  - `cac`: CLI framework
  - `lilconfig`: Configuration loading
  - `tinyglobby`: File globbing

## Project Structure

- `/core`: Core functionality (token counting, limit parsing, reporters)
- `/cli`: CLI implementation
- `/data`: Model configurations and pricing data
- `/config`: Configuration loading utilities
- `/test`: Unit tests
- `/bin`: Executable entry point
- `/scripts`: Build and utility scripts
- `/types`: TypeScript type definitions
