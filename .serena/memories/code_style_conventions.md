# Code Style and Conventions

## TypeScript Conventions

- Use `type` imports for type-only imports
- Use `let` instead of `const` for variables
- Use single quotes for strings
- Use semicolons
- Use trailing commas in multi-line arrays/objects
- Use explicit return types for functions

## File Naming

- Use kebab-case for file names (e.g., `count-tokens.ts`)
- Test files end with `.test.ts`
- Configuration files use `.config.ts` pattern

## Documentation

- Use JSDoc comments for exported functions
- Include @example sections in JSDoc
- Document parameters with @param
- Document return values with @returns
- Include @see references for external documentation

## Code Organization

- Each module has a single responsibility
- Export main functions explicitly
- Use `satisfies` for const assertions with TypeScript
- Prefer functional programming patterns

## Error Handling

- Use try-catch blocks for external library calls
- Provide fallback behavior when tokenization fails
- Log warnings for unknown models
- Clean up resources in finally blocks (e.g., tiktoken encoder)

## Testing

- Tests are colocated in `/test` directory
- Use Vitest for unit testing
- Mock external dependencies
- Aim for high code coverage
