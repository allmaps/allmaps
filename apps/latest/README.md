# latest.allmaps.org

Shows the latest maps edited with [Allmaps Editor](https://editor.allmaps.org)
at https://latest.allmaps.org/. The default is 100 maps; use `?limit=250` to
request a different count.

This private SvelteKit app (`@allmaps/latest`) consumes the reusable
[`Latest` component from `@allmaps/ui/latest`](../../packages/ui#latest-maps).
Routes, page metadata, analytics, global styles, and static assets belong here.

## Development and deployment

From the repository root, after building workspace dependencies:

```sh
pnpm --filter @allmaps/ui run prepack
pnpm --filter @allmaps/ui run watch
pnpm --filter @allmaps/latest run dev
pnpm --filter @allmaps/latest run check
```

Run the watcher and development server in separate terminals. The development
port is defined by `latest` in `ports.json`.

To build the site and its dependencies:

```sh
pnpm exec turbo run build --filter @allmaps/latest
```

The static site is written to `apps/latest/build`. The app name, deployment
directory, and public URL are unchanged. Code that previously imported the
component from `@allmaps/latest` should import it from `@allmaps/ui/latest`.

## License

GPL-3.0-or-later
