import React from 'react';
import { Navbar, Nav, Button, Container } from 'react-bootstrap';
import { 
  List, 
  ChevronLeft, 
  ChevronRight,
  BookmarkFill,
  GearFill 
} from 'react-bootstrap-icons';
import { useExerciseStore } from '../../stores/exerciseStore';

export function Header({ onToggleSidebar, sidebarOpen }) {
  const { currentExercise } = useExerciseStore();

  const handlePrevious = () => {
    console.log('Navigate to previous exercise');
  };

  const handleNext = () => {
    console.log('Navigate to next exercise');
  };

  const handleBookmarks = () => {
    console.log('Toggle bookmarks drawer');
  };

  return (
    <Navbar bg="white" className="header-sticky border-bottom shadow-sm">
      <Container fluid>
        {/* Left side - Mobile menu button and logo */}
        <div className="d-flex align-items-center">
          <Button 
            variant="outline-secondary"
            size="sm"
            className="d-lg-none me-3"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <List size={18} />
          </Button>
          
          <Navbar.Brand className="d-flex align-items-center mb-0">
            <img 
              src="/img/pills_no_green.png" 
              alt="CQL Code Clinic" 
              height="32"
              className="me-2"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <span className="fw-bold text-dark fs-4">CQL Code Clinic</span>
          </Navbar.Brand>
        </div>

        {/* Center - Exercise info (hidden on small screens) */}
        {currentExercise && (
          <div className="d-none d-md-flex flex-column text-center">
            <div className="fw-medium text-dark small" style={{maxWidth: '300px'}}>
              {currentExercise.title}
            </div>
            <div className="text-muted small">
              <span className="text-capitalize">{currentExercise.difficulty}</span> • {currentExercise.estimatedTime} min
            </div>
          </div>
        )}

        {/* Right side - Navigation controls */}
        <div className="d-flex align-items-center gap-1">
          {/* Exercise navigation */}
          <div className="d-none d-sm-flex align-items-center gap-1">
            <Button 
              variant="outline-secondary"
              size="sm"
              onClick={handlePrevious}
              className="d-flex align-items-center gap-1"
            >
              <ChevronLeft size={16} />
              <span className="d-none d-lg-inline">Previous</span>
            </Button>
            
            <Button 
              variant="outline-secondary"
              size="sm"
              onClick={handleBookmarks}
              className="d-flex align-items-center gap-1"
            >
              <BookmarkFill size={16} />
              <span className="d-none d-lg-inline">Bookmarks</span>
            </Button>
            
            <Button 
              variant="outline-secondary"
              size="sm"
              onClick={handleNext}
              className="d-flex align-items-center gap-1"
            >
              <span className="d-none d-lg-inline">Next</span>
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Settings */}
          <Button
            variant="outline-secondary"
            size="sm"
            aria-label="Settings"
          >
            <GearFill size={16} />
          </Button>
        </div>
      </Container>
    </Navbar>
  );
}