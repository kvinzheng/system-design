/**
 * Lightweight sanitizer that strips scripts, event handlers, and dangerous
 * URLs from pasted HTML. Whitelists tags + attributes that the editor
 * understands.
 */

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'DIV', 'SPAN',
  'H1', 'H2', 'H3',
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'CODE', 'PRE',
  'BLOCKQUOTE',
  'UL', 'OL', 'LI',
  'A',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title', 'target', 'rel']),
};

const SAFE_URL = /^(https?:|mailto:|\/|#)/i;

export function sanitizeHtml(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  cleanNode(template.content);
  return template.innerHTML;
}

function cleanNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.parentNode?.removeChild(child);
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child as Element;
    const tag = el.tagName.toUpperCase();

    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap unknown tags but keep their children.
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
      el.parentNode?.removeChild(el);
      continue;
    }

    for (const attr of Array.from(el.attributes)) {
      const allowed = ALLOWED_ATTRS[tag];
      if (!allowed || !allowed.has(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (attr.name.toLowerCase() === 'href' && !SAFE_URL.test(attr.value)) {
        el.removeAttribute('href');
      }
    }

    if (tag === 'A') {
      el.setAttribute('rel', 'noopener noreferrer');
      el.setAttribute('target', '_blank');
    }

    cleanNode(el);
  }
}
