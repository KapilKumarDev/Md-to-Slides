const features = ['editor', 'preview', 'present', 'export', 'decks']

const featurePatterns = (names) =>
  names.flatMap((name) => [`@/features/${name}`, `@/features/${name}/*`])

const rule = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] })

const marp = { group: ['@marp-team/*'], message: 'Only src/core/engine may import Marp.' }
const noApp = { group: ['@/app', '@/app/*'], message: 'Only src/app composes features.' }
const noShared = {
  group: ['@/shared', '@/shared/*'],
  message: 'core must not depend on shared UI.',
}
const noFeatures = (message) => ({ group: featurePatterns(features), message })

export const boundaries = [
  ...features.map((name) => ({
    files: [`src/features/${name}/**/*.{ts,tsx}`],
    rules: rule(
      {
        group: featurePatterns(features.filter((other) => other !== name)),
        message: 'Features must not import other features. Share state through @/core/deck.',
      },
      noApp,
      marp,
    ),
  })),
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: rule(
      { group: ['@/features/*/*'], message: 'Import features only through their index.ts.' },
      marp,
    ),
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: rule(noFeatures('shared must not import features.'), noApp, marp),
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: rule(noFeatures('core must not import features.'), noApp, noShared, marp),
  },
  {
    // Declared after the core block so it wins for these files: engine may import Marp.
    files: ['src/core/engine/**/*.{ts,tsx}'],
    rules: rule(noFeatures('core must not import features.'), noApp, noShared),
  },
]
