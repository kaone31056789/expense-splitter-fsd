import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Apply the saved colour theme before the first render (no flash)
try {
  const theme = localStorage.getItem('es-theme');
  if (theme) document.documentElement.dataset.theme = theme;
} catch (e) { /* storage blocked: use the system theme */ }

createRoot(document.getElementById('root')).render(<App />);
