# Task Completion Checklist

When completing a task in the token-limit project, ensure you:

## 1. Code Quality Checks

- [ ] Run `pnpm test:types` to ensure TypeScript types are correct
- [ ] Run `pnpm test:js` to check ESLint rules
- [ ] Run `pnpm test:format` to verify Prettier formatting
- [ ] Run `pnpm test:spelling` to check for spelling errors

## 2. Testing

- [ ] Write or update unit tests for new functionality
- [ ] Run `pnpm test:unit` to ensure all tests pass
- [ ] Check coverage report to ensure adequate test coverage

## 3. Build Verification

- [ ] Run `pnpm build` to ensure the project builds successfully
- [ ] Test the CLI locally with `pnpm token-limit` to verify functionality

## 4. Documentation

- [ ] Update README.md if adding new features or changing behavior
- [ ] Add JSDoc comments for new exported functions
- [ ] Update changelog.md for user-facing changes

## 5. Before Committing

- [ ] Run the full test suite: `pnpm test`
- [ ] Ensure no unused dependencies: `pnpm test:usage`
- [ ] Verify package deduplication: `pnpm test:packages`

## 6. Commit Guidelines

- Use conventional commit messages:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `test:` for test changes
  - `chore:` for maintenance tasks
  - `refactor:` for code refactoring

## 7. CI/CD Considerations

- The project uses GitHub Actions for CI
- All tests must pass before merging
- Ensure your changes don't break existing functionality
