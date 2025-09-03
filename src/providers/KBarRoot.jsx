import { KBarProvider } from "kbar";
import React from "react";

export default function KBarRoot({ actions = [], children }) {
	return <KBarProvider actions={actions}>{children}</KBarProvider>;
}
