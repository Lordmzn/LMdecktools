/* eslint-disable */
/** 
 * This file contains language specific message functions for tree-shaking. 
 * 
 *! WARNING: Only import messages from this file if you want to manually
 *! optimize your bundle. Else, import from the `messages.js` file. 
 * 
 * Your bundler will (in the future) automatically replace the index function 
 * with a language specific message function in the build step. 
 */


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_cancel = () => `Cancel`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_close = () => `Close`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_copy = () => `Copy`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_delete = () => `Delete`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_save = () => `Save`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_import = () => `Import`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_export = () => `Export`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_loading = () => `Loading…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_generic = () => `Generic`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_specific = () => `Specific`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_any = () => `Any`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_strict = () => `Strict`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_card_matching_label = () => `Card Matching:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_language_label = () => `Language:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_filter_placeholder = () => `Filter cards...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_sort_by_name = () => `Sort by Name`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_sort_by_quantity = () => `Sort by Quantity`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_sort_by_set = () => `Sort by Set`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_add_cards = () => `Add Cards`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_no_cards_match_filter = () => `No cards match your filter`


/**
 * @param {{ shown: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_showing_of = (params) => `Showing ${params.shown} of ${params.total} cards...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_flip_card = () => `Flip card`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_no_database_selected = () => `No database selected`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_cannot_be_undone = () => `This action cannot be undone.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_read_only_hint = () => `Select a database to enable editing — click "Preview" in the header`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const nav_home = () => `Home`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const nav_collection = () => `Collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const nav_card_lists = () => `Card Lists`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const header_db_button_title = () => `Manage database`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const header_db_active = () => `Database`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const header_db_peek = () => `Preview`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const header_db_none = () => `Choose DB`


/**
 * @param {{ year: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_credit = (params) => `© 2025–${params.year} Lord M'zn · Local-first · Built for the community`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_diagnostics = () => `Diagnostics`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_contribute = () => `Contribute`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_support = () => `Support:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_language = () => `Language`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_wotc_disclaimer = () => `LM Deck Tools is not affiliated with, endorsed, sponsored, or approved by Wizards of the Coast LLC. Magic: The Gathering is a trademark of Wizards of the Coast LLC.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_scryfall_prefix = () => `Card data provided by`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_scryfall_middle = () => `. Scryfall is not affiliated with this project. Use of Scryfall data is subject to their`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_scryfall_api_terms = () => `API terms`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_privacy = () => `This app runs entirely in your browser. No personal data is collected, transmitted, or stored on any server. All data (decks, collection, cached images) is stored locally via IndexedDB and the Cache API. No cookies are used. No analytics are present.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_license_prefix = () => `Licensed under the`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_license_link = () => `GNU Affero General Public License v3.0`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_meta_title = () => `LM Deck Tools — Chart Your Own Course`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_meta_description = () => `Manage your Magic: The Gathering card lists and collection. Every plank of data stays on your device — no accounts, no servers, no middlemen.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_eyebrow = () => `No captain · No port · Your treasure`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_hero_title_line1 = () => `Chart Your Own`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_hero_title_line2 = () => `Course`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_hero_subtitle = () => `Manage your Magic: The Gathering card lists and collection. Every plank of data stays on your device — no accounts, no servers, no middlemen.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_cta_card_lists = () => `Manage Card Lists`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_cta_collection = () => `Manage Collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_principle_local_first = () => `Local-first`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_principle_zero_tracking = () => `Zero tracking`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_principle_open_format = () => `Open format`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_principle_no_account = () => `No account`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_lists_title = () => `Card Lists`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_lists_body = () => `Create and manage named card lists. Search Scryfall's full catalogue and cross-reference ownership against your collection.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_hoard_title = () => `Track Your Hoard`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_hoard_body = () => `Keep an inventory of every card you own. See at a glance what's in your hold and what you need to complete your lists.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_portability_title = () => `Import & Export`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_portability_body = () => `Move data freely. Plain text in, plain text out. Share lists with your crew or stash a backup — your treasure, your rules.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_start_eyebrow = () => `Set Sail`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_start_title = () => `Getting Started`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step1_title = () => `Log Your Hoard`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step1_body = () => `Add cards you own to your collection. Search or import in bulk.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step2_title = () => `Chart Card Lists`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step2_body = () => `Build lists searching Scryfall. Ownership shows automatically.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step3_title = () => `Track the Gap`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step3_body = () => `See which lists are complete and which cards you still need.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step4_title = () => `Share Freely`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step4_body = () => `Export plain text to share, trade, or backup your data.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_compact_label = () => `The Compact`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_compact_lead = () => `We built this tool on the same principles that governed the fairest ships on the sea —`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_compact_lead_strong = () => `transparency in every process, no central authority, and every hand sovereign over their own treasure.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_1_title = () => `Your data never leaves your device.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_1_body = () => `No server, no cloud, no third-party databases.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_2_title = () => `No accounts, no tracking.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_2_body = () => `We don't know who you are and we don't want to.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_3_title = () => `Open, portable formats.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_3_body = () => `Export anytime. Your collection is yours to take wherever you sail.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_4_title = () => `Transparent code.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_4_body = () => `Every plank of this ship is visible. No hidden compartments.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_eyebrow = () => `The Hold`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_title = () => `My Collection`


/**
 * @param {{ total: NonNullable<unknown>, unique: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_count = (params) => `${params.total} cards (${params.unique} unique)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_add_modal_title = () => `Add Cards to Collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_empty_title = () => `Your hold is empty`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_empty_body = () => `Click "Add Cards" to start logging what you own`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_no_db_body = () => `Click "Choose DB" to get started`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_notify_added = (params) => `Added ${params.name} to collection`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_notify_added_single = (params) => `Added one ${params.name}`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_notify_removed_single = (params) => `Removed one ${params.name}`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_notify_updated = (params) => `Updated ${params.name} quantity`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_placeholder = () => `Search for cards...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_searching = () => `Searching...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_button = () => `Search`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_all_prints = () => `all prints`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_unique = () => `unique`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_show_all_prints = () => `Show all print versions`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_results_found = (params) => `${params.count} results found`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_no_results = () => `No results found`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_found_cards = (params) => `Found ${params.count} cards`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_failed = () => `Search failed`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_empty_title = () => `Search for cards to add to your list`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_learn_syntax = () => `Learn Scryfall syntax`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_hexagram_48 = () => `One draws from the well without hindrance.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_add_card = () => `Failed to add card`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_remove_card = () => `Failed to remove card`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_update_quantity = () => `Failed to update quantity`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_create_list = () => `Failed to create list`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_delete_list = () => `Failed to delete list`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_rename_list = () => `Failed to rename list`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_import_failed = () => `Import failed`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_add_all_to_collection = () => `Failed to add cards to collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_add_card_to_collection = () => `Failed to add card to collection`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_own_badge = (params) => `Own: ${params.count}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_add_to_collection_button = () => `Add to Collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_add_to_list_button = () => `Add to List`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_remove_from_list = () => `Remove from list`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_decrease_quantity = () => `Decrease quantity`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_increase_quantity = () => `Increase quantity`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_add_to_collection = () => `Add to collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_owned = () => `✓ Owned`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_missing = () => `✗ Missing`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_remove_single = () => `Remove one`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_add_single = () => `Add one`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_edit_quantity = () => `Edit quantity`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_edit_quantity_title = () => `Edit Quantity`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_quantity_label = () => `Quantity:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_label = () => `Lists`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_none = () => `No lists`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_button = () => `Delete List`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_button_title = () => `Delete this list`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_compare_button = () => `Compare Lists`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_new_button = () => `New List`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_current_chart = () => `Current chart`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_no_list_selected = () => `No list selected`


/**
 * @param {{ total: NonNullable<unknown>, unique: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_count = (params) => `${params.total} cards (${params.unique} unique)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_add_all_to_collection = () => `Add all to collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_add_all_to_collection_title = () => `Add all list cards to your collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_add_cards_modal_title = () => `Add Cards to List`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_modal_title = () => `Import List`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_hint = () => `Paste a card list in standard format:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_placeholder = () => `# List Name
4 Lightning Bolt
2 Mountain`


/**
 * @param {{ current: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_progress = (params) => `Importing… (${params.current}/${params.total})`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_importing = () => `Importing…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_submit = () => `Load List`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_modal_title = () => `Delete List`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_modal_aria = () => `Confirm delete list`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_confirm_prefix = () => `Are you sure you want to delete`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_export_modal_title = () => `Export List`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_copied = () => `Copied!`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_added_card = (params) => `Added ${params.name} to list`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_removed_card = (params) => `Removed ${params.name} from list`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_created = () => `New list created`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_deleted = () => `List deleted`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_imported = () => `List imported`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_added_to_collection_one = (params) => `Added ${params.count} card to collection`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_added_to_collection_other = (params) => `Added ${params.count} cards to collection`


/**
 * @param {{ added: NonNullable<unknown>, failed: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_added_partial = (params) => `Added ${params.added}, failed ${params.failed}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_owned_banner = () => `✓ Owned — you have all cards in this list`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_missing_banner_one = (params) => `✗ Missing ${params.count} card`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_missing_banner_other = (params) => `✗ Missing ${params.count} cards`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_empty_title = () => `No cards in list yet`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_empty_body = () => `Click "Add Cards" to get started`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const linked_toast_suffix = () => `was modified outside the app.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const linked_toast_merge = () => `Merge`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const linked_toast_ignore = () => `Ignore`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_export_modal_title = () => `Export Comparison`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_need_two_lists = () => `You need at least two card lists to compare.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_back_to_lists = () => `Back to Card Lists`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_eyebrow = () => `Two charts, one course`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_title = () => `Compare Lists`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_list_a = () => `List A:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_list_b = () => `List B:`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_badge_only_a = (params) => `${params.count} only in A`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_badge_both = (params) => `${params.count} in both`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_badge_only_b = (params) => `${params.count} only in B`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_column_only_in = (params) => `Only in ${params.name}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_column_both = () => `In Both Lists`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_tab_only_a = (params) => `Only A (${params.count})`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_tab_both = (params) => `Both (${params.count})`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_tab_only_b = (params) => `Only B (${params.count})`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_no_cards = () => `No cards`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_meta_title = () => `Diagnostics · LM Deck Tools`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_eyebrow = () => `The Log Book`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_title = () => `Diagnostics`


/**
 * @param {{ maxEntries: NonNullable<unknown>, maxAgeDays: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_intro = (params) => `Errors this app ran into, recorded on your device and nowhere else. Nothing here is sent anywhere unless you export it or choose to open a GitHub issue. The journal keeps the last ${params.maxEntries} entries and drops anything older than ${params.maxAgeDays} days.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_export_json = () => `Export JSON`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_clear_all = () => `Clear All`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_no_db_title = () => `No database open`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_no_db_body = () => `Errors are journalled in your local database — click "Choose DB" in the header to start recording them.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_empty_title = () => `No errors recorded`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_empty_body = () => `Calm seas so far.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_search_placeholder = () => `Search errors...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_all_categories = () => `All categories`


/**
 * @param {{ shown: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_shown_of_total = (params) => `${params.shown} of ${params.total}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_select_shown = () => `Select shown`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_clear_selection = () => `Clear selection`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_report_selected = (params) => `Report ${params.count} on GitHub`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_report = () => `Report on GitHub`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_no_match = () => `No errors match your filter`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_select_entry_aria = () => `Select error for reporting`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_hide_details = () => `Hide details`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_show_details = () => `Show details`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_clear_confirm_title = () => `Clear the error journal?`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_clear_confirm_body = (params) => `All ${params.count} recorded errors will be deleted from this device. Export them first if you plan to report a bug.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_report_body_prefix = () => `This opens a new, pre-filled issue on`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_report_body_suffix = () => `in a new tab. Below is exactly what would be sent — nothing else leaves your device, and you can still edit or abandon the issue there.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_open_issue = () => `Open GitHub issue`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_stat_lists = () => `Card lists:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_stat_list_cards = () => `Cards in lists:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_stat_collection = () => `Collection cards:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_modal_title = () => `Welcome to LM Deck Tools`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_modal_subtitle = () => `Choose how to start your MTG collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_tab_local = () => `In-browser DB`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_tab_file = () => `File DB`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_tab_cache = () => `Cache`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_tab_import = () => `Import`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_tab_export = () => `Export`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_local_searching = () => `Searching for local database`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_local_found = () => `Local database found`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_local_active = () => `Local database active`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_peek_notice = () => `Previewing in read-only mode. Click "Connect" to enable editing.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_connect_local = () => `Connect to local DB`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_title = () => `Download copy`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_body = () => `Download a full copy of your database (collection + all card lists). A one-off snapshot — for a file that keeps saving itself, link one under File DB.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_started = () => `Download started.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_preparing = () => `Preparing…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_button = () => `Download .yjs file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_title = () => `Restore from file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_body_prefix = () => `Restore your database from a previously downloaded copy. This`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_replaces = () => `replaces`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_body_suffix = () => `everything currently stored — to fold a file into what you already have instead, link it under File DB.`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_selected_file = (params) => `Selected file: ${params.name}`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_success_one = (params) => `Restored ${params.count} list successfully.`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_success_other = (params) => `Restored ${params.count} lists successfully.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_link_hint_prefix = () => `Link a file under`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_link_hint_suffix = () => `to keep this copy saving itself, or close this window.`


/**
 * @param {{ imported: NonNullable<unknown>, errors: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_partial = (params) => `Restored ${params.imported}, failed ${params.errors}.`


/**
 * @param {{ current: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_progress = (params) => `Restoring… (${params.current}/${params.total} lists)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restoring = () => `Restoring…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_button = () => `Restore from file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_no_fs_access = () => `Auto-save to a linked file requires Chrome 86+, Edge 86+, or Safari 15.2+, so this browser has no File DB tab. Download and restore copies here instead.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_title = () => `Start from scratch`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_body = () => `Create a new empty database. All existing data will be cleared.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_button = () => `Create New Database`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_could_not_read_file = () => `Could not read this file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_failed_to_import_file = () => `Failed to import file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_intro = () => `Export your collection to share with other tools and services.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_format_label = () => `Format:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_csv_hint = () => `One column per field, opens in a spreadsheet, and imports back into this app.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_format_text = () => `Text`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_text_hint = () => `Space-separated lines (4 Lightning Bolt) for pasting into other MTG tools.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_fields_label = () => `Include Fields:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_count = () => `Count`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_name = () => `Name`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_edition = () => `Edition`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_collector_number = () => `Collector #`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_foil = () => `Foil`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_language = () => `Language`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_scryfall_id = () => `Scryfall ID`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_placeholder = () => `Select fields to generate preview...`


/**
 * @param {{ shown: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_truncated = (params) => `Preview — first ${params.shown} of ${params.total} cards. Download and copy include all of them.`


/**
 * @param {{ total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_all_one = (params) => `Preview — all ${params.total} card.`


/**
 * @param {{ total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_all_other = (params) => `Preview — all ${params.total} cards.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_empty = () => `Nothing to export yet — your collection is empty.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_download = () => `Download File`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_copy = () => `Copy to Clipboard`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_link_title = () => `Link a File (Bring Your Own Cloud)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_link_body = () => `Save your data to a file on disk. Place it in a cloud-synced folder (Dropbox, iCloud, OneDrive) for cross-device sync with zero server involvement.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_link_new_file = () => `New File...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_link_existing_file = () => `Existing File...`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_linked_title = (params) => `Linked: ${params.name}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_linked_body = () => `Changes are automatically saved to this file.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_saving = () => `Saving…`


/**
 * @param {{ time: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_last_saved = (params) => `Last saved: ${params.time}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_save_now = () => `Save Now`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_change_file = () => `Change File...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_unlink = () => `Unlink`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_reconnect_title = () => `File link needs reconnection`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_reconnect_body = (params) => `The browser needs your permission to access "${params.name}" again. Click Reconnect to re-grant access.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_permission_denied = () => `Permission was denied. Reload the page to try again, or grant access in your browser settings.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_reconnect_button = () => `Reconnect`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_not_found_title = () => `Linked file not found`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_not_found_body = (params) => `File not found — "${params.name}" could not be located.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_data_safe = () => `Your data is safe in the browser.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_write_error_title = () => `File write error`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_write_error_body = (params) => `Failed to write to "${params.name}". The file may be locked or inaccessible.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_retry = () => `Retry`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_title = () => `Image Cache`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_body = () => `Card images are cached locally for faster loading.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_stat_label = () => `Cached images:`


/**
 * @param {{ count: NonNullable<unknown>, size: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_summary_one = (params) => `${params.count} image · ${params.size}`


/**
 * @param {{ count: NonNullable<unknown>, size: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_summary_other = (params) => `${params.count} images · ${params.size}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_clearing = () => `Clearing…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_clear = () => `Clear Image Cache`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_source = () => `Source`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_source_file = () => `File`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_source_paste = () => `Paste`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_source_url = () => `URL`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_target = () => `Import into`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_target_list = () => `New List`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_target_collection = () => `Collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_text_placeholder = () => `4 Lightning Bolt
2 Counterspell

Or paste CSV data...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_fetch = () => `Fetch`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_fetching = () => `Fetching…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_url_note_prefix = () => `Supported: Archidekt (public decks). Fetching sends a request to`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_url_note_suffix = () => `carrying the deck ID; no other data leaves your device. Any other site: export the deck as a file and use the File tab.`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_parsed_one = (params) => `${params.count} card parsed`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_parsed_other = (params) => `${params.count} cards parsed`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_could_not_read_file = () => `Could not read file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_failed_fetch = () => `Failed to fetch deck`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_default_list_name = () => `Imported List`


/**
 * @param {{ success: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_result_ok_one = (params) => `Imported ${params.success} card successfully.`


/**
 * @param {{ success: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_result_ok_other = (params) => `Imported ${params.success} cards successfully.`


/**
 * @param {{ success: NonNullable<unknown>, failed: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_result_partial_one = (params) => `Imported ${params.success} card, ${params.failed} failed.`


/**
 * @param {{ success: NonNullable<unknown>, failed: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_result_partial_other = (params) => `Imported ${params.success} cards, ${params.failed} failed.`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_not_found_one = (params) => `${params.count} card not found on Scryfall`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_not_found_other = (params) => `${params.count} cards not found on Scryfall`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_run_collection = () => `Import to Collection`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_run_list = () => `Import as New List`


/**
 * @param {{ current: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_progress = (params) => `Importing… (${params.current}/${params.total} batches)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_importing = () => `Importing…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_note_label = () => `Note:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_note_body = () => `You can always export or import your data later using the application controls.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_aria = () => `Confirm restore`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_title = () => `Restore over your database?`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_prefix = () => `Restoring`


/**
 * @param {{ lists: NonNullable<unknown>, cards: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_suffix = (params) => `your ${params.lists} and ${params.cards} with the contents of this file.`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_count_lists_one = (params) => `${params.count} card list`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_count_lists_other = (params) => `${params.count} card lists`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_count_collection_one = (params) => `${params.count} collection card`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_count_collection_other = (params) => `${params.count} collection cards`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_warning = () => `This action cannot be undone. Download a copy first if you may want the current data back.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_button = () => `Replace and Restore`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_aria = () => `Confirm new database`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_title = () => `Create new database?`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_prefix = () => `This will`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_strong = () => `permanently delete`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_suffix = () => `all your current data — card lists, collection, and settings.`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_unlink = (params) => `Your linked file "${params.name}" will be unlinked. The file itself won't be deleted, but it will no longer sync with the app.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_warning = () => `This action cannot be undone. Make sure you have a backup if needed.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_button = () => `Delete and Create New`


/**
 * @param {{ app: NonNullable<unknown>, appName: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_foreign_app = (params) => `This file was exported by "${params.app}", not ${params.appName}. Nothing was changed.`


/**
 * @param {{ appName: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_not_an_export = (params) => `This is not an ${params.appName} export — it contains no card lists or collection. Nothing was changed.`


/**
 * @param {{ version: NonNullable<unknown>, supported: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_unsupported_version = (params) => `This file is export format version ${params.version}; this app reads ${params.supported}. Update the app before restoring. Nothing was changed.`


/**
 * @param {{ declared: NonNullable<unknown>, actual: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_truncated_lists_one = (params) => `This file looks incomplete: it declares ${params.declared} card list but contains ${params.actual}. Nothing was changed.`


/**
 * @param {{ declared: NonNullable<unknown>, actual: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_truncated_lists_other = (params) => `This file looks incomplete: it declares ${params.declared} card lists but contains ${params.actual}. Nothing was changed.`


/**
 * @param {{ declared: NonNullable<unknown>, actual: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_truncated_cards_one = (params) => `This file looks incomplete: it declares ${params.declared} collection card but contains ${params.actual}. Nothing was changed.`


/**
 * @param {{ declared: NonNullable<unknown>, actual: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_truncated_cards_other = (params) => `This file looks incomplete: it declares ${params.declared} collection cards but contains ${params.actual}. Nothing was changed.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_unrecognised_format = () => `Unrecognised file format. Please choose a .yjs or .json file exported from this app. Nothing was changed.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_empty_payload = () => `This file contains no card lists and no collection cards, so restoring from it would erase your data and put nothing back. Nothing was changed — use "Create New Database" if you meant to start over.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_legacy = () => `Legacy export`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_lists_one = (params) => `${params.count} list`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_lists_other = (params) => `${params.count} lists`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_cards_one = (params) => `${params.count} collection card`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_cards_other = (params) => `${params.count} collection cards`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_no_deck_id = () => `Could not extract deck ID from Archidekt URL`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_archidekt_unreachable = () => `Could not reach Archidekt API (likely blocked by CORS). Try exporting the deck as a text file from Archidekt and importing the file instead.`


/**
 * @param {{ status: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_archidekt_status = (params) => `Archidekt API returned ${params.status}. Check that the deck is public.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_moxfield = () => `Moxfield deck URLs cannot be imported: Moxfield has no public API. In Moxfield, use "Export" to download the deck as a text file, then import it from the File tab (or paste it into the Text tab).`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_unsupported = () => `Unsupported URL. Only Archidekt deck URLs can be imported. Any other deck site: export the deck as a text file and use the File or Text tab.`


/**
 * @param {{ line: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_parse_missing_name = (params) => `Line ${params.line}: missing card name, skipped`


/**
 * @param {{ line: NonNullable<unknown>, text: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_parse_unparseable = (params) => `Line ${params.line}: could not parse "${params.text}", skipped`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const time_just_now = () => `just now`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const time_minutes_ago = (params) => `${params.count} min ago`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const time_hours_ago = (params) => `${params.count}h ago`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const time_days_ago = (params) => `${params.count}d ago`
