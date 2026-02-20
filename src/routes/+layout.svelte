<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import '../app.css';
	import { onMount } from 'svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	import {store} from '$lib/store.svelte';
	$inspect(store.dbLoaded, store.savedCardLists, store.collection);

</script>


<ParaglideJS {i18n}>
	<div class="min-h-screen flex flex-col">
		
		<Header />

		<main class="flex-1">
			{@render children()}
		</main>

		<Footer />

	</div>
</ParaglideJS>
