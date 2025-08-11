// Monaco Editor Environment Configuration
// This file is loaded before Monaco Editor to set up the environment

// Set up global require for Monaco Editor
if (typeof window !== 'undefined') {
  // Configure Monaco Environment with fallback for worker issues
  window.MonacoEnvironment = {
    getWorker: function (workerId, label) {
      // Fallback to loading workers without module type for compatibility
      const getWorkerModule = (moduleUrl, label) => {
        try {
          return new Worker(moduleUrl, {
            name: label,
            type: 'module',
          });
        } catch (e) {
          // Fallback to regular worker
          console.warn('Failed to load worker as module, falling back to regular worker:', e);
          return new Worker(moduleUrl, {
            name: label,
          });
        }
      };

      const baseUrl = '/node_modules/monaco-editor/esm/vs';
      
      switch (label) {
        case 'json':
          return getWorkerModule(`${baseUrl}/language/json/json.worker.js`, label);
        case 'css':
        case 'scss':
        case 'less':
          return getWorkerModule(`${baseUrl}/language/css/css.worker.js`, label);
        case 'html':
        case 'handlebars':
        case 'razor':
          return getWorkerModule(`${baseUrl}/language/html/html.worker.js`, label);
        case 'typescript':
        case 'javascript':
          return getWorkerModule(`${baseUrl}/language/typescript/ts.worker.js`, label);
        case 'cql':
          // CQL uses the default editor worker
          return getWorkerModule(`${baseUrl}/editor/editor.worker.js`, label);
        default:
          return getWorkerModule(`${baseUrl}/editor/editor.worker.js`, label);
      }
    }
  };
}