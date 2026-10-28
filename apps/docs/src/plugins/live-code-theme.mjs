import { createRequire } from 'node:module'

let codeTheme

// Keep dynamic Shiki blocks aligned with Starlight's resolved syntax and UI colors.
const frameSettings = {
  background: 'frames.editorBackground',
  foreground: 'codeForeground',
  'border-color': 'borderColor',
  'terminal-background': 'frames.terminalBackground',
  'header-background': 'frames.terminalTitlebarBackground',
  'header-foreground': 'frames.terminalTitlebarForeground',
  'button-foreground': 'frames.inlineButtonForeground',
  'button-background': 'frames.inlineButtonBackground',
  'button-border': 'frames.inlineButtonBorder',
  'feedback-background': 'frames.tooltipSuccessBackground',
  'feedback-foreground': 'frames.tooltipSuccessForeground',
  focus: 'focusBorder'
}
const layoutSettings = {
  font: 'codeFontFamily',
  'font-size': 'codeFontSize',
  'font-weight': 'codeFontWeight',
  'line-height': 'codeLineHeight',
  'padding-block': 'codePaddingBlock',
  'padding-inline': 'codePaddingInline',
  'border-width': 'borderWidth',
  'border-radius': 'borderRadius',
  'ui-font': 'uiFontFamily',
  'ui-font-size': 'uiFontSize',
  shadow: 'frames.frameBoxShadowCssValue'
}

export function updateCodeTheme(engine) {
  const variants = engine.styleVariants
  const light =
    variants.find(({ theme }) => theme.type === 'light') ?? variants[0]
  const dark =
    variants.find(({ theme }) => theme.type === 'dark') ?? variants[0]
  const styles = {}
  for (const [name, setting] of Object.entries(frameSettings)) {
    const lightValue = light.resolvedStyleSettings.get(setting)
    const darkValue = dark.resolvedStyleSettings.get(setting)
    styles[`--allmaps-code-${name}`] =
      lightValue === darkValue
        ? lightValue
        : `light-dark(${lightValue}, ${darkValue})`
  }
  for (const [name, setting] of Object.entries(layoutSettings)) {
    styles[`--allmaps-code-${name}`] =
      variants[0].resolvedStyleSettings.get(setting)
  }
  codeTheme = {
    styles,
    themes: variants.map(({ theme }) => ({
      name: theme.name,
      type: theme.type,
      colors: theme.colors,
      fg: theme.fg,
      bg: theme.bg,
      settings: theme.settings
    }))
  }
}

export function liveCodeTheme(root) {
  const moduleId = 'virtual:allmaps-code-theme'
  const loadThemeModule = createRequire(root)
  return {
    name: 'allmaps-code-theme',
    resolveId(id) {
      if (id === moduleId) return `\0${moduleId}`
    },
    load(id) {
      if (id !== `\0${moduleId}`) return
      // Use Node's canonical module, outside Astro's temporary config runner.
      // EC loads its config separately, with a cache-busting URL.
      const { getCodeTheme } = loadThemeModule(
        './src/plugins/live-code-theme.mjs'
      )
      return `export default ${JSON.stringify(getCodeTheme())}`
    }
  }
}

export function getCodeTheme() {
  if (!codeTheme) throw new Error('Starlight code themes have not initialized.')
  return codeTheme
}
