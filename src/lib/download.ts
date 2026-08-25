/**
 * The one `<a download>` sequence in the app, shared rather than repeated at
 * each export button (#90 — the same Blob/anchor code lived three times, in
 * `DBSelectionModal.svelte` twice and `diagnostics/+page.svelte` once).
 *
 * The anchor is appended to `document.body` before `.click()` and removed
 * after — some browser versions (notably older iOS Safari) only fire the
 * click on an anchor that is actually in the document.
 */
export function triggerDownload(
	data: BlobPart,
	filename: string,
	mimeType = 'application/octet-stream'
): void {
	const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
