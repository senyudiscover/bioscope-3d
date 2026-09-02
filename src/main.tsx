import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BioScopeWorkspace } from '../app/bioscope-workspace';
import '../app/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BioScopeWorkspace />
  </StrictMode>,
);
