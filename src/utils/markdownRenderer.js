import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  gfm: true
});

export function renderMarkdown(content) {
  return DOMPurify.sanitize(marked.parse(content));
}
