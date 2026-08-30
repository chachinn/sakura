/* =====================================================
   Sakura Vocabulary — JLPT-level lazy loader
   Educational records live only in data/vocabulary/*.json.
===================================================== */
(function initializeSakuraVocabularyLoader() {
    if (window.SakuraVocabularyLoader) return;

    const levels = Object.freeze(["N5", "N4", "N3", "N2", "N1"]);
    const files = Object.freeze({
        N5: "./data/vocabulary/n5.json?v=2",
        N4: "./data/vocabulary/n4.json?v=2",
        N3: "./data/vocabulary/n3.json?v=2",
        N2: "./data/vocabulary/n2.json",
        N1: "./data/vocabulary/n1.json"
    });
    const supplementFiles = Object.freeze({
        N5: "./data/vocabulary/n5-family-supplement.json?v=1"
    });
    const loadedByLevel = new Map();
    const inFlightByLevel = new Map();

    function requireLevel(level) {
        if (!levels.includes(level)) throw new Error(`Invalid Vocabulary JLPT level ${JSON.stringify(level)}.`);
        return level;
    }

    function vocabularyIdentity(record) {
        return `${record.word}\u0000${record.kana}`;
    }

    function dedupeVocabularyRecords(records) {
        const seen = new Set();
        return records.filter(record => {
            const identity = vocabularyIdentity(record);
            if (seen.has(identity)) return false;
            seen.add(identity);
            return true;
        });
    }

    function validateVocabularyRecords(records, level) {
        const errors = [];
        const ids = new Set();
        const identities = new Set();
        const loadedIds = new Set(
            [...loadedByLevel.entries()]
                .filter(([loadedLevel]) => loadedLevel !== level)
                .flatMap(([, items]) => items)
                .map(item => item.id)
        );
        const loadedIdentities = new Set(
            [...loadedByLevel.entries()]
                .filter(([loadedLevel]) => loadedLevel !== level)
                .flatMap(([, items]) => items)
                .map(vocabularyIdentity)
        );
        const requiredStrings = [
            "id",
            "type",
            "word",
            "kana",
            "romaji",
            "meaning",
            "jlpt",
            "exampleSentence",
            "exampleTranslation",
            "notes"
        ];

        records.forEach((record, index) => {
            const label = `[${level} record ${index}]`;
            if (!record || typeof record !== "object" || Array.isArray(record)) {
                errors.push(`${label} must be an object.`);
                return;
            }

            requiredStrings.forEach(field => {
                if (typeof record[field] !== "string" || !record[field].trim()) {
                    errors.push(`${label} ${field} is required.`);
                }
            });

            if (record.type !== "vocabulary") errors.push(`${label} type must be vocabulary.`);
            if (record.jlpt !== level) errors.push(`${label} jlpt must be ${level}.`);

            if (ids.has(record.id) || loadedIds.has(record.id)) {
                errors.push(`${label} duplicate ID ${record.id}.`);
            }
            ids.add(record.id);

            const identity = vocabularyIdentity(record);
            if (identities.has(identity)) {
                errors.push(`${label} duplicate word+kana ${record.word} / ${record.kana}.`);
            }
            else if (loadedIdentities.has(identity)) {
                console.warn(
                    `Vocabulary validation: ${label} overlaps another loaded JLPT level: ` +
                    `${record.word} / ${record.kana}. Lower-level precedence will be used in combined views.`
                );
            }
            identities.add(identity);

            if (record.categories !== undefined && !Array.isArray(record.categories)) {
                errors.push(`${label} categories must be an array when present.`);
            }
        });

        if (errors.length) {
            errors.forEach(error => console.error(`Vocabulary validation: ${error}`));
            throw new Error(`${level} Vocabulary validation failed with ${errors.length} problem(s).`);
        }

        console.info(`Vocabulary validation passed: ${records.length} ${level} record(s).`);
        return records;
    }

    async function loadSupplement(level) {
        const supplementUrl = supplementFiles[level];
        if (!supplementUrl) return [];
        try {
            const response = await fetch(supplementUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const records = await response.json();
            if (!Array.isArray(records)) throw new Error("supplement must contain a JSON array");
            return records;
        }
        catch (error) {
            console.warn(`Vocabulary loader: optional ${level} supplement could not be loaded.`, error);
            return [];
        }
    }

    function loadVocabularyLevel(level) {
        const validLevel = requireLevel(level);
        if (loadedByLevel.has(validLevel)) return Promise.resolve(loadedByLevel.get(validLevel));
        if (inFlightByLevel.has(validLevel)) return inFlightByLevel.get(validLevel);

        const request = (async () => {
            const response = await fetch(files[validLevel]);
            if (!response.ok) throw new Error(`Could not load ${files[validLevel]} (HTTP ${response.status}).`);

            const records = await response.json();
            if (!Array.isArray(records)) throw new Error(`${files[validLevel]} must contain a JSON array.`);

            const supplement = await loadSupplement(validLevel);
            const validRecords = validateVocabularyRecords(
                dedupeVocabularyRecords([...records, ...supplement]),
                validLevel
            );
            loadedByLevel.set(validLevel, validRecords);
            return validRecords;
        })()
            .catch(error => {
                console.error(`Vocabulary loader: ${validLevel} could not be loaded.`, error);
                throw error;
            })
            .finally(() => inFlightByLevel.delete(validLevel));

        inFlightByLevel.set(validLevel, request);
        return request;
    }

    async function loadVocabularyLevels(requestedLevels) {
        if (!Array.isArray(requestedLevels)) {
            throw new Error("Vocabulary levels must be provided as an array.");
        }

        const requested = new Set(requestedLevels.map(requireLevel));
        const orderedLevels = levels.filter(level => requested.has(level));
        const groups = await Promise.all(orderedLevels.map(loadVocabularyLevel));

        // Keep the lowest JLPT level's copy when the same word+kana appears
        // in more than one study list. `levels` is ordered N5 -> N1.
        return dedupeVocabularyRecords(groups.flat());
    }

    function getLoadedVocabulary() {
        return dedupeVocabularyRecords(
            levels.flatMap(level => loadedByLevel.get(level) || [])
        );
    }

    function getLoadedVocabularyLevels() {
        return levels.filter(level => loadedByLevel.has(level));
    }

    function getStartupVocabularyLevels() {
        const required = new Set();

        try {
            const storedGlobal = JSON.parse(localStorage.getItem("chaGlobalJlptLevels") || "null");
            if (Array.isArray(storedGlobal)) {
                storedGlobal.forEach(level => {
                    if (levels.includes(level)) required.add(level);
                });
            }

            const storedSections = JSON.parse(localStorage.getItem("chaSectionJlptLevels") || "null");
            ["wordOfDay", "randomVocabulary", "vocabularyQuiz"].forEach(sectionName => {
                const setting = storedSections?.[sectionName];
                if (setting?.useGlobal === false && Array.isArray(setting.levels)) {
                    setting.levels.forEach(level => {
                        if (levels.includes(level)) required.add(level);
                    });
                }
            });
        }
        catch (error) {
            console.warn("Vocabulary loader: stored JLPT preferences could not be read; using N5.", error);
        }

        if (!required.size) required.add("N5");
        return levels.filter(level => required.has(level));
    }

    window.SakuraVocabularyLoader = Object.freeze({
        levels,
        files,
        supplementFiles,
        loadVocabularyLevel,
        loadVocabularyLevels,
        loadAllVocabulary: () => loadVocabularyLevels(levels),
        getLoadedVocabulary,
        getLoadedVocabularyLevels,
        getStartupVocabularyLevels
    });

    window.VOCABULARY_DATA_READY = loadVocabularyLevels(getStartupVocabularyLevels())
        .then(records => {
            window.VOCABULARY_DATA = records;
            return records;
        })
        .catch(error => {
            console.error("Sakura could not initialize the Vocabulary dataset.", error);
            throw error;
        });
}());
