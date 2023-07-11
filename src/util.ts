export function xpathByText(tag: string, text: string): string {
  // There should be no text contains quotes.
  return `//${tag}[contains(text(), "${text}")]`
}

export function isValidPassword(p: string | undefined): boolean {
  return Boolean(p && p.length >= 8 && p.length <= 16)
}

export const version: string = process.env.VERSION || 'Development'
