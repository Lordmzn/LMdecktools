import type { HandleClientError } from '@sveltejs/kit';
import { logAppError } from '$lib/store.svelte';

export const handleError: HandleClientError = ({ error, event }) => {
	const errorId = crypto.randomUUID();
	// logAppError already writes to the console, so DEV no longer needs its own call.
	logAppError('unhandled', error, { errorId, pathname: event.url.pathname, source: 'handleError' });
	return { message: 'Navigation error.', errorId };
};
