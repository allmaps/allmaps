import { derived } from 'svelte/store'

import url from './url.js'
import data from './data.js'

type UrlParam = {
  type: 'url'
  urls: string[]
}

type DataParam = {
  type: 'data'
  data: string
}

type Param = UrlParam | DataParam

export default {
  ...derived([url, data], ([$url, $data]) => {
    if ($url.length > 0) {
      return {
        type: 'url',
        urls: $url
      }
    } else if ($data) {
      return {
        type: 'data',
        data: $data
      }
    } else {
      return null
    }
  }),
  set: function ($param: Param | undefined) {
    if ($param && $param.type === 'url') {
      url.set($param.urls)
      data.set('')
    } else if ($param && $param.type === 'data') {
      url.set([])
      data.set($param.data)
    } else {
      url.set([])
      data.set('')
    }
  }
}
