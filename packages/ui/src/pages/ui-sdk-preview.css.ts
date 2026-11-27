import { black, white } from '@allmaps/tailwind'
import { backgrounds } from '../starlight/components/playground-backgrounds'
import starlightLayers from '../../../../apps/docs/src/css/layers.css?raw'
import sdkStyles from '@ui-sdk/core/web.css?raw'

export function GET() {
  // The SDK defines its theme variables on the document root or a shadow host.
  // In a preview, the scope root supplies those variables to its descendants.
  const styles = sdkStyles.replace(':where(:root, :host)', ':where(:scope)')
  const palette = backgrounds
    .map(({ name, color }) => {
      const foreground =
        name === 'theme'
          ? 'var(--allmaps-ui-foreground)'
          : name === 'black' || name === 'darkblue'
            ? white
            : black
      return `:root[data-playground-background="${name}"] {
      --playground-background: ${color};
      --playground-foreground: ${foreground};
    }`
    })
    .join('\n')
  return new Response(
    `${starlightLayers}
${palette}
@layer components { @scope ([data-ui-preview]) { ${styles} } }`,
    { headers: { 'Content-Type': 'text/css; charset=utf-8' } }
  )
}
