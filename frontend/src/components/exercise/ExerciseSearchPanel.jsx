/**
 * Exercise Search Panel
 * Advanced search and filtering interface for exercises
 */

import React, { useState } from 'react';
import { 
  Form, 
  Row, 
  Col, 
  Button, 
  Badge, 
  Accordion,
  InputGroup,
  ButtonGroup,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { 
  Search, 
  Filter, 
  SortAlphaDown, 
  SortAlphaUp,
  Clock,
  Award,
  Tag,
  X,
  ChevronDown,
  ChevronUp
} from 'react-bootstrap-icons';
import { useExerciseSearch, useExerciseFilters } from '../../hooks/useExerciseSearch.js';

const ExerciseSearchPanel = ({ onResultsChange, className = '' }) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { filterOptions } = useExerciseFilters();
  
  const {
    criteria,
    searchResults,
    isLoading,
    error,
    setQuery,
    setDifficulty,
    setType,
    setConcepts,
    setTags,
    setTimeRange,
    setSorting,
    clearFilters,
    hasActiveFilters,
    resultCount
  } = useExerciseSearch();
  
  // Notify parent of results changes
  React.useEffect(() => {
    onResultsChange?.(searchResults, isLoading, error);
  }, [searchResults, isLoading, error, onResultsChange]);
  
  const handleConceptToggle = (concept) => {
    const newConcepts = criteria.concepts.includes(concept)
      ? criteria.concepts.filter(c => c !== concept)
      : [...criteria.concepts, concept];
    setConcepts(newConcepts);
  };
  
  const handleTagToggle = (tag) => {
    const newTags = criteria.tags.includes(tag)
      ? criteria.tags.filter(t => t !== tag)
      : [...criteria.tags, tag];
    setTags(newTags);
  };
  
  const handleTimeRangeSelect = (range) => {
    if (criteria.estimatedTimeMin === range.min && criteria.estimatedTimeMax === range.max) {
      setTimeRange(undefined, undefined); // Clear if already selected
    } else {
      setTimeRange(range.min, range.max);
    }
  };
  
  const renderActiveFilters = () => {
    if (!hasActiveFilters) return null;
    
    const filters = [];
    
    if (criteria.difficulty) {
      filters.push(
        <Badge 
          key="difficulty" 
          bg="primary" 
          className="me-1 mb-1"
          style={{ cursor: 'pointer' }}
          onClick={() => setDifficulty('')}
        >
          {criteria.difficulty} <X size={12} />
        </Badge>
      );
    }
    
    if (criteria.type) {
      filters.push(
        <Badge 
          key="type" 
          bg="secondary" 
          className="me-1 mb-1"
          style={{ cursor: 'pointer' }}
          onClick={() => setType('')}
        >
          {criteria.type} <X size={12} />
        </Badge>
      );
    }
    
    criteria.concepts.forEach(concept => {
      filters.push(
        <Badge 
          key={`concept-${concept}`} 
          bg="info" 
          className="me-1 mb-1"
          style={{ cursor: 'pointer' }}
          onClick={() => handleConceptToggle(concept)}
        >
          {concept} <X size={12} />
        </Badge>
      );
    });
    
    criteria.tags.forEach(tag => {
      filters.push(
        <Badge 
          key={`tag-${tag}`} 
          bg="success" 
          className="me-1 mb-1"
          style={{ cursor: 'pointer' }}
          onClick={() => handleTagToggle(tag)}
        >
          {tag} <X size={12} />
        </Badge>
      );
    });
    
    if (criteria.estimatedTimeMin !== undefined || criteria.estimatedTimeMax !== undefined) {
      const timeLabel = `${criteria.estimatedTimeMin || 0}-${criteria.estimatedTimeMax || '∞'} min`;
      filters.push(
        <Badge 
          key="time" 
          bg="warning" 
          className="me-1 mb-1"
          style={{ cursor: 'pointer' }}
          onClick={() => setTimeRange(undefined, undefined)}
        >
          <Clock size={12} className="me-1" />{timeLabel} <X size={12} />
        </Badge>
      );
    }
    
    return (
      <div className="mb-3">
        <div className="d-flex align-items-center mb-2">
          <small className="text-muted me-2">Active filters:</small>
          <Button 
            variant="outline-secondary" 
            size="sm"
            onClick={clearFilters}
          >
            Clear all
          </Button>
        </div>
        <div>{filters}</div>
      </div>
    );
  };
  
  return (
    <div className={`exercise-search-panel ${className}`}>
      {/* Main Search Bar */}
      <Row className="mb-3">
        <Col>
          <InputGroup>
            <InputGroup.Text>
              <Search />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search exercises by title, description, concepts, or tags..."
              value={criteria.query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button 
              variant="outline-secondary"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="me-1" />
              Filters
              {showAdvancedFilters ? <ChevronUp className="ms-1" /> : <ChevronDown className="ms-1" />}
            </Button>
          </InputGroup>
        </Col>
      </Row>
      
      {/* Results Summary */}
      <Row className="mb-3">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              {isLoading ? (
                <span className="text-muted">Searching...</span>
              ) : (
                <span className="text-muted">
                  {resultCount} exercise{resultCount !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
            
            {/* Sort Controls */}
            <div className="d-flex align-items-center">
              <span className="text-muted me-2">Sort by:</span>
              <ButtonGroup size="sm">
                <Form.Select
                  size="sm"
                  value={criteria.sortBy}
                  onChange={(e) => setSorting(e.target.value, criteria.sortOrder)}
                  style={{ width: 'auto' }}
                >
                  <option value="title">Title</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="estimatedTime">Time</option>
                  <option value="created">Created</option>
                  <option value="quality">Quality</option>
                </Form.Select>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip>Toggle sort order</Tooltip>}
                >
                  <Button
                    variant="outline-secondary"
                    onClick={() => setSorting(criteria.sortBy, criteria.sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {criteria.sortOrder === 'asc' ? <SortAlphaDown /> : <SortAlphaUp />}
                  </Button>
                </OverlayTrigger>
              </ButtonGroup>
            </div>
          </div>
        </Col>
      </Row>
      
      {/* Active Filters */}
      {renderActiveFilters()}
      
      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Accordion className="mb-3">
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <Filter className="me-2" />
              Advanced Filters
            </Accordion.Header>
            <Accordion.Body>
              <Row>
                {/* Difficulty Filter */}
                <Col md={6} className="mb-3">
                  <Form.Label className="d-flex align-items-center">
                    <Award className="me-1" />
                    Difficulty
                  </Form.Label>
                  <Form.Select
                    value={criteria.difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="">All difficulties</option>
                    {filterOptions.difficulties.map(difficulty => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                
                {/* Type Filter */}
                <Col md={6} className="mb-3">
                  <Form.Label className="d-flex align-items-center">
                    <Tag className="me-1" />
                    Exercise Type
                  </Form.Label>
                  <Form.Select
                    value={criteria.type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="">All types</option>
                    {filterOptions.types.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
              
              {/* Time Range Filter */}
              <Row>
                <Col className="mb-3">
                  <Form.Label className="d-flex align-items-center">
                    <Clock className="me-1" />
                    Estimated Time
                  </Form.Label>
                  <ButtonGroup className="w-100">
                    {filterOptions.timeRanges.map((range, index) => (
                      <Button
                        key={index}
                        variant={
                          criteria.estimatedTimeMin === range.min && 
                          criteria.estimatedTimeMax === range.max 
                            ? 'primary' 
                            : 'outline-primary'
                        }
                        size="sm"
                        onClick={() => handleTimeRangeSelect(range)}
                      >
                        {range.label}
                      </Button>
                    ))}
                  </ButtonGroup>
                </Col>
              </Row>
              
              {/* Concepts Filter */}
              <Row>
                <Col className="mb-3">
                  <Form.Label>CQL Concepts</Form.Label>
                  <div className="border rounded p-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {filterOptions.concepts.map(concept => (
                      <Form.Check
                        key={concept}
                        type="checkbox"
                        id={`concept-${concept}`}
                        label={concept}
                        checked={criteria.concepts.includes(concept)}
                        onChange={() => handleConceptToggle(concept)}
                        className="mb-1"
                      />
                    ))}
                  </div>
                </Col>
              </Row>
              
              {/* Tags Filter */}
              <Row>
                <Col className="mb-3">
                  <Form.Label>Tags</Form.Label>
                  <div className="d-flex flex-wrap gap-1">
                    {filterOptions.tags.map(tag => (
                      <Badge
                        key={tag}
                        bg={criteria.tags.includes(tag) ? 'primary' : 'outline-primary'}
                        className="badge-clickable"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="alert alert-danger">
          <strong>Search Error:</strong> {error.message}
        </div>
      )}
    </div>
  );
};

export default ExerciseSearchPanel;