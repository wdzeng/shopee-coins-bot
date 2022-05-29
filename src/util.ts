// eslint-disable-next-line import/prefer-default-export
export function xpathByText(tag: string, text: string): string {
  // eslint-disable-next-line no-param-reassign
  text = text.replace(/"/g, '\\"')
  return `//${tag}[contains(text(), "${text}")]`
}
