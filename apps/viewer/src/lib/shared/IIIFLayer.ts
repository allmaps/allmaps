import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import IIIFSource from 'ol/source/IIIF.js'
import IIIFInfo from 'ol/format/IIIFInfo.js'

import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'

type ImageInfo = string | ImageInformationResponse

function createIIIFTileSource(imageInfo: ImageInfo) {
  const options = new IIIFInfo(imageInfo).getTileSourceOptions()
  if (options === undefined || options.version === undefined) {
    throw new Error('Data seems to be no valid IIIF image information.')
  }

  options.zDirection = -1
  return new IIIFSource(options)
}

export default class IIIFLayer extends TileLayer<IIIFSource> {
  constructor(imageInfo?: ImageInfo) {
    super()

    if (imageInfo) {
      this.setImageInfo(imageInfo)
    }
  }

  setImageInfo(imageInfo: ImageInfo) {
    const iiifTileSource = createIIIFTileSource(imageInfo)
    this.setSource(iiifTileSource)
  }

  getExtent() {
    return this.getSource()?.getTileGrid()?.getExtent()
  }

  getView() {
    return new View({
      resolutions: this.getSource()?.getTileGrid()?.getResolutions(),
      extent: this.getExtent(),
      constrainOnlyCenter: true,
      enableRotation: false
    })
  }
}
