import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="d-flex vh-100 bg-light">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        onCloseSidebar={handleCloseSidebar}
      />
      
      {/* Main content area */}
      <div className="flex-grow-1 d-flex flex-column main-content">
        <Header 
          onToggleSidebar={handleToggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="flex-grow-1 overflow-auto bg-light" style={{ height: 'calc(100vh - 64px)' }}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}