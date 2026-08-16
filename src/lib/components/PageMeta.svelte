<!--
	Per-page `<head>` metadata (#25). Every route renders one of these so a
	prerendered page carries a title, a description and a social preview.

	Site-wide tags (canonical, hreflang, og:image, twitter:card) live in
	`+layout.svelte` instead — they are the same on every page and would only be
	repeated here. What changes per page is the title and the description, so
	those are the only props, and og:title / og:description mirror them rather
	than being separately authorable: a preview card that disagrees with the tab
	is a bug, not a feature.
-->
<script lang="ts">
	interface Props {
		title: string;
		description: string;
	}

	let { title, description }: Props = $props();
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
</svelte:head>
