import { describe, expect, it } from 'vitest'

import { defineConfig } from '../../config/define-config'

describe('defineConfig', () => {
  it('should return the provided configuration object', () => {
    expect.assertions(1)

    let config = defineConfig([{ path: 'test.md', limit: '100k' }])
    expect(config).toEqual([{ path: 'test.md', limit: '100k' }])
  })

  it('should allow empty configuration', () => {
    expect.assertions(1)

    let config = defineConfig([])
    expect(config).toEqual([])
  })
})
