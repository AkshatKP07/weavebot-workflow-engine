/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import MicroApp from './MicroApp.jsx' // <-- Import the new component
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Simple custom router to check if we are on the public runner page
const path = window.location.pathname;
const isMicroApp = path.startsWith('/run/');
const workflowId = isMicroApp ? path.split('/run/')[1] : null;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isMicroApp ? (
      /* If the URL is /run/<id>, show the public form WITHOUT Clerk auth */
      <MicroApp workflowId={workflowId} />
    ) : (
      /* Otherwise, load the secure Builder Canvas */
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    )}
  </React.StrictMode>,
)