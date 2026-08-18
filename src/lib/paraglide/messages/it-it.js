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
export const common_cancel = () => `Annulla`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_close = () => `Chiudi`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_copy = () => `Copia`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_delete = () => `Elimina`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_save = () => `Salva`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_import = () => `Importa`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_export = () => `Esporta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_loading = () => `Caricamento…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_generic = () => `Generica`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_specific = () => `Specifica`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_any = () => `Qualsiasi`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_strict = () => `Rigorosa`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_card_matching_label = () => `Corrispondenza carte:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_language_label = () => `Lingua:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_filter_placeholder = () => `Filtra le carte...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_sort_by_name = () => `Ordina per nome`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_sort_by_quantity = () => `Ordina per quantità`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_sort_by_set = () => `Ordina per set`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_add_cards = () => `Aggiungi carte`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_no_cards_match_filter = () => `Nessuna carta corrisponde al filtro`


/**
 * @param {{ shown: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_showing_of = (params) => `Mostrate ${params.shown} carte su ${params.total}...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_flip_card = () => `Gira la carta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_no_database_selected = () => `Nessun database selezionato`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_cannot_be_undone = () => `L'operazione non può essere annullata.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const common_read_only_hint = () => `Scegli un database per poter modificare — premi "Anteprima" nell'intestazione`


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
export const nav_collection = () => `Collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const nav_card_lists = () => `Liste di carte`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const header_db_button_title = () => `Gestione database`


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
export const header_db_peek = () => `Anteprima`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const header_db_none = () => `Scegli DB`


