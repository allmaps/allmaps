import { derived } from 'svelte/store'

import urlStore from './url.js'
import dataStore from './data.js'

export default derived([urlStore, dataStore], ([url, data]) => {
  if (url) {
    return {
      type: 'url',
      url
    }
  } else if (data) {
    return {
      type: 'data',
      data
    }
  } else {
    return null
  }
})
