import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { ToastProvider } from "./components/ui/ToastProvider";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <ToastProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ToastProvider>
  </ThemeProvider>,
);
