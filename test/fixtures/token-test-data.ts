/**
 * Test data for token counting validation
 * These test cases provide expected token counts for different text inputs
 */
export const tokenTestCases = [
  {
    text: "Hello world",
    expected: { local: 3, api: 3 },
    description: "Simple greeting"
  },
  {
    text: "The quick brown fox jumps over the lazy dog",
    expected: { local: 9, api: 9 },
    description: "Standard phrase"
  },
  {
    text: "```typescript\nconst x = 1;\n```",
    expected: { local: 8, api: 8 },
    description: "Code block"
  },
  {
    text: "🚀 Emoji test 🌟",
    expected: { local: 6, api: 6 },
    description: "Unicode and emoji handling"
  },
  {
    text: "",
    expected: { local: 0, api: 0 },
    description: "Empty string"
  },
  {
    text: "A longer text that represents typical documentation content with multiple sentences and various punctuation marks. This helps test tokenization accuracy for real-world usage patterns.",
    expected: { local: 32, api: 32 },
    description: "Long text with punctuation"
  },
  {
    text: "function calculateTokens(text: string): number {\n  return text.split(' ').length;\n}",
    expected: { local: 18, api: 18 },
    description: "TypeScript function"
  },
  {
    text: "# Heading\n\n## Subheading\n\n- List item 1\n- List item 2\n\n**Bold text** and *italic text*.",
    expected: { local: 22, api: 22 },
    description: "Markdown formatting"
  }
];

/**
 * Test cases for error scenarios
 */
export const errorTestCases = [
  {
    scenario: "API failure",
    text: "Test text for API failure",
    expectedFallback: true,
    description: "Should fallback to local tokenizer when API fails"
  },
  {
    scenario: "Rate limit exceeded",
    text: "Test text for rate limiting",
    expectedFallback: true,
    description: "Should handle rate limiting gracefully"
  },
  {
    scenario: "Invalid API key",
    text: "Test text with invalid key",
    expectedFallback: true,
    description: "Should fallback when API key is invalid"
  }
];

/**
 * Test cases for different Claude models
 */
export const modelTestCases = [
  {
    model: "claude-sonnet-4",
    text: "Hello Claude Sonnet 4",
    description: "Claude Sonnet 4 model"
  },
  {
    model: "claude-3.5-sonnet",
    text: "Hello Claude 3.5 Sonnet", 
    description: "Claude 3.5 Sonnet model"
  },
  {
    model: "claude-3.5-haiku",
    text: "Hello Claude 3.5 Haiku",
    description: "Claude 3.5 Haiku model"
  },
  {
    model: "claude-opus-4",
    text: "Hello Claude Opus 4",
    description: "Claude Opus 4 model"
  }
];

/**
 * Performance test data
 */
export const performanceTestCases = [
  {
    text: "Short",
    size: "small",
    description: "Short text performance"
  },
  {
    text: "Medium length text that represents typical usage patterns ".repeat(10),
    size: "medium", 
    description: "Medium text performance"
  },
  {
    text: "Long text content that tests performance with larger inputs ".repeat(100),
    size: "large",
    description: "Large text performance"
  }
];