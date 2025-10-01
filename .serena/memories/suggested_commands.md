# Suggested Commands

## Development Commands

### Testing

```bash
# Run all tests
pnpm test

# Run unit tests with coverage
pnpm test:unit

# Run specific test categories
pnpm test:format    # Check code formatting
pnpm test:js        # Run ESLint
pnpm test:packages  # Check package dedupe
pnpm test:spelling  # Check spelling with cspell
pnpm test:types     # TypeScript type checking
pnpm test:usage     # Check unused dependencies with knip
```

### Building

```bash
# Build the project
pnpm build
```

### Code Quality

```bash
# Format code with Prettier
pnpm prettier --write "**/*.{js,ts,json,md,yml}"

# Lint code with ESLint
pnpm eslint .

# Type check
pnpm tsc --noEmit
```

### Running the Tool

```bash
# Run token-limit CLI
pnpm token-limit

# Run with specific files
pnpm token-limit README.md docs/guide.md

# Run with options
pnpm token-limit --limit 10k --model gpt-4 docs/**/*.md
```

### Data Updates

```bash
# Update OpenRouter pricing data
pnpm data:open-router
```

### Git Commands (Darwin/macOS)

```bash
# Check current branch
git branch --show-current

# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new feature"
git commit -m "fix: resolve issue"
git commit -m "docs: update documentation"
git commit -m "test: add tests"
git commit -m "chore: update dependencies"

# Push changes
git push origin <branch-name>

# Create and switch to new branch
git checkout -b <branch-name>
```

### System Commands (Darwin/macOS)

```bash
# List files
ls -la

# Find files
find . -name "*.ts"

# Search in files
grep -r "countTokens" .

# Watch file changes
fswatch -r .
```
