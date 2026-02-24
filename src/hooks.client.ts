import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, event }) => {
	const errorId = crypto.randomUUID();
	if (import.meta.env.DEV) {
		console.error(`[client error ${errorId}] at ${event.url.pathname}:`, error);
	}
	return { message: 'Navigation error.', errorId };
};
