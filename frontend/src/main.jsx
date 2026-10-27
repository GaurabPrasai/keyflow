import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

// Dev/perf harness (Plan 4.0 §5.1): a separate chunk that is only fetched
// when the page is opened with ?perf, so it never costs anything otherwise.
if (new URLSearchParams(window.location.search).has('perf')) {
  import('./utils/perf.js').then((module) => module.startPerf()).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