/**
 * @param {{ year: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_credit = (params) => `© 2025–${params.year} Lord M'zn · Tutto in locale · Fatto per la comunità`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_diagnostics = () => `Diagnostica`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_contribute = () => `Contribuisci`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_support = () => `Sostieni:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_language = () => `Lingua`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_wotc_disclaimer = () => `LM Deck Tools non è affiliata, approvata, sponsorizzata né autorizzata da Wizards of the Coast LLC. Magic: The Gathering è un marchio di Wizards of the Coast LLC.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_scryfall_prefix = () => `Dati delle carte forniti da`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_scryfall_middle = () => `. Scryfall non è affiliata a questo progetto. L'uso dei dati di Scryfall è soggetto ai loro`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_scryfall_api_terms = () => `termini d'uso dell'API`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_privacy = () => `Questa app funziona interamente nel tuo browser. Nessun dato personale viene raccolto, trasmesso o conservato su alcun server. Tutti i dati (mazzi, collezione, immagini in cache) sono salvati localmente tramite IndexedDB e la Cache API. Non usiamo cookie. Non c'è alcun sistema di analytics.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const footer_license_prefix = () => `Distribuita con licenza`


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
export const home_meta_title = () => `LM Deck Tools — Traccia la tua rotta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_meta_description = () => `Gestisci le tue liste di carte e la tua collezione di Magic: The Gathering. Ogni asse dei tuoi dati resta a bordo del tuo dispositivo — niente account, niente server, niente intermediari.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_eyebrow = () => `Nessun capitano · Nessun porto · Il tuo tesoro`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_hero_title_line1 = () => `Traccia la Tua`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_hero_title_line2 = () => `Rotta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_hero_subtitle = () => `Gestisci le tue liste di carte e la tua collezione di Magic: The Gathering. Ogni asse dei tuoi dati resta a bordo del tuo dispositivo — niente account, niente server, niente intermediari.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_cta_card_lists = () => `Gestisci le liste`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_cta_collection = () => `Gestisci la collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_principle_local_first = () => `Tutto in locale`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_principle_zero_tracking = () => `Zero tracciamento`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_principle_open_format = () => `Formati aperti`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_principle_no_account = () => `Nessun account`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_lists_title = () => `Liste di carte`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_lists_body = () => `Crea e gestisci liste di carte con un nome. Cerca nell'intero catalogo di Scryfall e confronta ciò che ti serve con quello che hai già in collezione.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_hoard_title = () => `Conta il tuo bottino`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_hoard_body = () => `Tieni l'inventario di ogni carta che possiedi. Vedi a colpo d'occhio cosa c'è nella stiva e cosa ti manca per completare le liste.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_portability_title = () => `Importa & Esporta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_feature_portability_body = () => `Muovi i dati come vuoi. Testo semplice in entrata, testo semplice in uscita. Passa le liste alla ciurma o metti da parte una copia — il tuo tesoro, le tue regole.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_start_eyebrow = () => `Si salpa`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_start_title = () => `Come iniziare`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step1_title = () => `Registra il bottino`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step1_body = () => `Aggiungi alla collezione le carte che possiedi. Cercale una a una o importale in blocco.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step2_title = () => `Traccia le liste`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step2_body = () => `Costruisci le liste cercando su Scryfall. Il possesso compare da sé.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step3_title = () => `Misura la distanza`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step3_body = () => `Guarda quali liste sono complete e quali carte ti mancano ancora.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step4_title = () => `Condividi senza vincoli`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_step4_body = () => `Esporta in testo semplice per condividere, scambiare o mettere al sicuro i tuoi dati.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_compact_label = () => `Il Patto`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_compact_lead = () => `Abbiamo costruito questo strumento sugli stessi principi che governavano le navi più leali dei sette mari —`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_compact_lead_strong = () => `trasparenza in ogni manovra, nessuna autorità centrale, e ogni mano sovrana sul proprio tesoro.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_1_title = () => `I tuoi dati non lasciano mai il tuo dispositivo.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_1_body = () => `Nessun server, nessuna nuvola, nessun database di terzi.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_2_title = () => `Nessun account, nessun tracciamento.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_2_body = () => `Non sappiamo chi sei e non vogliamo saperlo.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_3_title = () => `Formati aperti e portabili.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_3_body = () => `Esporta quando vuoi. La tua collezione è tua, ovunque tu decida di navigare.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_4_title = () => `Codice trasparente.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const home_article_4_body = () => `Ogni asse di questa nave è a vista. Nessuna stiva segreta.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_meta_title = () => `La mia collezione · LM Deck Tools`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_meta_description = () => `Registra ogni carta di Magic: The Gathering che possiedi, cercane di nuove su Scryfall e tieni in ordine le quantità. La tua stiva resta sul tuo dispositivo.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_eyebrow = () => `La Stiva`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_title = () => `La mia collezione`


/**
 * @param {{ total: NonNullable<unknown>, unique: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_count = (params) => `${params.total} carte (${params.unique} uniche)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_add_modal_title = () => `Aggiungi carte alla collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_empty_title = () => `La tua stiva è vuota`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_empty_body = () => `Premi "Aggiungi carte" per iniziare a registrare quello che possiedi`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_no_db_body = () => `Premi "Scegli DB" per cominciare`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_notify_added = (params) => `${params.name} aggiunta alla collezione`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_notify_added_single = (params) => `Aggiunta una copia di ${params.name}`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_notify_removed_single = (params) => `Rimossa una copia di ${params.name}`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const collection_notify_updated = (params) => `Quantità di ${params.name} aggiornata`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_placeholder = () => `Cerca delle carte...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_searching = () => `Ricerca in corso...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_button = () => `Cerca`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_all_prints = () => `tutte le stampe`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_unique = () => `uniche`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_show_all_prints = () => `Mostra tutte le versioni stampate`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_results_found = (params) => `${params.count} risultati trovati`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_no_results = () => `Nessun risultato`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_found_cards = (params) => `Trovate ${params.count} carte`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_failed = () => `Ricerca fallita`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_empty_title = () => `Cerca le carte da aggiungere alla lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_learn_syntax = () => `Impara la sintassi di Scryfall`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const search_hexagram_48 = () => `Si attinge al pozzo senza impedimento.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_add_card = () => `Impossibile aggiungere la carta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_remove_card = () => `Impossibile rimuovere la carta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_update_quantity = () => `Impossibile aggiornare la quantità`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_create_list = () => `Impossibile creare la lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_delete_list = () => `Impossibile eliminare la lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_rename_list = () => `Impossibile rinominare la lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_import_failed = () => `Importazione fallita`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_add_all_to_collection = () => `Impossibile aggiungere le carte alla collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_failed_add_card_to_collection = () => `Impossibile aggiungere la carta alla collezione`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_own_badge = (params) => `Hai: ${params.count}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_add_to_collection_button = () => `Aggiungi alla collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_add_to_list_button = () => `Aggiungi alla lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_remove_from_list = () => `Rimuovi dalla lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_decrease_quantity = () => `Riduci la quantità`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_increase_quantity = () => `Aumenta la quantità`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_add_to_collection = () => `Aggiungi alla collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_action_to_collection = () => `In collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_remove_card = () => `Rimuovi carta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_action_remove = () => `Rimuovi`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_owned = () => `✓ Posseduta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_missing = () => `✗ Mancante`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_remove_single = () => `Togline una`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_add_single = () => `Aggiungine una`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_edit_quantity = () => `Modifica la quantità`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_edit_quantity_title = () => `Modifica quantità`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const card_quantity_label = () => `Quantità:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_meta_title = () => `Liste di carte · LM Deck Tools`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_meta_description = () => `Costruisci, importa ed esporta mazzi e liste di carte di Magic: The Gathering. Ogni rotta che tracci resta nel tuo browser — niente account, niente server.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_label = () => `Liste`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_none = () => `Nessuna lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_button = () => `Elimina lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_button_title = () => `Elimina questa lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_compare_button = () => `Confronta liste`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_new_button = () => `Nuova lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_current_chart = () => `Mappa corrente`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_no_list_selected = () => `Nessuna lista selezionata`


/**
 * @param {{ total: NonNullable<unknown>, unique: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_count = (params) => `${params.total} carte (${params.unique} uniche)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_add_all_to_collection = () => `Aggiungi tutto alla collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_add_all_to_collection_title = () => `Aggiungi alla collezione tutte le carte della lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_add_cards_modal_title = () => `Aggiungi carte alla lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_modal_title = () => `Importa lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_hint = () => `Incolla una lista di carte nel formato standard:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_placeholder = () => `# Nome della lista
4 Lightning Bolt
2 Mountain`


/**
 * @param {{ current: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_progress = (params) => `Importazione… (${params.current}/${params.total})`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_importing = () => `Importazione…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_import_submit = () => `Carica lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_modal_title = () => `Elimina lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_modal_aria = () => `Conferma eliminazione della lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_delete_confirm_prefix = () => `Vuoi davvero eliminare`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_export_modal_title = () => `Esporta lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_copied = () => `Copiato!`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_added_card = (params) => `${params.name} aggiunta alla lista`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_removed_card = (params) => `${params.name} rimossa dalla lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_created = () => `Nuova lista creata`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_deleted = () => `Lista eliminata`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_imported = () => `Lista importata`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_added_to_collection_one = (params) => `${params.count} carta aggiunta alla collezione`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_added_to_collection_other = (params) => `${params.count} carte aggiunte alla collezione`


/**
 * @param {{ added: NonNullable<unknown>, failed: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_notify_added_partial = (params) => `Aggiunte ${params.added}, fallite ${params.failed}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_owned_banner = () => `✓ Completa — hai tutte le carte di questa lista`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_missing_banner_one = (params) => `✗ Manca ${params.count} carta`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_missing_banner_other = (params) => `✗ Mancano ${params.count} carte`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_empty_title = () => `Ancora nessuna carta nella lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const lists_empty_body = () => `Premi "Aggiungi carte" per cominciare`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const linked_toast_suffix = () => `è stato modificato fuori dall'app.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const linked_toast_merge = () => `Unisci`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const linked_toast_ignore = () => `Ignora`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_aria = () => `Controlla cosa porterà l'unione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_title = () => `Unisci dal file`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_intro = (params) => `Unire "${params.name}" a questo dispositivo porta:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_loading = () => `Lettura del file…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_error = () => `Non è stato possibile leggere il file collegato.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_unchanged = () => `Questo file non contiene nulla che manchi al tuo database. Non c'è niente da unire.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_additive = () => `Non verrà rimosso nulla. Le carte che hai e che il file non ha restano dove sono.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_collection = () => `Collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_confirm = () => `Unisci`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_preview_close = () => `Chiudi`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_delta_added_one = (params) => `${params.count} carta aggiunta`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_delta_added_other = (params) => `${params.count} carte aggiunte`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_delta_new = (params) => `(${params.count} nuove)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_delta_all_copies = () => `(tutte copie in più)`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_delta_new_list_one = (params) => `nuova lista, ${params.count} carta`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_delta_new_list_other = (params) => `nuova lista, ${params.count} carte`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const merge_delta_settings = () => `impostazioni di corrispondenza aggiornate`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_meta_title = () => `Confronta liste · LM Deck Tools`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_meta_description = () => `Affianca due liste di carte di Magic: The Gathering e scopri cosa tiene ciascuna da sola e cosa hanno in comune.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_export_modal_title = () => `Esporta confronto`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_need_two_lists = () => `Servono almeno due liste di carte da confrontare.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_back_to_lists = () => `Torna alle liste`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_eyebrow = () => `Due mappe, una sola rotta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_title = () => `Confronta liste`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_list_a = () => `Lista A:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_list_b = () => `Lista B:`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_badge_only_a = (params) => `${params.count} solo in A`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_badge_both = (params) => `${params.count} in entrambe`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_badge_only_b = (params) => `${params.count} solo in B`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_column_only_in = (params) => `Solo in ${params.name}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_column_both = () => `In entrambe le liste`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_tab_only_a = (params) => `Solo A (${params.count})`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_tab_both = (params) => `Entrambe (${params.count})`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_tab_only_b = (params) => `Solo B (${params.count})`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const compare_no_cards = () => `Nessuna carta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_meta_title = () => `Diagnostica · LM Deck Tools`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_meta_description = () => `Gli errori che questa app ha registrato sul tuo dispositivo. Leggili, esportali o apri una segnalazione GitHub precompilata — da qui non parte nulla da solo.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_eyebrow = () => `Il Giornale di Bordo`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_title = () => `Diagnostica`


/**
 * @param {{ maxEntries: NonNullable<unknown>, maxAgeDays: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_intro = (params) => `Gli errori in cui questa app è incappata, registrati sul tuo dispositivo e da nessun'altra parte. Nulla di quanto vedi qui viene inviato altrove, a meno che tu non lo esporti o scelga di aprire una segnalazione su GitHub. Il giornale conserva le ultime ${params.maxEntries} voci e scarta tutto ciò che ha più di ${params.maxAgeDays} giorni.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_export_json = () => `Esporta JSON`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_clear_all = () => `Cancella tutto`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_no_db_title = () => `Nessun database aperto`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_no_db_body = () => `Gli errori vengono registrati nel tuo database locale — premi "Scegli DB" nell'intestazione per iniziare a raccoglierli.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_empty_title = () => `Nessun errore registrato`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_empty_body = () => `Mare calmo, finora.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_search_placeholder = () => `Cerca fra gli errori...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_all_categories = () => `Tutte le categorie`


/**
 * @param {{ shown: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_shown_of_total = (params) => `${params.shown} su ${params.total}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_select_shown = () => `Seleziona i mostrati`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_clear_selection = () => `Deseleziona tutto`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_report_selected = (params) => `Segnala ${params.count} su GitHub`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_report = () => `Segnala su GitHub`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_no_match = () => `Nessun errore corrisponde al filtro`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_select_entry_aria = () => `Seleziona l'errore da segnalare`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_hide_details = () => `Nascondi dettagli`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_show_details = () => `Mostra dettagli`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_clear_confirm_title = () => `Cancellare il giornale degli errori?`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_clear_confirm_body = (params) => `Tutti i ${params.count} errori registrati verranno eliminati da questo dispositivo. Esportali prima, se pensi di segnalare un problema.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_report_body_prefix = () => `Questo apre una nuova segnalazione precompilata su`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_report_body_suffix = () => `in una nuova scheda. Qui sotto c'è esattamente ciò che verrebbe inviato — nient'altro lascia il tuo dispositivo, e puoi comunque modificare o abbandonare la segnalazione lì.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const diagnostics_open_issue = () => `Apri la segnalazione su GitHub`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_stat_lists = () => `Liste di carte:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_stat_list_cards = () => `Carte nelle liste:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_stat_collection = () => `Carte in collezione:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_modal_title = () => `Benvenuto in LM Deck Tools`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_modal_subtitle = () => `Scegli come iniziare la tua collezione MTG`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_tab_local = () => `DB nel browser`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_tab_file = () => `DB su file`


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
export const db_tab_import = () => `Importa`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_tab_export = () => `Esporta`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_local_searching = () => `Ricerca del database locale`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_local_found = () => `Database locale trovato`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_local_active = () => `Database locale attivo`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_peek_notice = () => `Anteprima in sola lettura. Premi "Connetti" per poter modificare.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_connect_local = () => `Connetti al DB locale`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_title = () => `Scarica una copia`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_body = () => `Scarica una copia completa del tuo database (collezione + tutte le liste di carte). È un'istantanea singola — per un file che continua a salvarsi da sé, collegane uno da DB su file.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_started = () => `Download avviato.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_preparing = () => `Preparazione…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_download_button = () => `Scarica il file .yjs`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_title = () => `Ripristina da file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_body_prefix = () => `Ripristina il database da una copia scaricata in precedenza. Questa operazione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_replaces = () => `sostituisce`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_body_suffix = () => `tutto quello che è archiviato ora — per unire un file a ciò che hai già, collegalo invece da DB su file.`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_selected_file = (params) => `File scelto: ${params.name}`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_success_one = (params) => `Ripristinata ${params.count} lista.`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_success_other = (params) => `Ripristinate ${params.count} liste.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_link_hint_prefix = () => `Collega un file da`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_link_hint_suffix = () => `per far sì che questa copia continui a salvarsi da sé, oppure chiudi questa finestra.`


/**
 * @param {{ imported: NonNullable<unknown>, errors: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_partial = (params) => `Ripristinate ${params.imported}, fallite ${params.errors}.`


/**
 * @param {{ current: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_progress = (params) => `Ripristino… (${params.current}/${params.total} liste)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restoring = () => `Ripristino…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_button = () => `Ripristina da file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_no_fs_access = () => `Il salvataggio automatico su un file collegato richiede Chrome 86+, Edge 86+ o Safari 15.2+, quindi questo browser non ha la scheda DB su file. Scarica e ripristina le copie da qui.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_title = () => `Parti da zero`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_body = () => `Crea un nuovo database vuoto. Tutti i dati esistenti verranno cancellati.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_button = () => `Crea nuovo database`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_could_not_read_file = () => `Impossibile leggere questo file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_failed_to_import_file = () => `Importazione del file fallita`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_intro = () => `Esporta la tua collezione per usarla con altri strumenti e servizi.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_format_label = () => `Formato:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_csv_hint = () => `Una colonna per campo, si apre in un foglio di calcolo e si reimporta in questa app.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_format_text = () => `Testo`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_text_hint = () => `Righe separate da spazi (4 Lightning Bolt) da incollare in altri strumenti per MTG.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_fields_label = () => `Campi da includere:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_count = () => `Quantità`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_name = () => `Nome`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_edition = () => `Edizione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_collector_number = () => `N° collezionista`


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
export const db_export_field_language = () => `Lingua`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_field_scryfall_id = () => `ID Scryfall`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_placeholder = () => `Scegli i campi per generare l'anteprima...`


/**
 * @param {{ shown: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_truncated = (params) => `Anteprima — prime ${params.shown} carte su ${params.total}. Il download e la copia le includono tutte.`


/**
 * @param {{ total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_all_one = (params) => `Anteprima — ${params.total} carta in tutto.`


/**
 * @param {{ total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_all_other = (params) => `Anteprima — tutte le ${params.total} carte.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_preview_empty = () => `Non c'è ancora nulla da esportare — la tua collezione è vuota.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_download = () => `Scarica il file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_export_copy = () => `Copia negli appunti`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_link_title = () => `Collega un file (la nuvola è la tua)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_link_body = () => `Salva i tuoi dati in un file su disco. Mettilo in una cartella sincronizzata (Dropbox, iCloud, OneDrive) per averli su più dispositivi senza che nessun server sia coinvolto.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_link_new_file = () => `Nuovo file...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_link_existing_file = () => `File esistente...`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_linked_title = (params) => `Collegato: ${params.name}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_linked_body = () => `Le modifiche vengono salvate automaticamente su questo file.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_saving = () => `Salvataggio…`


/**
 * @param {{ time: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_last_saved = (params) => `Ultimo salvataggio: ${params.time}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_save_now = () => `Salva ora`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_change_file = () => `Cambia file...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_unlink = () => `Scollega`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_reconnect_title = () => `Il collegamento al file va ristabilito`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_reconnect_body = (params) => `Il browser ha bisogno del tuo permesso per accedere di nuovo a "${params.name}". Premi Riconnetti per concederlo.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_permission_denied = () => `Permesso negato. Ricarica la pagina per riprovare, oppure concedi l'accesso dalle impostazioni del browser.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_reconnect_button = () => `Riconnetti`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_not_found_title = () => `File collegato non trovato`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_not_found_body = (params) => `File non trovato — non è stato possibile localizzare "${params.name}".`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_data_safe = () => `I tuoi dati sono al sicuro nel browser.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_write_error_title = () => `Errore di scrittura del file`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_write_error_body = (params) => `Scrittura su "${params.name}" fallita. Il file potrebbe essere bloccato o non raggiungibile.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_retry = () => `Riprova`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_title = () => `Cache delle immagini`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_body = () => `Le immagini delle carte vengono tenute in cache in locale per caricarle più in fretta.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_stat_label = () => `Immagini in cache:`


/**
 * @param {{ count: NonNullable<unknown>, size: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_summary_one = (params) => `${params.count} immagine · ${params.size}`


/**
 * @param {{ count: NonNullable<unknown>, size: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_summary_other = (params) => `${params.count} immagini · ${params.size}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_clearing = () => `Svuotamento…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_cache_clear = () => `Svuota la cache delle immagini`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_source = () => `Origine`


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
export const db_import_source_paste = () => `Incolla`


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
export const db_import_target = () => `Importa in`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_target_list = () => `Nuova lista`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_target_collection = () => `Collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_text_placeholder = () => `4 Lightning Bolt
2 Counterspell

Oppure incolla dei dati CSV...`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_fetch = () => `Scarica`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_fetching = () => `Scaricamento…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_url_note_prefix = () => `Supportato: Archidekt (mazzi pubblici). Lo scaricamento invia una richiesta a`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_url_note_suffix = () => `con l'ID del mazzo; nessun altro dato lascia il tuo dispositivo. Per qualsiasi altro sito: esporta il mazzo come file e usa la scheda File.`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_parsed_one = (params) => `${params.count} carta riconosciuta`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_parsed_other = (params) => `${params.count} carte riconosciute`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_could_not_read_file = () => `Impossibile leggere il file`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_failed_fetch = () => `Impossibile scaricare il mazzo`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_default_list_name = () => `Lista importata`


/**
 * @param {{ success: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_result_ok_one = (params) => `Importata ${params.success} carta.`


/**
 * @param {{ success: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_result_ok_other = (params) => `Importate ${params.success} carte.`


/**
 * @param {{ success: NonNullable<unknown>, failed: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_result_partial_one = (params) => `Importata ${params.success} carta, ${params.failed} fallite.`


/**
 * @param {{ success: NonNullable<unknown>, failed: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_result_partial_other = (params) => `Importate ${params.success} carte, ${params.failed} fallite.`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_not_found_one = (params) => `${params.count} carta non trovata su Scryfall`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_not_found_other = (params) => `${params.count} carte non trovate su Scryfall`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_run_collection = () => `Importa nella collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_run_list = () => `Importa come nuova lista`


/**
 * @param {{ current: NonNullable<unknown>, total: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_import_progress = (params) => `Importazione… (${params.current}/${params.total} blocchi)`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_importing = () => `Importazione…`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_note_label = () => `Nota:`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_note_body = () => `Puoi sempre esportare o importare i tuoi dati in un secondo momento dai comandi dell'applicazione.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_aria = () => `Conferma ripristino`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_title = () => `Ripristinare sopra il tuo database?`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_prefix = () => `Il ripristino`


/**
 * @param {{ lists: NonNullable<unknown>, cards: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_suffix = (params) => `le tue ${params.lists} e le tue ${params.cards} con il contenuto di questo file.`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_count_lists_one = (params) => `${params.count} lista di carte`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_count_lists_other = (params) => `${params.count} liste di carte`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_count_collection_one = (params) => `${params.count} carta in collezione`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_count_collection_other = (params) => `${params.count} carte in collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_warning = () => `L'operazione non può essere annullata. Scarica prima una copia se pensi di rivolere i dati attuali.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_restore_confirm_button = () => `Sostituisci e ripristina`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_aria = () => `Conferma nuovo database`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_title = () => `Creare un nuovo database?`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_prefix = () => `Questa operazione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_strong = () => `cancella per sempre`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_suffix = () => `tutti i tuoi dati attuali — liste di carte, collezione e impostazioni.`


/**
 * @param {{ name: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_unlink = (params) => `Il file collegato "${params.name}" verrà scollegato. Il file in sé non verrà eliminato, ma smetterà di sincronizzarsi con l'app.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_warning = () => `L'operazione non può essere annullata. Assicurati di avere una copia se ti serve.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const db_create_confirm_button = () => `Cancella e crea nuovo`


/**
 * @param {{ app: NonNullable<unknown>, appName: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_foreign_app = (params) => `Questo file è stato esportato da "${params.app}", non da ${params.appName}. Non è stato modificato nulla.`


/**
 * @param {{ appName: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_not_an_export = (params) => `Questo non è un export di ${params.appName} — non contiene liste di carte né collezione. Non è stato modificato nulla.`


/**
 * @param {{ version: NonNullable<unknown>, supported: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_unsupported_version = (params) => `Questo file usa la versione ${params.version} del formato di export; questa app legge ${params.supported}. Aggiorna l'app prima di ripristinare. Non è stato modificato nulla.`


/**
 * @param {{ declared: NonNullable<unknown>, actual: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_truncated_lists_one = (params) => `Questo file sembra incompleto: ne dichiara ${params.declared} lista di carte ma ne contiene ${params.actual}. Non è stato modificato nulla.`


/**
 * @param {{ declared: NonNullable<unknown>, actual: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_truncated_lists_other = (params) => `Questo file sembra incompleto: ne dichiara ${params.declared} liste di carte ma ne contiene ${params.actual}. Non è stato modificato nulla.`


/**
 * @param {{ declared: NonNullable<unknown>, actual: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_truncated_cards_one = (params) => `Questo file sembra incompleto: ne dichiara ${params.declared} carta in collezione ma ne contiene ${params.actual}. Non è stato modificato nulla.`


/**
 * @param {{ declared: NonNullable<unknown>, actual: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_truncated_cards_other = (params) => `Questo file sembra incompleto: ne dichiara ${params.declared} carte in collezione ma ne contiene ${params.actual}. Non è stato modificato nulla.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_unrecognised_format = () => `Formato del file non riconosciuto. Scegli un file .yjs o .json esportato da questa app. Non è stato modificato nulla.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_error_empty_payload = () => `Questo file non contiene né liste di carte né carte in collezione: ripristinarlo cancellerebbe i tuoi dati senza rimettere nulla al loro posto. Non è stato modificato nulla — usa "Crea nuovo database" se volevi ripartire da zero.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_legacy = () => `Export di vecchio formato`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_lists_one = (params) => `${params.count} lista`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_lists_other = (params) => `${params.count} liste`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_cards_one = (params) => `${params.count} carta in collezione`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_summary_cards_other = (params) => `${params.count} carte in collezione`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_no_deck_id = () => `Impossibile ricavare l'ID del mazzo dall'URL di Archidekt`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_archidekt_unreachable = () => `Impossibile raggiungere l'API di Archidekt (probabilmente bloccata dal CORS). Prova a esportare il mazzo come file di testo da Archidekt e a importare il file.`


/**
 * @param {{ status: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_archidekt_status = (params) => `L'API di Archidekt ha risposto ${params.status}. Controlla che il mazzo sia pubblico.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_moxfield = () => `Gli URL dei mazzi di Moxfield non si possono importare: Moxfield non ha un'API pubblica. Su Moxfield usa "Export" per scaricare il mazzo come file di testo, poi importalo dalla scheda File (o incollalo nella scheda Incolla).`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_url_unsupported = () => `URL non supportato. Si possono importare solo gli URL dei mazzi di Archidekt. Per qualsiasi altro sito: esporta il mazzo come file di testo e usa la scheda File o Incolla.`


/**
 * @param {{ line: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_parse_missing_name = (params) => `Riga ${params.line}: manca il nome della carta, saltata`


/**
 * @param {{ line: NonNullable<unknown>, text: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const import_parse_unparseable = (params) => `Riga ${params.line}: impossibile interpretare "${params.text}", saltata`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const time_just_now = () => `proprio ora`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const time_minutes_ago = (params) => `${params.count} min fa`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const time_hours_ago = (params) => `${params.count} h fa`


/**
 * @param {{ count: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const time_days_ago = (params) => `${params.count} g fa`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_meta_title = () => `Fuori rotta · LM Deck Tools`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_meta_description = () => `Questa pagina non è sulla mappa.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_eyebrow = () => `Fuori rotta`


/**
 * @param {{ status: NonNullable<unknown> }} params
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_status = (params) => `Errore ${params.status}`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_not_found_title = () => `Questo porto non è sulla mappa`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_not_found_body = () => `L'indirizzo che hai seguito non porta da nessuna parte in questa app. Non hai perso nulla: le tue liste e la tua collezione sono al sicuro nel browser.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_generic_title = () => `Siamo finiti in secca`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_generic_body = () => `L'app ha incontrato un errore da cui non è riuscita a riprendersi. Le tue liste e la tua collezione sono salvate nel browser e non sono state toccate.`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_cta_home = () => `Torna in porto`


/**
 * 
 * @returns {string}
 */
/* @__NO_SIDE_EFFECTS__ */
export const error_cta_diagnostics = () => `Apri il giornale di bordo`
