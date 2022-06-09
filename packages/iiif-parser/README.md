# JavaScript module to parse IIIF data

Idea to fetch nested IIIF objects:

```ts
const options = {
  maxDepth: 2,
  maxItems: 10,
  images: true,
  manifests: true,
  collections: false
}

const fetchJson = (url: string): any =>
  fetch(url).then((response) => response.json())

// Runs BFS-like algorithm, fetches nested URLs using fetchJson function and options
await Collection.fetchNested(fetchJson, options)
```

@allmaps/iiif-parser has two versions of IIIF objects:
  - `InlineCollection` and `Collection`
  - `InlineImage` and `Image`

fetchNested will take Inline versions and use their URLs to download the complete version.

Or use a generator?? See https://observablehq.com/d/1c34a4c97a975184.
