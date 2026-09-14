import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/styles/index.css'

const selectNumericValue = event => {
  if (event.target instanceof HTMLInputElement && event.target.type === 'number') {
    event.target.select();
  }
};
document.addEventListener('focusin', selectNumericValue);
document.addEventListener('click', selectNumericValue);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
