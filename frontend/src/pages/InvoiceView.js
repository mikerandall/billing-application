import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { invoicesAPI } from '../utils/api';
import { format } from 'date-fns';

function InvoiceView() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getById(id);
      setInvoice(response.data);
    } catch (err) {
      setError('Error loading invoice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const downloadUrl = invoicesAPI.getDownloadUrl(id);
    window.open(downloadUrl, '_blank');
  };

  const handleRegeneratePdf = async () => {
    try {
      setRegenerating(true);
      await invoicesAPI.regeneratePdf(id);
      // Reload invoice to get updated pdf_filename
      await loadInvoice();
      alert('PDF regenerated successfully!');
    } catch (err) {
      alert('Error regenerating PDF: ' + err.message);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading invoice...</div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="error">{error}</div>
        <button onClick={() => navigate('/invoices')} className="btn btn-secondary mt-4">
          Back to Invoices
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="page">
        <div className="error">Invoice not found</div>
        <button onClick={() => navigate('/invoices')} className="btn btn-secondary mt-4">
          Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Invoice {invoice.invoice_number}</h1>
            <p className="text-sm text-gray">
              {invoice.client_name} - {invoice.project_name}
            </p>
          </div>
          <div className="flex gap-2">
            {invoice.pdf_filename && (
              <button onClick={handleDownload} className="btn btn-primary">
                View PDF
              </button>
            )}
            <button 
              onClick={handleRegeneratePdf} 
              className="btn btn-secondary"
              disabled={regenerating}
            >
              {regenerating ? 'Regenerating...' : 'Regenerate PDF'}
            </button>
            <Link to="/invoices" className="btn btn-secondary">
              Back to Invoices
            </Link>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-2 gap-6 mb-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Invoice Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray">Invoice Number:</span>
                <span className="font-medium">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray">Invoice Date:</span>
                <span>{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray">Due Date:</span>
                <span>{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray">Created:</span>
                <span>{format(new Date(invoice.created_at), 'MMM dd, yyyy h:mm a')}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Invoice Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray">Total Hours:</span>
                <span className="font-medium">{invoice.total_hours}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray">Hourly Rate:</span>
                <span>${invoice.hourly_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-gray font-semibold">Total Amount:</span>
                <span className="text-lg font-bold">${invoice.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hours Table */}
        <div className="card">
          <h3 className="font-semibold mb-4">Hours Included</h3>
          {invoice.hour_entries && invoice.hour_entries.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.hour_entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                    <td>{entry.hours}</td>
                    <td>{entry.description || '-'}</td>
                    <td>${(entry.hours * invoice.hourly_rate).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td>Total</td>
                  <td>{invoice.total_hours}</td>
                  <td></td>
                  <td>${invoice.total_amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-gray text-center">No hour entries found for this invoice.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvoiceView;
