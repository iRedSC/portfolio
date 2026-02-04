import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const root = document.documentElement;
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const activeDark = stored ? stored === 'dark' : prefersDark;
		root.classList.toggle('theme-dark', activeDark);
		root.classList.toggle('theme-light', !activeDark);
		setIsDark(activeDark);
	}, []);

	function toggleTheme() {
		const nextDark = !isDark;
		const root = document.documentElement;
		root.classList.toggle('theme-dark', nextDark);
		root.classList.toggle('theme-light', !nextDark);
		localStorage.setItem('theme', nextDark ? 'dark' : 'light');
		setIsDark(nextDark);
	}

	return (
		<button className="theme-toggle" type="button" onClick={toggleTheme}>
			{isDark ? <Moon size={16} /> : <Sun size={16} />}
		</button>
	);
}
