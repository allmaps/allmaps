# @allmaps/ui

UI components and functions for Allmaps.

## Latest maps

Import the latest georeferenced maps component through its dedicated entry point:

```svelte
<script lang="ts">
  import { Latest } from '@allmaps/ui/latest'
</script>

<Latest count={12} showProperties={false} showUrls={false} />
```

| Prop             | Default | Description                                           |
| ---------------- | ------- | ----------------------------------------------------- |
| `count`          | `100`   | Number of maps requested when the component mounts.   |
| `showHeader`     | `false` | Show the heading and map/error counts.                |
| `showProperties` | `true`  | Show control point count, mask point count, and area. |
| `showUrls`       | `true`  | Show links to the editor, viewer, and annotation.     |

The component fetches maps from `https://api.allmaps.org/maps` in the browser.
It owns its loading state and per-map error presentation. Consuming apps provide
routing and global styles. Use the Allmaps Tailwind theme and scan all UI output,
including the nested Latest components:

```ts
import { theme } from '@allmaps/tailwind'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@allmaps/ui/dist/**/*.{html,js,svelte,ts}'
  ],
  theme
}
```

From the repository root, `pnpm --filter @allmaps/ui run prepack` packages the
library without building its demo app. `pnpm --filter @allmaps/ui run watch`
updates the package while developing a consumer. The [Latest app](../../apps/latest)
and homepage both consume `@allmaps/ui/latest`.

## License

MIT; see [LICENSE.md](LICENSE.md).
