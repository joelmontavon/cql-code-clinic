import React from 'react';
import { Nav, Offcanvas } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useLocation } from 'react-router-dom';
import { 
  House, 
  BarChart,
  BookFill,
  GearFill,
  CodeSquare,
  X 
} from 'react-bootstrap-icons';

const navigation = [
  { name: 'Exercises', href: '/', icon: House },
  { name: 'Progress', href: '/progress', icon: BarChart },
  { name: 'Test CQL', href: '/test-cql', icon: CodeSquare },
  { name: 'Learn', href: '/learn', icon: BookFill },
  { name: 'Settings', href: '/settings', icon: GearFill },
];

function SidebarContent() {
  const location = useLocation();

  return (
    <div className="d-flex flex-column h-100">
      <div className="flex-grow-1 pt-3">
        <Nav className="flex-column">
          {navigation.map((item) => {
            const IconComponent = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <LinkContainer key={item.name} to={item.href}>
                <Nav.Link 
                  className={`d-flex align-items-center px-3 py-2 text-decoration-none ${
                    isActive 
                      ? 'bg-primary text-white fw-medium' 
                      : 'text-dark hover-bg-light'
                  }`}
                  style={{
                    borderRadius: '0.375rem',
                    margin: '0 0.5rem 0.25rem 0.5rem',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  <IconComponent 
                    size={18} 
                    className={`me-3 ${isActive ? 'text-white' : 'text-muted'}`}
                  />
                  {item.name}
                </Nav.Link>
              </LinkContainer>
            );
          })}
        </Nav>
      </div>

      {/* Footer */}
      <div className="p-3 border-top">
        <div className="text-muted small">
          <div className="fw-medium">CQL Code Clinic</div>
          <div>Interactive CQL Learning</div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ sidebarOpen = false, onCloseSidebar }) {
  return (
    <>
      {/* Mobile sidebar */}
      <Offcanvas 
        show={sidebarOpen} 
        onHide={onCloseSidebar}
        placement="start"
        className="d-lg-none"
        style={{ width: '250px' }}
      >
        <Offcanvas.Header>
          <Offcanvas.Title className="fw-bold">
            CQL Code Clinic
          </Offcanvas.Title>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onCloseSidebar}
          />
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <SidebarContent />
        </Offcanvas.Body>
      </Offcanvas>

      {/* Desktop sidebar */}
      <div className="d-none d-lg-flex sidebar-fixed bg-white border-end" style={{ width: '250px' }}>
        <div className="w-100" style={{ paddingTop: '76px' }}>
          <SidebarContent />
        </div>
      </div>
    </>
  );
}