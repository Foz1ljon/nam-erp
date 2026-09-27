import MarkdownIt from 'markdown-it'

// Raw HTML is disabled, so model output can't inject markup; markdown-it also rejects javascript: links.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]!
  const href = String(token.attrGet('href') ?? '')
  if (href.startsWith('/api/ai/files/')) token.attrSet('download', '')
  else if (/^https?:\/\//.test(href)) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

export function renderMarkdown(text: string): string {
  return md.render(text)
}
