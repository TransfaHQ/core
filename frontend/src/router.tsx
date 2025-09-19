import { createBrowserRouter } from "react-router";
import { Login } from "./pages/login";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Hello World</div>,
  },
  {
    path: "/login",
    Component: Login
  }
]);
