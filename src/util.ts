export function xpathByText(tag: string, text: string): string {
  // There should be no text contains quotes.
  // text = text.replace(/"/g, '\\"')
  return `//${tag}[contains(text(), "${text}")]`
}

export function isValidPassword(p: string | undefined): boolean {
  return Boolean(p && p.length >= 8 && p.length <= 16)
}

export const version = '1.2.1'
