import DOMPurify from 'dompurify';

const PURIFY = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'pre',
    'span', 'sub', 'sup',
  ],
  ALLOWED_ATTR: ['href', 'rel', 'target', 'class'],
};

/**
 * Quill often stores empty content as <p><br></p>
 */
export function isRichTextEmpty(html) {
  if (!html || typeof html !== 'string') return true;
  const stripped = html
    .replace(/<p><br\s*\/?><\/p>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .trim();
  return stripped.length === 0;
}

export function sanitizeRichHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, PURIFY);
}
