import type { Bbox, Size, Point } from '@allmaps/types'

export function computeCrop(
  cropSize: Size,
  imageSize: Size,
  resourceCoordinates: Point,
  bbox: Bbox,
  targetPoint?: Point,
  desiredScale?: number
) {
  const x = resourceCoordinates[0]
  const y = resourceCoordinates[1]

  // Default scale: halfway between the minimum scale needed to cover the container
  // and 1 (original size). This default is adjustable by the user.
  const minScale = Math.min(
    imageSize[0] / cropSize[0],
    imageSize[1] / cropSize[1]
  )
  const defaultScale = (minScale + 1) / 2
  let scale = desiredScale ?? defaultScale

  // Ensure scale is at least 1 (so that the crop is never smaller than the container)
  scale = Math.max(scale, 1)

  // The crop size in image pixels is the container size multiplied by the scale.
  const cropWidth = cropSize[0] * scale
  const cropHeight = cropSize[1] * scale

  // Default target point is center of the crop
  const defaultTargetPoint: Point = [cropSize[0] / 2, cropSize[1] / 2]
  const target = targetPoint || defaultTargetPoint

  // Ensure the crop stays within the bounding box
  const bboxMinX = Math.max(0, bbox[0])
  const bboxMinY = Math.max(0, bbox[1])
  const bboxMaxX = Math.min(imageSize[0], bbox[2])
  const bboxMaxY = Math.min(imageSize[1], bbox[3])

  // Ensure x, y is inside the bounding box
  const clampedX = Math.max(bboxMinX, Math.min(bboxMaxX, x))
  const clampedY = Math.max(bboxMinY, Math.min(bboxMaxY, y))

  // Position crop so that resourceCoordinates will be at the target point in the resulting crop
  // First, calculate the desired top-left corner of the crop in image coordinates
  const desiredCropX = clampedX - target[0] * scale
  const desiredCropY = clampedY - target[1] * scale

  // Then, keep the crop within the bbox boundaries
  let cropX = Math.max(bboxMinX, Math.min(bboxMaxX - cropWidth, desiredCropX))
  let cropY = Math.max(bboxMinY, Math.min(bboxMaxY - cropHeight, desiredCropY))

  // Calculate the cropped coordinates in the image.
  const croppedX = (x - cropX) / scale
  const croppedY = (y - cropY) / scale

  // Return combined results from both previous functions
  return {
    size: {
      width: Math.round(cropWidth / scale),
      height: Math.round(cropHeight / scale)
    },
    region: {
      x: Math.round(cropX),
      y: Math.round(cropY),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight)
    },
    coordinates: [croppedX, croppedY]
  }
}
