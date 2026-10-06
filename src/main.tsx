import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runStatusTests } from './lib/status.test';
import { runPdfBuilderTests } from './lib/pdfBuilder.test';

// Run self-checking unit tests immediately on boot in Developer Console
runStatusTests();
runPdfBuilderTests();

createRoot(document.getElementById('root')!).render(<App />);
