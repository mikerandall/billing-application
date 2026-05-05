import { sanitizeRichHtml, isRichTextEmpty } from '../utils/htmlField';

/**
 * Renders stored rich-text HTML (e.g. from Quill) safely for read-only display.
 */
function HtmlField({ html, className = '', emptyLabel = '-' }) {
  if (isRichTextEmpty(html)) {
    return <span className="text-gray">{emptyLabel}</span>;
  }
  const clean = sanitizeRichHtml(html);
  return (
    <div
      className={`rich-html text-sm text-slate-800 ${className}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export default HtmlField;
