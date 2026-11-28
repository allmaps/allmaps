import type { StarlightExpressiveCodeOptions } from '@astrojs/starlight/expressive-code'

export default {
  themes: ['github-dark', 'github-light'],
  useStarlightUiThemeColors: true,
  // Use the same token colors as the shared Shiki renderer.
  minSyntaxHighlightingColorContrast: 0,
  defaultProps: { wrap: true }
} satisfies StarlightExpressiveCodeOptions
