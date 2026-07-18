import type {
  Canvas as IIIFCanvas,
  LanguageString,
  Manifest as IIIFManifest,
  Metadata
} from '@allmaps/iiif-parser'

const YEAR_MIN = 1500
const YEAR_MAX = 2200

export type YearCandidateSource =
  'navDate' | 'metadata' | 'label' | 'summary' | 'description' | 'value'

export type YearCandidate = {
  value: string
  year: number
  endYear?: number
  source?: YearCandidateSource
  metadataLabel?: string
  language?: string
  approximate?: boolean
}

export type ScoredYearCandidate = YearCandidate & {
  score: number
}

export type YearCandidateOptions = {
  source?: YearCandidateSource
  metadataLabel?: string
  language?: string
}

export type IIIFInspectableResource = {
  navDate?: Date
  metadata?: Metadata
  description?: LanguageString
  label?: LanguageString
  summary?: LanguageString
}

const SOURCE_PENALTIES: Record<YearCandidateSource, number> = {
  navDate: -1000,
  metadata: 100,
  label: 260,
  summary: 420,
  description: 620,
  value: 500
}

const DATE_METADATA_LABEL_PATTERNS = [
  /\bdate\b/i,
  /\byear\b/i,
  /\bcreated?\b/i,
  /\bcreation\b/i,
  /\bissued?\b/i,
  /\bpublished?\b/i,
  /\bpublication\b/i,
  /\btemporal\b/i,
  /\bcoverage\b/i
]

const WEAK_DATE_METADATA_LABEL_PATTERNS = [
  /\bpublisher\b/i,
  /\bprovenance\b/i,
  /\borigin\b/i
]

const NEGATIVE_METADATA_LABEL_PATTERNS = [
  /\bidentifier\b/i,
  /\bcall\s*number\b/i,
  /\bshelf\s*mark\b/i,
  /\bshelfmark\b/i,
  /\baccession\b/i,
  /\bdigitized?\b/i,
  /\bmodified\b/i,
  /\bright(s)?\b/i,
  /\burl\b/i,
  /\bpermalink\b/i,
  /\blink\b/i,
  /\blicen[cs]e\b/i
]

const NEGATIVE_VALUE_PATTERNS = [
  /\bdigitized?\b/i,
  /\bmodified\b/i,
  /\baccessed\b/i,
  /\bdownloaded\b/i,
  /\bidentifier\b/i,
  /\bpermalink\b/i,
  /\blicen[cs]e\b/i
]

function isDateMetadataLabel(metadataLabel?: string) {
  return (
    metadataLabel &&
    DATE_METADATA_LABEL_PATTERNS.some((pattern) => pattern.test(metadataLabel))
  )
}

function isWeakDateMetadataLabel(metadataLabel?: string) {
  return (
    metadataLabel &&
    WEAK_DATE_METADATA_LABEL_PATTERNS.some((pattern) =>
      pattern.test(metadataLabel)
    )
  )
}

function isNegativeMetadataLabel(metadataLabel?: string) {
  return (
    metadataLabel &&
    NEGATIVE_METADATA_LABEL_PATTERNS.some((pattern) =>
      pattern.test(metadataLabel)
    )
  )
}

function getMetadataLabelPenalty(candidate: YearCandidate) {
  if (candidate.source !== 'metadata') {
    return 0
  }

  if (isDateMetadataLabel(candidate.metadataLabel)) {
    return -120
  } else if (isWeakDateMetadataLabel(candidate.metadataLabel)) {
    return 80
  } else if (isNegativeMetadataLabel(candidate.metadataLabel)) {
    return 650
  }

  return 180
}

function getValueContextPenalty(candidate: YearCandidate) {
  let penalty = 0

  if (
    NEGATIVE_VALUE_PATTERNS.some((pattern) => pattern.test(candidate.value))
  ) {
    penalty += 350
  }

  if (candidate.approximate) {
    penalty += 20
  }

  return penalty
}

function parseMetadataLabel(label: LanguageString) {
  return Object.values(label)
    .flat()
    .map((value) => String(value))
    .join(' ')
}

function isValidYear(year: number) {
  return year > YEAR_MIN && year < YEAR_MAX
}

