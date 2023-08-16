import {
  createHashRouter,
} from "react-router-dom";
import Index from '../views/index';
import ErrorPage from '../views/error'
import Rules from '../views/rules/index';
import Home from '../views/home';

export const router = createHashRouter([
  {
    path: "/",
    element: <Index />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "",
        element: <Home />,
      },
      {
        path: "rules",
        element: <Rules />,
      }
    ]
  },
]);