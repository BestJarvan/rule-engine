import {
  createBrowserRouter,
} from "react-router-dom";
import Index from '../views/index';
import ErrorPage from '../views/error'
import Rules from '../views/rules/index';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "rules",
        element: <Rules />,
      }
    ]
  },
]);