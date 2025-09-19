import { createBrowserRouter, Navigate } from "react-router";
import { LedgerList } from "./pages/ledger/list";
import { Login } from "./pages/login";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to='/ledgers' replace />
  },
  {
    path: "/ledgers",
    Component: LedgerList,
  },
  {
    path: "/login",
    Component: Login
  }
]);
