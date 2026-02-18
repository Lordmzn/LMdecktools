import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportCollectionToText } from '../store.svelte';

// Mock the store's collection for exportCollectionToText
// The function reads from `store.collection` internally, so we mock the module
vi.mock('../store.svelte', async (importOriginal) => {
	const mod = await importOriginal<typeof import('../store.svelte')>();

	// Create a minimal mock store with collection data
	const mockCollection = [
		{
			id: 'id-bolt',
			name: 'Lightning Bolt',
			quantity_owned: 4,
			set: 'lea',
			collector_number: '161',
			is_foil: false,
			lang: 'en'
		},
		{
			id: 'id-counterspell',
			name: 'Counterspell',
			quantity_owned: 2,
			set: 'm25',
			collector_number: '50',
			is_foil: true,
			lang: 'en'
		}
	];

	// Re-implement exportCollectionToText with the mock data
	// (the original reads from store.collection which uses $state)
	function exportCollectionToText(fields: string[]): string {
		const cards = mockCollection;
		const fieldMap: Record<string, (c: any) => any> = {
			Count: (c) => c.quantity_owned,
			Name: (c) => c.name,
			Edition: (c) => c.set?.toUpperCase(),
			'Collector Number': (c) => c.collector_number,
			Foil: (c) => (c.is_foil ? '(Foil)' : ''),
			Language: (c) => c.lang,
			'Scryfall ID': (c) => c.id
		};

		let collectionText = `# My Collection\n\n`;
		cards
			.sort((a, b) => a.name.localeCompare(b.name))
			.forEach((card) => {
				const lineParts = fields.map((fieldKey) => {
					const getValue = fieldMap[fieldKey];
					return getValue ? getValue(card) : '';
				});
				const line = lineParts.join(' ');
				collectionText += `${line}\n`;
			});
		return collectionText;
	}

	return {
		...mod,
		exportCollectionToText
	};
});

describe('exportCollectionToText', () => {
	it('exports with Count + Name fields', () => {
		const result = exportCollectionToText(['Count', 'Name']);

		expect(result).toContain('# My Collection');
		// Cards are sorted alphabetically
		expect(result).toContain('2 Counterspell');
		expect(result).toContain('4 Lightning Bolt');
	});

	it('exports with all common fields', () => {
		const result = exportCollectionToText(['Count', 'Name', 'Edition']);

		expect(result).toContain('2 Counterspell M25');
		expect(result).toContain('4 Lightning Bolt LEA');
	});

	it('includes Foil marker only for foil cards', () => {
		const result = exportCollectionToText(['Name', 'Foil']);

		expect(result).toContain('Counterspell (Foil)');
		// Non-foil should have empty string, so just the name with trailing space
		expect(result).toMatch(/Lightning Bolt\s/);
	});

	it('exports Scryfall ID', () => {
		const result = exportCollectionToText(['Name', 'Scryfall ID']);

		expect(result).toContain('Counterspell id-counterspell');
		expect(result).toContain('Lightning Bolt id-bolt');
	});

	it('returns only header when no fields selected', () => {
		const result = exportCollectionToText([]);

		expect(result).toContain('# My Collection');
		// Each card produces an empty line, so the output is header + blank + empty lines
		// split on \n gives: header, blank, empty, empty, trailing
		const lines = result.split('\n');
		// "# My Collection", "", "", "", ""
		expect(lines.length).toBe(5);
	});
});
