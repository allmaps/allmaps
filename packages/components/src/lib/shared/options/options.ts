import { supportedtransformationTypes } from '@allmaps/transform'

import type { DistortionMeasure, TransformationType } from '@allmaps/transform'

const usedTransformationTypes: Array<TransformationType | undefined> = [
  undefined,
  ...supportedtransformationTypes
]

const usedDistortionMeasures: Array<DistortionMeasure | undefined> = [
  undefined,
  'log2sigma',
  'twoOmega'
]

export function nextTransformationType(
  transformationType: TransformationType | undefined
): TransformationType | undefined {
  return usedTransformationTypes[
    (usedTransformationTypes.findIndex((t) => t === transformationType) + 1) %
      usedTransformationTypes.length
  ]
}

export function nextDistortionMeasure(
  distortionMeasure: DistortionMeasure | undefined
): DistortionMeasure | undefined {
  return usedDistortionMeasures[
    (usedDistortionMeasures.findIndex((d) => d === distortionMeasure) + 1) %
      usedDistortionMeasures.length
  ]
}
