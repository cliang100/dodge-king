export function load(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function save(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// storage can be unavailable in private mode; the game still works without it
	}
}
