import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { clientsAPI, projectsAPI } from '../utils/api';

const AppContext = createContext();

const initialState = {
  clients: [],
  projects: [],
  activeProjects: [],
  loading: false,
  error: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload, loading: false };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload, loading: false };
    case 'SET_ACTIVE_PROJECTS':
      return { ...state, activeProjects: action.payload, loading: false };
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(client =>
          client.id === action.payload.id ? action.payload : client
        ),
      };
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(client => client.id !== action.payload),
      };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(project =>
          project.id === action.payload.id ? action.payload : project
        ),
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload),
      };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial data
  useEffect(() => {
    loadClients();
    loadProjects();
    loadActiveProjects();
  }, []);

  const loadClients = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await clientsAPI.getAll();
      dispatch({ type: 'SET_CLIENTS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      dispatch({ type: 'SET_PROJECTS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const loadActiveProjects = async () => {
    try {
      const response = await projectsAPI.getAll({ active_only: true });
      dispatch({ type: 'SET_ACTIVE_PROJECTS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const createClient = async (clientData) => {
    try {
      const response = await clientsAPI.create(clientData);
      dispatch({ type: 'ADD_CLIENT', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateClient = async (id, clientData) => {
    try {
      const response = await clientsAPI.update(id, clientData);
      dispatch({ type: 'UPDATE_CLIENT', payload: response.data });
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteClient = async (id) => {
    try {
      await clientsAPI.delete(id);
      dispatch({ type: 'DELETE_CLIENT', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const createProject = async (projectData) => {
    try {
      const response = await projectsAPI.create(projectData);
      dispatch({ type: 'ADD_PROJECT', payload: response.data });
      if (response.data.is_active) {
        loadActiveProjects(); // Refresh active projects
      }
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateProject = async (id, projectData) => {
    try {
      const response = await projectsAPI.update(id, projectData);
      dispatch({ type: 'UPDATE_PROJECT', payload: response.data });
      loadActiveProjects(); // Refresh active projects
      return response.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteProject = async (id) => {
    try {
      await projectsAPI.delete(id);
      dispatch({ type: 'DELETE_PROJECT', payload: id });
      loadActiveProjects(); // Refresh active projects
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const value = {
    ...state,
    loadClients,
    loadProjects,
    loadActiveProjects,
    createClient,
    updateClient,
    deleteClient,
    createProject,
    updateProject,
    deleteProject,
    clearError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
