# @allmaps/id

## Usage

Installation:

```
npm install @allmaps/id --save
```

Usage:

```js
import { createId } from '@allmaps/id'
const url = 'https://orka.bibliothek.uni-kassel.de/viewer/rest/iiif/manifests/1535113582549/manifest/'
const id = await createId(url)
console.log(id)
```
