import { createBrowserRouter, Navigate } from "react-router";
import { LedgerList } from "./pages/ledger/list";
import { AccountList } from "./pages/account/list";
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
    path: "/accounts",
    Component: AccountList,
  },
  {
    path: "/login",
    Component: Login
  }
]);
