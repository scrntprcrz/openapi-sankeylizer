import React from "react";
import { KBarProvider } from "kbar";
import CommandBar from "../components/CommandBar.jsx";

export default function KBarRoot({ children }) {
	return (
		<KBarProvider>
			{children}
			<CommandBar />
		</KBarProvider>
	);
}
