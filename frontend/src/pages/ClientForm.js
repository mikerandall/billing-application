import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { clientsAPI } from '../utils/api';

function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { createClient, updateClient, clients } = useApp();
  const isEditing = Boolean(id);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    url: '',
    contacts: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      loadClient();
    }
  }, [id, isEditing]);

  const loadClient = async () => {
    try {
      // Try to get client from context first, then API
      let client = clients.find(c => c.id === id);
      if (!client) {
        const response = await clientsAPI.getById(id);
        client = response.data;
      }
      
      setFormData({
        name: client.name || '',
        address: client.address || '',
        url: client.url || '',
        contacts: client.contacts || []
      });
    } catch (error) {
      setError('Error loading client: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await updateClient(id, formData);
      } else {
        await createClient(formData);
      }
      navigate('/clients');
    } catch (error) {
      setError('Error saving client: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContactChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { name: '', email: '', phone: '' }]
    }));
  };

  const removeContact = (index) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">
            {isEditing ? 'Edit Client' : 'Create New Client'}
          </h1>
        </div>
        
        {error && (
          <div className="error">{error}</div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-2 gap-4 mb-6">
            <div className="form-group">
              <label className="form-label">Client Name *</label>
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
              <label className="form-label">Website URL</label>
              <input
                type="url"
                name="url"
                className="form-input"
                placeholder="https://example.com"
                value={formData.url}
                onChange={handleInputChange}
              />
            </div>
          </div>
          
          <div className="form-group mb-6">
            <label className="form-label">Address</label>
            <textarea
              name="address"
              className="form-input form-textarea"
              rows="3"
              value={formData.address}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Contacts</h3>
              <button
                type="button"
                onClick={addContact}
                className="btn btn-secondary btn-sm"
              >
                + Add Contact
              </button>
            </div>
            
            {formData.contacts.map((contact, index) => (
              <div key={index} className="card mb-4">
                <div className="card-header">
                  <h4 className="text-sm font-semibold">Contact {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="btn btn-danger btn-sm"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="grid grid-3 gap-4">
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={contact.name}
                      onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={contact.email}
                      onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {formData.contacts.length === 0 && (
              <p className="text-gray text-sm">No contacts added yet.</p>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Client' : 'Create Client')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/clients')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientForm;
