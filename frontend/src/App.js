import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ClientList from './pages/ClientList';
import ClientView from './pages/ClientView';
import ClientForm from './pages/ClientForm';
import ProjectForm from './pages/ProjectForm';
import CreateInvoice from './pages/CreateInvoice';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="App">
          <Navbar />
          <div className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/clients" element={<ClientList />} />
              <Route path="/clients/new" element={<ClientForm />} />
              <Route path="/clients/:id" element={<ClientView />} />
              <Route path="/clients/:id/edit" element={<ClientForm />} />
              <Route path="/clients/:clientId/projects/new" element={<ProjectForm />} />
              <Route path="/projects/:id/edit" element={<ProjectForm />} />
              <Route path="/projects/:id/invoice" element={<CreateInvoice />} />
            </Routes>
          </div>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;
