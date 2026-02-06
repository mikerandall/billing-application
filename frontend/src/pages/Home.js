import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { projectsAPI, hoursAPI } from '../utils/api';
import { format, parseISO } from 'date-fns';

function Home() {
  const { activeProjects, projects, clients, loading } = useApp();
  const [projectSummaries, setProjectSummaries] = useState([]);
  const [showHourForm, setShowHourForm] = useState(null);
  const [hourFormData, setHourFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    description: ''
  });
  const [allHours, setAllHours] = useState([]);
  const [hoursLoading, setHoursLoading] = useState(false);
  const [editingHour, setEditingHour] = useState(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    hours: '',
    description: ''
  });

  useEffect(() => {
    loadProjectSummaries();
    loadAllHours();
  }, [activeProjects]);

  const loadProjectSummaries = async () => {
    try {
      const summaries = await Promise.all(
        activeProjects.map(async (project) => {
          const response = await projectsAPI.getHoursSummary(project._id);
          return {
            ...project,
            ...response.data
          };
        })
      );
      setProjectSummaries(summaries);
    } catch (error) {
      console.error('Error loading project summaries:', error);
    }
  };

  const loadAllHours = async () => {
    try {
      setHoursLoading(true);
      const response = await hoursAPI.getAll();
      setAllHours(response.data);
    } catch (error) {
      console.error('Error loading hours:', error);
    } finally {
      setHoursLoading(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c._id === clientId);
    return client ? client.name : 'Unknown Client';
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p._id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const handleDeleteHour = async (hourId) => {
    if (window.confirm('Are you sure you want to delete this hour entry? This action cannot be undone.')) {
      try {
        await hoursAPI.delete(hourId);
        // Refresh both hours list and project summaries
        loadAllHours();
        loadProjectSummaries();
      } catch (error) {
        console.error('Error deleting hour entry:', error);
        alert('Error deleting hour entry: ' + error.message);
      }
    }
  };

  const handleEditHour = (hour) => {
    setEditingHour(hour._id);
    setEditFormData({
      date: hour.date.split('T')[0], // Convert ISO date to YYYY-MM-DD format
      hours: hour.hours.toString(),
      description: hour.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingHour(null);
    setEditFormData({
      date: '',
      hours: '',
      description: ''
    });
  };

  const handleUpdateHour = async (hourId) => {
    try {
      // Find the original hour entry to get the project_id
      const originalHour = allHours.find(h => h._id === hourId);
      
      await hoursAPI.update(hourId, {
        project_id: originalHour.project_id,
        date: editFormData.date,
        hours: parseFloat(editFormData.hours),
        description: editFormData.description
      });
      
      setEditingHour(null);
      setEditFormData({
        date: '',
        hours: '',
        description: ''
      });
      
      // Refresh both hours list and project summaries
      loadAllHours();
      loadProjectSummaries();
    } catch (error) {
      console.error('Error updating hour entry:', error);
      alert('Error updating hour entry: ' + error.message);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Test functions for invoice functionality
  const handleTestMarkInvoiced = async (projectId) => {
    try {
      const response = await hoursAPI.testMarkInvoiced(projectId);
      alert(`Success: ${response.data.message}`);
      // Refresh data
      loadProjectSummaries();
      loadAllHours();
    } catch (error) {
      console.error('Error marking hours as invoiced:', error);
      alert('Error marking hours as invoiced: ' + error.message);
    }
  };

  const handleTestMarkUninvoiced = async (projectId) => {
    try {
      const response = await hoursAPI.testMarkUninvoiced(projectId);
      alert(`Success: ${response.data.message}`);
      // Refresh data
      loadProjectSummaries();
      loadAllHours();
    } catch (error) {
      console.error('Error marking hours as uninvoiced:', error);
      alert('Error marking hours as uninvoiced: ' + error.message);
    }
  };

  const handleLogHours = async (projectId) => {
    try {
      await hoursAPI.create({
        project_id: projectId,
        date: hourFormData.date,
        hours: parseFloat(hourFormData.hours),
        description: hourFormData.description
      });
      
      setShowHourForm(null);
      setHourFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        hours: '',
        description: ''
      });
      loadProjectSummaries(); // Refresh summaries
      loadAllHours(); // Refresh hours list
    } catch (error) {
      console.error('Error logging hours:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Active Projects Dashboard</h1>
        </div>
        
        {projectSummaries.length === 0 ? (
          <div className="text-center">
            <p className="text-gray mb-4">No active projects found.</p>
            <Link to="/clients" className="btn btn-primary">
              Create Your First Client
            </Link>
          </div>
        ) : (
          <div className="grid">
            {projectSummaries.map((project) => (
              <div key={project._id} className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{project.name}</h3>
                    <p className="text-sm text-gray">{getClientName(project.client_id)}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setShowHourForm(project._id)}
                      className="btn btn-primary btn-sm"
                    >
                      Log Hours
                    </button>
                    <Link
                      to={`/projects/${project._id}/invoice`}
                      className="btn btn-secondary btn-sm"
                    >
                      Create Invoice
                    </Link>
                    {/* Test buttons 
                    <button
                      onClick={() => handleTestMarkInvoiced(project._id)}
                      className="btn btn-sm"
                      style={{ backgroundColor: '#10b981', color: 'white' }}
                      title="TEST: Mark all hours as invoiced"
                    >
                      🧪 Mark Invoiced
                    </button>
                    <button
                      onClick={() => handleTestMarkUninvoiced(project._id)}
                      className="btn btn-sm"
                      style={{ backgroundColor: '#f59e0b', color: 'white' }}
                      title="TEST: Mark all hours as uninvoiced"
                    >
                      🧪 Mark Uninvoiced
                    </button>
                    */}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray">Total Hours</p>
                    <p className="text-lg font-semibold">{project.total_hours || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray">Uninvoiced Hours</p>
                    <p className="text-lg font-semibold text-orange-600">{project.uninvoiced_hours || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray">Hourly Rate</p>
                    <p className="text-lg font-semibold">${project.hourly_rate || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray">Amount Outstanding</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${((project.uninvoiced_hours || 0) * (project.hourly_rate || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {project.last_invoice_date && (
                  <div className="mt-4">
                    <p className="text-xs text-gray">
                      Last Invoice: {format(new Date(project.last_invoice_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
                
                {showHourForm === project._id && (
                  <div className="mt-4 p-4" style={{ background: '#f8fafc', borderRadius: '6px' }}>
                    <h4 className="mb-4">Log Hours for {project.name}</h4>
                    <div className="grid grid-3 gap-4">
                      <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={hourFormData.date}
                          onChange={(e) => setHourFormData({
                            ...hourFormData,
                            date: e.target.value
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Hours</label>
                        <input
                          type="number"
                          step="0.25"
                          className="form-input"
                          placeholder="8.5"
                          value={hourFormData.hours}
                          onChange={(e) => setHourFormData({
                            ...hourFormData,
                            hours: e.target.value
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Description (Optional)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Development work"
                          value={hourFormData.description}
                          onChange={(e) => setHourFormData({
                            ...hourFormData,
                            description: e.target.value
                          })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleLogHours(project._id)}
                        className="btn btn-primary"
                        disabled={!hourFormData.hours}
                      >
                        Log Hours
                      </button>
                      <button
                        onClick={() => setShowHourForm(null)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hours List Section */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="card-title">Recent Hours Logged</h2>
        </div>
        
        {hoursLoading ? (
          <div className="loading">Loading hours...</div>
        ) : allHours.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray">No hours logged yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Project</th>
                  <th className="text-left py-3 px-4">Client</th>
                  <th className="text-left py-3 px-4">Hours</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allHours.map((hour) => {
                  const project = projects.find(p => p._id === hour.project_id);
                  const isEditing = editingHour === hour._id;
                  
                  return (
                    <tr key={hour._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="date"
                            name="date"
                            className="form-input w-full"
                            value={editFormData.date}
                            onChange={handleEditFormChange}
                          />
                        ) : (
                          format(parseISO(hour.date), 'MMM dd, yyyy')
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {getProjectName(hour.project_id)}
                      </td>
                      <td className="py-3 px-4">
                        {project ? getClientName(project.client_id) : 'Unknown Client'}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {isEditing ? (
                          <input
                            type="number"
                            name="hours"
                            step="0.25"
                            className="form-input w-20"
                            value={editFormData.hours}
                            onChange={handleEditFormChange}
                          />
                        ) : (
                          `${hour.hours}h`
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            name="description"
                            className="form-input w-full"
                            value={editFormData.description}
                            onChange={handleEditFormChange}
                            placeholder="Description"
                          />
                        ) : (
                          hour.description || '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          hour.is_invoiced 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {hour.is_invoiced ? 'Invoiced' : 'Uninvoiced'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateHour(hour._id)}
                              className="btn btn-primary btn-sm"
                              disabled={!editFormData.hours || !editFormData.date}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="btn btn-secondary btn-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditHour(hour)}
                              className="btn btn-secondary btn-sm"
                              title="Edit hour entry"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteHour(hour._id)}
                              className="btn btn-danger btn-sm"
                              title="Delete hour entry"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
