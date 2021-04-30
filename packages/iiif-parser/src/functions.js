export function getImageUrl (parsedImage, region, size) {
  // region = x,y,w,h
  const urlRegion = `${size.x},${size.y},${size.w},${size.h}`

  // size = w,h
  const urlSize = `${size.w},${size.h}`

  return `${parsedImage.uri}/${urlRegion}/${urlSize}/0/${parsedImage.quality}.${parsedImage.format}`
}
