import type { supportedModels } from '../data'

/* Represents the names of all supported models across different providers. */
type SupportedModelNames = {
  [K in keyof typeof supportedModels]: keyof (typeof supportedModels)[K]
}[keyof typeof supportedModels]
