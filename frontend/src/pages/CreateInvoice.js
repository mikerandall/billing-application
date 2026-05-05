import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { projectsAPI, hoursAPI, invoicesAPI } from '../utils/api';
import { format } from 'date-fns';
import HtmlField from '../components/HtmlField';

function CreateInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients } = useApp();
  
  const [project, setProject] = useState(null);
  const [client, setClient] = useState(null);
  const [hourEntries, setHourEntries] = useState([]);
  const [selectedHours, setSelectedHours] = useState([]);
  const [invoiceData, setInvoiceData] = useState({
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_days: 14
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceResult, setInvoiceResult] = useState(null);

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      
      // Load project
      const projectResponse = await projectsAPI.getById(id);
      const projectData = projectResponse.data;
      setProject(projectData);
      
      // Load client
      const clientData = clients.find(c => c._id === projectData.client_id);
      setClient(clientData);
      
      // Load uninvoiced hours for this project
      const hoursResponse = await hoursAPI.getAll({
        project_id: id,
        uninvoiced_only: true
      });
      setHourEntries(hoursResponse.data);
      
      // Select all hours by default
      setSelectedHours(hoursResponse.data.map(h => h._id));
      
    } catch (error) {
      setError('Error loading project data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHourSelection = (hourId) => {
    setSelectedHours(prev => 
      prev.includes(hourId)
        ? prev.filter(id => id !== hourId)
        : [...prev, hourId]
    );
  };

  const selectAllHours = () => {
    setSelectedHours(hourEntries.map(h => h.id));
  };

  const selectNone = () => {
    setSelectedHours([]);
  };

  const calculateTotals = () => {
    const selectedEntries = hourEntries.filter(h => selectedHours.includes(h._id));
    const totalHours = selectedEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalAmount = totalHours * (project?.hourly_rate || 0);
    
    return { totalHours, totalAmount, selectedEntries };
  };

  const handleCreateInvoice = async () => {
    if (selectedHours.length === 0) {
      setError('Please select at least one hour entry to invoice.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await invoicesAPI.create({
        project_id: id,
        hour_entry_ids: selectedHours,
        invoice_date: invoiceData.invoice_date,
        due_days: invoiceData.due_days
      });

      setInvoiceResult(response.data);
    } catch (error) {
      setError('Error creating invoice: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadInvoice = () => {
    try {
      // Open PDF in new window/tab
      const downloadUrl = invoicesAPI.getDownloadUrl(invoiceResult._id);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      alert('Error opening invoice: ' + error.message);
    }
  };

  const handleRegeneratePdf = async () => {
    try {
      const response = await invoicesAPI.regeneratePdf(invoiceResult._id);
      alert(`PDF regenerated successfully: ${response.data.pdf_filename}`);
    } catch (error) {
      alert('Error regenerating PDF: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading project data...</div>;
  }

  if (!project || !client) {
    return (
      <div className="page">
        <div className="error">Project or client not found</div>
      </div>
    );
  }

  const { totalHours, totalAmount, selectedEntries } = calculateTotals();

  if (invoiceResult) {
    return (
      <div className="page">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title">Invoice Created Successfully!</h1>
          </div>
          
          <div className="text-center">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Invoice #{invoiceResult.invoice_number}
              </h2>
              <p className="text-gray">
                Created for {client.name} - {project.name}
              </p>
              <p className="text-lg font-semibold mt-2">
                Total: ${invoiceResult.total_amount.toFixed(2)}
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleDownloadInvoice}
                className="btn btn-primary"
              >
                View PDF
              </button>
              <button
                onClick={handleRegeneratePdf}
                className="btn btn-secondary"
              >
                Regenerate PDF
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Create Invoice</h1>
            <p className="text-sm text-gray">
              {client.name} - {project.name}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
        
        {error && (
          <div className="error">{error}</div>
        )}
        
        <div className="grid grid-2 gap-6 mb-6">
          <div className="form-group">
            <label className="form-label">Invoice Date</label>
            <input
              type="date"
              className="form-input"
              value={invoiceData.invoice_date}
              onChange={(e) => setInvoiceData(prev => ({
                ...prev,
                invoice_date: e.target.value
              }))}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Payment Terms (Days)</label>
            <input
              type="number"
              className="form-input"
              min="1"
              value={invoiceData.due_days}
              onChange={(e) => setInvoiceData(prev => ({
                ...prev,
                due_days: parseInt(e.target.value)
              }))}
            />
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Select Hours to Invoice</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllHours}
                className="btn btn-secondary btn-sm"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={selectNone}
                className="btn btn-secondary btn-sm"
              >
                Select None
              </button>
            </div>
          </div>
          
          {hourEntries.length === 0 ? (
            <div className="text-center text-gray">
              No uninvoiced hours found for this project.
            </div>
          ) : (
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Date</th>
                    <th>Hours</th>
                    <th>Description</th>
                    <th>Technical Notes</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {hourEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedHours.includes(entry._id)}
                          onChange={() => handleHourSelection(entry.id)}
                        />
                      </td>
                      <td>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                      <td>{entry.hours}</td>
                      <td className="align-top max-w-md"><HtmlField html={entry.description} /></td>
                      <td className="align-top max-w-md"><HtmlField html={entry.technical_notes} /></td>
                      <td>${(entry.hours * (project.hourly_rate || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {selectedHours.length > 0 && (
          <div className="card mb-6">
            <h4 className="font-semibold mb-4">Invoice Summary</h4>
            <div className="grid grid-3 gap-4">
              <div>
                <p className="text-sm text-gray">Total Hours</p>
                <p className="text-lg font-semibold">{totalHours}</p>
              </div>
              <div>
                <p className="text-sm text-gray">Hourly Rate</p>
                <p className="text-lg font-semibold">${project.hourly_rate || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray">Total Amount</p>
                <p className="text-lg font-semibold">${totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex gap-4">
          <button
            onClick={handleCreateInvoice}
            className="btn btn-primary"
            disabled={creating || selectedHours.length === 0}
          >
            {creating ? 'Creating Invoice...' : 'Create Invoice'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateInvoice;
