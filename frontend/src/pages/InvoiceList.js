import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoicesAPI } from '../utils/api';
import { format } from 'date-fns';

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoicesAPI.getAll();
      setInvoices(response.data);
    } catch (err) {
      setError('Error loading invoices: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (invoiceId) => {
    const downloadUrl = invoicesAPI.getDownloadUrl(invoiceId);
    window.open(downloadUrl, '_blank');
  };

  if (loading) {
    return <div className="loading">Loading invoices...</div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Invoices</h1>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center">
            <p className="text-gray mb-4">No invoices found.</p>
            <p className="text-sm text-gray">
              Create invoices from the project view by selecting hours to invoice.
            </p>
          </div>
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td>
                      <Link 
                        to={`/invoices/${invoice._id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td>{invoice.client_name}</td>
                    <td>{invoice.project_name}</td>
                    <td>{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</td>
                    <td>{invoice.total_hours}</td>
                    <td>${invoice.total_amount.toFixed(2)}</td>
                    <td>
                      <div className="flex gap-2">
                        <Link
                          to={`/invoices/${invoice._id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          View
                        </Link>
                        {invoice.pdf_filename && (
                          <button
                            onClick={() => handleDownload(invoice._id)}
                            className="btn btn-primary btn-sm"
                          >
                            PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default InvoiceList;
