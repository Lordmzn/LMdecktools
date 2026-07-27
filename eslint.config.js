import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';
const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath),
	// The design-system skill ships React reference components; they are vendored
	// documentation, not app source, and must not be linted as such.
	{ ignores: ['.claude/**', 'docs/**'] },
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		ignores: ['eslint.config.js', 'svelte.config.js'],

		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		rules: {
			// Paraglide i18n routing is wired up but not actively used — plain hrefs are fine
			'svelte/no-navigation-without-resolve': 'off',
			// Pervasive in WIP code interacting with IndexedDB and Scryfall API
			'@typescript-eslint/no-explicit-any': 'off',
			// Allow _-prefixed variables as intentional no-ops (unused destructuring, unused params)
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
			],
			// Disabled in favour of @typescript-eslint/no-unused-vars (avoids false positives on TS type annotations)
			'no-unused-vars': 'off'
		}
	}
);
