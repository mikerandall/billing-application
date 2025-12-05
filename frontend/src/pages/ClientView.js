import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { clientsAPI, projectsAPI } from '../utils/api';
import { format } from 'date-fns';

function ClientView() {
  const { id } = useParams();
  const { clients } = useApp();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projectSummaries, setProjectSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [id]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      
      // Try to get client from context first, then API
      let clientData = clients.find(c => c.id === id);
      if (!clientData) {
        const clientResponse = await clientsAPI.getById(id);
        clientData = clientResponse.data;
      }
      
      // Load client projects
      const projectsResponse = await projectsAPI.getAll({ client_id: id });
      const projectsData = projectsResponse.data;
      
      // Load hours summaries for each project
      const summaries = await Promise.all(
        projectsData.map(async (project) => {
          try {
            const response = await projectsAPI.getHoursSummary(project._id);
            return {
              ...project,
              ...response.data
            };
          } catch (error) {
            console.error(`Error loading hours summary for project ${project._id}:`, error);
            return {
              ...project,
              total_hours: 0,
              uninvoiced_hours: 0
            };
          }
        })
      );
      
      setClient(clientData);
      setProjects(projectsData);
      setProjectSummaries(summaries);
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading client...</div>;
  }

  if (!client) {
    return (
      <div className="page">
        <div className="error">Client not found</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">{client.name}</h1>
            <div className="flex gap-2 mt-2">
              <Link to="/clients" className="btn btn-secondary btn-sm">
                ← Back to Clients
              </Link>
              <Link
                to={`/clients/${client.id}/edit`}
                className="btn btn-secondary btn-sm"
              >
                Edit Client
              </Link>
            </div>
          </div>
        </div>
        
        <div className="grid grid-2 mb-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Client Information</h3>
            
            {client.address && (
              <div className="mb-3">
                <label className="form-label">Address</label>
                <p className="text-sm">{client.address}</p>
              </div>
            )}
            
            {client.url && (
              <div className="mb-3">
                <label className="form-label">Website</label>
                <p className="text-sm">
                  <a 
                    href={client.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {client.url}
                  </a>
                </p>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Contacts</h3>
            {client.contacts && client.contacts.length > 0 ? (
              client.contacts.map((contact, index) => (
                <div key={index} className="mb-3 p-3" style={{ background: '#f8fafc', borderRadius: '6px' }}>
                  <p className="font-semibold">{contact.name}</p>
                  {contact.email && (
                    <p className="text-sm">
                      <a href={`mailto:${contact.email}`} className="text-blue-600">
                        {contact.email}
                      </a>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-sm">{contact.phone}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray text-sm">No contacts added</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Projects</h2>
          <Link
            to={`/clients/${client._id}/projects/new`}
            className="btn btn-primary"
          >
            + Add Project
          </Link>
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center">
            <p className="text-gray mb-4">No projects found for this client.</p>
            <Link
              to={`/clients/${client.id}/projects/new`}
              className="btn btn-primary"
            >
              Create First Project
            </Link>
          </div>
        ) : (
          <div className="grid">
            {projectSummaries.map((project) => (
              <div key={project._id} className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{project.name}</h3>
                    <div className="flex gap-4 mt-2">
                      <span className={`text-sm px-2 py-1 rounded ${
                        project.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-sm text-gray">
                        Rate: ${project.hourly_rate || 0}/hr
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/projects/${project._id}/edit`}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit
                    </Link>
                    {project.is_active && (
                      <Link
                        to={`/projects/${project._id}/invoice`}
                        className="btn btn-primary btn-sm"
                      >
                        Invoice
                      </Link>
                    )}
                  </div>
                </div>
                
                {/* Hours Summary Grid */}
                <div className="grid grid-3 mb-4">
                  <div>
                    <p className="text-xs text-gray">Total Hours</p>
                    <p className="text-lg font-semibold">{project.total_hours || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray">Uninvoiced Hours</p>
                    <p className="text-lg font-semibold text-orange-600">{project.uninvoiced_hours || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray">Amount Outstanding</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${((project.uninvoiced_hours || 0) * (project.hourly_rate || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm text-gray">
                    Started: {format(new Date(project.start_date), 'MMM dd, yyyy')}
                  </p>
                  {project.last_invoice_date && (
                    <p className="text-sm text-gray">
                      Last Invoice: {format(new Date(project.last_invoice_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
                
                {project.billing_codes && project.billing_codes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Billing Codes:</p>
                    <div className="flex gap-1 flex-wrap">
                      {project.billing_codes.map((code, index) => (
                        <span 
                          key={index}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
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

export default ClientView;
