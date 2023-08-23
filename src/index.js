import React from 'react';
// import ReactDOM from 'react-dom/client'; // react 18
import ReactDOM from "react-dom"; // react 17
import { RouterProvider } from "react-router-dom";
import { router } from './routers/index'

import 'antd/dist/antd.min.css'; // or 'antd/dist/antd.less'
import './index.css';

ReactDOM.render(
  <>
    <RouterProvider router={router} />
  </>,
  document.getElementById('root')
);
