# Allmaps Select

Adapted from shadcn-svelte's MIT-licensed Select components:
https://github.com/huntabyte/shadcn-svelte/tree/493481fab94f68b8982949bc8a37eede786f2462/docs/src/lib/registry/ui/select

The component structure, bindings, snippets and Bits UI behavior follow upstream.
Allmaps uses Phosphor icons and shared CSS instead of the registry's generated
style classes. The upstream license is included in LICENSE.md.

Theme values live in `src/lib/css/ui.css`; Select layout lives in `select.css`.
Use relative imports within the package so its published files do not depend on
an app's `$lib` alias. Future components belong next to this folder and should
use the same theme tokens. The existing `components/Select.svelte` is independent.
