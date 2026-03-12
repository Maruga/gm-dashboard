import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true
});

export function renderMarkdown(content) {
  return marked.parse(content);
}
