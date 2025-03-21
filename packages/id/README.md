# @allmaps/id

Uses the [SHA-1](https://en.wikipedia.org/wiki/SHA-1) algorithm to generate IDs from strings, random IDs from UUIDs and checksums from JSON objects.

Allmaps uses this module to create IDs from IIIF URIs. For example:

* Given the following manifest URL: https://digital.zlb.de/viewer/api/v1/records/34231682/manifest/,
* The output of the [`generateId`](#generateid) function will be: `6f5a7b547c8f6fbe`,
* We can use this ID to lookup the [Georeference Annotation](https://iiif.io/api/extension/georef/) for the georeferenced maps in this manifest using Allmaps API:
  https://annotations.allmaps.org/manifests/6f5a7b547c8f6fbe.

To see @allmaps/id in action, view this [Observable notebook](https://observablehq.com/@allmaps/the-allmaps-id-module).

## Usage

This is an ESM-only module that works in browsers and Node.js.

Node.js:

The Node.js version of @allmaps/id uses[`crypto.createHash()`](https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options) and [`crypto.randomUUID()`](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions) from the [`crypto` module](https://nodejs.org/api/crypto.html). First, run `npm install @allmaps/id`.

```js
import { generateId } from '@allmaps/id'
const url = 'https://digital.zlb.de/viewer/api/v1/records/34231682/manifest/'
const id = await generateId(url)
// id = '6f5a7b547c8f6fbe'
```

Browser:

The browser version of @allmaps/id uses the [`SubtleCrypto.digest()`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest) and [`Crypto.randomUUID()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) Web APIs.

```html
<script type="module">
  import { generateId } from 'https://esm.run/@allmaps/id'

  const url =
    'https://orka.bibliothek.uni-kassel.de/viewer/rest/iiif/manifests/1535113582549/manifest/'
  const id = await generateId(url)
  console.log(id)
</script>
```

## CLI

Generating Allmaps IDs is also possible using the [Allmaps CLI](https://github.com/allmaps/allmaps/tree/main/apps/cli).

For example:

```sh
echo https://digital.zlb.de/viewer/api/v1/records/34231682/manifest/ | allmaps id
```

## License

MIT

## API

### `generateChecksum(obj, length)`

Generates a checksum of a JSON object.

###### Parameters

* `obj` (`unknown`)
  * JSON object.
* `length` (`number | undefined`)
  * Length of returned hash. The maximum length of the hash is 40 characters.

###### Returns

First `length` characters of the SHA-1 hash of sorted and serialized version of `obj` (`Promise<string>`).

### `generateId(str, length)`

Generates an ID from a string using the SHA-1 algorithm. Given the same input, the ID will always be the same.

###### Parameters

* `str` (`string`)
  * Input string
* `length` (`number | undefined`)
  * Length of returned hash. The maximum length of the hash is 40 characters. The default length is 16.

###### Returns

First `length` characters of the SHA-1 hash of `str` (`Promise<string>`).

### `generateRandomId(length)`

Generates a random ID.

###### Parameters

* `length` (`number | undefined`)
  * Length of returned hash. The maximum length of the hash is 40 characters.

###### Returns

First `length` characters of the SHA-1 hash of a random UUID (`Promise<string>`).
