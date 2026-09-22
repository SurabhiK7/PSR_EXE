import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { FluentProvider } from '@fluentui/react-components';
import App from './App.jsx';
import { pcpTheme } from './theme/theme.js';
import { BrandingProvider } from './config/BrandingContext.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FluentProvider theme={pcpTheme} style={{ background: 'transparent' }}>
      <BrowserRouter>
        <BrandingProvider>
          <App />
        </BrandingProvider>
      </BrowserRouter>
    </FluentProvider>
  </React.StrictMode>
);
