import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OrdersBoard from "./App.tsx";
import "./global.css";
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");
createRoot(rootElement).render(
	<StrictMode>
		<OrdersBoard />
	</StrictMode>,
);
