/* =====================================================
   Sakura Travel Mode — category metadata and lazy loader
   Phrase records live in separate JSON files by category.
===================================================== */
(function initializeSakuraTravelLoader() {
    if (window.SakuraTravelLoader) return;

    const categories = Object.freeze({
        trains: { title: "Trains & Stations", icon: "電", description: "Useful Japanese for tickets, platforms, transfers, and railway problems.", filters: ["All", "Essential", "Tickets", "Platforms", "Transfers", "Directions", "Problems"] },
        airports: { title: "Airports & Immigration", icon: "空", description: "Airport, check-in, immigration, baggage, security, boarding, and airport-rail help.", filters: ["All", "Essential", "Check-in", "Security", "Immigration", "Baggage", "Connections", "Departure", "Help"] },
        restaurants: { title: "Restaurants & Food", icon: "食", description: "Natural phrases for ordering, requests, reservations, and payment.", filters: ["All", "Essential", "Ordering", "Reservations", "Menu", "Requests", "Payment"] },
        shopping: { title: "Shopping", icon: "買", description: "Practical help with prices, sizes, stock, fitting, tax-free shopping, and payment.", filters: ["All", "Essential", "Sizes", "Stock", "Fitting", "Tax-Free", "Payment"] },
        hotels: { title: "Hotels", icon: "宿", description: "Check-in, luggage, room requests, check-out, and accommodation problems.", filters: ["All", "Essential", "Check-in", "Check-out", "Luggage", "Room Requests", "Problems"] },
        taxi: { title: "Taxi & Directions", icon: "車", description: "Tell a driver your destination, clarify directions, fares, and stops.", filters: ["All", "Essential", "Destination", "Directions", "Fare", "Stops"] },
        emergencies: { title: "Emergencies & Health", icon: "助", description: "Essential Japanese for medical help, pharmacies, police, and lost items.", filters: ["All", "Essential", "Medical", "Pharmacy", "Police", "Lost Items", "Help"] },
        others: { title: "Others", icon: "🌸", description: "More useful Japanese for little moments around Japan.", filters: ["All", "Convenience Stores", "Shrines & Temples", "Tickets & Admission", "Concerts & Live Events", "Anime & Exhibitions", "Aquariums & Zoos", "Theme Parks & Attractions", "Sightseeing & Photos", "General Tourist Situations"] }
    });
    const files = Object.freeze(Object.fromEntries(Object.keys(categories).map(category => [category, `./data/travel/${category}.json`])));
    const loadedByCategory = new Map();
    const inFlightByCategory = new Map();
    const generationByCategory = new Map(Object.keys(categories).map(category => [category, 0]));
    const validPriorities = new Set(["essential", "useful", "extra"]);
    const validPoliteness = new Set(["polite", "casual", "very-polite", "neutral"]);

    function requireCategory(category) {
        if (!Object.prototype.hasOwnProperty.call(categories, category)) throw new Error(`Invalid Travel category ${JSON.stringify(category)}.`);
        return category;
    }

    function validateTravelRecords(records, category) {
        const errors = [];
        const ids = new Set();
        const loadedIds = new Set([...loadedByCategory.entries()].filter(([loadedCategory]) => loadedCategory !== category).flatMap(([, loadedRecords]) => loadedRecords).map(record => record.id));
        const validSubcategories = new Set(categories[category].filters.filter(filter => filter !== "All"));
        const requiredStrings = ["id", "type", "category", "subcategory", "japanese", "reading", "romaji", "english", "politeness", "priority"];
        const valid = records.filter((record, index) => {
            const recordErrors = [];
            if (!record || typeof record !== "object" || Array.isArray(record)) recordErrors.push("must be an object");
            else {
                requiredStrings.forEach(field => { if (typeof record[field] !== "string" || !record[field].trim()) recordErrors.push(`${field} is required`); });
                if (record.type !== "travel") recordErrors.push('type must be "travel"');
                if (record.category !== category) recordErrors.push(`category must be "${category}"`);
                if (!validSubcategories.has(record.subcategory)) recordErrors.push(`invalid subcategory ${JSON.stringify(record.subcategory)}`);
                if (!validPriorities.has(record.priority)) recordErrors.push(`invalid priority ${JSON.stringify(record.priority)}`);
                if (!validPoliteness.has(record.politeness)) recordErrors.push(`invalid politeness ${JSON.stringify(record.politeness)}`);
                if (!Array.isArray(record.tags)) recordErrors.push("tags must be an array");
                if (ids.has(record.id)) recordErrors.push(`duplicate ID ${record.id}`);
                if (loadedIds.has(record.id)) recordErrors.push(`ID ${record.id} already exists in another loaded category`);
                ids.add(record.id);
            }
            if (recordErrors.length) errors.push(`[${category} record ${index}] ${recordErrors.join("; ")}`);
            return !recordErrors.length;
        });
        errors.forEach(error => console.error(`Travel validation: ${error}`));
        if (errors.length) console.warn(`Travel validation: skipped ${errors.length} invalid ${category} record(s).`);
        else console.info(`Travel validation: ${valid.length} ${category} phrase(s) valid.`);
        return valid;
    }

    function loadTravelCategory(category, refresh = false) {
        const validCategory = requireCategory(category);
        if (!refresh && loadedByCategory.has(validCategory)) return Promise.resolve(loadedByCategory.get(validCategory));
        if (inFlightByCategory.has(validCategory)) return inFlightByCategory.get(validCategory);
        const generation = generationByCategory.get(validCategory) || 0;
        let request;
        request = (async () => {
            const response = await fetch(files[validCategory]);
            if (!response.ok) throw new Error(`Could not load ${files[validCategory]} (HTTP ${response.status}).`);
            const records = await response.json();
            if (!Array.isArray(records)) throw new Error(`${files[validCategory]} must contain a JSON array.`);
            const validRecords = validateTravelRecords(records, validCategory);
            if (generationByCategory.get(validCategory) !== generation) return [];
            loadedByCategory.set(validCategory, validRecords);
            return validRecords;
        })().catch(error => {
            console.error(`Travel loader: ${validCategory} could not be loaded.`, error);
            throw error;
        }).finally(() => {
            if (inFlightByCategory.get(validCategory) === request) inFlightByCategory.delete(validCategory);
        });
        inFlightByCategory.set(validCategory, request);
        return request;
    }

    window.TRAVEL_CATEGORIES = categories;
    window.SakuraTravelLoader = Object.freeze({
        loadTravelCategory,
        refreshTravelCategory: category => loadTravelCategory(category, true),
        getTravelCategoryAsset: category => files[requireCategory(category)],
        forgetTravelCategories: categoriesToForget => {
            (categoriesToForget || Object.keys(categories)).forEach(category => {
                const validCategory = requireCategory(category);
                generationByCategory.set(validCategory, (generationByCategory.get(validCategory) || 0) + 1);
                loadedByCategory.delete(validCategory);
                inFlightByCategory.delete(validCategory);
            });
        },
        getLoadedTravelCategories: () => Object.keys(categories).filter(category => loadedByCategory.has(category)),
        getLoadedTravelPhrases: () => Object.keys(categories).flatMap(category => loadedByCategory.get(category) || []),
        getTravelPhrasesByCategory: category => [...(loadedByCategory.get(requireCategory(category)) || [])]
    });
}());
