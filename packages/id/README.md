# @allmaps/id

## Usage

Installation:

```
npm install @allmaps/id --save
```

Usage:

```js
const generateId = require('@allmaps/id')
const url = 'https://orka.bibliothek.uni-kassel.de/viewer/rest/iiif/manifests/1535113582549/manifest/'
const id = generateId(url)
console.log(id)
```
