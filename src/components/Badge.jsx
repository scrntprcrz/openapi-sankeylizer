import clsx from "clsx";
import React from "react";

export default function Badge({ value, className }) {
	if (!value || Number(value) <= 0) return null;

	return <span className={clsx("badge", className)}>{value}</span>;
}
