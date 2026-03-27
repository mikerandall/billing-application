import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { projectsAPI } from '../utils/api';
import { format } from 'date-fns';

function ProjectForm() {
  const navigate = useNavigate();
  const { clientId, id } = useParams();
  const { createProject, updateProject, deleteProject, clients, projects } = useApp();
  const isEditing = Boolean(id);
  
  const [formData, setFormData] = useState({
    client_id: clientId || '',
    name: '',
    billing_codes: [],
    start_date: format(new Date(), 'yyyy-MM-dd'),
    is_active: true,
    hourly_rate: 0
  });
  const [billingCodeInput, setBillingCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      loadProject();
    }
  }, [id, isEditing]);

  const loadProject = async () => {
    try {
      // Try to get project from context first, then API
      let project = projects.find(p => p.id === id);
      if (!project) {
        const response = await projectsAPI.getById(id);
        project = response.data;
      }
      
      setFormData({
        client_id: project.client_id,
        name: project.name || '',
        billing_codes: project.billing_codes || [],
        start_date: project.start_date || format(new Date(), 'yyyy-MM-dd'),
        is_active: project.is_active !== undefined ? project.is_active : true,
        hourly_rate: project.hourly_rate || 0
      });
    } catch (error) {
      setError('Error loading project: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await updateProject(id, formData);
        // Navigate back to client view
        navigate(`/clients/${formData.client_id}`);
      } else {
        await createProject(formData);
        navigate(`/clients/${formData.client_id}`);
      }
    } catch (error) {
      setError('Error saving project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addBillingCode = () => {
    if (billingCodeInput.trim() && !formData.billing_codes.includes(billingCodeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        billing_codes: [...prev.billing_codes, billingCodeInput.trim()]
      }));
      setBillingCodeInput('');
    }
  };

  const removeBillingCode = (codeToRemove) => {
    setFormData(prev => ({
      ...prev,
      billing_codes: prev.billing_codes.filter(code => code !== codeToRemove)
    }));
  };

  const handleBillingCodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBillingCode();
    }
  };

  const handleDeleteProject = async () => {
    try {
      setLoading(true);
      await deleteProject(id);
      // Navigate back to client view after successful deletion
      navigate(`/clients/${formData.client_id}`);
    } catch (error) {
      setError('Error deleting project: ' + error.message);
      setLoading(false);
    }
  };

  const getClientName = () => {
    const client = clients.find(c => c._id === formData.client_id);
    return client ? client.name : 'Unknown Client';
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">
              {isEditing ? 'Edit Project' : 'Create New Project'}
            </h1>
            <p className="text-sm text-gray">Client: {getClientName()}</p>
          </div>
        </div>
        
        {error && (
          <div className="error">{error}</div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-2 gap-4 mb-6">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Hourly Rate ($)</label>
              <input
                type="number"
                name="hourly_rate"
                className="form-input"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="grid grid-2 gap-4 mb-6">
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                name="start_date"
                className="form-input"
                value={formData.start_date}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                />
                <span className="form-label">Active Project</span>
              </label>
            </div>
          </div>
          
          <div className="form-group mb-6">
            <label className="form-label">Billing Codes</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                className="form-input"
                placeholder="Enter billing code"
                value={billingCodeInput}
                onChange={(e) => setBillingCodeInput(e.target.value)}
                onKeyPress={handleBillingCodeKeyPress}
              />
              <button
                type="button"
                onClick={addBillingCode}
                className="btn btn-secondary"
                disabled={!billingCodeInput.trim()}
              >
                Add
              </button>
            </div>
            
            {formData.billing_codes.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {formData.billing_codes.map((code, index) => (
                  <span 
                    key={index}
                    className="flex items-center gap-1 text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded"
                  >
                    {code}
                    <button
                      type="button"
                      onClick={() => removeBillingCode(code)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Project' : 'Create Project')}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/clients/${formData.client_id}`)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            {isEditing && (
              <button
                type="button"
                className="btn btn-danger"
                style={{ marginLeft: 'auto' }}
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this project? Click "OK" to confirm.')) {
                    await handleDeleteProject();
                  }
                }}
              >
                Delete Project
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;