function getTokenAtIndex(value: string, index: number) {
  const before = value.slice(0, index)
  const after = value.slice(index)
  const start = Math.max(
    before.lastIndexOf(' '),
    before.lastIndexOf('\n'),
    before.lastIndexOf('\t'),
    before.lastIndexOf('"'),
    before.lastIndexOf("'")
  )
  const endMatch = after.search(/[\s"'<>()[\]]/)
  const end = endMatch === -1 ? value.length : index + endMatch

  return value.slice(start + 1, end)
}

function isYearInUrl(value: string, index: number) {
  const token = getTokenAtIndex(value, index)

  return /^https?:\/\//i.test(token) || /^www\./i.test(token)
}

function getFollowingRangeYear(value: string, index: number) {
  const rangeMatch = value
    .slice(index + 4)
    .match(/^\s*(?:[-/–—]|\bto\b|\band\b)\s*(?<year>\d{4})\b/i)
  const yearStr = rangeMatch?.groups?.year

  if (!yearStr) {
    return
  }

  const year = parseInt(yearStr, 10)

  if (isValidYear(year)) {
    return year
  }
}

function isApproximateYear(value: string, index: number) {
  const prefix = value.slice(Math.max(0, index - 12), index)

  return /\b(ca\.?|circa|around|about|approx\.?)\s*$/i.test(prefix)
}

// Prefer explicit IIIF and metadata date signals over incidental years in long
// descriptions. Earlier years and shorter values only break ties after source
// and context have been considered.
export function scoreYear(candidate: YearCandidate) {
  const sourcePenalty = SOURCE_PENALTIES[candidate.source ?? 'value']
  const metadataLabelPenalty = getMetadataLabelPenalty(candidate)
  const valueContextPenalty = getValueContextPenalty(candidate)
  const valueLengthPenalty = Math.min(candidate.value.length, 400) * 2
  const yearPenalty = (candidate.year - YEAR_MIN) * 0.05

  const score =
    sourcePenalty +
    metadataLabelPenalty +
    valueContextPenalty +
    valueLengthPenalty +
    yearPenalty

  return score
}

export function findYearsInLanguageString(
  languageString?: LanguageString,
  options: Omit<YearCandidateOptions, 'language'> = {}
): YearCandidate[] {
  if (!languageString) {
    return []
  }

  return Object.entries(languageString)
    .map(([language, values]) =>
      values.map((value) =>
        findYearsInValue(value, {
          ...options,
          language
        })
      )
    )
    .flat(2)
}

export function findYearsInValue(
  value: string | number | boolean,
  options: YearCandidateOptions = {}
): YearCandidate[] {
  const regex = /\b(?<year>\d{4})\b/g

  const stringValue = String(value)
  const candidates: YearCandidate[] = []

  for (const match of stringValue.matchAll(regex)) {
    const yearStr = match.groups?.year
    if (yearStr) {
      const year = parseInt(yearStr, 10)
      if (isValidYear(year) && !isYearInUrl(stringValue, match.index)) {
        const endYear = getFollowingRangeYear(stringValue, match.index)
        const approximate = isApproximateYear(stringValue, match.index)

        candidates.push({
          value: stringValue,
          year,
          ...(endYear ? { endYear } : {}),
          ...(approximate ? { approximate } : {}),
          ...options
        })
      }
    }
  }

  return candidates
}

export function findYearInCanvas(canvas?: IIIFCanvas) {
  if (canvas) {
    return findYearInIIIFResource(canvas)
  }
}

export function findYearInManifest(manifest?: IIIFManifest) {
  if (manifest) {
    return findYearInIIIFResource(manifest)
  }
}

export function findYearInIIIFResource(iiifResource: IIIFInspectableResource) {
  const candidate = findBestYearInIIIFResource(iiifResource)

  if (candidate) {
    return candidate.year
  }
}

export function findBestYearInIIIFResource(
  iiifResource: IIIFInspectableResource
) {
  return findYearCandidatesInIIIFResource(iiifResource)[0]
}

export function findYearCandidatesInIIIFResource(
  iiifResource: IIIFInspectableResource
): ScoredYearCandidate[] {
  const navDateYears = iiifResource.navDate
    ? [
        {
          value: iiifResource.navDate.toISOString(),
          year: iiifResource.navDate.getFullYear(),
          source: 'navDate' as const
        }
      ]
    : []
  const metadataYears = findYearsInMetadata(iiifResource.metadata)
  const descriptionYears = findYearsInLanguageString(iiifResource.description, {
    source: 'description'
  })
  const labelYears = findYearsInLanguageString(iiifResource.label, {
    source: 'label'
  })
  const summaryYears = findYearsInLanguageString(iiifResource.summary, {
    source: 'summary'
  })

  return [
    ...navDateYears,
    ...metadataYears,
    ...descriptionYears,
    ...labelYears,
    ...summaryYears
  ]
    .map((year) => ({
      ...year,
      score: scoreYear(year)
    }))
    .sort((a, b) => a.score - b.score || a.year - b.year)
}

export function findYearsInMetadata(metadata?: Metadata): YearCandidate[] {
  if (!metadata) {
    return []
  }

  const allYears = []

  for (const metadataItem of metadata) {
    const metadataLabel = parseMetadataLabel(metadataItem.label)
    const values = Object.values(metadataItem.value).flat()

    for (const value of values) {
      const years = findYearsInValue(value, {
        source: 'metadata',
        metadataLabel
      })

      if (years.length > 0) {
        allYears.push(...years)
      }
    }
  }

  return allYears
}
