export function xpathByText(tag: string, text: string): string {
  text = text.replace(/"/g, '\\"')
  return `//${tag}[contains(text(), "${text}")]`
}

export function isValidPassword(p: string | undefined) : boolean {
  return !!(p && p.length >= 8 && p.length <= 16)
}
