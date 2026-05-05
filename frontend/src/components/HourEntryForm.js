import React from 'react';
import RichTextEditor from './RichTextEditor';

/**
 * Shared fields + actions for logging or editing hour entries (same layout as dashboard “Log Hours”).
 *
 * `setFormData` must accept a functional updater, e.g. React’s `setHourFormData` / `setEditFormData`.
 */
function HourEntryForm({
  title,
  formData,
  setFormData,
  onSubmit,
  onCancel,
  submitLabel,
  submitDisabled = false,
  showInvoiceStatus = false,
  /** When embedded in the hours table row, omit top margin so it fits cleanly in the grid */
  embedded = false,
}) {
  const merge = (partial) =>
    setFormData((prev) => ({ ...prev, ...partial }));

  const shellClass = embedded
    ? 'p-4'
    : 'mt-4 p-4';

  return (
    <div className={shellClass} style={{ background: '#f8fafc', borderRadius: '6px' }}>
      <h4 className="mb-4">{title}</h4>
      <div className="grid grid-3 gap-4">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="form-input"
            value={formData.date}
            onChange={(e) => merge({ date: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Hours</label>
          <input
            type="number"
            step="0.25"
            className="form-input"
            placeholder="8.5"
            value={formData.hours}
            onChange={(e) => merge({ hours: e.target.value })}
          />
        </div>
        {showInvoiceStatus && (
          <div className="form-group">
            <label className="form-label">Invoice status</label>
            <select
              className="form-input"
              value={formData.is_invoiced ? 'invoiced' : 'uninvoiced'}
              onChange={(e) =>
                merge({ is_invoiced: e.target.value === 'invoiced' })
              }
              aria-label="Invoice status"
            >
              <option value="uninvoiced">Uninvoiced (invoiceable)</option>
              <option value="invoiced">Invoiced</option>
            </select>
          </div>
        )}
      </div>
      <div className="form-group mt-4">
        <label className="form-label">Description (Optional)</label>
        <RichTextEditor
          placeholder="Work summary for billing / client-facing line items"
          value={formData.description}
          onChange={(html) => merge({ description: html })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Technical Notes (Optional)</label>
        <RichTextEditor
          placeholder="Internal technical details"
          value={formData.technical_notes}
          onChange={(html) => merge({ technical_notes: html })}
        />
      </div>
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onSubmit}
          className="btn btn-primary"
          disabled={submitDisabled}
        >
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default HourEntryForm;
