export function classNames(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
