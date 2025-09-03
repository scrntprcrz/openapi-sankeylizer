import React from "react";
import { createRoot } from "react-dom/client";
import { RecoilRoot } from "recoil";
import "./styles/index.scss";
import App from "./App.jsx";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
	<React.StrictMode>
		<RecoilRoot>
			<App />
		</RecoilRoot>
	</React.StrictMode>
);
