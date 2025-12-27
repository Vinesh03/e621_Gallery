import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (import.meta.env.DEV) {
	const _warn = console.warn.bind(console);
	console.warn = (...args: any[]) => {
		const msg = args[0];
		if (typeof msg === 'string' && (
			msg.includes('React Router Future Flag Warning') ||
			msg.includes('Relative route resolution within Splat routes')
		)) {
			return;
		}
		_warn(...args);
	};
}

createRoot(document.getElementById("root")!).render(<App />);
