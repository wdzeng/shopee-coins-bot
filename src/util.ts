export function xpathByText(tag: string, text: string): string {
  text = text.replace(/"/g, '\\"')
  return `//${tag}[contains(text(), "${text}")]`
}
