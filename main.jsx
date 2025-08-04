import React from "react";
import ReactDOM from "react-dom/client";
import HOAAdminPortal from "./components/HoaPortalManager";
import "./index.css"; // optional, for global styles or Tailwind

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HOAAdminPortal />
  </React.StrictMode>
);
