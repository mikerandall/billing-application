import { useState } from 'react';
import { sanitizeRichHtml, isRichTextEmpty } from '../utils/htmlField';

/**
 * Renders stored rich-text HTML (e.g. from Quill) safely for read-only display.
 * When `expandable` is true, collapses long content with a "Read More / View Less" toggle.
 */
function HtmlField({ html, className = '', emptyLabel = '-', expandable = false }) {
  const [expanded, setExpanded] = useState(false);

  if (isRichTextEmpty(html)) {
    return <span className="text-gray">{emptyLabel}</span>;
  }
  const clean = sanitizeRichHtml(html);

  if (!expandable) {
    return (
      <div
        className={`rich-html text-sm text-slate-800 ${className}`}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return (
    <div>
      <div
        className={`rich-html text-sm text-slate-800 ${className}`}
        style={
          expanded
            ? undefined
            : {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
        }
        dangerouslySetInnerHTML={{ __html: clean }}
      />
      <button
        onClick={() => setExpanded(e => !e)}
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 cursor-pointer bg-transparent border-none p-0"
      >
        {expanded ? 'View Less' : 'Read More'}
      </button>
    </div>
  );
}

export default HtmlField;
