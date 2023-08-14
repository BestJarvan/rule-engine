import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { RouterProvider } from "react-router-dom";
import { router } from './routers/index'

const root = document.getElementById('root')

ReactDOM.render((
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
), root);
