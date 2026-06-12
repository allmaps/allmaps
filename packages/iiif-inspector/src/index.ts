export { parseLanguageString } from './language-string.js'

export {
  findBestYearInIIIFResource,
  findYearCandidatesInIIIFResource,
  findYearInCanvas,
  findYearInIIIFResource,
  findYearInManifest,
  findYearsInLanguageString,
  findYearsInMetadata,
  findYearsInValue,
  scoreYear
} from './years.js'

export type {
  IIIFInspectableResource,
  ScoredYearCandidate,
  YearCandidateOptions,
  YearCandidateSource,
  YearCandidate
} from './years.js'
