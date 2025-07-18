import { defineConfig } from '.'

export default defineConfig([
  // Monitor each individual slash command file for token size assessment
  {
    name: 'Individual SimpleClaude Commands',
    path: '.claude/commands/**/*.md',
    limit: 5000, // Assessment baseline - adjust as needed
    model: 'claude-sonnet-4',
    warnThreshold: 0.8, // Warn at 4000 tokens
    showCost: false, // Focus on tokens for size assessment
  },
  
  // Monitor total combined size (useful for `claude -p ""` context simulation)
  {
    name: 'All Commands Combined (Context Window Check)',
    path: '.claude/commands/**/*.md',
    limit: 180000, // Buffer room in 200k context window
    model: 'claude-sonnet-4',
    warnThreshold: 0.9, // Warn at 162k tokens
    showCost: false,
  },
  
  // Monitor core SimpleClaude commands separately
  {
    name: 'Core SimpleClaude Commands',
    path: '.claude/commands/sc-*.md',
    limit: 5000,
    model: 'claude-sonnet-4',
    warnThreshold: 0.8,
    showCost: false,
  },
  
  // Monitor subdirectory 1 commands
  {
    name: 'Subdirectory 1 Commands',
    path: '.claude/commands/*/sc-*.md',
    limit: 30000, // Aggregate limit for subdirectory
    model: 'claude-sonnet-4',
    warnThreshold: 0.8,
    showCost: false,
  },
  
  // Monitor subdirectory 2 commands (adjust path as needed)
  {
    name: 'Subdirectory 2 Commands',
    path: '.claude/commands/shared/*.md',
    limit: 30000, // Aggregate limit for subdirectory
    model: 'claude-sonnet-4',
    warnThreshold: 0.8,
    showCost: false,
  },
])