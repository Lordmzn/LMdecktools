import type { Handle, HandleServerError } from '@sveltejs/kit';
import { i18n } from '$lib/i18n';
const handleParaglide: Handle = i18n.handle();
export const handle: Handle = handleParaglide;

export const handleError: HandleServerError = ({ error, event }) => {
	const errorId = crypto.randomUUID();
	if (import.meta.env.DEV) {
		console.error(`[server error ${errorId}] at ${event.url.pathname}:`, error);
	}
	return { message: 'Server error.', errorId };
};
