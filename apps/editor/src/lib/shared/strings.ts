const MAX_TRUNCATED_TEXT_LENGTH = 64

export function truncate(text: string) {
  return text.length > MAX_TRUNCATED_TEXT_LENGTH
    ? `${text.slice(0, MAX_TRUNCATED_TEXT_LENGTH)}…`
    : text
}
