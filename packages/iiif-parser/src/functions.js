export function getImageUrl (parsedImage, { region, size }) {
  // TODO: use image width, height, maxWidth, maxHeight
  // TODO: check if profile allows custom sizes

  let urlRegion
  if (region) {
    // region = x,y,width,height
    urlRegion = `${region.x},${region.y},${region.width},${region.height}`
  } else {
    urlRegion = 'full'
  }

  let urlSize
  if (size) {
    let height = ''
    if (size.height && size.width !== size.height) {
      height = size.height
    }

    // size = width,height
    urlSize = `${size.width},${height}`
  } else {
    urlSize = parsedImage.version === 2 ? 'full' : 'max'
  }

  return `${parsedImage.uri}/${urlRegion}/${urlSize}/0/${parsedImage.quality}.${parsedImage.format}`
}
