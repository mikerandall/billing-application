import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function ClientList() {
  const { clients, loading, deleteClient } = useApp();

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete client "${name}"?`)) {
      try {
        await deleteClient(id);
      } catch (error) {
        alert('Error deleting client: ' + error.message);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading clients...</div>;
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Clients</h1>
          <Link to="/clients/new" className="btn btn-primary">
            Add New Client
          </Link>
        </div>
        
        {clients.length === 0 ? (
          <div className="text-center">
            <p className="text-gray mb-4">No clients found.</p>
            <Link to="/clients/new" className="btn btn-primary">
              Create Your First Client
            </Link>
          </div>
        ) : (
          <div className="grid">
            {clients.map((client) => (
              <div key={client.id} className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{client.name}</h3>
                    {client.url && (
                      <a 
                        href={client.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {client.url}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/clients/${client._id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      View
                    </Link>
                    <Link
                      to={`/clients/${client._id}/edit`}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(client._id, client.name)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {client.address && (
                  <p className="text-sm text-gray mb-2">{client.address}</p>
                )}
                
                {client.contacts && client.contacts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Contacts:</h4>
                    {client.contacts.map((contact, index) => (
                      <div key={index} className="text-sm text-gray mb-1">
                        <strong>{contact.name}</strong>
                        {contact.email && (
                          <span> - <a href={`mailto:${contact.email}`}>{contact.email}</a></span>
                        )}
                        {contact.phone && <span> - {contact.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientList;
