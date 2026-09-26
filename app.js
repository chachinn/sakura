/* =====================================================
   Sakura — mobile Japanese-learning PWA
   Plain JavaScript, local data with optional API enhancement
===================================================== */

const STORAGE = {
    saved: "chaSavedLearningItems",
    statuses: "chaFlashcardStatuses",
    globalLevels: "chaGlobalJlptLevels",
    sectionLevels: "chaSectionJlptLevels",
    quizStats: "chaQuizStats",
    activeQuiz: "chaActiveQuizType",
    mastery: "sakuraMastery",
    dailyProgress: "sakuraDailyProgress",
    kanaQuizGroups: "sakuraKanaQuizGroups",
    recentSearches: "chaRecentSearches",
    kaomojiUsage: "sakuraKaomojiUsage",
    quizRomaji: "sakuraKanjiQuizRomajiVisible",
    chibiPosition: "sakuraChibiCompanionPosition",
    railGuidePrefs: "sakuraRailGuidePrefs",
    userNative: "sakura_user_native_entries",
    userSlang: "sakura_user_slang_entries",
    nativeHistory: "sakura_native_recent_history",
    appearanceTheme: "sakuraAppearanceTheme",
    chibiGuide: "sakuraChibiGuide",
    customAccent: "sakuraCustomAccentColor",
    wallpaperOverlay: "sakuraWallpaperOverlay",
    wallpaperFraming: "sakuraWallpaperFraming",
    translationHistory: "sakuraTranslationHistory",
    pinnedTravelPhrases: "sakuraPinnedTravelPhrases",
    travelPhraseDecks: "sakuraTravelPhraseDecks",
    travelNotes: "sakuraTravelNotes",
    travelCountdown: "sakuraTravelCountdown",
    travelModeEnabled: "sakuraTravelModeEnabled",
    navigationModeOnboarding: "sakuraNavigationModeOnboardingV1",
    travelOfflinePack: "sakuraTravelOfflinePack",
    yenConverter: "sakuraYenConverter",
    migrationVersion: "sakuraDataMigrationVersion",
    nativeDifficulty: "chaNativeDifficulty",
    wallpaperEnabled: "chaWallpaperEnabled",
    wallpaper: "lastWallpaper"
};

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const DEFAULT_LEVELS = ["N5"];
function normalizeJlptLevels(values, fallback = DEFAULT_LEVELS) {
    const requested = new Set(Array.isArray(values) ? values : []);
    const normalized = JLPT_LEVELS.filter(level => requested.has(level));
    return normalized.length ? normalized : [...fallback];
}

const DATA_MIGRATION_VERSION = 1;
const LEGACY_KANJI_IDS = {
    "kanji-n5-day": "kanji-65e5",
    "kanji-n5-study": "kanji-5b66",
    "kanji-n4-trip": "kanji-65c5",
    "kanji-n4-special": "kanji-7279",
    "kanji-n3-deep": "kanji-6df1",
    "kanji-n3-continue": "kanji-7d9a",
    "kanji-n2-support": "kanji-652f",
    "kanji-n2-recognize": "kanji-8a8d",
    "kanji-n1-carry": "kanji-643a",
    "kanji-n1-moment": "kanji-77ac"
};
const PERMANENT_KANJI_IDS = new Set(Object.values(LEGACY_KANJI_IDS));
const SECTION_NAMES = ["kanjiOfDay", "wordOfDay", "randomKanji", "randomVocabulary", "kanjiQuiz", "vocabularyQuiz"];
const DIRECT_LEVEL_SECTIONS = new Set(["randomKanji", "randomVocabulary", "kanjiQuiz", "vocabularyQuiz"]);
const NATIVE_CATEGORIES = ["Everyday casual", "Natural polite speech", "Reactions", "Travel", "Workplace", "Friends", "Texting", "Restaurants", "Shopping", "Transportation", "Hotels", "Social situations"];
const SLANG_CATEGORIES = ["Gyaru", "SNS / Social Media", "Internet", "Youth", "Casual Spoken", "Workplace / Office", "Anime / Otaku", "Oshi / Fandom", "Gaming", "Dating / Romance", "Friendship / Social", "School / Student", "Beauty / Fashion", "Food / Going Out", "Drinking / Nightlife", "Music / Concert", "Memes / Reactions", "Texting / LINE / DMs", "Gen Z / Reiwa", "Heisei / Retro", "Kansai", "Regional Dialects", "Strong Language / Insults", "Sarcasm / Passive Aggressive", "Fillers / Reaction Words", "Abbreviations", "Loanword Slang", "Things Textbooks Never Teach"];
const SLANG_CATEGORY_OPTIONS = [
    ["All", "All Slang"], ["Gyaru", "Gyaru"], ["SNS / Social Media", "SNS / Social Media"], ["Internet", "Internet"], ["Youth", "Youth"], ["Casual Spoken", "Casual Spoken"], ["Workplace / Office", "Workplace / Office"], ["Anime / Otaku", "Anime / Otaku"], ["Oshi / Fandom", "Oshi / Fandom"], ["Gaming", "Gaming"], ["Dating / Romance", "Dating / Romance"], ["Friendship / Social", "Friendship / Social"], ["School / Student", "School / Student"], ["Beauty / Fashion", "Beauty / Fashion"], ["Food / Going Out", "Food / Going Out"], ["Drinking / Nightlife", "Drinking / Nightlife"], ["Music / Concert", "Music / Concert"], ["Memes / Reactions", "Memes / Reactions"], ["Texting / LINE / DMs", "Texting / LINE / DMs"], ["Gen Z / Reiwa", "Gen Z / Reiwa"], ["Heisei / Retro", "Heisei / Retro"], ["Kansai", "Kansai"], ["Regional Dialects", "Regional Dialects"], ["Strong Language / Insults", "Strong Language / Insults"], ["Sarcasm / Passive Aggressive", "Sarcasm / Passive Aggressive"], ["Fillers / Reaction Words", "Fillers / Reaction Words"], ["Abbreviations", "Abbreviations"], ["Loanword Slang", "Loanword Slang"], ["Things Textbooks Never Teach", "Things Textbooks Never Teach"]
];
const LEGACY_SLANG_CATEGORY_MAP = { "Youth slang":"Youth", "Social media":"SNS / Social Media", "Internet":"Internet", "Everyday casual":"Casual Spoken", "Workplace":"Workplace / Office", "Anime versus real life":"Anime / Otaku", "Gaming":"Gaming", "Friends":"Friendship / Social", "Reactions":"Memes / Reactions", "Texting":"Texting / LINE / DMs", "Gyaru":"Gyaru", "TikTok / short-form social media":"SNS / Social Media", "X / online posts":"SNS / Social Media" };
function authoritativeSlangCategories(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(value => LEGACY_SLANG_CATEGORY_MAP[cleanEntryText(value)] || cleanEntryText(value)).filter(value => SLANG_CATEGORIES.includes(value)))];
}
const TRANSLATION_API_ENDPOINT = ""; // Optional future secure endpoint. Leave blank to use Sakura's built-in public web translator.
const MYMEMORY_TRANSLATION_ENDPOINT = "https://api.mymemory.translated.net/get";
const ONLINE_TRANSLATION_TIMEOUT_MS = 10000;
const ONLINE_TRANSLATION_MAX_BYTES = 500;
const APPEARANCE_DB = "sakuraAppearanceDB";
const APPEARANCE_STORE = "wallpapers";
const WALLPAPER_RECORD = "activeWallpaper";
const DEFAULT_WALLPAPER_FRAMING = Object.freeze({ positionX: 50, positionY: 50, zoom: 1 });
const THEMES = { pink:{name:"Sakura Pink",swatch:"#ef5b87"},purple:{name:"Lavender Purple",swatch:"#9b70c8"},blue:{name:"Sky Blue",swatch:"#68a9dc"},green:{name:"Mint Green",swatch:"#68b99a"},yellow:{name:"Soft Yellow",swatch:"#d6a94d"} };
const DEFAULT_CHIBI_GUIDE = Object.freeze({ character:"sakura", companionEnabled:false, companionSide:"right", idleAnimations:true, speechBubbles:true, contextReactions:true, gestureCoach:true });
const SAKURA_GUIDES = Object.freeze([
    ["sakura","Sakura"], ["mochi","Mochi"], ["hikari","Hikari"], ["yui","Yui"], ["aoi","Aoi"],
    ["haru","Haru"], ["sora","Sora"], ["shiro","Shiro"], ["latte","Latte"], ["choco","Choco"],
    ["pudding","Pudding"], ["ayame","Ayame"], ["midori","Midori"], ["hina","Hina"], ["luna","Luna"]
]);
const CHIBI_OPTIONS = Object.freeze({
    skinTone:[ ["light","Light","#F9D9C7"], ["light-medium","Light-Medium","#EFC3A7"], ["medium","Medium","#D99C73"], ["medium-deep","Medium-Deep","#A96848"], ["deep","Deep","#6F4231"] ],
    hairStyle:[ ["bob","Short Bob"], ["long","Long Straight"], ["ponytail","Ponytail"], ["twin-tails","Twin Tails"], ["shoulder","Shoulder Length"], ["bun","Bun"] ],
    hairColor:[ ["#17171C","Black"], ["#3B2722","Dark Brown"], ["#76503A","Brown"], ["#D9B878","Blonde"], ["#E887A8","Pink"], ["#A982C5","Lavender"], ["#668EB8","Blue"], ["#D9D7DD","White/Silver"] ],
    eyeColor:[ ["#CC6F94","Pink"], ["#6B4636","Brown"], ["#8A7042","Hazel"], ["#4F83B6","Blue"], ["#4F8B69","Green"], ["#795AA3","Purple"], ["#43AFC4","Aqua"] ],
    expression:[ ["neutral","Neutral"], ["soft-smile","Soft Smile"], ["happy","Happy"], ["wink","Wink"], ["laugh","Laugh"], ["excited","Excited"], ["sad","Sad"], ["angry","Angry"], ["surprised","Surprised"] ],
    outfit:[ ["sakura-casual","Sakura Casual"], ["school-inspired","Preppy / Academic"], ["travel","Travel Outfit"], ["cafe","Café Outfit"], ["yukata","Yukata-Inspired"] ],
    accessory:[ ["none","None"], ["sakura-clip","Sakura Hair Clip"], ["ribbon","Ribbon"], ["beret","Beret"] ]
});
const CHIBI_POSE_FAMILIES = Object.freeze(["neutral", "small-bow", "formal-bow", "explaining", "hands-together", "holding", "sitting", "walking", "waving", "dining"]);
const CHIBI_SPEECH = Object.freeze([
    { japanese:"おかえり！", romaji:"okaeri!", english:"Welcome back!" },
    { japanese:"がんばって！", romaji:"ganbatte!", english:"You can do it!" },
    { japanese:"いい感じ！", romaji:"ii kanji!", english:"Looking good!" },
    { japanese:"おつかれさま！", romaji:"otsukaresama!", english:"Nice work!" },
    { japanese:"すごい！", romaji:"sugoi!", english:"Amazing!" }
]);
const TRANSLATION_CONTEXTS = ["Everyday","Travel","Restaurant","Café","Shopping","Hotel","Train","Airport","Workplace","Friends","Social media","Other"];
const TRANSLATION_TONES = ["Polite and natural","Casual","Very polite","Friendly","Social media / texting"];
const KANA_QUIZ_GROUPS = ["Basic", "Dakuten", "Handakuten", "Yoon", "Extended"];
let activeKanaQuizGroups = readJson(STORAGE.kanaQuizGroups, ["Basic"])
    .filter(group => KANA_QUIZ_GROUPS.includes(group));
if (!activeKanaQuizGroups.length) activeKanaQuizGroups = ["Basic"];

const KANA_DATA = [
    ["あ", "a", "Hiragana"], ["い", "i", "Hiragana"], ["う", "u", "Hiragana"], ["え", "e", "Hiragana"], ["お", "o", "Hiragana"],
    ["か", "ka", "Hiragana"], ["き", "ki", "Hiragana"], ["く", "ku", "Hiragana"], ["け", "ke", "Hiragana"], ["こ", "ko", "Hiragana"],
    ["さ", "sa", "Hiragana"], ["し", "shi", "Hiragana"], ["す", "su", "Hiragana"], ["せ", "se", "Hiragana"], ["そ", "so", "Hiragana"],
    ["た", "ta", "Hiragana"], ["ち", "chi", "Hiragana"], ["つ", "tsu", "Hiragana"], ["て", "te", "Hiragana"], ["と", "to", "Hiragana"],
    ["な", "na", "Hiragana"], ["に", "ni", "Hiragana"], ["ぬ", "nu", "Hiragana"], ["ね", "ne", "Hiragana"], ["の", "no", "Hiragana"],
    ["は", "ha", "Hiragana"], ["ひ", "hi", "Hiragana"], ["ふ", "fu", "Hiragana"], ["へ", "he", "Hiragana"], ["ほ", "ho", "Hiragana"],
    ["ま", "ma", "Hiragana"], ["み", "mi", "Hiragana"], ["む", "mu", "Hiragana"], ["め", "me", "Hiragana"], ["も", "mo", "Hiragana"],
    ["や", "ya", "Hiragana"], ["ゆ", "yu", "Hiragana"], ["よ", "yo", "Hiragana"], ["ら", "ra", "Hiragana"], ["り", "ri", "Hiragana"],
    ["る", "ru", "Hiragana"], ["れ", "re", "Hiragana"], ["ろ", "ro", "Hiragana"], ["わ", "wa", "Hiragana"], ["を", "wo", "Hiragana"], ["ん", "n", "Hiragana"],
    ["ア", "a", "Katakana"], ["イ", "i", "Katakana"], ["ウ", "u", "Katakana"], ["エ", "e", "Katakana"], ["オ", "o", "Katakana"],
    ["カ", "ka", "Katakana"], ["キ", "ki", "Katakana"], ["ク", "ku", "Katakana"], ["ケ", "ke", "Katakana"], ["コ", "ko", "Katakana"],
    ["サ", "sa", "Katakana"], ["シ", "shi", "Katakana"], ["ス", "su", "Katakana"], ["セ", "se", "Katakana"], ["ソ", "so", "Katakana"],
    ["タ", "ta", "Katakana"], ["チ", "chi", "Katakana"], ["ツ", "tsu", "Katakana"], ["テ", "te", "Katakana"], ["ト", "to", "Katakana"],
    ["ナ", "na", "Katakana"], ["ニ", "ni", "Katakana"], ["ヌ", "nu", "Katakana"], ["ネ", "ne", "Katakana"], ["ノ", "no", "Katakana"],
    ["ハ", "ha", "Katakana"], ["ヒ", "hi", "Katakana"], ["フ", "fu", "Katakana"], ["ヘ", "he", "Katakana"], ["ホ", "ho", "Katakana"],
    ["マ", "ma", "Katakana"], ["ミ", "mi", "Katakana"], ["ム", "mu", "Katakana"], ["メ", "me", "Katakana"], ["モ", "mo", "Katakana"],
    ["ヤ", "ya", "Katakana"], ["ユ", "yu", "Katakana"], ["ヨ", "yo", "Katakana"], ["ラ", "ra", "Katakana"], ["リ", "ri", "Katakana"],
    ["ル", "ru", "Katakana"], ["レ", "re", "Katakana"], ["ロ", "ro", "Katakana"], ["ワ", "wa", "Katakana"], ["ヲ", "wo", "Katakana"], ["ン", "n", "Katakana"],

    ["が", "ga", "Hiragana", "Dakuten"], ["ぎ", "gi", "Hiragana", "Dakuten"], ["ぐ", "gu", "Hiragana", "Dakuten"], ["げ", "ge", "Hiragana", "Dakuten"], ["ご", "go", "Hiragana", "Dakuten"],
    ["ざ", "za", "Hiragana", "Dakuten"], ["じ", "ji", "Hiragana", "Dakuten"], ["ず", "zu", "Hiragana", "Dakuten"], ["ぜ", "ze", "Hiragana", "Dakuten"], ["ぞ", "zo", "Hiragana", "Dakuten"],
    ["だ", "da", "Hiragana", "Dakuten"], ["ぢ", "ji", "Hiragana", "Dakuten"], ["づ", "zu", "Hiragana", "Dakuten"], ["で", "de", "Hiragana", "Dakuten"], ["ど", "do", "Hiragana", "Dakuten"],
    ["ば", "ba", "Hiragana", "Dakuten"], ["び", "bi", "Hiragana", "Dakuten"], ["ぶ", "bu", "Hiragana", "Dakuten"], ["べ", "be", "Hiragana", "Dakuten"], ["ぼ", "bo", "Hiragana", "Dakuten"],
    ["ぱ", "pa", "Hiragana", "Handakuten"], ["ぴ", "pi", "Hiragana", "Handakuten"], ["ぷ", "pu", "Hiragana", "Handakuten"], ["ぺ", "pe", "Hiragana", "Handakuten"], ["ぽ", "po", "Hiragana", "Handakuten"],
    ["きゃ", "kya", "Hiragana", "Yoon"], ["きゅ", "kyu", "Hiragana", "Yoon"], ["きょ", "kyo", "Hiragana", "Yoon"],
    ["ぎゃ", "gya", "Hiragana", "Yoon"], ["ぎゅ", "gyu", "Hiragana", "Yoon"], ["ぎょ", "gyo", "Hiragana", "Yoon"],
    ["しゃ", "sha", "Hiragana", "Yoon"], ["しゅ", "shu", "Hiragana", "Yoon"], ["しょ", "sho", "Hiragana", "Yoon"],
    ["じゃ", "ja", "Hiragana", "Yoon"], ["じゅ", "ju", "Hiragana", "Yoon"], ["じょ", "jo", "Hiragana", "Yoon"],
    ["ちゃ", "cha", "Hiragana", "Yoon"], ["ちゅ", "chu", "Hiragana", "Yoon"], ["ちょ", "cho", "Hiragana", "Yoon"],
    ["にゃ", "nya", "Hiragana", "Yoon"], ["にゅ", "nyu", "Hiragana", "Yoon"], ["にょ", "nyo", "Hiragana", "Yoon"],
    ["ひゃ", "hya", "Hiragana", "Yoon"], ["ひゅ", "hyu", "Hiragana", "Yoon"], ["ひょ", "hyo", "Hiragana", "Yoon"],
    ["びゃ", "bya", "Hiragana", "Yoon"], ["びゅ", "byu", "Hiragana", "Yoon"], ["びょ", "byo", "Hiragana", "Yoon"],
    ["ぴゃ", "pya", "Hiragana", "Yoon"], ["ぴゅ", "pyu", "Hiragana", "Yoon"], ["ぴょ", "pyo", "Hiragana", "Yoon"],
    ["みゃ", "mya", "Hiragana", "Yoon"], ["みゅ", "myu", "Hiragana", "Yoon"], ["みょ", "myo", "Hiragana", "Yoon"],
    ["りゃ", "rya", "Hiragana", "Yoon"], ["りゅ", "ryu", "Hiragana", "Yoon"], ["りょ", "ryo", "Hiragana", "Yoon"],
    ["っ", "small tsu", "Hiragana", "Special", false],

    ["ガ", "ga", "Katakana", "Dakuten"], ["ギ", "gi", "Katakana", "Dakuten"], ["グ", "gu", "Katakana", "Dakuten"], ["ゲ", "ge", "Katakana", "Dakuten"], ["ゴ", "go", "Katakana", "Dakuten"],
    ["ザ", "za", "Katakana", "Dakuten"], ["ジ", "ji", "Katakana", "Dakuten"], ["ズ", "zu", "Katakana", "Dakuten"], ["ゼ", "ze", "Katakana", "Dakuten"], ["ゾ", "zo", "Katakana", "Dakuten"],
    ["ダ", "da", "Katakana", "Dakuten"], ["ヂ", "ji", "Katakana", "Dakuten"], ["ヅ", "zu", "Katakana", "Dakuten"], ["デ", "de", "Katakana", "Dakuten"], ["ド", "do", "Katakana", "Dakuten"],
    ["バ", "ba", "Katakana", "Dakuten"], ["ビ", "bi", "Katakana", "Dakuten"], ["ブ", "bu", "Katakana", "Dakuten"], ["ベ", "be", "Katakana", "Dakuten"], ["ボ", "bo", "Katakana", "Dakuten"],
    ["パ", "pa", "Katakana", "Handakuten"], ["ピ", "pi", "Katakana", "Handakuten"], ["プ", "pu", "Katakana", "Handakuten"], ["ペ", "pe", "Katakana", "Handakuten"], ["ポ", "po", "Katakana", "Handakuten"],
    ["キャ", "kya", "Katakana", "Yoon"], ["キュ", "kyu", "Katakana", "Yoon"], ["キョ", "kyo", "Katakana", "Yoon"],
    ["ギャ", "gya", "Katakana", "Yoon"], ["ギュ", "gyu", "Katakana", "Yoon"], ["ギョ", "gyo", "Katakana", "Yoon"],
    ["シャ", "sha", "Katakana", "Yoon"], ["シュ", "shu", "Katakana", "Yoon"], ["ショ", "sho", "Katakana", "Yoon"],
    ["ジャ", "ja", "Katakana", "Yoon"], ["ジュ", "ju", "Katakana", "Yoon"], ["ジョ", "jo", "Katakana", "Yoon"],
    ["チャ", "cha", "Katakana", "Yoon"], ["チュ", "chu", "Katakana", "Yoon"], ["チョ", "cho", "Katakana", "Yoon"],
    ["ニャ", "nya", "Katakana", "Yoon"], ["ニュ", "nyu", "Katakana", "Yoon"], ["ニョ", "nyo", "Katakana", "Yoon"],
    ["ヒャ", "hya", "Katakana", "Yoon"], ["ヒュ", "hyu", "Katakana", "Yoon"], ["ヒョ", "hyo", "Katakana", "Yoon"],
    ["ビャ", "bya", "Katakana", "Yoon"], ["ビュ", "byu", "Katakana", "Yoon"], ["ビョ", "byo", "Katakana", "Yoon"],
    ["ピャ", "pya", "Katakana", "Yoon"], ["ピュ", "pyu", "Katakana", "Yoon"], ["ピョ", "pyo", "Katakana", "Yoon"],
    ["ミャ", "mya", "Katakana", "Yoon"], ["ミュ", "myu", "Katakana", "Yoon"], ["ミョ", "myo", "Katakana", "Yoon"],
    ["リャ", "rya", "Katakana", "Yoon"], ["リュ", "ryu", "Katakana", "Yoon"], ["リョ", "ryo", "Katakana", "Yoon"],
    ["ヴァ", "va", "Katakana", "Extended"], ["ヴィ", "vi", "Katakana", "Extended"], ["ヴ", "vu", "Katakana", "Extended"], ["ヴェ", "ve", "Katakana", "Extended"], ["ヴォ", "vo", "Katakana", "Extended"],
    ["ウィ", "wi", "Katakana", "Extended"], ["ウェ", "we", "Katakana", "Extended"], ["ウォ", "wo", "Katakana", "Extended"],
    ["ファ", "fa", "Katakana", "Extended"], ["フィ", "fi", "Katakana", "Extended"], ["フェ", "fe", "Katakana", "Extended"], ["フォ", "fo", "Katakana", "Extended"], ["フュ", "fyu", "Katakana", "Extended"],
    ["ティ", "ti", "Katakana", "Extended"], ["トゥ", "tu", "Katakana", "Extended"], ["ディ", "di", "Katakana", "Extended"], ["ドゥ", "du", "Katakana", "Extended"],
    ["チェ", "che", "Katakana", "Extended"], ["シェ", "she", "Katakana", "Extended"], ["ジェ", "je", "Katakana", "Extended"],
    ["ツァ", "tsa", "Katakana", "Extended"], ["ツィ", "tsi", "Katakana", "Extended"], ["ツェ", "tse", "Katakana", "Extended"], ["ツォ", "tso", "Katakana", "Extended"],
    ["クァ", "kwa", "Katakana", "Extended"], ["クィ", "kwi", "Katakana", "Extended"], ["クェ", "kwe", "Katakana", "Extended"], ["クォ", "kwo", "Katakana", "Extended"], ["グァ", "gwa", "Katakana", "Extended"],
    ["イェ", "ye", "Katakana", "Extended"], ["キェ", "kye", "Katakana", "Extended"], ["ギェ", "gye", "Katakana", "Extended"], ["ニェ", "nye", "Katakana", "Extended"], ["ヒェ", "hye", "Katakana", "Extended"], ["ビェ", "bye", "Katakana", "Extended"], ["ピェ", "pye", "Katakana", "Extended"], ["ミェ", "mye", "Katakana", "Extended"], ["リェ", "rye", "Katakana", "Extended"],
    ["ッ", "small tsu", "Katakana", "Special", false], ["ー", "long vowel mark", "Katakana", "Special", false]
];

function readJson(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    }
    catch (error) {
        console.warn(`Could not read ${key}.`, error);
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

const DAILY_GOALS = Object.freeze([5, 10, 20, 30]);
const DAILY_GOAL_MIN = 1;
const DAILY_GOAL_MAX = 999;

function validDailyGoal(value) {
    const goal = Number(value);
    return Number.isInteger(goal) && goal >= DAILY_GOAL_MIN && goal <= DAILY_GOAL_MAX;
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isValidLocalDateKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const [year, month, day] = value.split("-").map(Number);
    return localDateKey(new Date(year, month - 1, day, 12)) === value;
}

function previousLocalDateKey(dateKey) {
    if (!isValidLocalDateKey(dateKey)) return "";
    const [year, month, day] = dateKey.split("-").map(Number);
    return localDateKey(new Date(year, month - 1, day - 1, 12));
}

function normalizeDailyProgress(value, today = localDateKey()) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const storedDate = isValidLocalDateKey(source.date) ? source.date : today;
    const count = name => {
        const number = Number(source[name]);
        return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
    };
    return {
        date: today,
        completedReviewsToday: storedDate === today ? count("completedReviewsToday") : 0,
        dailyGoal: validDailyGoal(source.dailyGoal) ? Number(source.dailyGoal) : 10,
        currentStreak: count("currentStreak"),
        longestStreak: Math.max(count("longestStreak"), count("currentStreak")),
        lastCompletedDate: isValidLocalDateKey(source.lastCompletedDate) ? source.lastCompletedDate : ""
    };
}

let dailyProgress = normalizeDailyProgress(readJson(STORAGE.dailyProgress, {}));

function persistDailyProgress() {
    writeJson(STORAGE.dailyProgress, dailyProgress);
}

persistDailyProgress();

function refreshDailyProgressDate() {
    const normalized = normalizeDailyProgress(dailyProgress);
    const changed = normalized.date !== dailyProgress.date || normalized.completedReviewsToday !== dailyProgress.completedReviewsToday;
    dailyProgress = normalized;
    if (changed) persistDailyProgress();
    return dailyProgress;
}

function completeDailyGoalIfNeeded() {
    refreshDailyProgressDate();
    if (dailyProgress.completedReviewsToday < dailyProgress.dailyGoal || dailyProgress.lastCompletedDate === dailyProgress.date) return false;
    // Opening Sakura never breaks a streak. The next completed day decides whether it continues or restarts.
    dailyProgress.currentStreak = dailyProgress.lastCompletedDate === previousLocalDateKey(dailyProgress.date) ? dailyProgress.currentStreak + 1 : 1;
    dailyProgress.longestStreak = Math.max(dailyProgress.longestStreak, dailyProgress.currentStreak);
    dailyProgress.lastCompletedDate = dailyProgress.date;
    persistDailyProgress();
    return true;
}

let dailyBloomAnimationTimer = 0;

function playDailyGoalBloom() {
    const celebration = document.getElementById("daily-bloom-celebration");
    const card = document.querySelector(".daily-study-card");
    if (!celebration || !card) return;
    window.clearTimeout(dailyBloomAnimationTimer);
    celebration.classList.remove("active");
    card.classList.remove("bloom-celebrating");
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    requestAnimationFrame(() => {
        celebration.classList.add("active");
        card.classList.add("bloom-celebrating");
    });
    dailyBloomAnimationTimer = window.setTimeout(() => {
        celebration.classList.remove("active");
        card.classList.remove("bloom-celebrating");
    }, 1800);
}

function setDailyCustomGoalVisibility(show) {
    const row = document.querySelector(".daily-custom-goal-row");
    if (!row) return;
    row.hidden = !show;
    if (!show) setDailyGoalMessage("");
}

function renderDailyProgress() {
    refreshDailyProgressDate();
    const newlyCompleted = completeDailyGoalIfNeeded();
    const count = dailyProgress.completedReviewsToday;
    const goal = dailyProgress.dailyGoal;
    const countElement = document.getElementById("daily-study-count");
    if (!countElement) return;
    countElement.textContent = `${count} / ${goal}`;
    document.getElementById("daily-current-streak").textContent = dailyProgress.currentStreak;
    document.getElementById("daily-longest-streak").textContent = dailyProgress.longestStreak;

    const select = document.getElementById("daily-goal-select");
    const customInput = document.getElementById("daily-custom-goal");
    const isCustomGoal = !DAILY_GOALS.includes(goal);
    if (select) select.value = isCustomGoal ? "custom" : String(goal);
    setDailyCustomGoalVisibility(isCustomGoal);
    if (customInput && document.activeElement !== customInput) {
        customInput.value = isCustomGoal ? String(goal) : "";
    }

    const progress = document.querySelector(".daily-study-progress");
    progress.setAttribute("aria-valuemax", goal);
    progress.setAttribute("aria-valuenow", Math.min(count, goal));
    document.getElementById("daily-study-progress-bar").style.width = `${Math.min(100, (count / goal) * 100)}%`;
    const complete = count >= goal;
    document.getElementById("daily-goal-status").textContent = complete ? "Garden in bloom 🌸" : `${Math.max(0, goal - count)} to bloom`;
    document.querySelector(".daily-study-card").classList.toggle("complete", complete);
    if (newlyCompleted) playDailyGoalBloom();
}

function recordDailyStudyAction() {
    refreshDailyProgressDate();
    dailyProgress.completedReviewsToday += 1;
    persistDailyProgress();
    renderDailyProgress();
}

function setDailyGoal(value) {
    const goal = Number(value);
    if (!validDailyGoal(goal)) return false;
    refreshDailyProgressDate();
    dailyProgress.dailyGoal = goal;
    persistDailyProgress();
    renderDailyProgress();
    return true;
}

function setDailyGoalMessage(message = "", isError = false) {
    const element = document.getElementById("daily-goal-message");
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("error", isError);
}

function applyCustomDailyGoal() {
    const input = document.getElementById("daily-custom-goal");
    const raw = input?.value?.trim() || "";
    const goal = Number(raw);
    if (!validDailyGoal(goal)) {
        setDailyGoalMessage(`Choose a whole number from ${DAILY_GOAL_MIN} to ${DAILY_GOAL_MAX}.`, true);
        input?.focus();
        return;
    }
    setDailyGoal(goal);
    setDailyGoalMessage(`Daily target set to ${goal}.`);
    input?.blur();
}

const MASTERY_STATES = Object.freeze(["New", "Learning", "Familiar", "Mastered"]);

function masteryIdentity(item) {
    const type = item?.migratedFrom === "native" ? "native" : String(item?.type || "");
    const id = String(item?.id || "");
    return ["kanji", "vocabulary", "slang"].includes(type) && id ? { type, id, key:`${type}:${id}` } : null;
}

function normalizeMasteryProgress(value, identity) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const mastery = MASTERY_STATES.includes(source.mastery) ? source.mastery : "New";
    const count = name => Math.max(0, Math.floor(Number(source[name]) || 0));
    const lastReviewed = typeof source.lastReviewed === "string" && !Number.isNaN(Date.parse(source.lastReviewed)) ? source.lastReviewed : null;
    return { type:identity.type, id:identity.id, mastery, timesSeen:count("timesSeen"), correctCount:count("correctCount"), incorrectCount:count("incorrectCount"), lastReviewed };
}

function readMasteryStore() {
    const stored = readJson(STORAGE.mastery, {});
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    const safe = {};
    Object.entries(stored).forEach(([key, value]) => {
        const separator = key.indexOf(":");
        if (separator < 1) return;
        const identity = masteryIdentity({ type:key.slice(0, separator), id:key.slice(separator + 1) });
        if (identity) safe[identity.key] = normalizeMasteryProgress(value, identity);
    });
    return safe;
}

let masteryProgress = readMasteryStore();

function getMastery(item) {
    const identity = masteryIdentity(item);
    return identity ? normalizeMasteryProgress(masteryProgress[identity.key], identity) : null;
}

function persistMastery() {
    writeJson(STORAGE.mastery, masteryProgress);
}

function setMastery(item, state) {
    const identity = masteryIdentity(item);
    if (!identity || !MASTERY_STATES.includes(state)) return null;
    masteryProgress[identity.key] = { ...getMastery(identity), mastery:state };
    persistMastery();
    return masteryProgress[identity.key];
}

function recalculateMastery(progress) {
    const correct = progress.correctCount;
    const attempts = correct + progress.incorrectCount;
    const accuracy = attempts ? correct / attempts : 0;
    let evidenceState = attempts ? "Learning" : "New";
    if (correct >= 6 && accuracy >= 0.85) evidenceState = "Mastered";
    else if (correct >= 3 && accuracy >= 0.7) evidenceState = "Familiar";
    const currentIndex = MASTERY_STATES.indexOf(progress.mastery);
    const evidenceIndex = MASTERY_STATES.indexOf(evidenceState);
    return MASTERY_STATES[evidenceIndex < currentIndex ? Math.max(evidenceIndex, currentIndex - 1) : evidenceIndex];
}

function recordMasteryResult(item, correct) {
    const identity = masteryIdentity(item);
    if (!identity) return null;
    const progress = getMastery(identity);
    progress.timesSeen += 1;
    if (correct) progress.correctCount += 1;
    else progress.incorrectCount += 1;
    progress.lastReviewed = new Date().toISOString();
    progress.mastery = recalculateMastery(progress);
    masteryProgress[identity.key] = progress;
    persistMastery();
    return progress;
}

function renderMasteryControl(container, item) {
    if (!container) return;
    const progress = getMastery(item);
    container.hidden = !progress;
    if (!progress) { container.innerHTML = ""; return; }
    container.dataset.masteryType = progress.type;
    container.dataset.masteryId = progress.id;
    container.innerHTML = `<div class="mastery-control-heading"><span>Mastery</span><strong>${progress.mastery}</strong></div><div class="mastery-state-options" role="group" aria-label="Set mastery state">${MASTERY_STATES.map(state => `<button class="mastery-state-button ${state === progress.mastery ? "active" : ""}" type="button" data-mastery-state="${state}" aria-pressed="${state === progress.mastery}">${state}</button>`).join("")}</div>`;
}

function refreshVisibleMasteryControls() {
    renderMasteryControl(document.getElementById("kanji-mastery-control"), currentDetailKanji);
    renderMasteryControl(document.getElementById("word-mastery-control"), currentDetailWord);
    renderMasteryControl(document.getElementById("slang-mastery-control"), currentNativeMode === "slang" ? currentNativeItem : null);
}

function recordCompleteness(value) {
    if (value == null || value === "") return 0;
    if (Array.isArray(value)) return value.reduce((score, entry) => score + recordCompleteness(entry), value.length ? 1 : 0);
    if (typeof value === "object") return Object.values(value).reduce((score, entry) => score + recordCompleteness(entry), 1);
    return 1;
}

function mergeSavedKanjiRecords(existing, candidate, preferCandidate) {
    const existingScore = recordCompleteness(existing);
    const candidateScore = recordCompleteness(candidate);
    const candidateWins = candidateScore > existingScore || (candidateScore === existingScore && preferCandidate);
    const primary = candidateWins ? candidate : existing;
    const secondary = candidateWins ? existing : candidate;
    const savedDates = [existing.savedAt, candidate.savedAt].filter(value => value && !Number.isNaN(Date.parse(value))).sort();
    return { ...secondary, ...primary, id: candidate.id, ...(savedDates.length ? { savedAt: savedDates[0] } : {}) };
}

function migrateSavedKanjiIds(items) {
    const migrated = [];
    const knownKanjiIndexes = new Map();
    let changed = 0;
    let duplicatesRemoved = 0;

    items.forEach(item => {
        if (!item || item.type !== "kanji") { migrated.push(item); return; }
        const mappedId = LEGACY_KANJI_IDS[item.id];
        const finalId = mappedId || item.id;
        if (!mappedId && !PERMANENT_KANJI_IDS.has(finalId)) { migrated.push(item); return; }

        const candidate = mappedId ? { ...item, id: finalId } : item;
        if (mappedId) changed += 1;
        const key = `kanji:${finalId}`;
        if (!knownKanjiIndexes.has(key)) {
            knownKanjiIndexes.set(key, migrated.length);
            migrated.push(candidate);
            return;
        }

        const existingIndex = knownKanjiIndexes.get(key);
        migrated[existingIndex] = mergeSavedKanjiRecords(migrated[existingIndex], candidate, !mappedId);
        duplicatesRemoved += 1;
    });

    return { items: migrated, changed, duplicatesRemoved };
}

function migrateKanjiFlashcardStatuses(statuses) {
    const migrated = { ...statuses };
    let changed = 0;
    Object.entries(LEGACY_KANJI_IDS).forEach(([oldId, newId]) => {
        const oldKey = `kanji:${oldId}`;
        if (!Object.prototype.hasOwnProperty.call(migrated, oldKey)) return;
        const newKey = `kanji:${newId}`;
        const oldValue = migrated[oldKey];
        const newValue = migrated[newKey];
        const newHasValidValue = newValue !== undefined && newValue !== null && newValue !== "";
        const oldHasValidValue = oldValue !== undefined && oldValue !== null && oldValue !== "";
        if (!newHasValidValue && oldHasValidValue) migrated[newKey] = oldValue;
        delete migrated[oldKey];
        changed += 1;
    });
    return { statuses: migrated, changed };
}

function runSakuraDataMigrations() {
    try {
        const currentVersion = Number(localStorage.getItem(STORAGE.migrationVersion) || 0);
        if (currentVersion >= DATA_MIGRATION_VERSION) return { skipped: true };

        const savedRaw = localStorage.getItem(STORAGE.saved);
        const statusesRaw = localStorage.getItem(STORAGE.statuses);
        const saved = savedRaw ? JSON.parse(savedRaw) : [];
        const statuses = statusesRaw ? JSON.parse(statusesRaw) : {};
        if (!Array.isArray(saved)) throw new Error(`${STORAGE.saved} must contain an array.`);
        if (!statuses || typeof statuses !== "object" || Array.isArray(statuses)) throw new Error(`${STORAGE.statuses} must contain an object.`);

        const savedResult = migrateSavedKanjiIds(saved);
        const statusResult = migrateKanjiFlashcardStatuses(statuses);
        if (savedRaw !== null && (savedResult.changed || savedResult.duplicatesRemoved)) writeJson(STORAGE.saved, savedResult.items);
        if (statusesRaw !== null && statusResult.changed) writeJson(STORAGE.statuses, statusResult.statuses);
        localStorage.setItem(STORAGE.migrationVersion, String(DATA_MIGRATION_VERSION));
        console.info(`Sakura data migration ${DATA_MIGRATION_VERSION} complete: ${savedResult.changed} saved Kanji updated, ${savedResult.duplicatesRemoved} duplicate saved Kanji removed, ${statusResult.changed} flashcard status keys updated.`);
        return { skipped: false, savedResult, statusResult };
    }
    catch (error) {
        console.warn("Sakura data migration could not be completed; it will retry next launch.", error);
        return { skipped: false, error };
    }
}

runSakuraDataMigrations();

function normalizeAnswer(value) {
    return String(value || "").trim().toLowerCase().replace(/[.,!?;:'"()\[\]{}]/g, "").replace(/\s+/g, " ");
}

let savedItems = readJson(STORAGE.saved, []);
let flashcardStatuses = readJson(STORAGE.statuses, {});
let pinnedTravelPhraseIds = readJson(STORAGE.pinnedTravelPhrases, []);
if (!Array.isArray(pinnedTravelPhraseIds)) pinnedTravelPhraseIds = [];
let travelPhraseDecks = readJson(STORAGE.travelPhraseDecks, []);
if (!Array.isArray(travelPhraseDecks)) travelPhraseDecks = [];
let travelNotes = readJson(STORAGE.travelNotes, []);
if (!Array.isArray(travelNotes)) travelNotes = [];
let travelCountdown = readJson(STORAGE.travelCountdown, null);
if (!travelCountdown || typeof travelCountdown !== "object" || Array.isArray(travelCountdown)) travelCountdown = null;
const NAVIGATION_MODE_ONBOARDING_VERSION = "1";
let navigationModeOnboardingSeen = localStorage.getItem(STORAGE.navigationModeOnboarding) === NAVIGATION_MODE_ONBOARDING_VERSION;
const storedTravelModeEnabled = localStorage.getItem(STORAGE.travelModeEnabled);

// Sakura starts in Practice Mode until the user makes a navigation-mode choice.
// This also migrates existing installs that previously defaulted to Travel.
let travelModeEnabled = navigationModeOnboardingSeen
    ? storedTravelModeEnabled === "true"
    : false;
if (!navigationModeOnboardingSeen || storedTravelModeEnabled === null) {
    localStorage.setItem(STORAGE.travelModeEnabled, "false");
}
let travelOfflinePackMetadata = readJson(STORAGE.travelOfflinePack, null);
if (!travelOfflinePackMetadata || typeof travelOfflinePackMetadata !== "object" || Array.isArray(travelOfflinePackMetadata)) travelOfflinePackMetadata = null;
const TRAVEL_OFFLINE_CACHE = "sakura-travel-content-v1";
const TRAVEL_OFFLINE_PACK_VERSION = "v1";
let travelOfflinePackState = { status:"checking", ready:[], failed:[], processed:0 };
let travelOfflinePackOperation = null;
let yenConverterSettings = readJson(STORAGE.yenConverter, null);
if (!yenConverterSettings || !Number.isFinite(Number(yenConverterSettings.phpPerJpy)) || Number(yenConverterSettings.phpPerJpy) <= 0) yenConverterSettings = null;
const YEN_CURRENCIES = Object.freeze({ JPY:{ symbol:"¥", label:"Japanese yen" }, PHP:{ symbol:"₱", label:"Philippine pesos" } });
let yenConverterState = { currencies:{ top:"JPY", bottom:"PHP" }, activeSide:"top", expressions:{ top:"", bottom:"" } };
let globalLevels = normalizeJlptLevels(readJson(STORAGE.globalLevels, DEFAULT_LEVELS));
let sectionSettings = readJson(STORAGE.sectionLevels, {});
if (!sectionSettings || typeof sectionSettings !== "object" || Array.isArray(sectionSettings)) sectionSettings = {};
DIRECT_LEVEL_SECTIONS.forEach(sectionName => {
    const setting = sectionSettings[sectionName];
    const hasDirectSetting = setting && !Object.prototype.hasOwnProperty.call(setting, "useGlobal");
    const levels = setting?.useGlobal === false || hasDirectSetting ? normalizeJlptLevels(setting.levels, JLPT_LEVELS) : normalizeJlptLevels(globalLevels);
    sectionSettings[sectionName] = { levels };
});
writeJson(STORAGE.sectionLevels, sectionSettings);
let quizStats = {
    kana: { blooms: 0, misses: 0, questions: 0 },
    kanji: { blooms: 0, misses: 0, questions: 0 },
    vocabulary: { blooms: 0, misses: 0, questions: 0 }
};
const quizTransitionLocks = { kana: false, kanji: false, vocabulary: false };
const quizTransitionTimers = { kana: null, kanji: null, vocabulary: null };
const dailyQuestionCredited = { kanji: false, vocabulary: false };
let kanjiQuizRomajiVisible = readJson(STORAGE.quizRomaji, false) === true;
let kanjiQuizFeedbackRevealed = false;

let currentRoute = "home";
const STUDY_SUITE_ROUTES = new Set(["study-lab", "practice-shadowing", "study-writing", "study-review", "study-lessons", "practice-conversation", "practice-quick"]);
let studySuiteLoadPromise = null;
function ensureStudySuite() {
    if (window.SakuraStudySuite) {
        window.SakuraStudySuite.init?.();
        return Promise.resolve(window.SakuraStudySuite);
    }
    if (studySuiteLoadPromise) return studySuiteLoadPromise;
    studySuiteLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-sakura-study-suite]');
        if (existing) {
            existing.addEventListener("load", () => { window.SakuraStudySuite?.init?.(); resolve(window.SakuraStudySuite); }, { once:true });
            existing.addEventListener("error", () => reject(new Error("Sakura Study Suite could not load.")), { once:true });
            return;
        }
        const script = document.createElement("script");
        script.src = "./study-suite.js?v=1";
        script.dataset.sakuraStudySuite = "true";
        script.async = true;
        script.onload = () => {
            if (!window.SakuraStudySuite) { reject(new Error("Sakura Study Suite did not initialize.")); return; }
            window.SakuraStudySuite.init?.();
            requestAnimationFrame(() => window.SakuraStudySuite?.augmentAudioButtons?.(currentRoute));
            resolve(window.SakuraStudySuite);
        };
        script.onerror = () => reject(new Error("Sakura Study Suite could not load."));
        document.body.appendChild(script);
    }).catch(error => {
        studySuiteLoadPromise = null;
        console.warn("Sakura Study Suite unavailable.", error);
        throw error;
    });
    return studySuiteLoadPromise;
}
function scheduleStudySuiteLoad() {
    const load = () => ensureStudySuite().catch(() => {});
    if ("requestIdleCallback" in window) requestIdleCallback(load, { timeout:3200 });
    else window.setTimeout(load, 1800);
}
let hubDrawerReturnFocus = null;
let detailReturnRoute = "home";
let currentDailyKanji = null;
let currentDailyWord = null;
let currentBrowseKanji = null;
let currentBrowseWord = null;
let currentDetailKanji = null;
let currentDetailWord = null;
let currentKana = null;
let currentKanjiQuiz = null;
let currentVocabularyQuiz = null;
let currentNativeItem = null;
let currentNativeMode = "native";
let currentTravelCategory = null;
let railGuidePrefs = readJson(STORAGE.railGuidePrefs, { city:"tokyo", line:"yamanote", from:"", to:"" }) || { city:"tokyo", line:"yamanote", from:"", to:"" };
const railCityCache = new Map();
let railGuideCityData = null;
let railGuideSearchTimer = 0;
let railGuideLoadRequestId = 0;
let railNetworkPlannerState = { city:"", from:"", to:"" };
let railNetworkRouteOptions = [];
let railNetworkSelectedRouteIndex = 0;
const railNetworkGraphCache = new Map();
const railNetworkHubCache = new Map();
const railNetworkSearchTimers = { from:0, to:0 };

let currentTravelFilter = "All";
let currentTravelPhrase = null;
let currentTravelIndex = 0;
let savedTravelCategoryFilter = "all";
let currentTravelDeckId = "";
let travelDeckIconChoice = "🌸";
let travelDeckPickerFilter = "all";
let travelDeckPickerSelection = new Set();
let travelNoteCategoryFilter = "all";
let currentTravelNoteId = "";
let pendingTravelSmartPhrase = null;
let travelRenderRevision = 0;
let flashcardDeck = [];
let flashcardIndex = 0;
let flashcardRevealed = false;
let filteredFlashcardKeys = null;
let searchType = "all";
let searchLevels = [...globalLevels];
let recentSearches = readJson(STORAGE.recentSearches, []);
let searchReturnRoute = "learn";
let universalSearchIndex = [];
let searchIndexDirty = true;
let searchWarmRevision = 0;
let transientSearchItems = new Map();
let travelSearchPreparation = null;
let searchVisibleCount = 40;
const searchFieldCache = new WeakMap();
const levelPoolCache = new WeakMap();
const LIBRARY_BATCH_SIZE = 48;
const LIBRARY_TOTALS = Object.freeze({ kanji:306, vocabulary:1506, travel:720 });
let libraryInitialized = false;
let libraryRepository = "";
let libraryFilter = "N5";
let libraryVisibleCount = LIBRARY_BATCH_SIZE;
let libraryLoadingRevision = 0;
let libraryCurrentItems = [];
let whatWouldYouSayBankPromise = null;
let whatWouldYouSaySession = null;
let sentenceBuilderBankPromise = null;
let sentenceBuilderSession = null;
let personalitiesBankPromise = null;
let personalitiesSession = null;
let practiceRomajiVisible = false;
let countersData = null;
let countersDataPromise = null;
let currentCounter = null;
let countersRomajiVisible = false;
let particlesData = null;
let particlesDataPromise = null;
let currentParticle = null;
let particlesRomajiVisible = false;
let grammarData = null;
let grammarDataPromise = null;
let currentGrammar = null;
let grammarRomajiVisible = false;
let etiquetteData = null;
let etiquetteDataPromise = null;
let currentEtiquetteEntry = null;
let etiquetteRomajiVisible = false;
const KAOMOJI_VISIBLE_LIMIT = 50;
const KAOMOJI_DEFAULT_TAGS = Object.freeze([
    "hello", "good morning", "happy", "cute", "thanks", "thank you", "good luck",
    "love", "laughing", "cat", "dog", "animal", "sorry", "excited", "hugging",
    "wink", "good night", "congratulations", "support"
]);
let kaomojiData = null;
let kaomojiDataPromise = null;
let kaomojiById = new Map();
let kaomojiUsage = readJson(STORAGE.kaomojiUsage, {});
if (!kaomojiUsage || typeof kaomojiUsage !== "object" || Array.isArray(kaomojiUsage)) kaomojiUsage = {};
let kaomojiSearchTimer = null;
let kaomojiCopyToastTimer = null;
let kaomojiUniversalLoadScheduled = false;
let chibiGuide = normalizeChibiGuide(readJson(STORAGE.chibiGuide, DEFAULT_CHIBI_GUIDE));
let chibiGuideDraft = { ...chibiGuide };
let chibiAssetManifest = null;
let chibiAssetManifestPromise = null;
let chibiCompanionTimer = 0;
let chibiCompanionResetTimer = 0;
let chibiCompanionBusy = false;
let chibiCompanionPosition = normalizeChibiCompanionPosition(readJson(STORAGE.chibiPosition, null));
let chibiCompanionDragState = null;
let chibiCompanionSuppressClick = false;
let normalizedNativeDataCache = null;
let normalizedSlangDataCache = null;
let slangExpansionsLoadPromise = null;
let slangExpansionsLoaded = false;
let pendingTravelPhraseId = "";
let userNativeEntries = readJson(STORAGE.userNative, []);
let userSlangEntries = readJson(STORAGE.userSlang, []);
let nativeRecentHistory = readJson(STORAGE.nativeHistory, { native: [], slang: [] });
let nativeQueues = { native: [], slang: [] };
let nativeQueueKeys = { native: "", slang: "" };
let wallpaperObjectUrl = "";
let pendingWallpaperBlob = null;
let wallpaperFraming = normalizeWallpaperFraming(readJson(STORAGE.wallpaperFraming, DEFAULT_WALLPAPER_FRAMING));
let wallpaperFramingDraft = { ...wallpaperFraming };
let wallpaperDragState = null;
let translationHistory = readJson(STORAGE.translationHistory, []);
let currentTranslationResult = null;
let translationContext = "Everyday";
let translationTone = "Polite and natural";
let translationMode = "offline";
let translationLoading = false;
let translationPhraseData = null;
let translationPhraseDataPromise = null;
let translationPhraseIndex = null;
const translationOnlineCache = new Map();
let translationReadingSourcePromise = null;
let translationReadingVocabulary = [];
let translationReadingKanji = [];
let translationReadingCandidatesCache = null;
let translationReadingCandidateMapCache = null;
let translationReadingCandidatePrefixCache = null;
let translationKanjiReadingMapCache = null;
const kanjiSelectionRevisions = new Map();
const vocabularySelectionRevisions = new Map();
const KANJI_FILTER_SECTIONS = new Set(["kanjiOfDay", "randomKanji", "kanjiQuiz"]);
const VOCABULARY_FILTER_SECTIONS = new Set(["wordOfDay", "randomVocabulary", "vocabularyQuiz"]);

async function ensureKanjiLevels(requestedLevels) {
    const levels = normalizeJlptLevels(requestedLevels);
    const loader = window.SakuraKanjiLoader;
    if (!loader) throw new Error("Sakura Kanji loader is unavailable.");
    const before = loader.getLoadedKanjiLevels().join("|");
    let loadError = null;

    try {
        await loader.loadKanjiLevels(levels);
    }
    catch (error) {
        loadError = error;
    }
    finally {
        const after = loader.getLoadedKanjiLevels().join("|");
        const loadedKanji = loader.getLoadedKanji();
        if (before !== after || window.KANJI_DATA.length !== loadedKanji.length) {
            window.KANJI_DATA = loadedKanji;
            validateKanjiDataset(window.KANJI_DATA);
            invalidateSearchIndex();
        }
    }

    if (loadError) throw loadError;
    return window.KANJI_DATA;
}

async function loadKanjiForSelection(scope, levels, onSettled) {
    const revision = (kanjiSelectionRevisions.get(scope) || 0) + 1;
    kanjiSelectionRevisions.set(scope, revision);
    let loaded = false;
    try {
        await ensureKanjiLevels(levels);
        loaded = true;
    }
    catch (error) {
        // The loader already reports the failing level. Keep the current working content.
    }
    if (kanjiSelectionRevisions.get(scope) === revision) onSettled?.(loaded);
    return loaded;
}

async function ensureVocabularyLevels(requestedLevels) {
    const levels = normalizeJlptLevels(requestedLevels);
    const loader = window.SakuraVocabularyLoader;
    if (!loader) throw new Error("Sakura Vocabulary loader is unavailable.");
    const before = loader.getLoadedVocabularyLevels().join("|");
    let loadError = null;
    try {
        await loader.loadVocabularyLevels(levels);
    }
    catch (error) {
        loadError = error;
    }
    finally {
        const after = loader.getLoadedVocabularyLevels().join("|");
        const loadedVocabulary = loader.getLoadedVocabulary();
        if (before !== after || window.VOCABULARY_DATA.length !== loadedVocabulary.length) {
            window.VOCABULARY_DATA = loadedVocabulary;
            invalidateSearchIndex();
        }
    }
    if (loadError) throw loadError;
    return window.VOCABULARY_DATA;
}

async function loadVocabularyForSelection(scope, levels, onSettled) {
    const revision = (vocabularySelectionRevisions.get(scope) || 0) + 1;
    vocabularySelectionRevisions.set(scope, revision);
    let loaded = false;
    try {
        await ensureVocabularyLevels(levels);
        loaded = true;
    }
    catch (error) {
        // The loader reports the failing level. Keep currently loaded Vocabulary usable.
    }
    if (vocabularySelectionRevisions.get(scope) === revision) onSettled?.(loaded);
    return loaded;
}

async function loadGlobalLearningContent() {
    const [kanjiLoaded, vocabularyLoaded] = await Promise.all([
        loadKanjiForSelection("global", globalLevels),
        loadVocabularyForSelection("global", globalLevels)
    ]);
    if (kanjiLoaded || vocabularyLoaded) refreshAllFilteredContent();
}

function refreshSectionForLevelChange(sectionName) {
    if (VOCABULARY_FILTER_SECTIONS.has(sectionName)) {
        loadVocabularyForSelection(sectionName, getActiveLevels(sectionName), loaded => {
            if (loaded) refreshSection(sectionName);
        });
        return;
    }
    if (!KANJI_FILTER_SECTIONS.has(sectionName)) {
        refreshSection(sectionName);
        return;
    }
    loadKanjiForSelection(sectionName, getActiveLevels(sectionName), loaded => {
        if (loaded) refreshSection(sectionName);
    });
}

function itemKey(item) {
    if (!item) return "";
    return `${item.migratedFrom === "native" ? "native" : item.type}:${item.id}`;
}

function isSaved(item) {
    return Boolean(item) && savedItems.some(saved => itemKey(saved) === itemKey(item));
}

function setSaveButton(button, item) {
    if (!button) return;
    const saved = isSaved(item);
    button.classList.toggle("saved", saved);
    button.textContent = saved ? "♥" : "♡";
    button.setAttribute("aria-pressed", String(saved));
}

function updateSavedCounts() {
    document.getElementById("home-saved-count").textContent = savedItems.length;
}

function saveItem(item) {
    if (!item || isSaved(item)) return false;
    savedItems.push({ ...item, savedAt: new Date().toISOString() });
    writeJson(STORAGE.saved, savedItems);
    updateSavedUi();
    return true;
}

function removeItem(item) {
    if (!item) return;
    savedItems = savedItems.filter(saved => itemKey(saved) !== itemKey(item));
    delete flashcardStatuses[itemKey(item)];
    writeJson(STORAGE.saved, savedItems);
    writeJson(STORAGE.statuses, flashcardStatuses);
    updateSavedUi();
}

function toggleSaved(item) {
    if (isSaved(item)) removeItem(item);
    else saveItem(item);
}

function syncSaveButtons() {
    setSaveButton(document.getElementById("save-daily-kanji"), currentDailyKanji);
    setSaveButton(document.getElementById("save-daily-word"), currentDailyWord);
    setSaveButton(document.getElementById("save-browse-kanji"), currentBrowseKanji);
    setSaveButton(document.getElementById("save-browse-word"), currentBrowseWord);
    setSaveButton(document.getElementById("save-native-item"), currentNativeItem);
    setSaveButton(document.getElementById("save-detail-kanji"), currentDetailKanji);
    setSaveButton(document.getElementById("save-detail-word"), currentDetailWord);
    setSaveButton(document.getElementById("save-kana-quiz"), kanaQuizSavedItem());
    setSaveButton(document.getElementById("save-kanji-quiz"), currentKanjiQuiz);
    setSaveButton(document.getElementById("save-vocabulary-quiz"), currentVocabularyQuiz);
}

function updateSavedUi() {
    updateSavedCounts();
    syncSaveButtons();
    renderSavedItems();
    renderMyTravelPhrases();
    if (currentRoute === "library" && libraryRepository) renderLibraryResults();
    cleanTravelDecks();
    renderTravelDecks();
    renderCurrentTravelDeck();
    buildFlashcardDeck();
}

function getGlobalLevels() {
    return normalizeJlptLevels(globalLevels);
}

function getActiveLevels(sectionName) {
    const setting = sectionSettings[sectionName];
    if (DIRECT_LEVEL_SECTIONS.has(sectionName)) return normalizeJlptLevels(setting?.levels, globalLevels);
    if (!setting || setting.useGlobal !== false) return getGlobalLevels();
    return normalizeJlptLevels(setting.levels, JLPT_LEVELS);
}

function itemsForLevels(items, sectionName) {
    const levels = getActiveLevels(sectionName);
    if (!Array.isArray(items)) return [];
    let cachedPools = levelPoolCache.get(items);
    if (!cachedPools) { cachedPools = new Map(); levelPoolCache.set(items, cachedPools); }
    const key = levels.join("|");
    if (!cachedPools.has(key)) {
        const levelSet = new Set(levels);
        cachedPools.set(key, items.filter(item => levelSet.has(item.jlpt)));
    }
    return cachedPools.get(key);
}

function createLevelChip(level, checked, onChange, disabled = false) {
    const label = document.createElement("label");
    label.className = "level-chip";
    label.innerHTML = `<input type="checkbox" value="${level}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}><span>${level}</span>`;
    label.querySelector("input").addEventListener("change", onChange);
    return label;
}

function renderGlobalLevels() {
    const container = document.getElementById("global-jlpt-selector");
    if (!container) return;
    container.innerHTML = "";
    JLPT_LEVELS.forEach(level => {
        container.appendChild(createLevelChip(level, globalLevels.includes(level), event => {
            globalLevels = event.target.checked
                ? [...new Set([...globalLevels, level])]
                : globalLevels.filter(value => value !== level);
            if (!globalLevels.length) globalLevels = ["N5"];
            globalLevels = normalizeJlptLevels(globalLevels, ["N5"]);
            writeJson(STORAGE.globalLevels, globalLevels);
            renderGlobalLevels();
            renderAllSectionControls();
            loadGlobalLearningContent();
        }));
    });
    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = `all-level-button ${globalLevels.length === JLPT_LEVELS.length ? "active" : ""}`;
    allButton.textContent = "◎ All";
    allButton.addEventListener("click", () => {
        globalLevels = globalLevels.length === JLPT_LEVELS.length ? ["N5"] : [...JLPT_LEVELS];
        writeJson(STORAGE.globalLevels, globalLevels);
        renderGlobalLevels();
        renderAllSectionControls();
        loadGlobalLearningContent();
    });
    container.appendChild(allButton);
    const label = globalLevels.length === JLPT_LEVELS.length ? "All" : globalLevels.join(" + ");
    const summary = document.getElementById("global-level-summary");
    const compactLabel = document.getElementById("home-study-level-label");
    if (summary) summary.textContent = `Selected: ${label}`;
    if (compactLabel) compactLabel.textContent = label;
}

function renderSectionControl(sectionName) {
    const container = document.getElementById(`${sectionName}-levels`);
    if (!container) return;
    const direct = DIRECT_LEVEL_SECTIONS.has(sectionName);
    const setting = sectionSettings[sectionName] || (direct ? { levels:[...globalLevels] } : { useGlobal:true, levels:[...DEFAULT_LEVELS] });
    const activeLevels = getActiveLevels(sectionName);
    container.innerHTML = "";

    const top = document.createElement("div");
    top.className = "level-control-top";
    top.innerHTML = `<span class="active-level-text">Active: ${activeLevels.length === JLPT_LEVELS.length ? "All" : activeLevels.join(" + ")}</span>${direct ? "" : `<label class="global-toggle"><span>Use Global</span><input type="checkbox" ${setting.useGlobal !== false ? "checked" : ""}></label>`}`;
    if (!direct) top.querySelector("input").addEventListener("change", event => {
        sectionSettings[sectionName] = { ...setting, useGlobal:event.target.checked };
        writeJson(STORAGE.sectionLevels, sectionSettings); renderAllSectionControls(); refreshSectionForLevelChange(sectionName);
    });
    container.appendChild(top);

    const chips = document.createElement("div");
    chips.className = "section-level-chips";
    JLPT_LEVELS.forEach(level => {
        chips.appendChild(createLevelChip(level, activeLevels.includes(level), event => {
            const current = sectionSettings[sectionName] || setting;
            const levels = event.target.checked
                ? [...new Set([...(current.levels || []), level])]
                : (current.levels || []).filter(value => value !== level);
            sectionSettings[sectionName] = direct ? { levels:levels.length ? levels : ["N5"] } : { useGlobal:false, levels:levels.length ? levels : ["N5"] };
            writeJson(STORAGE.sectionLevels, sectionSettings);
            renderAllSectionControls();
            refreshSectionForLevelChange(sectionName);
        }, !direct && setting.useGlobal !== false));
    });
    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = `all-level-button ${(direct || !setting.useGlobal) && activeLevels.length === JLPT_LEVELS.length ? "active" : ""}`;
    allButton.textContent = "◎ All";
    allButton.disabled = !direct && setting.useGlobal !== false;
    allButton.addEventListener("click", () => {
        const nextLevels = activeLevels.length === JLPT_LEVELS.length ? ["N5"] : [...JLPT_LEVELS];
        sectionSettings[sectionName] = direct ? { levels:nextLevels } : { useGlobal:false, levels:nextLevels };
        writeJson(STORAGE.sectionLevels, sectionSettings);
        renderAllSectionControls();
        refreshSectionForLevelChange(sectionName);
    });
    chips.appendChild(allButton);
    container.appendChild(chips);
}

function renderAllSectionControls() {
    SECTION_NAMES.forEach(renderSectionControl);
}

function pickIndex(pool, current, direction = 1, random = false) {
    if (!pool.length) return -1;
    const currentIndex = pool.findIndex(item => current && item.id === current.id);
    if (random && pool.length > 1) {
        let result;
        do result = Math.floor(Math.random() * pool.length);
        while (result === currentIndex);
        return result;
    }
    if (currentIndex < 0) return direction < 0 ? pool.length - 1 : 0;
    return (currentIndex + direction + pool.length) % pool.length;
}

async function enhanceVocabulary(item) {
    try {
        const response = await fetch("https://jotoba.de/api/search/words", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: item.word, language: "English", no_english: false })
        });
        if (!response.ok) throw new Error("Jotoba request failed.");
        const data = await response.json();
        const entry = Array.isArray(data.words) ? data.words.find(word => word?.reading && word.reading.kanji === item.word) || data.words[0] : null;
        const sense = entry?.senses?.find(value => value.language === "English" && value.glosses?.length) || entry?.senses?.find(value => value.glosses?.length);
        if (!entry) return item;
        return {
            ...item,
            kana: entry.reading?.kana || item.kana,
            meaning: sense?.glosses?.slice(0, 3).join("; ") || item.meaning
        };
    }
    catch (error) {
        console.info("Using local vocabulary fallback.", error);
        return item;
    }
}

function renderOptionalText(id, value, containerId = "") {
    const element = document.getElementById(id);
    const text = typeof value === "string" ? value.trim() : "";
    element.textContent = text;
    (containerId ? document.getElementById(containerId) : element).hidden = !text;
}

function renderDailyKanji(item) {
    currentDailyKanji = item;
    document.getElementById("daily-kanji-character").textContent = item?.character || "—";
    document.getElementById("daily-kanji-reading").textContent = item?.reading || "No reading available";
    renderOptionalText("daily-kanji-romaji", item?.romaji);
    document.getElementById("daily-kanji-meaning").textContent = item?.meaning || "No content for these levels";
    document.getElementById("daily-kanji-level").textContent = item?.jlpt || "—";
    const example = item?.examples?.[0];
    document.getElementById("daily-kanji-example").textContent = example ? `${example.word}（${example.reading}）— ${example.meaning}` : "Choose another JLPT level.";
    setSaveButton(document.getElementById("save-daily-kanji"), item);
}

function browseDailyKanji(direction = 1, random = false) {
    const pool = itemsForLevels(window.KANJI_DATA, "kanjiOfDay");
    const index = pickIndex(pool, currentDailyKanji, direction, random);
    const selected = index < 0 ? null : pool[index];
    renderDailyKanji(selected);
}

function renderDailyWord(item) {
    currentDailyWord = item;
    document.getElementById("daily-word-text").textContent = item?.word || "—";
    document.getElementById("daily-word-reading").textContent = item?.kana || "No reading available";
    renderOptionalText("daily-word-romaji", item?.romaji);
    document.getElementById("daily-word-meaning").textContent = item?.meaning || "No content for these levels";
    document.getElementById("daily-word-tags").innerHTML = item ? `<span class="tag">${item.jlpt}</span><span class="tag">${partOfSpeech(item)}</span>` : "";
    document.getElementById("daily-word-example").textContent = item?.exampleSentence || "Choose another JLPT level.";
    setSaveButton(document.getElementById("save-daily-word"), item);
}

async function browseDailyWord(direction = 1, random = false) {
    const pool = itemsForLevels(window.VOCABULARY_DATA, "wordOfDay");
    const index = pickIndex(pool, currentDailyWord, direction, random);
    const selected = index < 0 ? null : pool[index];
    renderDailyWord(selected);
    if (!selected) return;
    const enhanced = await enhanceVocabulary(selected);
    if (currentDailyWord?.id === selected.id) renderDailyWord(enhanced);
}

function renderBrowseKanji(item) {
    currentBrowseKanji = item;
    document.getElementById("browse-kanji-character").textContent = item?.character || "—";
    document.getElementById("browse-kanji-reading").textContent = item?.reading || "No reading available";
    renderOptionalText("browse-kanji-romaji", item?.romaji);
    document.getElementById("browse-kanji-meaning").textContent = item?.meaning || "No content for these levels";
    document.getElementById("browse-kanji-level").textContent = item?.jlpt || "—";
    setSaveButton(document.getElementById("save-browse-kanji"), item);
}

function browseKanji(direction = 1, random = false) {
    const pool = itemsForLevels(window.KANJI_DATA, "randomKanji");
    const index = pickIndex(pool, currentBrowseKanji, direction, random);
    renderBrowseKanji(index < 0 ? null : pool[index]);
}

function renderBrowseWord(item) {
    currentBrowseWord = item;
    document.getElementById("browse-word-text").textContent = item?.word || "—";
    document.getElementById("browse-word-reading").textContent = item?.kana || "No reading available";
    renderOptionalText("browse-word-romaji", item?.romaji);
    document.getElementById("browse-word-meaning").textContent = item?.meaning || "No content for these levels";
    document.getElementById("browse-word-level").textContent = item?.jlpt || "—";
    setSaveButton(document.getElementById("save-browse-word"), item);
}

function browseWord(direction = 1, random = false) {
    const pool = itemsForLevels(window.VOCABULARY_DATA, "randomVocabulary");
    const index = pickIndex(pool, currentBrowseWord, direction, random);
    renderBrowseWord(index < 0 ? null : pool[index]);
}

function partOfSpeech(item) {
    const notes = String(item?.notes || "").toLowerCase();
    if (notes.includes("する")) return "Noun / する verb";
    if (notes.includes("adverb")) return "Adverb";
    if (notes.includes("adjective")) return "Adjective";
    if (notes.includes("verb")) return "Verb";
    return "Vocabulary";
}

function renderKanjiDetail(item) {
    currentDetailKanji = item;
    document.getElementById("detail-kanji-character").textContent = item?.character || "—";
    document.getElementById("detail-kanji-level").textContent = item?.jlpt || "—";
    document.getElementById("detail-kanji-meaning").textContent = item?.literalMeaning || item?.meaning || "No content available";
    document.getElementById("detail-kanji-core-concept").textContent = item?.coreConcept || item?.meaning || "No content available";
    renderOptionalText("detail-kanji-primary-reading", item?.reading, "detail-kanji-primary-reading-group");
    renderOptionalText("detail-kanji-romaji", item?.romaji, "detail-kanji-romaji-group");
    document.getElementById("detail-kanji-usage-note").textContent = item?.naturalUsageNotes || "This kanji is usually encountered as part of complete words.";
    document.getElementById("detail-kanji-onyomi").textContent = item?.onyomi?.join(", ") || "—";
    document.getElementById("detail-kanji-kunyomi").textContent = item?.kunyomi?.join(", ") || "—";
    document.getElementById("detail-kanji-sentence").textContent = item?.exampleSentence || "";
    document.getElementById("detail-kanji-translation").textContent = item?.exampleTranslation || "";
    document.getElementById("detail-kanji-examples").innerHTML = (item?.commonWords || item?.examples || []).map(example => {
        const savedExample = { id: `example-${item.id}-${example.word}`, type: "vocabulary", word: example.word, kana: example.reading, romaji: "", meaning: example.meaning, jlpt: item.jlpt, exampleSentence: item.exampleSentence, exampleTranslation: item.exampleTranslation, notes: `Example word for ${item.character}` };
        return `<article class="example-word"><span><strong>${example.word}（${example.reading}）</strong><small>${example.meaning}</small></span><button class="example-save-button ${isSaved(savedExample) ? "saved" : ""}" type="button" data-example-id="${encodeURIComponent(JSON.stringify(savedExample))}" aria-label="Save ${example.word}">${isSaved(savedExample) ? "♥" : "♡"}</button></article>`;
    }).join("") || '<p class="empty-state">No example words available.</p>';
    setSaveButton(document.getElementById("save-detail-kanji"), item);
    renderMasteryControl(document.getElementById("kanji-mastery-control"), item);
}

function renderWordDetail(item) {
    currentDetailWord = item;
    document.getElementById("detail-word-level").textContent = item?.jlpt || "—";
    document.getElementById("detail-word-text").textContent = item?.word || "—";
    renderOptionalText("detail-word-kana", item?.kana);
    renderOptionalText("detail-word-romaji", item?.romaji);
    document.getElementById("detail-word-dictionary-meaning").textContent = item?.dictionaryMeaning || item?.meaning || "No content available";
    document.getElementById("detail-word-meaning").textContent = item?.naturalMeaning || item?.meaning || "No content available";
    document.getElementById("detail-word-pos").textContent = partOfSpeech(item);
    document.getElementById("detail-word-sentence").textContent = item?.exampleSentence || "";
    document.getElementById("detail-word-translation").textContent = item?.exampleTranslation || "";
    document.getElementById("detail-word-notes").textContent = item?.naturalUsageNotes || item?.notes || "No usage note available.";
    setSaveButton(document.getElementById("save-detail-word"), item);
    renderMasteryControl(document.getElementById("word-mastery-control"), item);
}

function openKanjiDetail(item, returnRoute = currentRoute) {
    if (!item) return;
    detailReturnRoute = returnRoute;
    renderKanjiDetail(item);
    showRoute("kanji-detail", false);
}

function openWordDetail(item, returnRoute = currentRoute) {
    if (!item) return;
    detailReturnRoute = returnRoute;
    renderWordDetail(item);
    showRoute("word-detail", false);
}

function moveDetailKanji(direction = 1, random = false) {
    const section = detailReturnRoute === "learn" ? "randomKanji" : "kanjiOfDay";
    const pool = detailReturnRoute === "library" ? libraryCurrentItems : detailReturnRoute === "search" ? window.KANJI_DATA : itemsForLevels(window.KANJI_DATA, section);
    const index = pickIndex(pool, currentDetailKanji, direction, random);
    const item = index < 0 ? null : pool[index];
    renderKanjiDetail(item);
    if (detailReturnRoute === "learn") renderBrowseKanji(item);
    else if (detailReturnRoute !== "search") renderDailyKanji(item);
}

function moveDetailWord(direction = 1, random = false) {
    const section = detailReturnRoute === "learn" ? "randomVocabulary" : "wordOfDay";
    const pool = detailReturnRoute === "library" ? libraryCurrentItems : detailReturnRoute === "search" ? window.VOCABULARY_DATA : itemsForLevels(window.VOCABULARY_DATA, section);
    const index = pickIndex(pool, currentDetailWord, direction, random);
    const item = index < 0 ? null : pool[index];
    renderWordDetail(item);
    if (detailReturnRoute === "learn") renderBrowseWord(item);
    else if (detailReturnRoute !== "search") renderDailyWord(item);
}

function kanaGroup(item) {
    return item[3] || "Basic";
}

function kanaQuizEligible(item) {
    return item[4] !== false;
}

let kanaRomajiReadingsCache = null;
let kanaRomajiTokensCache = null;

function kanaToRomaji(value) {
    const kana = String(value || "").normalize("NFKC");
    if (!kanaRomajiReadingsCache) {
        kanaRomajiReadingsCache = new Map(KANA_DATA.filter(kanaQuizEligible).map(item => [item[0], item[1]]));
        kanaRomajiTokensCache = [...kanaRomajiReadingsCache.keys()].sort((left, right) => right.length - left.length);
    }
    const readings = kanaRomajiReadingsCache;
    const tokens = kanaRomajiTokensCache;
    let result = "";
    for (let index = 0; index < kana.length;) {
        const character = kana[index];
        if (character === "っ" || character === "ッ") {
            const nextToken = tokens.find(token => kana.startsWith(token, index + 1));
            const nextReading = nextToken ? readings.get(nextToken) : "";
            result += nextReading.startsWith("ch") ? "c" : (/^[bcdfghjklmnpqrstvwxyz]/.exec(nextReading)?.[0] || "");
            index += 1;
            continue;
        }
        if (character === "ー") {
            result += /[aeiou](?!.*[aeiou])/.exec(result)?.[0] || "";
            index += 1;
            continue;
        }
        const token = tokens.find(candidate => kana.startsWith(candidate, index));
        if (!token) {
            result += character;
            index += 1;
            continue;
        }
        result += readings.get(token);
        index += token.length;
    }
    return result;
}


function kanjiQuizReadingWithRomaji(reading) {
    const kana = String(reading || "").trim();
    if (!kana || !kanjiQuizRomajiVisible) return kana;
    const romaji = kanaToRomaji(kana);
    return romaji && romaji !== kana ? `${kana} (${romaji})` : kana;
}

function kanjiQuizRevealText(item = currentKanjiQuiz) {
    if (!item) return "No content available.";
    const on = (item.onyomi || []).map(kanjiQuizReadingWithRomaji).join(", ") || "—";
    const kun = (item.kunyomi || []).map(kanjiQuizReadingWithRomaji).join(", ") || "—";
    return `${item.meaning} · On: ${on} · Kun: ${kun}`;
}

function applyKanjiQuizRomajiVisibility() {
    const button = document.getElementById("kanji-quiz-romaji-toggle");
    if (!button) return;
    button.textContent = kanjiQuizRomajiVisible ? "Hide Romaji" : "Show Romaji";
    button.setAttribute("aria-pressed", String(kanjiQuizRomajiVisible));
    if (kanjiQuizFeedbackRevealed && currentKanjiQuiz) {
        setFeedback("kanji-quiz-feedback", kanjiQuizRevealText(currentKanjiQuiz));
    }
}

function kanaQuizSavedItem(item = currentKana) {
    if (!Array.isArray(item) || !item[0] || !item[1]) return null;
    const character = String(item[0]);
    const group = kanaGroup(item);
    const script = String(item[2] || "Kana");
    const codePoints = [...character].map(value => value.codePointAt(0).toString(16)).join("-");
    return {
        id: `kana-${codePoints}`,
        type: "kana",
        character,
        reading: String(item[1]),
        script,
        kanaGroup: group,
        category: `${script} · ${group === "Yoon" ? "Yōon" : group}`,
        meaning: `${script} ${group === "Yoon" ? "Yōon" : group} kana`
    };
}

function renderKanaQuizGroups() {
    const container = document.getElementById("kana-quiz-groups");
    if (!container) return;
    container.innerHTML = KANA_QUIZ_GROUPS.map(group => `<button class="kana-group-chip ${activeKanaQuizGroups.includes(group) ? "active" : ""}" type="button" data-kana-group="${group}" aria-pressed="${activeKanaQuizGroups.includes(group)}">${group === "Yoon" ? "Yōon" : group}</button>`).join("");
}

function toggleKanaQuizGroup(group) {
    if (!KANA_QUIZ_GROUPS.includes(group)) return;
    if (activeKanaQuizGroups.includes(group)) {
        if (activeKanaQuizGroups.length === 1) return;
        activeKanaQuizGroups = activeKanaQuizGroups.filter(value => value !== group);
    }
    else activeKanaQuizGroups = KANA_QUIZ_GROUPS.filter(value => activeKanaQuizGroups.includes(value) || value === group);
    writeJson(STORAGE.kanaQuizGroups, activeKanaQuizGroups);
    renderKanaQuizGroups();
    newKana();
}

function newKana() {
    cancelQuizTransition("kana");
    const pool = KANA_DATA.filter(item => kanaQuizEligible(item) && activeKanaQuizGroups.includes(kanaGroup(item)));
    const choices = pool.filter(item => !currentKana || item[0] !== currentKana[0]);
    const available = choices.length ? choices : pool;
    currentKana = available[Math.floor(Math.random() * available.length)];
    document.getElementById("kana-character").textContent = currentKana[0];
    document.getElementById("kana-type").textContent = `${currentKana[2]} · ${kanaGroup(currentKana) === "Yoon" ? "Yōon" : kanaGroup(currentKana)}`;
    document.getElementById("kana-answer").value = "";
    setFeedback("kana-feedback", "");
    setSaveButton(document.getElementById("save-kana-quiz"), kanaQuizSavedItem());
    recordQuizQuestion("kana");
}

function newKanjiQuiz() {
    cancelQuizTransition("kanji");
    const pool = itemsForLevels(window.KANJI_DATA, "kanjiQuiz");
    const index = pickIndex(pool, currentKanjiQuiz, 1, true);
    currentKanjiQuiz = index < 0 ? null : pool[index];
    dailyQuestionCredited.kanji = false;
    kanjiQuizFeedbackRevealed = false;
    document.getElementById("kanji-quiz-character").textContent = currentKanjiQuiz?.character || "—";
    document.getElementById("kanji-quiz-answer").value = "";
    setFeedback("kanji-quiz-feedback", currentKanjiQuiz ? "" : "No content is available for these levels.", "incorrect");
    setSaveButton(document.getElementById("save-kanji-quiz"), currentKanjiQuiz);
    if (currentKanjiQuiz) recordQuizQuestion("kanji");
}

function newVocabularyQuiz() {
    cancelQuizTransition("vocabulary");
    const pool = itemsForLevels(window.VOCABULARY_DATA, "vocabularyQuiz");
    const index = pickIndex(pool, currentVocabularyQuiz, 1, true);
    currentVocabularyQuiz = index < 0 ? null : pool[index];
    dailyQuestionCredited.vocabulary = false;
    document.getElementById("vocabulary-quiz-word").textContent = currentVocabularyQuiz?.word || "—";
    document.getElementById("vocabulary-quiz-reading").textContent = currentVocabularyQuiz?.kana || "No content is available for these levels.";
    document.getElementById("vocabulary-quiz-answer").value = "";
    setFeedback("vocabulary-quiz-feedback", "");
    setSaveButton(document.getElementById("save-vocabulary-quiz"), currentVocabularyQuiz);
    if (currentVocabularyQuiz) recordQuizQuestion("vocabulary");
}

function setFeedback(id, message, state = "") {
    const element = document.getElementById(id);
    element.textContent = message;
    element.className = `feedback ${state}`;
}

const QUIZ_UI = {
    kana: { panel: "kana-quiz-panel", input: "kana-answer", check: "check-kana", blooms: "kana-quiz-blooms", misses: "kana-quiz-misses" },
    kanji: { panel: "kanji-quiz-panel", input: "kanji-quiz-answer", check: "check-kanji-quiz", blooms: "kanji-quiz-blooms", misses: "kanji-quiz-misses" },
    vocabulary: { panel: "vocabulary-quiz-panel", input: "vocabulary-quiz-answer", check: "check-vocabulary-quiz", blooms: "vocabulary-quiz-blooms", misses: "vocabulary-quiz-misses" }
};

function normalizedQuizStats(type) {
    const stored = quizStats[type] || {};
    return { blooms: Number(stored.blooms) || 0, misses: Number(stored.misses) || 0, questions: Number(stored.questions) || 0 };
}

function updateQuizStatus(type) {
    const stats = normalizedQuizStats(type);
    quizStats[type] = stats;
    document.getElementById(QUIZ_UI[type].blooms).textContent = stats.blooms;
    document.getElementById(QUIZ_UI[type].misses).textContent = stats.misses;
}

function recordQuizQuestion(type) {
    const stats = normalizedQuizStats(type);
    stats.questions += 1;
    quizStats[type] = stats;
    updateQuizStatus(type);
}

function recordQuizMiss(type) {
    const stats = normalizedQuizStats(type);
    stats.misses += 1;
    quizStats[type] = stats;
    updateQuizStatus(type);
}

function resetQuizSession(type) {
    if (!QUIZ_UI[type]) return;
    const stats = normalizedQuizStats(type);
    if ((stats.blooms || stats.misses) && !window.confirm("Reset your Quiz Garden?\n\nYour Blooms and Misses will return to zero.")) return;
    cancelQuizTransition(type);
    quizStats[type] = { blooms: 0, misses: 0, questions: 0 };
    updateQuizStatus(type);
    ({ kana: newKana, kanji: newKanjiQuiz, vocabulary: newVocabularyQuiz })[type]();
}

function cancelQuizTransition(type) {
    clearTimeout(quizTransitionTimers[type]);
    quizTransitionTimers[type] = null;
    quizTransitionLocks[type] = false;
    const ui = QUIZ_UI[type];
    document.getElementById(ui.panel)?.classList.remove("correct-transition");
    const input = document.getElementById(ui.input);
    const check = document.getElementById(ui.check);
    if (input) input.disabled = false;
    if (check) check.disabled = false;
}

function completeCorrectAnswer(type, feedbackId, message, nextQuestion) {
    if (quizTransitionLocks[type]) return;
    quizTransitionLocks[type] = true;
    const stats = normalizedQuizStats(type);
    stats.blooms += 1;
    quizStats[type] = stats;
    updateQuizStatus(type);
    setFeedback(feedbackId, message, "correct");
    const ui = QUIZ_UI[type];
    document.getElementById(ui.panel).classList.add("correct-transition");
    document.getElementById(ui.input).disabled = true;
    document.getElementById(ui.check).disabled = true;
    quizTransitionTimers[type] = setTimeout(nextQuestion, 850);
}

function checkKana() {
    if (quizTransitionLocks.kana || !currentKana) return;
    const answer = normalizeAnswer(document.getElementById("kana-answer").value);
    if (answer === currentKana[1]) {
        completeCorrectAnswer("kana", "kana-feedback", `Correct! ${currentKana[0]} is ${currentKana[1]}.`, newKana);
        return;
    }
    recordQuizMiss("kana");
    setFeedback("kana-feedback", "Try again. Enter the romaji reading.", "incorrect");
    return;
}

function normalizeKanjiReading(value) {
    return normalizeAnswer(String(value || "").normalize("NFKC"))
        .replace(/[。、．・･]/g, "")
        .replace(/[ァ-ヶ]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60));
}

function kanjiReadingAnswers(item) {
    return [...(item?.onyomi || []), ...(item?.kunyomi || [])]
        .flatMap(reading => String(reading || "").split(/[\/／,，、;；|｜]+/))
        .map(normalizeKanjiReading)
        .filter(Boolean);
}

function normalizeKanjiRomaji(value) {
    return normalizeAnswer(String(value || "").normalize("NFKC"))
        .replace(/[\s\-\u2010-\u2015・･]+/g, "");
}

function kanjiRomajiAnswers(item) {
    return String(item?.romaji || "")
        .split(/[\/／,，、;；|｜]+/)
        .map(normalizeKanjiRomaji)
        .filter(Boolean);
}

function isKanjiQuizAnswerCorrect(item, rawAnswer) {
    const answer = normalizeAnswer(rawAnswer);
    const meaningAnswers = String(item?.meaning || "").split(/[;,]/).map(normalizeAnswer).filter(Boolean);
    const readingAnswer = normalizeKanjiReading(rawAnswer);
    const readingAnswers = kanjiReadingAnswers(item);
    const romajiAnswer = normalizeKanjiRomaji(rawAnswer);
    const romajiAnswers = kanjiRomajiAnswers(item);
    const exactMatch = meaningAnswers.includes(answer) || readingAnswers.includes(readingAnswer) || romajiAnswers.includes(romajiAnswer);
    const escapedAnswer = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const meaningfulEnglishPartial = answer.length >= 3 && /^[a-z][a-z\s'-]*$/i.test(answer) && meaningAnswers.some(value => new RegExp(`(^|\\s)${escapedAnswer}(?=$|\\s)`, "i").test(value));
    return Boolean(answer) && (exactMatch || meaningfulEnglishPartial);
}

function checkKanjiQuiz() {
    if (quizTransitionLocks.kanji || !currentKanjiQuiz) return;
    if (!dailyQuestionCredited.kanji) { dailyQuestionCredited.kanji = true; recordDailyStudyAction(); }
    const correct = isKanjiQuizAnswerCorrect(currentKanjiQuiz, document.getElementById("kanji-quiz-answer").value);
    recordMasteryResult(currentKanjiQuiz, correct);
    if (correct) completeCorrectAnswer("kanji", "kanji-quiz-feedback", `Correct! ${currentKanjiQuiz.character}: ${currentKanjiQuiz.meaning}`, newKanjiQuiz);
    else { recordQuizMiss("kanji"); setFeedback("kanji-quiz-feedback", "Try again with a reading or English meaning.", "incorrect"); }
    return;
}

function checkVocabularyQuiz() {
    if (quizTransitionLocks.vocabulary || !currentVocabularyQuiz) return;
    if (!dailyQuestionCredited.vocabulary) { dailyQuestionCredited.vocabulary = true; recordDailyStudyAction(); }
    const answer = normalizeAnswer(document.getElementById("vocabulary-quiz-answer").value);
    const meanings = currentVocabularyQuiz.meaning.split(/[;,]/).map(normalizeAnswer);
    const correct = answer && meanings.some(value => value === answer || value.includes(answer));
    recordMasteryResult(currentVocabularyQuiz, Boolean(correct));
    if (correct) completeCorrectAnswer("vocabulary", "vocabulary-quiz-feedback", `Correct! ${currentVocabularyQuiz.word}: ${currentVocabularyQuiz.meaning}`, newVocabularyQuiz);
    else { recordQuizMiss("vocabulary"); setFeedback("vocabulary-quiz-feedback", "Try again with the English meaning.", "incorrect"); }
    return;
}

function showQuizTab(name) {
    if (!QUIZ_UI[name]) name = "kana";
    document.querySelectorAll("[data-quiz-tab]").forEach(button => button.classList.toggle("active", button.dataset.quizTab === name));
    document.querySelectorAll("[data-quiz-panel]").forEach(panel => { panel.hidden = panel.dataset.quizPanel !== name; });
    localStorage.setItem(STORAGE.activeQuiz, name);
}

const SEARCH_NUMBER_WORDS = Object.freeze(["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]);
const PARTY_SIZE_FORMS = Object.freeze({
    1: { kanji:"一人", kana:"ひとり", romaji:"hitori", english:"one" },
    2: { kanji:"二人", kana:"ふたり", romaji:"futari", english:"two" },
    3: { kanji:"三人", kana:"さんにん", romaji:"sannin", english:"three" },
    4: { kanji:"四人", kana:"よにん", romaji:"yonin", english:"four" },
    5: { kanji:"五人", kana:"ごにん", romaji:"gonin", english:"five" },
    6: { kanji:"六人", kana:"ろくにん", romaji:"rokunin", english:"six" },
    7: { kanji:"七人", kana:"ななにん", romaji:"nananin", english:"seven" },
    8: { kanji:"八人", kana:"はちにん", romaji:"hachinin", english:"eight" },
    9: { kanji:"九人", kana:"きゅうにん", romaji:"kyuunin", english:"nine" },
    10: { kanji:"十人", kana:"じゅうにん", romaji:"juunin", english:"ten" }
});
const TICKET_QUANTITY_FORMS = Object.freeze({
    1: { kanji:"一枚", kana:"いちまい", romaji:"ichimai", english:"one" },
    2: { kanji:"二枚", kana:"にまい", romaji:"nimai", english:"two" },
    3: { kanji:"三枚", kana:"さんまい", romaji:"sanmai", english:"three" },
    4: { kanji:"四枚", kana:"よんまい", romaji:"yonmai", english:"four" },
    5: { kanji:"五枚", kana:"ごまい", romaji:"gomai", english:"five" },
    6: { kanji:"六枚", kana:"ろくまい", romaji:"rokumai", english:"six" },
    7: { kanji:"七枚", kana:"ななまい", romaji:"nanamai", english:"seven" },
    8: { kanji:"八枚", kana:"はちまい", romaji:"hachimai", english:"eight" },
    9: { kanji:"九枚", kana:"きゅうまい", romaji:"kyuumai", english:"nine" },
    10: { kanji:"十枚", kana:"じゅうまい", romaji:"juumai", english:"ten" }
});
const SHOPPING_QUANTITY_FORMS = Object.freeze({
    1: { kanji:"一つ", kana:"ひとつ", romaji:"hitotsu", english:"one" },
    2: { kanji:"二つ", kana:"ふたつ", romaji:"futatsu", english:"two" },
    3: { kanji:"三つ", kana:"みっつ", romaji:"mittsu", english:"three" },
    4: { kanji:"四つ", kana:"よっつ", romaji:"yottsu", english:"four" },
    5: { kanji:"五つ", kana:"いつつ", romaji:"itsutsu", english:"five" },
    6: { kanji:"六つ", kana:"むっつ", romaji:"muttsu", english:"six" },
    7: { kanji:"七つ", kana:"ななつ", romaji:"nanatsu", english:"seven" },
    8: { kanji:"八つ", kana:"やっつ", romaji:"yattsu", english:"eight" },
    9: { kanji:"九つ", kana:"ここのつ", romaji:"kokonotsu", english:"nine" },
    10: { kanji:"十", kana:"とお", romaji:"too", english:"ten" }
});

function searchText(value) {
    let normalized = String(Array.isArray(value) ? value.join(" ") : value || "")
        .normalize("NFKC")
        .replace(/\bwhere[\u2019']s\b/gi, "where is")
        .replace(/\bwe[\u2019']re\b/gi, "we are")
        .replace(/\bi[\u2019']ll\b/gi, "i will")
        .replace(/[.,!?;:\uFF0C\u3002\uFF01\uFF1F\u3001]+/g, " ")
        .replace(/[-\u2010-\u2015]+/g, " ")
        .replace(/[\u3000\s]+/g, " ")
        .trim()
        .toLocaleLowerCase();
    return normalized
        .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g, word => String(SEARCH_NUMBER_WORDS.indexOf(word)))
        .replace(/\bpersons?\b|\bpeople\b/g, "people")
        .replace(/\bbookings?\b|\breservations?\b/g, "reservation")
        .replace(/\bwi\s+fi\b/g, "wifi")
        .replace(/\bmicrowav(?:e|ed|ing)\b/g, "heat")
        .replace(/\bpictures?\b/g, "photo")
        .replace(/[\s]+/g, " ")
        .trim();
}

function searchQuantity(query) {
    const match = searchText(query).match(/(?:^|\s)(10|[1-9])(?:\s|$)/);
    return match ? Number(match[1]) : null;
}

function detectTicketQuantity(query) {
    const normalized = searchText(query);
    if (!/\b(?:tickets?|admission|passes?)\b/.test(normalized)) return null;
    return searchQuantity(normalized);
}

function buildTicketQuantityVariant(quantity) {
    const form = TICKET_QUANTITY_FORMS[quantity];
    if (!form) return null;
    return {
        id: `smart-travel:travel.ticket-quantity:${quantity}`,
        type:"travel", category:"others", subcategory:"Tickets & Admission",
        japanese:`${form.kanji}お願いします。`, reading:`${form.kana} おねがいします。`, romaji:`${form.romaji} onegai shimasu.`,
        english:`${form.english.charAt(0).toUpperCase()}${form.english.slice(1)} ticket${quantity === 1 ? "" : "s"}, please.`, literalMeaning:`${form.english.charAt(0).toUpperCase()}${form.english.slice(1)} flat item${quantity === 1 ? "" : "s"}, please.`,
        naturalUsage:"A concise, polite request for a ticket or admission quantity. Japanese commonly counts tickets with 枚 (mai).",
        politeness:"polite", priority:"essential", tags:["ticket-quantity", "admission", `quantity-${quantity}`],
        smartVariant:true, transient:true, intent:"travel.ticket-quantity"
    };
}

function detectShoppingQuantity(query) {
    const normalized = searchText(query);
    const shoppingContext = /\bof these\b/.test(normalized) || /\bi will take\b/.test(normalized) || /\bcan i get\b.*\bthese\b/.test(normalized);
    if (!shoppingContext || /\b(?:tickets?|admission|passes?|table|people|party|platform|room|gate|exit|size|floor|pm|am)\b/.test(normalized)) return null;
    return searchQuantity(normalized);
}

function buildShoppingQuantityVariant(quantity) {
    const form = SHOPPING_QUANTITY_FORMS[quantity];
    if (!form) return null;
    return {
        id:`smart-travel:shopping.quantity:${quantity}`,
        type:"travel", category:"shopping", subcategory:"Essential",
        japanese:`これを${form.kanji}お願いします。`, reading:`これを ${form.kana} おねがいします。`, romaji:`Kore o ${form.romaji} onegai shimasu.`,
        english:`I’ll take ${form.english} of these, please.`, literalMeaning:`This, ${form.english} item${quantity === 1 ? "" : "s"}, please.`,
        naturalUsage:"A polite general-purpose shopping request when pointing to an item. The native Japanese ～つ counter is used through nine; ten is 十 (とお).",
        politeness:"polite", priority:"essential", tags:["shopping-quantity", "pointing", `quantity-${quantity}`],
        smartVariant:true, transient:true, intent:"shopping.quantity"
    };
}

function detectRestaurantPartySize(query) {
    const normalized = searchText(query);
    const partySize = searchQuantity(normalized);
    if (!partySize) return null;
    const strongContext = /\btable\b|\bpeople\b|\bparty\b|\bwe are\b|\bof us\b|\breservation\b/.test(normalized) || new RegExp(`\\bjust\\s+${partySize}\\b`).test(normalized);
    return strongContext ? partySize : null;
}

function buildRestaurantPartySizeVariant(partySize) {
    const form = PARTY_SIZE_FORMS[partySize];
    if (!form) return null;
    const peopleMeaning = partySize === 1 ? "One person" : `${form.english.charAt(0).toUpperCase()}${form.english.slice(1)} people`;
    return {
        id: `smart-travel:restaurant.party-size:${partySize}`,
        type: "travel", category: "restaurants", subcategory: "Essential",
        japanese: `すみません、${form.kanji}です。`, reading: `すみません、${form.kana}です。`, romaji: `sumimasen, ${form.romaji} desu.`,
        english: `Excuse me, table for ${form.english}.`, literalMeaning: `${peopleMeaning}.`,
        naturalUsage: "Suggested restaurant arrival phrase based on Sakura's trusted party-size template.",
        politeness: "polite", priority: "essential", tags: ["party-size", "restaurant-arrival", `people-${partySize}`],
        smartVariant: true, transient: true, intent: "restaurant.party-size", sourceId: "travel-restaurants-001"
    };
}

const TRAVEL_SEARCH_INTENTS = Object.freeze([
    Object.freeze({ id:"travel.ticket-quantity", detect:detectTicketQuantity, build:buildTicketQuantityVariant }),
    Object.freeze({ id:"shopping.quantity", detect:detectShoppingQuantity, build:buildShoppingQuantityVariant }),
    Object.freeze({ id:"restaurant.party-size", detect:detectRestaurantPartySize, build:buildRestaurantPartySizeVariant })
]);

function smartTravelSearchResults(query) {
    if (!query || !["all", "travel"].includes(searchType)) return [];
    for (const intent of TRAVEL_SEARCH_INTENTS) {
        const value = intent.detect(query);
        const item = value === null ? null : intent.build(value);
        if (item) return [{ item, score:2000 }];
    }
    return [];
}

function cleanEntryText(value) {
    return String(value || "").normalize("NFKC").replace(/[\u3000\t ]+/g, " ").trim();
}

function normalizeContentEntry(entry, forcedType = entry?.type) {
    const type = forcedType === "slang" ? "slang" : "native";
    const categories = type === "slang" ? authoritativeSlangCategories(entry?.categories) : [...new Set((Array.isArray(entry?.categories) ? entry.categories : []).map(cleanEntryText).filter(Boolean))];
    const normalized = {
        id: cleanEntryText(entry?.id), type,
        expression: cleanEntryText(entry?.expression), kana: cleanEntryText(entry?.kana), romaji: cleanEntryText(entry?.romaji),
        naturalMeaning: cleanEntryText(entry?.naturalMeaning || entry?.meaning), literalMeaning: cleanEntryText(entry?.literalMeaning || entry?.literal),
        difficulty: cleanEntryText(entry?.difficulty), categories,
        tone: cleanEntryText(entry?.tone), formality: cleanEntryText(entry?.formality), commonUsers: cleanEntryText(entry?.commonUsers || entry?.users),
        commonSituation: cleanEntryText(entry?.commonSituation || entry?.situation), whereUsed: cleanEntryText(entry?.whereUsed || entry?.whereSeen),
        learnerSafety: cleanEntryText(entry?.learnerSafety || entry?.safe), currentStatus: cleanEntryText(entry?.currentStatus || entry?.status),
        rudeOrRisky: typeof entry?.rudeOrRisky === "boolean" ? entry.rudeOrRisky : !["", "no"].includes(cleanEntryText(entry?.rude).toLowerCase()),
        exampleSentence: cleanEntryText(entry?.exampleSentence), exampleTranslation: cleanEntryText(entry?.exampleTranslation),
        conversation: cleanEntryText(entry?.conversation), nuanceNotes: cleanEntryText(entry?.nuanceNotes || entry?.notes),
        tags: [...new Set((Array.isArray(entry?.tags) ? entry.tags : []).map(cleanEntryText).filter(Boolean))], userCreated: Boolean(entry?.userCreated),
        migratedFrom: cleanEntryText(entry?.migratedFrom)
    };
    return { ...normalized, meaning: normalized.naturalMeaning, literal: normalized.literalMeaning, users: normalized.commonUsers, situation: normalized.commonSituation, whereSeen: normalized.whereUsed, safe: normalized.learnerSafety, status: normalized.currentStatus, rude: normalized.rudeOrRisky ? "Yes" : "No", notes: normalized.nuanceNotes };
}

function invalidateNormalizedContentCaches() {
    normalizedNativeDataCache = null;
    normalizedSlangDataCache = null;
}

function ensureSlangExpansionsLoaded() {
    if (slangExpansionsLoaded) return Promise.resolve();
    if (slangExpansionsLoadPromise) return slangExpansionsLoadPromise;

    slangExpansionsLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-sakura-slang-expansions]');
        const finish = () => {
            slangExpansionsLoaded = true;
            invalidateNormalizedContentCaches();
            invalidateSearchIndex();
            invalidateTranslationReadingCandidates();
            const count = document.getElementById("library-slang-count");
            if (count && libraryInitialized) count.textContent = slangData().length.toLocaleString();
            if (currentNativeMode === "slang" && ["learn-slang", "native"].includes(currentRoute)) {
                refreshNativeCategories();
                browseNative(1, true);
            }
            resolve();
        };
        if (existing) {
            if (existing.dataset.loaded === "true") { finish(); return; }
            existing.addEventListener("load", finish, { once:true });
            existing.addEventListener("error", () => reject(new Error("Sakura's extended slang library could not load.")), { once:true });
            return;
        }

        const script = document.createElement("script");
        script.src = "./data/slang-expansions.js?v=6";
        script.async = true;
        script.dataset.sakuraSlangExpansions = "true";
        script.addEventListener("load", () => { script.dataset.loaded = "true"; finish(); }, { once:true });
        script.addEventListener("error", () => reject(new Error("Sakura's extended slang library could not load.")), { once:true });
        document.body.appendChild(script);
    }).catch(error => {
        slangExpansionsLoadPromise = null;
        console.warn("Extended slang library remains unavailable; Sakura will keep the core slang set usable.", error);
        throw error;
    });

    return slangExpansionsLoadPromise;
}

function scheduleSlangExpansionsLoad() {
    const load = () => ensureSlangExpansionsLoaded().catch(() => {});
    if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout:4500 });
    else window.setTimeout(load, 1200);
}

function nativeData() {
    if (!normalizedNativeDataCache) normalizedNativeDataCache = [...loadedSearchData("NATIVE_JAPANESE_DATA", "Native Japanese").filter(entry => !entry.slangCategories?.length), ...userNativeEntries].map(entry => normalizeContentEntry(entry, "native"));
    return normalizedNativeDataCache;
}

function slangData() {
    if (!normalizedSlangDataCache) {
        const migratedNative = loadedSearchData("NATIVE_JAPANESE_DATA", "Native Japanese")
            .filter(entry => entry.slangCategories?.length)
            .map(entry => ({ ...entry, categories: entry.slangCategories, migratedFrom: "native" }));
        normalizedSlangDataCache = [...loadedSearchData("SLANG_DATA", "Slang"), ...migratedNative, ...userSlangEntries].map(entry => normalizeContentEntry(entry, "slang"));
    }
    return normalizedSlangDataCache;
}

function searchMainText(item) {
    return item.kaomoji || item.character || item.word || item.expression || item.japanese || "";
}

function searchReading(item) {
    if (item.type === "kanji") return [item.reading, ...(item.onyomi || []), ...(item.kunyomi || [])].filter(Boolean).join(" · ");
    return item.kana || item.reading || "";
}

function loadedSearchData(globalName, label) {
    const data = window[globalName];
    if (!Array.isArray(data)) {
        console.warn(`Universal Search: ${label} data failed to load (${globalName}).`);
        return [];
    }
    return data;
}

function buildSearchIndex() {
    if (!searchIndexDirty) return universalSearchIndex;
    const groups = {
        Kanji: loadedSearchData("KANJI_DATA", "Kanji"),
        Vocabulary: loadedSearchData("VOCABULARY_DATA", "Vocabulary"),
        Native: nativeData(),
        Slang: slangData(),
        Travel: window.SakuraTravelLoader?.getLoadedTravelPhrases() || [],
        Translations: savedItems.filter(item => item.type === "translation")
    };
    universalSearchIndex = Object.values(groups).flat();
    searchIndexDirty = false;
    warmSearchFields(universalSearchIndex);
    console.info(`Indexed:\n${groups.Kanji.length} Kanji\n${groups.Vocabulary.length} Vocabulary\n${groups.Native.length} Native\n${groups.Slang.length} Slang\n${groups.Travel.length} Travel`);
    return universalSearchIndex;
}

function invalidateSearchIndex() {
    searchIndexDirty = true;
    searchWarmRevision += 1;
    if (currentRoute === "search") buildSearchIndex();
}

function warmSearchFields(items) {
    const revision = ++searchWarmRevision;
    let index = 0;
    const schedule = callback => {
        if ("requestIdleCallback" in window) window.requestIdleCallback(callback, { timeout:200 });
        else setTimeout(() => callback(null), 0);
    };
    const warmChunk = deadline => {
        if (revision !== searchWarmRevision) return;
        let processed = 0;
        while (index < items.length && processed < 120 && (!deadline || deadline.didTimeout || deadline.timeRemaining() > 1)) {
            searchableFields(items[index]);
            index += 1;
            processed += 1;
        }
        if (index < items.length) schedule(warmChunk);
    };
    schedule(warmChunk);
}

function prepareTravelSearch() {
    if (travelSearchPreparation) return travelSearchPreparation;
    const loader = window.SakuraTravelLoader;
    const categories = Object.keys(window.TRAVEL_CATEGORIES || {});
    if (!loader || !categories.length) return Promise.resolve();
    const loaded = new Set(loader.getLoadedTravelCategories());
    const missing = categories.filter(category => !loaded.has(category));
    if (!missing.length) return Promise.resolve();
    travelSearchPreparation = Promise.allSettled(missing.map(category => loader.loadTravelCategory(category)))
        .then(results => {
            const unavailable = missing.filter((category, index) => results[index].status === "rejected");
            if (unavailable.length) console.warn(`Universal Search: Travel categories unavailable: ${unavailable.join(", ")}. Searching available Travel content.`);
            invalidateSearchIndex();
        })
        .finally(() => { travelSearchPreparation = null; });
    return travelSearchPreparation;
}

function prepareTravelSearchForCurrentQuery() {
    const input = document.getElementById("universal-search-input");
    if (!input?.value.trim() || !["all", "travel"].includes(searchType)) return;
    prepareTravelSearch().then(() => {
        if (currentRoute === "search" && input.value.trim()) renderSearchResults();
    });
}

function prepareKaomojiSearchForCurrentQuery() {
    const input = document.getElementById("universal-search-input");
    if (!input?.value.trim() || !["all", "kaomoji"].includes(searchType) || kaomojiData || kaomojiUniversalLoadScheduled) return;
    kaomojiUniversalLoadScheduled = true;
    loadKaomojiData()
        .then(() => {
            if (currentRoute === "search" && input.value.trim() && ["all", "kaomoji"].includes(searchType)) renderSearchResults();
        })
        .catch(error => console.warn("Universal Search: Kaomoji data could not load.", error))
        .finally(() => { kaomojiUniversalLoadScheduled = false; });
}

function searchIndex() {
    return universalSearchIndex;
}

function searchableFields(item) {
    if (!item || typeof item !== "object") return [];
    const cached = searchFieldCache.get(item);
    if (cached) return cached.all;
    const exampleFields = [...(item.examples || []), ...(item.commonWords || [])].flatMap(example => [example.word, example.reading, example.kana, example.romaji, example.meaning]);
    const primary = [
        item.character, item.kanji, item.word, item.expression, item.japanese,
        item.kana, item.reading, item.romaji, item.meaning, item.english,
        item.naturalMeaning, item.literalMeaning, item.dictionaryMeaning,
        ...(item.onyomi || []), ...(item.kunyomi || []), ...exampleFields
    ].filter(Boolean).map(searchText);
    const all = [
        ...primary, item.literal, item.notes, item.exampleSentence, item.exampleTranslation,
        item.dictionaryMeaning, item.coreConcept, item.naturalUsageNotes,
        item.naturalUsage, item.commonUsers, item.commonSituation,
        item.whereUsed, item.learnerSafety, item.currentStatus, item.nuanceNotes,
        item.conversation, item.tone, item.formality, item.users, item.situation,
        item.whereSeen, item.status, item.safe, item.rude, item.category, item.subcategory,
        item.politeness, item.priority, ...(item.categories || []), ...(item.tags || [])
    ].filter(Boolean).map(searchText);
    const result = { all:[...new Set(all)], primary:new Set(primary) };
    searchFieldCache.set(item, result);
    return result.all;
}

function searchScore(item, query) {
    const fields = searchableFields(item);
    const primary = searchFieldCache.get(item)?.primary || new Set();
    let score = 0;
    fields.forEach((field, index) => {
        if (field === query) score = Math.max(score, 1000 - index * 8);
        else if (field.startsWith(query)) score = Math.max(score, 700 - index * 6);
        else if (field.split(/\s+/).some(word => word.startsWith(query))) score = Math.max(score, 500 - index * 4);
        else if (field.includes(query)) score = Math.max(score, 300 - index * 2);
        if (primary.has(field)) {
            if (field === query) score = Math.max(score, 1200 - index * 4);
            else if (field.startsWith(query)) score = Math.max(score, 1050 - index * 3);
            else if (field.split(/\s+/).some(word => word.startsWith(query))) score = Math.max(score, 980 - index * 2);
            else if (field.includes(query)) score = Math.max(score, 760 - index);
        }
    });
    const queryTokens = query.split(/\s+/).filter(token => token.length > 1);
    if (queryTokens.length > 1 && queryTokens.every(token => fields.some(field => field.split(/\s+/).some(word => word.startsWith(token))))) score = Math.max(score, 180);
    return score;
}

function filteredSearchResults(query) {
    const normalized = searchText(query);
    if (!normalized) return [];
    const seen = new Set();
    return [...smartTravelSearchResults(query), ...kaomojiUniversalSearchResults(query), ...searchIndex().map(item => ({ item, score: searchScore(item, normalized) }))]
        .filter(result => result.score > 0)
        .filter(result => searchType === "all" || result.item.type === searchType)
        .filter(result => !["kanji", "vocabulary"].includes(result.item.type) || searchLevels.includes(result.item.jlpt))
        .filter(result => {
            const key = itemKey(result.item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => b.score - a.score || searchMainText(a.item).localeCompare(searchMainText(b.item), "ja"));
}

function escapeSearchHtml(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function searchTypeLabel(type) {
    return ({ kana:"Kana", kanji: "Kanji", vocabulary: "Vocabulary", native: "Native", slang: "Slang", travel: "Travel", kaomoji:"Kaomoji", translation:"Translation" })[type] || type;
}

function searchResultMeta(item) {
    if (item.type === "travel") {
        const category = travelCategoryMetadata(item.category)?.title || travelTagLabel(item.category);
        return [category, travelTagLabel(item.priority)].filter(Boolean).join(" · ");
    }
    if (item.type === "kaomoji") return item.category || "";
    return item.jlpt || item.difficulty || "";
}

function renderSearchResults() {
    const input = document.getElementById("universal-search-input");
    const query = input.value.trim();
    const resultsSection = document.getElementById("search-results-section");
    const recentSection = document.getElementById("recent-searches-section");
    const clearButton = document.getElementById("clear-search-input");
    clearButton.hidden = !query;
    resultsSection.hidden = !query;
    recentSection.hidden = Boolean(query);
    if (!query) return;

    const results = filteredSearchResults(query);
    const visibleResults = results.slice(0, searchVisibleCount);
    transientSearchItems = new Map(results.filter(result => result.item.transient).map(result => [itemKey(result.item), result.item]));
    document.getElementById("search-result-summary").textContent = `${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`;
    document.getElementById("search-results").innerHTML = visibleResults.map(({ item }) => {
        const isKaomoji = item.type === "kaomoji";
        const saved = !isKaomoji && !item.transient && isSaved(item);
        const reading = searchReading(item);
        const meta = searchResultMeta(item);
        return `<article class="search-result-card ${isKaomoji ? "kaomoji-search-result" : ""}" data-search-key="${escapeSearchHtml(itemKey(item))}">
            <button class="search-result-main" type="button" data-search-open="${escapeSearchHtml(itemKey(item))}"${isKaomoji ? ` aria-label="Copy ${escapeSearchHtml(searchMainText(item))}"` : ""}>
                <span class="search-result-topline"><span class="search-type-tag">${searchTypeLabel(item.type)}</span>${isKaomoji ? `<span class="status-label">Tap to copy</span>` : item.smartVariant ? `<span class="status-label">Suggested phrase</span>` : ""}${meta ? `<span class="tag">${escapeSearchHtml(meta)}</span>` : ""}</span>
                <h2>${escapeSearchHtml(searchMainText(item))}</h2>
                ${reading ? `<p class="search-result-reading">${escapeSearchHtml(reading)}${item.romaji && !reading.includes(item.romaji) ? ` · ${escapeSearchHtml(item.romaji)}` : ""}</p>` : ""}
                <p class="search-result-meaning">${escapeSearchHtml(item.meaning || item.english)}</p>
            </button>
            ${item.transient || isKaomoji ? "" : `<button class="save-button search-result-save ${saved ? "saved" : ""}" type="button" data-search-save="${escapeSearchHtml(itemKey(item))}" aria-label="${saved ? "Unsave" : "Save"} ${escapeSearchHtml(searchMainText(item))}" aria-pressed="${saved}">${saved ? "♥" : "♡"}</button>`}
        </article>`;
    }).join("");
    document.getElementById("search-empty").hidden = results.length > 0;
    const showMore = document.getElementById("show-more-search-results");
    showMore.hidden = visibleResults.length >= results.length;
    showMore.textContent = showMore.hidden ? "Show more" : `Show ${Math.min(40, results.length - visibleResults.length)} more`;
}

function resetSearchResultLimit() {
    searchVisibleCount = 40;
}

function findSearchItem(key) {
    if (String(key || "").startsWith("kaomoji:")) return kaomojiById.get(String(key).slice("kaomoji:".length));
    return transientSearchItems.get(key) || searchIndex().find(item => itemKey(item) === key);
}

function addRecentSearch(query) {
    const clean = String(query || "").trim();
    if (!clean) return;
    recentSearches = [clean, ...recentSearches.filter(value => value.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    writeJson(STORAGE.recentSearches, recentSearches);
    renderRecentSearches();
}

function renderRecentSearches() {
    const list = document.getElementById("recent-search-list");
    list.innerHTML = recentSearches.map((query, index) => `<span class="recent-search-chip"><button class="recent-search-use" type="button" data-recent-index="${index}">${escapeSearchHtml(query)}</button><button class="recent-search-remove" type="button" data-remove-recent="${index}" aria-label="Remove ${escapeSearchHtml(query)}">×</button></span>`).join("");
    document.getElementById("recent-searches-empty").hidden = recentSearches.length > 0;
    document.getElementById("clear-recent-searches").hidden = recentSearches.length === 0;
}

function renderSearchJlptFilters() {
    const container = document.getElementById("search-jlpt-filters");
    container.innerHTML = "";
    JLPT_LEVELS.forEach(level => container.appendChild(createLevelChip(level, searchLevels.includes(level), event => {
        searchLevels = event.target.checked ? [...new Set([...searchLevels, level])] : searchLevels.filter(value => value !== level);
        if (!searchLevels.length) searchLevels = ["N5"];
        searchLevels = normalizeJlptLevels(searchLevels, ["N5"]);
        resetSearchResultLimit();
        renderSearchJlptFilters();
        Promise.all([loadKanjiForSelection("search", searchLevels), loadVocabularyForSelection("search", searchLevels)]).then(() => renderSearchResults());
    })));
    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = `all-level-button ${searchLevels.length === JLPT_LEVELS.length ? "active" : ""}`;
    allButton.textContent = "◎ All";
    allButton.addEventListener("click", () => {
        searchLevels = searchLevels.length === JLPT_LEVELS.length ? ["N5"] : [...JLPT_LEVELS];
        resetSearchResultLimit();
        renderSearchJlptFilters();
        Promise.all([loadKanjiForSelection("search", searchLevels), loadVocabularyForSelection("search", searchLevels)]).then(() => renderSearchResults());
    });
    container.appendChild(allButton);
    document.getElementById("search-jlpt-summary").textContent = searchLevels.length === JLPT_LEVELS.length ? "All levels" : searchLevels.join(" + ");
}

function openSearch(returnRoute = currentRoute) {
    searchReturnRoute = ["search", "kanji-detail", "word-detail"].includes(returnRoute) ? "learn" : returnRoute;
    showRoute("search");
    Promise.all([loadKanjiForSelection("search", searchLevels), loadVocabularyForSelection("search", searchLevels)]).then(() => {
        if (currentRoute === "search") renderSearchResults();
    });
    prepareTravelSearchForCurrentQuery();
    prepareKaomojiSearchForCurrentQuery();
    requestAnimationFrame(() => document.getElementById("universal-search-input").focus());
}

function openSearchResult(item) {
    if (!item) return;
    addRecentSearch(document.getElementById("universal-search-input").value);
    if (item.type === "kaomoji") { copyKaomojiItem(item); return; }
    if (item.type === "kanji") openKanjiDetail(item, "search");
    else if (item.type === "vocabulary") openWordDetail(item, "search");
    else if (item.type === "travel" && travelCategoryMetadata(item.category)) {
        if (item.smartVariant) pendingTravelSmartPhrase = item;
        else pendingTravelPhraseId = item.id;
        currentTravelFilter = "All";
        showRoute(`travel-${item.category}`);
    }
    else if (item.type === "translation") { showRoute("translate"); renderTranslationResult({id:item.id,japanese:item.expression,kana:item.kana,romaji:item.romaji,naturalMeaning:item.naturalMeaning||item.meaning,literalMeaning:item.literalMeaning||"",tone:item.tone||"",usageNote:item.notes||"",alternative:item.alternative||"",offline:false}); }
    else {
        showRoute(`learn-${item.type}`);
        document.getElementById("native-difficulty-filter").value = "All";
        refreshNativeCategories();
        document.getElementById("native-category-filter").value = "All";
        renderNative(item);
    }
}

function userEntries() {
    return [...userNativeEntries.map(entry => normalizeContentEntry(entry, "native")), ...userSlangEntries.map(entry => normalizeContentEntry(entry, "slang"))];
}

function persistUserEntries() {
    writeJson(STORAGE.userNative, userNativeEntries);
    writeJson(STORAGE.userSlang, userSlangEntries);
    nativeQueues = { native: [], slang: [] };
    nativeQueueKeys = { native: "", slang: "" };
    invalidateNormalizedContentCaches();
    invalidateSearchIndex();
    refreshNativeCategories();
    renderMyEntries();
    updateSavedUi();
}

function entryCategories(type = document.getElementById("entry-type").value) {
    return type === "slang" ? SLANG_CATEGORIES : NATIVE_CATEGORIES;
}

function renderEntryCategoryChips(selected = []) {
    const container = document.getElementById("entry-category-chips");
    container.innerHTML = "";
    entryCategories().forEach(category => {
        const label = document.createElement("label");
        label.className = "level-chip";
        label.innerHTML = `<input type="checkbox" value="${escapeSearchHtml(category)}" ${selected.includes(category) ? "checked" : ""}><span>${escapeSearchHtml(category)}</span>`;
        container.appendChild(label);
    });
}

function selectedEntryCategories() {
    return [...document.querySelectorAll("#entry-category-chips input:checked")].map(input => input.value);
}

function generateEntryId(type, expression) {
    const slug = searchText(expression).replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "entry";
    return `user-${type}-${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function readEntryForm() {
    const type = document.getElementById("entry-type").value;
    return normalizeContentEntry({
        id: document.getElementById("entry-edit-id").value || generateEntryId(type, document.getElementById("entry-expression").value), type,
        expression: document.getElementById("entry-expression").value, kana: document.getElementById("entry-kana").value,
        romaji: document.getElementById("entry-romaji").value, naturalMeaning: document.getElementById("entry-natural-meaning").value,
        literalMeaning: document.getElementById("entry-literal-meaning").value, difficulty: document.getElementById("entry-difficulty").value,
        categories: selectedEntryCategories(), tone: document.getElementById("entry-tone").value, formality: document.getElementById("entry-formality").value,
        commonUsers: document.getElementById("entry-common-users").value, commonSituation: document.getElementById("entry-common-situation").value,
        whereUsed: document.getElementById("entry-where-used").value, learnerSafety: document.getElementById("entry-learner-safety").value,
        currentStatus: document.getElementById("entry-current-status").value, rudeOrRisky: document.getElementById("entry-rude-risky").checked,
        exampleSentence: document.getElementById("entry-example-sentence").value, exampleTranslation: document.getElementById("entry-example-translation").value,
        conversation: document.getElementById("entry-conversation").value, nuanceNotes: document.getElementById("entry-nuance-notes").value,
        tags: document.getElementById("entry-tags").value.split(",").map(cleanEntryText).filter(Boolean), userCreated: true
    }, type);
}

function validateUserEntry(entry, editingId = "", checkDuplicates = true) {
    const errors = [];
    if (!entry.expression) errors.push("Expression is required.");
    if (!entry.naturalMeaning) errors.push("Natural English meaning is required.");
    if (!["Beginner", "Intermediate", "Advanced"].includes(entry.difficulty)) errors.push("Choose a difficulty.");
    if (!entry.categories.length) errors.push("Choose at least one category.");
    if (checkDuplicates) {
        const duplicate = [...nativeData(), ...slangData()].find(item => item.id !== editingId && searchText(item.expression) === searchText(entry.expression));
        if (duplicate) errors.push(`“${entry.expression}” already exists.`);
    }
    return errors;
}

function possibleNearDuplicate(entry, editingId = "") {
    const needle = searchText(entry.expression);
    return [...nativeData(), ...slangData()].find(item => item.id !== editingId && needle && (searchText(item.expression).includes(needle) || needle.includes(searchText(item.expression))) && searchText(item.expression) !== needle);
}

function resetEntryForm(entry = null) {
    document.getElementById("entry-form").reset();
    const value = entry ? normalizeContentEntry(entry, entry.type) : null;
    document.getElementById("entry-edit-id").value = value?.id || "";
    document.getElementById("entry-type").value = value?.type || "native";
    const fields = { expression: "entry-expression", kana: "entry-kana", romaji: "entry-romaji", naturalMeaning: "entry-natural-meaning", literalMeaning: "entry-literal-meaning", difficulty: "entry-difficulty", tone: "entry-tone", formality: "entry-formality", commonUsers: "entry-common-users", commonSituation: "entry-common-situation", whereUsed: "entry-where-used", learnerSafety: "entry-learner-safety", currentStatus: "entry-current-status", exampleSentence: "entry-example-sentence", exampleTranslation: "entry-example-translation", conversation: "entry-conversation", nuanceNotes: "entry-nuance-notes" };
    Object.entries(fields).forEach(([key, id]) => { document.getElementById(id).value = value?.[key] || (key === "currentStatus" ? "Still common" : ""); });
    document.getElementById("entry-rude-risky").checked = Boolean(value?.rudeOrRisky);
    document.getElementById("entry-tags").value = value?.tags?.join(", ") || "";
    renderEntryCategoryChips(value?.categories || []);
    document.getElementById("entry-form-message").textContent = "";
}

function showEntryTab(name) {
    document.querySelectorAll("[data-entry-tab]").forEach(button => button.classList.toggle("active", button.dataset.entryTab === name));
    document.querySelectorAll("[data-entry-panel]").forEach(panel => { panel.hidden = panel.dataset.entryPanel !== name; });
    if (name === "list") renderMyEntries();
}

function renderMyEntries() {
    const query = searchText(document.getElementById("my-entry-search")?.value || "");
    const type = document.getElementById("my-entry-type-filter")?.value || "all";
    const entries = userEntries().filter(entry => (type === "all" || entry.type === type) && (!query || searchableFields(entry).some(field => field.includes(query))));
    const container = document.getElementById("my-entry-list");
    if (!container) return;
    container.innerHTML = entries.map(entry => `<article class="my-entry-card"><span class="search-type-tag">${searchTypeLabel(entry.type)}</span><h3>${escapeSearchHtml(entry.expression)}</h3><p>${escapeSearchHtml(entry.naturalMeaning)}</p><div><button type="button" data-edit-user-entry="${entry.id}">Edit</button><button type="button" data-delete-user-entry="${entry.id}">Delete</button></div></article>`).join("");
    document.getElementById("my-entry-empty").hidden = entries.length > 0;
}

function exportUserEntries() {
    const payload = { app: "Sakura", schemaVersion: 1, exportedAt: new Date().toISOString(), native: userNativeEntries, slang: userSlangEntries };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `sakura-user-entries-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
}

async function importUserEntries(file) {
    let payload;
    try { payload = JSON.parse(await file.text()); }
    catch { document.getElementById("entry-import-message").textContent = "Import failed: the file is not valid JSON."; return; }
    if (!payload || (!Array.isArray(payload.native) && !Array.isArray(payload.slang))) {
        document.getElementById("entry-import-message").textContent = "Import failed: this JSON does not contain Native or Slang entry arrays.";
        return;
    }
    const candidates = [...(Array.isArray(payload?.native) ? payload.native.map(entry => ({ ...entry, type: "native" })) : []), ...(Array.isArray(payload?.slang) ? payload.slang.map(entry => ({ ...entry, type: "slang" })) : [])];
    let added = 0, skipped = 0, invalid = 0;
    candidates.forEach(raw => {
        const entry = normalizeContentEntry({ ...raw, userCreated: true }, raw.type);
        if (validateUserEntry(entry, "", false).length) { invalid += 1; return; }
        if ([...nativeData(), ...slangData()].some(item => item.id === entry.id || searchText(item.expression) === searchText(entry.expression))) { skipped += 1; return; }
        (entry.type === "slang" ? userSlangEntries : userNativeEntries).push(entry); added += 1;
    });
    persistUserEntries();
    document.getElementById("entry-import-message").textContent = `Import complete: ${added} added, ${skipped} skipped, ${invalid} invalid.`;
}

function nativePool() {
    const source = currentNativeMode === "slang" ? slangData() : nativeData();
    const difficulty = document.getElementById("native-difficulty-filter").value;
    const category = document.getElementById("native-category-filter").value;
    return source.filter(item => (difficulty === "All" || item.difficulty === difficulty) && (category === "All" || item.categories.includes(category)));
}

function refreshNativeCategories() {
    const select = document.getElementById("native-category-filter");
    const previous = select.value;
    if (currentNativeMode === "slang") {
        select.innerHTML = SLANG_CATEGORY_OPTIONS.map(([value, label]) => `<option value="${escapeSearchHtml(value)}">${escapeSearchHtml(label)}</option>`).join("");
        select.value = SLANG_CATEGORY_OPTIONS.some(([value]) => value === previous) ? previous : "All";
        return;
    }
    const categories = [...new Set(nativeData().flatMap(item => item.categories))].sort();
    select.innerHTML = `<option>All</option>${categories.map(category => `<option>${category}</option>`).join("")}`;
    select.value = categories.includes(previous) ? previous : "All";
}

function renderNative(item) {
    currentNativeItem = item;
    const empty = document.getElementById("native-empty");
    empty.hidden = Boolean(item);
    empty.textContent = currentNativeMode === "slang" ? "No entries here yet 🌸 This collection is still growing." : "No content is available for these filters.";
    document.getElementById("native-status").textContent = item?.status || "No match";
    document.getElementById("native-expression").textContent = item?.expression || "—";
    renderOptionalText("native-reading", item?.kana);
    renderOptionalText("native-romaji", item?.romaji);
    document.getElementById("native-meaning").textContent = item?.meaning || "No content is available for these filters.";
    document.getElementById("native-details").innerHTML = item ? `
        <div class="detail-box"><strong>Literal meaning</strong><p>${item.literal}</p></div>
        <div class="detail-box"><strong>Example</strong><p>${item.exampleSentence}<br>${item.exampleTranslation}</p></div>
        <div class="detail-box"><strong>Conversation</strong><pre>${item.conversation}</pre></div>
        <div class="detail-box"><strong>Tone &amp; formality</strong><p>${item.tone}<br>${item.formality}</p></div>
        <div class="detail-box"><strong>Who &amp; where</strong><p>${item.users}<br>${item.whereSeen}</p></div>
        <div class="detail-box"><strong>Learner note</strong><p>Rude? ${item.rude}<br>Safe? ${item.safe}<br>${item.notes}</p></div>` : "";
    setSaveButton(document.getElementById("save-native-item"), item);
    renderMasteryControl(document.getElementById("slang-mastery-control"), currentNativeMode === "slang" ? item : null);
}

function browseNative(direction = 1, random = false) {
    const pool = nativePool();
    if (random) {
        const filterKey = `${currentNativeMode}|${document.getElementById("native-difficulty-filter").value}|${document.getElementById("native-category-filter").value}|${pool.map(item => item.id).join(",")}`;
        if (nativeQueueKeys[currentNativeMode] !== filterKey || !nativeQueues[currentNativeMode].length) {
            const recent = new Set((nativeRecentHistory[currentNativeMode] || []).slice(-10));
            const fresh = pool.filter(item => !recent.has(item.id));
            const delayed = pool.filter(item => recent.has(item.id));
            nativeQueues[currentNativeMode] = shuffleItems(fresh).concat(shuffleItems(delayed));
            if (nativeQueues[currentNativeMode].length > 1 && nativeQueues[currentNativeMode][0]?.id === currentNativeItem?.id) {
                [nativeQueues[currentNativeMode][0], nativeQueues[currentNativeMode][1]] = [nativeQueues[currentNativeMode][1], nativeQueues[currentNativeMode][0]];
            }
            nativeQueueKeys[currentNativeMode] = filterKey;
        }
        const item = nativeQueues[currentNativeMode].shift() || null;
        if (item) {
            nativeRecentHistory[currentNativeMode] = [...(nativeRecentHistory[currentNativeMode] || []), item.id].slice(-10);
            writeJson(STORAGE.nativeHistory, nativeRecentHistory);
        }
        renderNative(item);
        return;
    }
    const index = pickIndex(pool, currentNativeItem, direction, random);
    renderNative(index < 0 ? null : pool[index]);
}


const RAIL_CITY_FILES = {
    tokyo: "./data/rail/tokyo.json?v=7",
    osaka: "./data/rail/osaka.json?v=4",
    kyoto: "./data/rail/kyoto.json?v=4"
};

function normalizeRailPrefs() {
    const validCities = Object.keys(RAIL_CITY_FILES);
    if (!validCities.includes(railGuidePrefs.city)) railGuidePrefs.city = "tokyo";
    railGuidePrefs.line = String(railGuidePrefs.line || "");
    railGuidePrefs.operator = String(railGuidePrefs.operator || "all");
    railGuidePrefs.from = String(railGuidePrefs.from || "");
    railGuidePrefs.to = String(railGuidePrefs.to || "");
}

function saveRailPrefs() {
    writeJson(STORAGE.railGuidePrefs, railGuidePrefs);
}

function validateRailCityData(data, normalizedCity) {
    return Boolean(
        data &&
        data.city === normalizedCity &&
        Array.isArray(data.lines) &&
        data.lines.length &&
        data.lines.every(line =>
            line &&
            typeof line.id === "string" &&
            line.id &&
            typeof line.name === "string" &&
            Array.isArray(line.stations) &&
            line.stations.length
        )
    );
}

async function readRailResponse(response, normalizedCity) {
    if (!response?.ok) throw new Error(`Rail guide data unavailable: ${normalizedCity} (HTTP ${response?.status || "unknown"})`);
    const data = await response.json();
    if (!validateRailCityData(data, normalizedCity)) throw new Error(`Rail guide data is invalid: ${normalizedCity}`);
    return data;
}

async function loadRailCity(city) {
    normalizeRailPrefs();
    const normalizedCity = RAIL_CITY_FILES[city] ? city : "tokyo";
    if (railCityCache.has(normalizedCity)) return railCityCache.get(normalizedCity);

    const versionedUrl = RAIL_CITY_FILES[normalizedCity];
    const unversionedUrl = versionedUrl.split("?")[0];
    const attempts = [];

    for (const url of [...new Set([versionedUrl, unversionedUrl])]) {
        try {
            const response = await fetch(url, { cache:"no-cache" });
            const data = await readRailResponse(response, normalizedCity);
            railCityCache.set(normalizedCity, data);
            return data;
        }
        catch (error) {
            attempts.push(`${url}: ${error?.message || error}`);
        }
    }

    if ("caches" in window) {
        for (const url of [...new Set([versionedUrl, unversionedUrl])]) {
            try {
                const response = await caches.match(url);
                if (!response) continue;
                const data = await readRailResponse(response, normalizedCity);
                railCityCache.set(normalizedCity, data);
                return data;
            }
            catch (error) {
                attempts.push(`cache ${url}: ${error?.message || error}`);
            }
        }
    }

    throw new Error(`Rail guide data could not be loaded for ${normalizedCity}. ${attempts.join(" | ")}`);
}

function currentRailLine() {
    return railGuideCityData?.lines?.find(line => line.id === railGuidePrefs.line) || railGuideCityData?.lines?.[0] || null;
}

function normalizeRailSearchText(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .toLocaleLowerCase("en-US")
        .replace(/<[^>]*>/g, " ")
        .replace(/\([^)]*\)/g, " ")
        .replace(/[・·]/g, " ")
        .replace(/[-‐‑‒–—―]/g, " ")
        .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function railStationSearchText(station, line) {
    return normalizeRailSearchText([
        station.code,
        station.name,
        station.jp,
        ...(station.aliases || []),
        ...(station.connections || []),
        station.nearby || "",
        line?.name || "",
        line?.jp || "",
        line?.code || "",
        line?.operator || ""
    ].join(" "));
}

function railSearchScore(query, station, line) {
    const normalized = normalizeRailSearchText(query);
    if (!normalized) return 0;
    const code = normalizeRailSearchText(station.code);
    const name = normalizeRailSearchText(station.name);
    const jp = normalizeRailSearchText(station.jp);
    const aliases = (station.aliases || []).map(normalizeRailSearchText);
    const lineName = normalizeRailSearchText(line?.name);
    const operator = normalizeRailSearchText(line?.operator);
    if (code === normalized) return 175;
    if (name === normalized || jp === normalized || aliases.includes(normalized)) return 170;
    if (code.startsWith(normalized)) return 150;
    if (name.startsWith(normalized) || aliases.some(value => value.startsWith(normalized))) return 140;
    if (name.includes(normalized) || jp.includes(normalized) || aliases.some(value => value.includes(normalized))) return 120;
    if (lineName === normalized || operator === normalized) return 75;
    if (railStationSearchText(station, line).includes(normalized)) return 50;
    return 0;
}

function railLandmarkSearchText(landmark) {
    return normalizeRailSearchText([
        landmark.name,
        landmark.jp,
        landmark.area,
        landmark.category,
        ...(landmark.aliases || []),
        ...(landmark.keywords || []),
        landmark.accessNote || ""
    ].join(" "));
}

function railLandmarkSearchScore(query, landmark) {
    const normalized = normalizeRailSearchText(query);
    if (!normalized) return 0;
    const name = normalizeRailSearchText(landmark.name);
    const jp = normalizeRailSearchText(landmark.jp);
    const aliases = (landmark.aliases || []).map(normalizeRailSearchText);
    const area = normalizeRailSearchText(landmark.area);
    const category = normalizeRailSearchText(landmark.category);
    if (name === normalized || jp === normalized || aliases.includes(normalized)) return 165;
    if (name.startsWith(normalized) || aliases.some(value => value.startsWith(normalized))) return 130;
    if (name.includes(normalized) || jp.includes(normalized) || aliases.some(value => value.includes(normalized))) return 110;
    if (area === normalized || category === normalized) return 70;
    if (railLandmarkSearchText(landmark).includes(normalized)) return 55;
    return 0;
}

function railLandmarkPrimaryRef(landmark) {
    const first = landmark?.railRefs?.[0];
    if (!first || !railGuideCityData) return null;
    const line = railGuideCityData.lines.find(item => item.id === first.lineId);
    const station = line?.stations.find(item => item.code === first.stationCode);
    return line && station ? { line, station } : null;
}

function railOperators() {
    if (!railGuideCityData) return [];
    return railGuideCityData.operators?.length
        ? railGuideCityData.operators
        : [...new Set(railGuideCityData.lines.map(line => line.operator).filter(Boolean))];
}

function setRailLoadingState(message = "", state = "") {
    const loading = document.getElementById("rail-loading");
    const view = document.getElementById("travel-rail-view");
    if (view) {
        if (state === "loading") view.setAttribute("aria-busy", "true");
        else view.removeAttribute("aria-busy");
    }
    if (!loading) return;
    loading.dataset.state = state;
    loading.textContent = message;
    loading.hidden = !message;
}

function railJourney(line, fromCode, toCode) {
    if (!line || !fromCode || !toCode || fromCode === toCode) return null;
    const stations = line.stations || [];
    const fromIndex = stations.findIndex(station => station.code === fromCode);
    const toIndex = stations.findIndex(station => station.code === toCode);
    if (fromIndex < 0 || toIndex < 0) return null;

    if (!line.loop) {
        const forward = fromIndex < toIndex;
        const path = forward
            ? stations.slice(fromIndex, toIndex + 1)
            : stations.slice(toIndex, fromIndex + 1).reverse();
        return {
            path,
            direction: forward ? line.directionForward : line.directionReverse,
            stops: Math.max(0, path.length - 1)
        };
    }

    const forwardPath = [];
    let cursor = fromIndex;
    while (true) {
        forwardPath.push(stations[cursor]);
        if (cursor === toIndex) break;
        cursor = (cursor + 1) % stations.length;
    }
    const reversePath = [];
    cursor = fromIndex;
    while (true) {
        reversePath.push(stations[cursor]);
        if (cursor === toIndex) break;
        cursor = (cursor - 1 + stations.length) % stations.length;
    }
    const useForward = forwardPath.length <= reversePath.length;
    const path = useForward ? forwardPath : reversePath;
    return {
        path,
        direction: useForward ? line.directionForward : line.directionReverse,
        stops: Math.max(0, path.length - 1)
    };
}


function railNetworkHubKey(value) {
    return String(value || "")
        .normalize("NFKC")
        .toLocaleLowerCase("en-US")
        .replace(/<[^>]*>/g, " ")
        .replace(/\([^)]*\)/g, " ")
        .replace(/[・·]/g, " ")
        .replace(/[-‐‑‒–—―]/g, " ")
        .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function railNetworkNodeId(lineId, stationCode) {
    return `${lineId}::${stationCode}`;
}

function railNetworkHubs() {
    if (!railGuideCityData) return new Map();
    const city = railGuideCityData.city;
    if (railNetworkHubCache.has(city)) return railNetworkHubCache.get(city);

    const hubs = new Map();
    for (const line of railGuideCityData.lines || []) {
        for (const station of line.stations || []) {
            const key = railNetworkHubKey(station.name || station.jp || station.code);
            if (!key) continue;
            if (!hubs.has(key)) {
                hubs.set(key, {
                    key,
                    name: station.name || station.jp || station.code,
                    jp: station.jp || "",
                    occurrences: [],
                    aliases: new Set(),
                    searchParts: new Set()
                });
            }
            const hub = hubs.get(key);
            if (!hub.jp && station.jp) hub.jp = station.jp;
            hub.occurrences.push({ line, station });
            (station.aliases || []).filter(Boolean).forEach(value => hub.aliases.add(String(value)));
            [
                station.name, station.jp, station.code,
                ...(station.aliases || []), ...(station.connections || []),
                station.nearby || "", line.name, line.jp, line.code, line.operator
            ].filter(Boolean).forEach(value => hub.searchParts.add(String(value)));
        }
    }

    for (const hub of hubs.values()) {
        hub.searchText = normalizeRailSearchText([...hub.searchParts].join(" "));
        hub.codes = [...new Set(hub.occurrences.map(item => item.station.code))];
        hub.lines = [...new Set(hub.occurrences.map(item => `${item.line.code} ${item.line.name}`))];
    }

    railNetworkHubCache.set(city, hubs);
    return hubs;
}

function railNetworkHubSearchScore(query, hub) {
    const normalized = normalizeRailSearchText(query);
    if (!normalized) return 0;
    const name = normalizeRailSearchText(hub.name);
    const jp = normalizeRailSearchText(hub.jp);
    const codes = hub.codes.map(normalizeRailSearchText);
    const aliases = [...(hub.aliases || [])].map(normalizeRailSearchText);
    if (name === normalized || jp === normalized || codes.includes(normalized) || aliases.includes(normalized)) return 200;
    if (name.startsWith(normalized) || codes.some(code => code.startsWith(normalized)) || aliases.some(alias => alias.startsWith(normalized))) return 170;
    if (name.includes(normalized) || jp.includes(normalized) || aliases.some(alias => alias.includes(normalized))) return 145;
    if (hub.searchText.includes(normalized)) return 90;
    return 0;
}

function railNetworkHubByKey(key) {
    return railNetworkHubs().get(String(key || "")) || null;
}

function clearRailNetworkPlanner({ preserveInputs = false } = {}) {
    window.clearTimeout(railNetworkSearchTimers.from);
    window.clearTimeout(railNetworkSearchTimers.to);
    railNetworkRouteOptions = [];
    railNetworkSelectedRouteIndex = 0;
    railNetworkPlannerState = { city:railGuideCityData?.city || "", from:"", to:"" };
    if (!preserveInputs) {
        const fromInput = document.getElementById("rail-network-from-input");
        const toInput = document.getElementById("rail-network-to-input");
        if (fromInput) fromInput.value = "";
        if (toInput) toInput.value = "";
    }
    ["from","to"].forEach(side => {
        const results = document.getElementById(`rail-network-${side}-results`);
        if (results) {
            results.hidden = true;
            results.innerHTML = "";
        }
    });
    const panel = document.getElementById("rail-network-route-result");
    if (panel) {
        panel.hidden = true;
        panel.innerHTML = "";
    }
    updateRailNetworkPlanButton();
}

function ensureRailNetworkPlannerCity() {
    const city = railGuideCityData?.city || "";
    if (railNetworkPlannerState.city !== city) {
        railNetworkRouteOptions = [];
        railNetworkSelectedRouteIndex = 0;
        railNetworkPlannerState = { city, from:"", to:"" };
        const fromInput = document.getElementById("rail-network-from-input");
        const toInput = document.getElementById("rail-network-to-input");
        if (fromInput) fromInput.value = "";
        if (toInput) toInput.value = "";
    }
}

function railNetworkInputValue(side) {
    return String(document.getElementById(`rail-network-${side}-input`)?.value || "").trim();
}

function railNetworkMatchesForInput(value) {
    if (!railGuideCityData) return [];
    const normalized = normalizeRailSearchText(value);
    if (!normalized) return [];
    return [...railNetworkHubs().values()]
        .map(hub => ({ hub, score:railNetworkHubSearchScore(normalized, hub) }))
        .filter(item => item.score > 0)
        .sort((a,b) => b.score - a.score || a.hub.name.localeCompare(b.hub.name));
}

function railNetworkResolveTypedHub(side, { allowStrongPartial = true } = {}) {
    if (!["from","to"].includes(side) || !railGuideCityData) return null;
    ensureRailNetworkPlannerCity();

    const value = railNetworkInputValue(side);
    if (!value) {
        railNetworkPlannerState[side] = "";
        return null;
    }

    const current = railNetworkHubByKey(railNetworkPlannerState[side]);
    if (current && normalizeRailSearchText(current.name) === normalizeRailSearchText(value)) return current;

    const matches = railNetworkMatchesForInput(value);
    if (!matches.length) {
        railNetworkPlannerState[side] = "";
        return null;
    }

    const best = matches[0];
    const second = matches[1];

    // Exact station name/Japanese name/code = score 200.
    // A unique strong prefix = score 170 and is also safe enough to accept.
    const safeExact = best.score >= 200;
    const safeStrongPartial = allowStrongPartial &&
        best.score >= 170 &&
        (!second || second.score < best.score);

    if (!safeExact && !safeStrongPartial) {
        railNetworkPlannerState[side] = "";
        return null;
    }

    railNetworkPlannerState[side] = best.hub.key;
    const input = document.getElementById(`rail-network-${side}-input`);
    if (input) input.value = best.hub.name;
    return best.hub;
}

function showRailNetworkPlannerMessage(title, message) {
    const panel = document.getElementById("rail-network-route-result");
    if (!panel) return;
    panel.innerHTML = `<div class="rail-network-route-empty"><strong>${escapeSearchHtml(title)}</strong><p>${escapeSearchHtml(message)}</p></div>`;
    panel.hidden = false;
}

function planRailNetworkFromInputs() {
    if (!railGuideCityData) {
        showRailNetworkPlannerMessage(
            "Rail data is not ready yet.",
            "Reopen Rail Guide or switch cities, then try again."
        );
        return;
    }

    window.clearTimeout(railNetworkSearchTimers.from);
    window.clearTimeout(railNetworkSearchTimers.to);

    const fromValue = railNetworkInputValue("from");
    const toValue = railNetworkInputValue("to");
    if (!fromValue || !toValue) {
        showRailNetworkPlannerMessage("Choose both stations.", "Enter a From station and a To station first.");
        updateRailNetworkPlanButton();
        return;
    }

    let fromHub;
    let toHub;
    try {
        fromHub = railNetworkResolveTypedHub("from");
        toHub = railNetworkResolveTypedHub("to");
    }
    catch (error) {
        console.error("Rail station resolution failed.", error);
        showRailNetworkPlannerMessage(
            "Sakura couldn't read those stations.",
            "Clear the route, reselect the city, and try again."
        );
        return;
    }

    if (!fromHub || !toHub) {
        if (!fromHub) renderRailNetworkSuggestions("from", fromValue);
        if (!toHub) renderRailNetworkSuggestions("to", toValue);
        showRailNetworkPlannerMessage(
            "Select the station from the suggestions.",
            "Sakura found more than one possible match, or the station name is not in the selected city's offline rail database."
        );
        updateRailNetworkPlanButton();
        return;
    }

    ["from","to"].forEach(side => {
        const results = document.getElementById(`rail-network-${side}-results`);
        if (results) {
            results.hidden = true;
            results.innerHTML = "";
        }
    });

    updateRailNetworkPlanButton();
    try {
        renderRailNetworkRoute(fromHub.key, toHub.key);
    }
    catch (error) {
        console.error("Rail route rendering failed.", error);
        showRailNetworkPlannerMessage(
            "Sakura couldn't draw this route.",
            "The stations were found, but the route renderer hit an error. Clear the route and try again."
        );
    }
}

function updateRailNetworkPlanButton() {
    const button = document.getElementById("rail-network-plan-button");
    if (!button) return;

    // The button is usable as soon as both fields contain text.
    // Exact/unique station resolution happens when Find route is tapped,
    // so users do not have to tap an autocomplete suggestion first.
    const ready = Boolean(
        railGuideCityData &&
        railNetworkPlannerState.city === railGuideCityData.city &&
        railNetworkInputValue("from") &&
        railNetworkInputValue("to")
    );
    button.disabled = !ready;
    button.setAttribute("aria-disabled", String(!ready));
}

function renderRailNetworkSuggestions(side, query = "") {
    const results = document.getElementById(`rail-network-${side}-results`);
    if (!results || !railGuideCityData) return;
    const normalized = normalizeRailSearchText(query);
    if (!normalized) {
        results.hidden = true;
        results.innerHTML = "";
        return;
    }

    const matches = [...railNetworkHubs().values()]
        .map(hub => ({ hub, score:railNetworkHubSearchScore(normalized, hub) }))
        .filter(item => item.score > 0)
        .sort((a,b) => b.score - a.score || a.hub.name.localeCompare(b.hub.name))
        .slice(0, 8);

    results.hidden = false;
    results.innerHTML = matches.length
        ? matches.map(({hub}) => {
            const codes = hub.codes.slice(0, 5).join(" · ");
            const lineCopy = hub.lines.slice(0, 3).join(" · ");
            return `<button type="button" data-rail-network-pick="${side}" data-rail-network-hub="${escapeSearchHtml(hub.key)}">
                <span class="rail-network-result-icon" aria-hidden="true">🚉</span>
                <span><strong>${escapeSearchHtml(hub.name)}</strong>${hub.jp ? `<small>${escapeSearchHtml(hub.jp)}</small>` : ""}<small>${escapeSearchHtml(codes)}${lineCopy ? ` · ${escapeSearchHtml(lineCopy)}` : ""}</small></span>
            </button>`;
        }).join("")
        : `<p>No matching station in ${escapeSearchHtml(railGuideCityData.cityName)}.</p>`;
}

function selectRailNetworkHub(side, key) {
    if (!["from","to"].includes(side)) return;
    const hub = railNetworkHubByKey(key);
    if (!hub) return;
    ensureRailNetworkPlannerCity();
    railNetworkPlannerState[side] = hub.key;
    railNetworkRouteOptions = [];
    railNetworkSelectedRouteIndex = 0;
    const input = document.getElementById(`rail-network-${side}-input`);
    const results = document.getElementById(`rail-network-${side}-results`);
    if (input) input.value = hub.name;
    if (results) {
        results.hidden = true;
        results.innerHTML = "";
    }
    updateRailNetworkPlanButton();
}

function buildRailNetworkGraph() {
    if (!railGuideCityData) return null;
    const city = railGuideCityData.city;
    if (railNetworkGraphCache.has(city)) return railNetworkGraphCache.get(city);

    const nodes = new Map();
    const adjacency = new Map();
    const hubs = railNetworkHubs();

    const addNode = (line, station) => {
        const id = railNetworkNodeId(line.id, station.code);
        if (!nodes.has(id)) {
            nodes.set(id, { id, line, station, hubKey:railNetworkHubKey(station.name || station.jp || station.code) });
            adjacency.set(id, []);
        }
        return id;
    };

    const addEdge = (from, to, edge) => {
        if (!adjacency.has(from) || !adjacency.has(to)) return;
        adjacency.get(from).push({ to, ...edge });
    };

    for (const line of railGuideCityData.lines || []) {
        const stations = line.stations || [];
        stations.forEach(station => addNode(line, station));
        for (let index = 0; index < stations.length - 1; index += 1) {
            const a = railNetworkNodeId(line.id, stations[index].code);
            const b = railNetworkNodeId(line.id, stations[index + 1].code);
            addEdge(a, b, { type:"ride", lineId:line.id, cost:1 });
            addEdge(b, a, { type:"ride", lineId:line.id, cost:1 });
        }
        if (line.loop && stations.length > 2) {
            const first = railNetworkNodeId(line.id, stations[0].code);
            const last = railNetworkNodeId(line.id, stations[stations.length - 1].code);
            addEdge(first, last, { type:"ride", lineId:line.id, cost:1 });
            addEdge(last, first, { type:"ride", lineId:line.id, cost:1 });
        }
    }

    // Transfers are intentionally conservative for stability:
    // only station records that resolve to the same station-hub name are linked.
    // This avoids inventing walk transfers that may be outside the gates.
    for (const hub of hubs.values()) {
        const ids = hub.occurrences.map(({line,station}) => railNetworkNodeId(line.id, station.code));
        for (let i = 0; i < ids.length; i += 1) {
            for (let j = i + 1; j < ids.length; j += 1) {
                const a = nodes.get(ids[i]);
                const b = nodes.get(ids[j]);
                if (!a || !b || a.line.id === b.line.id) continue;
                addEdge(a.id, b.id, { type:"transfer", hubKey:hub.key, cost:5 });
                addEdge(b.id, a.id, { type:"transfer", hubKey:hub.key, cost:5 });
            }
        }
    }

    // Curated transfer links cover verified interchanges whose station names differ,
    // such as JR Osaka Station ↔ the three Osaka Metro Umeda stations.
    for (const link of railGuideCityData.transferLinks || []) {
        const fromId = railNetworkNodeId(link.from?.lineId, link.from?.stationCode);
        const toId = railNetworkNodeId(link.to?.lineId, link.to?.stationCode);
        if (!nodes.has(fromId) || !nodes.has(toId)) continue;
        const transferEdge = {
            type:"transfer",
            hubKey:"",
            transferName:String(link.name || ""),
            transferNote:String(link.note || ""),
            transferKind:String(link.kind || "transfer"),
            cost:Number.isFinite(Number(link.cost)) ? Number(link.cost) : 7
        };
        addEdge(fromId, toId, transferEdge);
        addEdge(toId, fromId, transferEdge);
    }

    const graph = { nodes, adjacency, hubs };
    railNetworkGraphCache.set(city, graph);
    return graph;
}

function findRailNetworkRouteWithOptions(fromHubKey, toHubKey, { edgePenalty = null } = {}) {
    const graph = buildRailNetworkGraph();
    if (!graph) return null;
    const fromHub = graph.hubs.get(fromHubKey);
    const toHub = graph.hubs.get(toHubKey);
    if (!fromHub || !toHub) return null;
    if (fromHubKey === toHubKey) {
        return { sameStation:true, fromHub, toHub, nodes:[], edges:[], rideStops:0, transfers:0, cost:0, searchCost:0 };
    }
    const starts = fromHub.occurrences.map(({line,station}) => railNetworkNodeId(line.id, station.code));
    const targets = new Set(toHub.occurrences.map(({line,station}) => railNetworkNodeId(line.id, station.code)));
    const distance = new Map();
    const previous = new Map();
    const queue = [];
    for (const start of starts) {
        if (!graph.nodes.has(start)) continue;
        distance.set(start, 0);
        queue.push({ id:start, cost:0 });
    }
    let targetId = "";
    while (queue.length) {
        queue.sort((a,b) => a.cost - b.cost);
        const current = queue.shift();
        if (!current || current.cost !== distance.get(current.id)) continue;
        if (targets.has(current.id)) { targetId = current.id; break; }
        const currentNode = graph.nodes.get(current.id);
        for (const edge of graph.adjacency.get(current.id) || []) {
            const nextNode = graph.nodes.get(edge.to);
            const extra = typeof edgePenalty === "function" ? Math.max(0, Number(edgePenalty(edge, currentNode, nextNode)) || 0) : 0;
            const nextCost = current.cost + edge.cost + extra;
            if (nextCost >= (distance.get(edge.to) ?? Infinity)) continue;
            distance.set(edge.to, nextCost);
            previous.set(edge.to, { from:current.id, edge });
            queue.push({ id:edge.to, cost:nextCost });
        }
    }
    if (!targetId) return null;
    const nodeIds = [targetId];
    const edges = [];
    let cursor = targetId;
    while (previous.has(cursor)) {
        const step = previous.get(cursor);
        edges.push(step.edge);
        cursor = step.from;
        nodeIds.push(cursor);
    }
    nodeIds.reverse(); edges.reverse();
    const routeNodes = nodeIds.map(id => graph.nodes.get(id));
    const baseCost = edges.reduce((sum, edge) => sum + (Number(edge.cost) || 0), 0);
    return {
        sameStation:false, fromHub, toHub, nodes:routeNodes, edges,
        rideStops:edges.filter(edge => edge.type === "ride").length,
        transfers:edges.filter(edge => edge.type === "transfer").length,
        cost:baseCost, searchCost:distance.get(targetId)
    };
}

function findRailNetworkRoute(fromHubKey, toHubKey) {
    return findRailNetworkRouteWithOptions(fromHubKey, toHubKey);
}

function railDirectionForPair(line, fromCode, nextCode) {
    const stations = line?.stations || [];
    const fromIndex = stations.findIndex(station => station.code === fromCode);
    const nextIndex = stations.findIndex(station => station.code === nextCode);
    if (fromIndex < 0 || nextIndex < 0) return "";
    if (line.loop) {
        const forward = nextIndex === (fromIndex + 1) % stations.length;
        if (line.id === "yamanote") return forward ? "Counterclockwise" : "Clockwise";
        return forward ? line.directionForward : line.directionReverse;
    }
    return nextIndex > fromIndex ? line.directionForward : line.directionReverse;
}

function railNetworkRouteSteps(route) {
    if (!route || route.sameStation) return [];
    const steps = [];
    let currentRide = null;

    const flushRide = () => {
        if (currentRide) steps.push(currentRide);
        currentRide = null;
    };

    route.edges.forEach((edge, index) => {
        const fromNode = route.nodes[index];
        const toNode = route.nodes[index + 1];
        if (!fromNode || !toNode) return;
        if (edge.type === "ride") {
            if (!currentRide || currentRide.line.id !== fromNode.line.id) {
                flushRide();
                currentRide = {
                    type:"ride",
                    line:fromNode.line,
                    stations:[fromNode.station, toNode.station]
                };
            }
            else {
                currentRide.stations.push(toNode.station);
            }
        }
        else {
            flushRide();
            const hub = railNetworkHubByKey(edge.hubKey);
            steps.push({
                type:"transfer",
                hub,
                fromLine:fromNode.line,
                fromStation:fromNode.station,
                toLine:toNode.line,
                toStation:toNode.station,
                transferName:edge.transferName || "",
                transferNote:edge.transferNote || "",
                transferKind:edge.transferKind || ""
            });
        }
    });
    flushRide();
    return steps;
}

function railNetworkRouteTraits(route) {
    const steps = railNetworkRouteSteps(route);
    const rides = steps.filter(step => step.type === "ride");
    const operators = rides.map(step => String(step.line.operator || ""));
    return {
        steps, rides,
        lineIds:rides.map(step => step.line.id),
        lineNames:rides.map(step => step.line.name),
        operators,
        hasJR:operators.some(operator => /\bJR\b/i.test(operator)),
        subwayOnly:operators.length > 0 && operators.every(operator => /Metro|Subway/i.test(operator))
    };
}
function railNetworkRouteSignature(route) {
    const traits = railNetworkRouteTraits(route);
    const transfers = traits.steps.filter(step => step.type === "transfer")
        .map(step => railNetworkHubKey(step.transferName || step.hub?.name || step.fromStation?.name || ""));
    return `${traits.lineIds.join(">")}|${transfers.join(">")}`;
}
function railNetworkLinePenalty(lineIds, amount = 6) {
    const penalized = new Set(lineIds);
    return edge => edge.type === "ride" && penalized.has(edge.lineId) ? amount : 0;
}
function railNetworkOperatorPenalty({ preferJR = false, avoidJR = false } = {}) {
    return (edge, fromNode) => {
        if (edge.type !== "ride") return 0;
        const isJR = /\bJR\b/i.test(String(fromNode?.line?.operator || ""));
        if (preferJR && !isJR) return 2;
        if (avoidJR && isJR) return 2;
        return 0;
    };
}
function findRailNetworkRouteOptions(fromHubKey, toHubKey, limit = 3) {
    const primary = findRailNetworkRoute(fromHubKey, toHubKey);
    if (!primary || primary.sameStation) return primary ? [primary] : [];
    const primaryTraits = railNetworkRouteTraits(primary);
    const seen = new Set([railNetworkRouteSignature(primary)]);
    const candidates = [];
    const attempts = [
        railNetworkLinePenalty(primaryTraits.lineIds, 6),
        ...primaryTraits.lineIds.slice(0, 3).map(lineId => railNetworkLinePenalty([lineId], 8)),
        railNetworkOperatorPenalty({ preferJR:true }),
        railNetworkOperatorPenalty({ avoidJR:true })
    ];
    for (const edgePenalty of attempts) {
        const candidate = findRailNetworkRouteWithOptions(fromHubKey, toHubKey, { edgePenalty });
        if (!candidate || candidate.sameStation) continue;
        const signature = railNetworkRouteSignature(candidate);
        if (!signature || seen.has(signature)) continue;
        seen.add(signature);
        const traits = railNetworkRouteTraits(candidate);
        if (candidate.cost > primary.cost + 12) continue;
        if (candidate.rideStops > primary.rideStops + 18) continue;
        if (candidate.transfers > primary.transfers + 1) continue;
        if (traits.rides.length > primaryTraits.rides.length + 2) continue;
        candidates.push(candidate);
    }
    candidates.sort((a,b) => {
        const at = railNetworkRouteTraits(a), bt = railNetworkRouteTraits(b);
        if (!primaryTraits.hasJR && at.hasJR !== bt.hasJR) return at.hasJR ? -1 : 1;
        if (a.transfers !== b.transfers) return a.transfers - b.transfers;
        if (a.cost !== b.cost) return a.cost - b.cost;
        return a.rideStops - b.rideStops;
    });
    return [primary, ...candidates.slice(0, Math.max(0, limit - 1))];
}

const RAIL_NETWORK_MINUTES_PER_STOP = Object.freeze({
    "yamanote":2.3,
    "chuo-rapid-core":3.0,
    "keihin-tohoku-core":2.5,
    "jr-yokosuka-kamakura":3.6,
    "jr-shonan-shinjuku-kamakura":4.2,
    "jr-narita-express-shinjuku-itinerary":88,
    "enoden":2.8,
    "keio-inokashira":2.0,
    "seibu-shinjuku-itinerary":2.0,
    "odakyu-odawara-core":2.6,
    "odakyu-enoshima":2.7,
    "odakyu-romancecar-enoshima-itinerary":69,

    "metro-ginza":2.1,
    "metro-marunouchi":2.0,
    "metro-marunouchi-branch":2.0,
    "metro-hibiya":2.1,
    "metro-tozai":2.2,
    "metro-chiyoda":2.2,
    "metro-yurakucho":2.1,
    "metro-hanzomon":2.1,
    "metro-namboku":2.2,
    "metro-fukutoshin":2.2,
    "toei-asakusa":2.3,
    "toei-mita":2.2,
    "toei-shinjuku":2.3,
    "toei-oedo":2.2,

    "osaka-loop":2.4,
    "jr-kyoto":3.4,
    "yumesaki":2.7,
    "metro-midosuji":2.0,
    "metro-tanimachi":2.1,
    "metro-yotsubashi":2.0,
    "metro-chuo":2.1,
    "metro-sennichimae":2.0,
    "metro-sakaisuji":2.1,
    "metro-nagahori":2.1,
    "metro-imazatosuji":2.1,
    "metro-newtram":2.0,

    "nara":3.1,
    "sagano":3.1,
    "subway-karasuma":2.0,
    "subway-tozai":2.1
});

function railNetworkMinutesPerStop(line) {
    if (!line) return 2.3;
    const explicit = RAIL_NETWORK_MINUTES_PER_STOP[line.id];
    if (Number.isFinite(explicit)) return explicit;

    const operator = String(line.operator || "");
    if (/Metro|Subway/i.test(operator)) return 2.1;
    if (/\bJR\b/i.test(operator)) return 2.8;
    return 2.4;
}

function railNetworkTransferMinutes(step) {
    if (!step || step.type !== "transfer") return 0;

    const fromOperator = String(step.fromLine?.operator || "");
    const toOperator = String(step.toLine?.operator || "");
    const stationKey = railNetworkHubKey(step.hub?.name || step.fromStation?.name || "");

    if (railGuideCityData?.city === "tokyo" && stationKey === "nihombashi" &&
        [fromOperator,toOperator].includes("Tokyo Metro") &&
        [fromOperator,toOperator].includes("Toei Subway")) return 7;

    if (step.transferKind === "walk" || step.transferKind === "outside-gate") return 8;
    if (fromOperator && toOperator && fromOperator !== toOperator) return 7;
    return 5;
}

function railNetworkRideMinutes(step) {
    if (!step || step.type !== "ride") return 0;
    const stopCount = Math.max(0, (step.stations?.length || 1) - 1);
    if (!stopCount) return 0;
    return Math.max(2, Math.round(stopCount * railNetworkMinutesPerStop(step.line)));
}

function railNetworkRouteTime(route) {
    const steps = railNetworkRouteSteps(route);
    let rideMinutes = 0;
    let transferMinutes = 0;

    steps.forEach(step => {
        if (step.type === "ride") rideMinutes += railNetworkRideMinutes(step);
        else if (step.type === "transfer") transferMinutes += railNetworkTransferMinutes(step);
    });

    return {
        rideMinutes,
        transferMinutes,
        totalMinutes:rideMinutes + transferMinutes
    };
}

function railNetworkFormatMinutes(minutes) {
    const safe = Math.max(0, Math.round(Number(minutes) || 0));
    if (safe < 60) return `~${safe} min`;
    const hours = Math.floor(safe / 60);
    const mins = safe % 60;
    return mins ? `~${hours} hr ${mins} min` : `~${hours} hr`;
}

function railNetworkRouteOptionLabel(route, index, primary) {
    if (index === 0) return "Recommended";
    const traits = railNetworkRouteTraits(route), primaryTraits = railNetworkRouteTraits(primary);
    if (traits.hasJR && !primaryTraits.hasJR) return "JR option";
    if (traits.subwayOnly && !primaryTraits.subwayOnly) return "Subway only";
    if (route.transfers < primary.transfers) return "Fewer transfers";
    return "Alternative";
}
function railNetworkDisplayLineName(line) {
    if (!line) return "";
    if (line.id === "jr-shonan-shinjuku-kamakura") return "Shonan-Shinjuku Line";
    return line.name || "";
}
function railNetworkRideHasVariableStops(step) {
    return Boolean(step?.type === "ride" && (
        step.line?.id === "jr-shonan-shinjuku-kamakura" ||
        step.line?.variableStops ||
        step.line?.majorStopsOnly
    ));
}
function railNetworkRouteHasVariableStops(route) {
    return railNetworkRouteSteps(route).some(railNetworkRideHasVariableStops);
}
function railNetworkShonanDirectYokosukaDestination(step) {
    if (step?.line?.id !== "jr-shonan-shinjuku-kamakura") return "";
    const destination = step.stations?.[step.stations.length - 1]?.name || "";
    return ["Kita-Kamakura", "Kamakura", "Zushi"].includes(destination) ? destination : "";
}
function railNetworkRideServiceMessage(step) {
    if (!railNetworkRideHasVariableStops(step)) return "";
    if (step.line?.id === "jr-shonan-shinjuku-kamakura") {
        const directDestination = railNetworkShonanDirectYokosukaDestination(step);
        if (directDestination) {
            return `Board a Zushi-bound train for a direct ride to ${directDestination}. Other Shonan-Shinjuku services may require a transfer at Ofuna.`;
        }
    }
    return step.line?.serviceNote || "Stops vary by train service. Confirm that your train stops at your destination.";
}
function railNetworkDisplayDirection(step, direction) {
    if (!direction) return "";
    const destination = step.stations?.[step.stations.length - 1]?.name || "";
    if (step.line?.id === "jr-shonan-shinjuku-kamakura") {
        if (railNetworkShonanDirectYokosukaDestination(step)) {
            return "For Zushi · continues onto Yokosuka Line";
        }
        return /Yokohama|Ofuna|Zushi/i.test(direction)
            ? "Southbound · toward Yokohama / Ofuna"
            : "Northbound · toward Shinjuku / Ikebukuro";
    }
    if (railGuideCityData?.city === "tokyo" && step.line?.code === "A" && destination === "Asakusa" && /Oshiage/i.test(direction)) {
        return "toward Asakusa / Oshiage";
    }
    return direction;
}
function railNetworkTransferGuidance(step) {
    if (step.transferNote) return step.transferNote;
    const stationKey = railNetworkHubKey(step.hub?.name || step.fromStation?.name || "");
    const fromOperator = String(step.fromLine?.operator || ""), toOperator = String(step.toLine?.operator || "");
    const operatorChange = fromOperator && toOperator && fromOperator !== toOperator;
    if (railGuideCityData?.city === "tokyo" && stationKey === "nihombashi" &&
        [fromOperator,toOperator].includes("Tokyo Metro") && [fromOperator,toOperator].includes("Toei Subway")) {
        return "Follow signs for the Toei Asakusa Line (A). Fare gates may be involved. When using an IC card for this Metro ↔ Toei transfer, complete the transfer within 30 minutes.";
    }
    const cityGuidance = railGuideCityData?.transferGuidance?.[stationKey] || "";
    if (cityGuidance) return cityGuidance;
    if (operatorChange) return `Follow signs for ${step.toLine?.name || "the connecting line"}. This changes railway operators, so fare gates may be involved. Confirm the current station signs and IC/ticket handling.`;
    return "Follow the station's current transfer signs. Sakura does not estimate platform or walking time.";
}
function selectRailNetworkRouteOption(index) {
    const nextIndex = Number(index);
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= railNetworkRouteOptions.length) return;
    railNetworkSelectedRouteIndex = nextIndex;
    renderRailNetworkRoute(railNetworkPlannerState.from, railNetworkPlannerState.to, { recompute:false });
}

function renderRailNetworkRoute(fromHubKey = railNetworkPlannerState.from, toHubKey = railNetworkPlannerState.to, { recompute = true } = {}) {
    const panel = document.getElementById("rail-network-route-result");
    if (!panel || !railGuideCityData) return;
    ensureRailNetworkPlannerCity();
    const fromHub = railNetworkHubByKey(fromHubKey), toHub = railNetworkHubByKey(toHubKey);
    if (!fromHub || !toHub) {
        railNetworkRouteOptions = []; railNetworkSelectedRouteIndex = 0;
        panel.innerHTML = `<div class="rail-network-route-empty"><strong>Could not resolve this station pair.</strong><p>Clear the route and choose the stations again.</p></div>`;
        panel.hidden = false; updateRailNetworkPlanButton(); return;
    }
    if (recompute || !railNetworkRouteOptions.length) {
        railNetworkRouteOptions = findRailNetworkRouteOptions(fromHub.key, toHub.key, 3);
        railNetworkSelectedRouteIndex = 0;
    }
    if (!railNetworkRouteOptions.length) {
        panel.innerHTML = `<div class="rail-network-route-empty"><strong>No connected route found in Sakura's current ${escapeSearchHtml(railGuideCityData.cityName)} database.</strong><p>Try another station pair. Sakura only connects interchange stations represented in the offline guide and does not invent outside-gate walking transfers.</p></div>`;
        panel.hidden = false; return;
    }
    const route = railNetworkRouteOptions[Math.min(railNetworkSelectedRouteIndex, railNetworkRouteOptions.length - 1)];
    railNetworkSelectedRouteIndex = Math.min(railNetworkSelectedRouteIndex, railNetworkRouteOptions.length - 1);
    if (route.sameStation) {
        panel.innerHTML = `<div class="rail-network-route-summary"><span class="section-kicker">You're already there</span><h3>${escapeSearchHtml(fromHub.name)}</h3><p>The From and To selections resolve to the same station hub.</p></div>`;
        panel.hidden = false; return;
    }
    const primary = railNetworkRouteOptions[0];
    const optionHtml = railNetworkRouteOptions.length > 1 ? `<section class="rail-route-options-wrap" aria-label="Offline route options">
        <div class="rail-route-options-heading"><span class="section-kicker">Route options</span><small>Offline routes · estimated time</small></div>
        <div class="rail-route-options" role="tablist" aria-label="Choose route option">${railNetworkRouteOptions.map((option,optionIndex)=>{
            const traits=railNetworkRouteTraits(option), active=optionIndex===railNetworkSelectedRouteIndex;
            const label=railNetworkRouteOptionLabel(option,optionIndex,primary), variableStops=railNetworkRouteHasVariableStops(option);
            const time=railNetworkRouteTime(option);
            const routeTime=railNetworkFormatMinutes(time.totalMinutes);
            const meta=variableStops
                ? `${routeTime} · stops vary · ${option.transfers} transfer${option.transfers===1?"":"s"}`
                : `${routeTime} · ${option.rideStops} stop${option.rideStops===1?"":"s"} · ${option.transfers} transfer${option.transfers===1?"":"s"}`;
            return `<button class="rail-route-option ${active?"active":""}" type="button" role="tab" aria-selected="${active}" data-rail-route-option="${optionIndex}"><span class="rail-route-option-label">${escapeSearchHtml(label)}</span><strong>${escapeSearchHtml(traits.rides.map(step=>step.line.code).join(" → "))}</strong><small>${escapeSearchHtml(meta)}</small><em>${escapeSearchHtml(traits.rides.map(step=>railNetworkDisplayLineName(step.line)).join(" → "))}</em></button>`;
        }).join("")}</div></section>` : "";
    const steps=railNetworkRouteSteps(route);
    const stepHtml=steps.map((step,index)=>{
        if(step.type==="transfer"){
            const title=step.transferName||step.hub?.name||step.fromStation.name;
            const transferMinutes=railNetworkTransferMinutes(step);
            return `<article class="rail-network-step transfer-step"><span class="rail-network-step-number">${index+1}</span><div><span class="rail-network-step-kicker">Transfer</span><h4>${escapeSearchHtml(title)}</h4><p>${escapeSearchHtml(step.fromLine.code)} ${escapeSearchHtml(railNetworkDisplayLineName(step.fromLine))} → ${escapeSearchHtml(step.toLine.code)} ${escapeSearchHtml(railNetworkDisplayLineName(step.toLine))}</p><span class="rail-network-time-pill">Allow ~${transferMinutes} min to transfer</span><small>${escapeSearchHtml(railNetworkTransferGuidance(step))}</small></div></article>`;
        }
        const stations=step.stations, first=stations[0], last=stations[stations.length-1], next=stations[1];
        const rawDirection=next?railDirectionForPair(step.line,first.code,next.code):"";
        const direction=railNetworkDisplayDirection(step,rawDirection), stopCount=Math.max(0,stations.length-1), variableStops=railNetworkRideHasVariableStops(step);
        const trail=stations.map(station=>station.name).join(" → ");
        const trailHtml=stopCount>1 ? (variableStops ? `<details class="rail-network-stops"><summary>Typical local stopping pattern</summary><small class="rail-network-station-trail">Stored local pattern: ${escapeSearchHtml(trail)}</small></details>` : `<details class="rail-network-stops"><summary>View all ${stopCount} stops</summary><small class="rail-network-station-trail">${escapeSearchHtml(trail)}</small></details>`) : "";
        const rideMeta=variableStops ? (direction?escapeSearchHtml(direction):"Service direction varies") : `${stopCount} stop${stopCount===1?"":"s"}${direction?` · ${escapeSearchHtml(direction)}`:""}`;
        const serviceMessage=railNetworkRideServiceMessage(step);
        const throughService=railNetworkShonanDirectYokosukaDestination(step) ? " · Through service to Yokosuka Line" : "";
        const rideMinutes=railNetworkRideMinutes(step);
        return `<article class="rail-network-step ride-step" style="--rail-line:${escapeSearchHtml(step.line.accent||"#d75a82")}"><span class="rail-network-step-number">${index+1}</span><div class="rail-network-step-copy"><div class="rail-network-line-title"><span class="rail-network-line-code">${escapeSearchHtml(step.line.code)}</span><div><span class="rail-network-step-kicker">Take</span><h4>${escapeSearchHtml(railNetworkDisplayLineName(step.line))}</h4><small>${escapeSearchHtml((step.line.operator||"")+throughService)}</small></div></div><p><strong>${escapeSearchHtml(first.code)} ${escapeSearchHtml(first.name)}</strong> → <strong>${escapeSearchHtml(last.code)} ${escapeSearchHtml(last.name)}</strong></p><p>${rideMeta}</p><span class="rail-network-time-pill">${escapeSearchHtml(railNetworkFormatMinutes(rideMinutes))} on train</span>${serviceMessage?`<small class="rail-network-service-note">${escapeSearchHtml(serviceMessage)}</small>`:""}${trailHtml}</div></article>`;
    }).join("");
    const routeLabel=railNetworkRouteOptionLabel(route,railNetworkSelectedRouteIndex,primary), variableRoute=railNetworkRouteHasVariableStops(route);
    const routeTime=railNetworkRouteTime(route);
    const totalTime=railNetworkFormatMinutes(routeTime.totalMinutes);
    const summaryMeta=variableRoute ? `${route.transfers} transfer${route.transfers===1?"":"s"} · ${steps.filter(step=>step.type==="ride").length} train line${steps.filter(step=>step.type==="ride").length===1?"":"s"} · stopping pattern varies` : `${route.rideStops} ride stop${route.rideStops===1?"":"s"} · ${route.transfers} transfer${route.transfers===1?"":"s"} · ${steps.filter(step=>step.type==="ride").length} train line${steps.filter(step=>step.type==="ride").length===1?"":"s"}`;
    const variableNote=variableRoute ? " Some JR services use local, rapid, or special-rapid stopping patterns, so intermediate stops can differ by train." : "";
    panel.innerHTML=`${optionHtml}<div class="rail-network-route-summary"><span class="section-kicker">${escapeSearchHtml(routeLabel)} · Offline route</span><h3>${escapeSearchHtml(fromHub.name)} → ${escapeSearchHtml(toHub.name)}</h3><div class="rail-network-total-time"><span>Estimated travel time</span><strong>${escapeSearchHtml(totalTime)}</strong><small>${routeTime.rideMinutes} min riding + ~${routeTime.transferMinutes} min transfer allowance</small></div><p>${escapeSearchHtml(summaryMeta)}</p></div><div class="rail-network-step-list">${stepHtml}</div><div class="rail-network-live-note"><strong>Before boarding</strong><p>This is an offline route based on Sakura's stored station order, not a departure-specific timetable. The travel time is an estimate of ride time plus transfer walking allowance; it does not include waiting for the next train, delays, or timetable-specific service differences. Route options are not ranked by live travel time or fare.${escapeSearchHtml(variableNote)} Confirm the current train type, destination, platform, disruptions, fare-gate instructions, and transfer signs at the station.</p></div>`;
    panel.hidden=false;
    if(recompute && typeof panel.scrollIntoView==="function") panel.scrollIntoView({block:"nearest"});
}

function renderRailNetworkPlanner() {
    if (!railGuideCityData) return;
    ensureRailNetworkPlannerCity();
    const from = railNetworkHubByKey(railNetworkPlannerState.from);
    const to = railNetworkHubByKey(railNetworkPlannerState.to);
    const fromInput = document.getElementById("rail-network-from-input");
    const toInput = document.getElementById("rail-network-to-input");
    if (fromInput && from) fromInput.value = from.name;
    if (toInput && to) toInput.value = to.name;
    const cityLabel = document.getElementById("rail-network-city-label");
    if (cityLabel) cityLabel.textContent = `${railGuideCityData.cityName} network`;
    updateRailNetworkPlanButton();
    if (from && to) renderRailNetworkRoute();
    else {
        const panel = document.getElementById("rail-network-route-result");
        if (panel) {
            panel.hidden = true;
            panel.innerHTML = "";
        }
    }
}

function renderRailCityTabs() {
    const container = document.getElementById("rail-city-tabs");
    if (!container) return;
    const cities = [["tokyo","Tokyo"],["osaka","Osaka"],["kyoto","Kyoto"]];
    container.innerHTML = cities.map(([id,label]) => `<button class="rail-city-chip ${railGuidePrefs.city === id ? "active" : ""}" type="button" data-rail-city="${id}" aria-pressed="${railGuidePrefs.city === id}">${label}</button>`).join("");
}

function renderRailOperatorTabs() {
    const container = document.getElementById("rail-operator-tabs");
    if (!container || !railGuideCityData) return;
    const operators = railOperators();
    if (!["all", ...operators].includes(railGuidePrefs.operator)) railGuidePrefs.operator = "all";
    const options = [["all","All"], ...operators.map(operator => [operator, operator])];
    container.innerHTML = options.map(([value,label]) => `<button class="rail-operator-chip ${railGuidePrefs.operator === value ? "active" : ""}" type="button" data-rail-operator="${escapeSearchHtml(value)}" aria-pressed="${railGuidePrefs.operator === value}">${escapeSearchHtml(label)}</button>`).join("");
}

function renderRailLineCards() {
    const container = document.getElementById("rail-line-list");
    if (!container || !railGuideCityData) return;
    const selected = currentRailLine();
    const lines = railGuidePrefs.operator === "all"
        ? railGuideCityData.lines
        : railGuideCityData.lines.filter(line => line.operator === railGuidePrefs.operator);
    container.innerHTML = lines.map(line => `<button class="rail-line-card ${line.id === selected?.id ? "active" : ""}" type="button" data-rail-line="${escapeSearchHtml(line.id)}" style="--rail-line:${escapeSearchHtml(line.accent || "#d75a82")}">
        <span class="rail-line-code">${escapeSearchHtml(line.code)}</span>
        <span><strong>${escapeSearchHtml(line.name)}</strong><small>${escapeSearchHtml(line.operator || "")}${line.jp ? ` · ${escapeSearchHtml(line.jp)}` : ""} · ${line.loop ? "Loop" : `${line.stations.length} stations`}</small></span>
        <b aria-hidden="true">›</b>
    </button>`).join("") || `<p class="rail-line-empty">No lines in this operator filter.</p>`;
}

function renderRailStationOptions(line) {
    const from = document.getElementById("rail-from-station");
    const to = document.getElementById("rail-to-station");
    if (!from || !to || !line) return;
    const options = line.stations.map(station => `<option value="${escapeSearchHtml(station.code)}">${escapeSearchHtml(station.code)} · ${escapeSearchHtml(station.name)}</option>`).join("");
    from.innerHTML = `<option value="">From station</option>${options}`;
    to.innerHTML = `<option value="">To station</option>${options}`;
    const codes = new Set(line.stations.map(station => station.code));
    if (!codes.has(railGuidePrefs.from)) railGuidePrefs.from = "";
    if (!codes.has(railGuidePrefs.to)) railGuidePrefs.to = "";
    from.value = railGuidePrefs.from;
    to.value = railGuidePrefs.to;
}

function renderRailJourney() {
    const panel = document.getElementById("rail-journey-result");
    const line = currentRailLine();
    if (!panel || !line) return;
    const journey = railJourney(line, railGuidePrefs.from, railGuidePrefs.to);
    if (!journey) {
        panel.hidden = true;
        panel.innerHTML = "";
        return;
    }
    const destination = journey.path[journey.path.length - 1];
    const nextStation = journey.path[1];
    panel.hidden = false;
    panel.innerHTML = `<span class="section-kicker">Your direction</span>
        <h3>${escapeSearchHtml(railGuidePrefs.from)} → ${escapeSearchHtml(destination.code)}</h3>
        <p><strong>${escapeSearchHtml(journey.direction)}</strong></p>
        <p>${journey.stops} stop${journey.stops === 1 ? "" : "s"} · next on this guide: ${escapeSearchHtml(nextStation?.code || "")} ${escapeSearchHtml(nextStation?.name || "")}</p>
        <small>Use the station's live signs to confirm the exact train type and platform.</small>`;
}

function renderRailStationDetail(stationCode) {
    const line = currentRailLine();
    const card = document.getElementById("rail-station-detail");
    if (!line || !card) return;
    const station = line.stations.find(item => item.code === stationCode);
    if (!station) {
        card.hidden = true;
        card.innerHTML = "";
        return;
    }
    card.hidden = false;
    const stationTitle = station.jp
        ? `${escapeSearchHtml(station.jp)} <small>${escapeSearchHtml(station.name)}</small>`
        : `${escapeSearchHtml(station.name)}`;
    card.innerHTML = `<div class="rail-station-detail-heading">
        <span class="rail-station-code" style="--rail-line:${escapeSearchHtml(line.accent || "#d75a82")}">${escapeSearchHtml(station.code)}</span>
        <div><h3>${stationTitle}</h3><p>${escapeSearchHtml(line.operator || "")} · ${escapeSearchHtml(line.name)}</p></div>
    </div>
    ${station.nearby ? `<div class="rail-detail-row"><strong>Nearby</strong><p>${escapeSearchHtml(station.nearby)}</p></div>` : ""}
    ${station.connections?.length ? `<div class="rail-detail-row"><strong>Connections</strong><p>${station.connections.map(escapeSearchHtml).join(" · ")}</p></div>` : ""}
    ${station.note ? `<div class="rail-detail-row"><strong>Tip</strong><p>${escapeSearchHtml(station.note)}</p></div>` : ""}`;
}

function renderRailLandmarkDetail(landmark) {
    const card = document.getElementById("rail-station-detail");
    const primary = railLandmarkPrimaryRef(landmark);
    if (!card || card.hidden || !landmark || !primary) return;
    const panel = document.createElement("section");
    panel.className = "rail-landmark-detail";
    panel.setAttribute("aria-label", `${landmark.name} landmark access`);
    panel.innerHTML = `<div class="rail-landmark-detail-heading">
        <span class="rail-landmark-pin" aria-hidden="true">⌖</span>
        <div><strong>${escapeSearchHtml(landmark.name)}</strong>${landmark.jp ? `<small>${escapeSearchHtml(landmark.jp)}</small>` : ""}</div>
    </div>
    <div class="rail-landmark-meta"><span>${escapeSearchHtml(landmark.area)}</span><span>${escapeSearchHtml(landmark.category)}</span></div>
    <div class="rail-detail-row"><strong>Nearest guide station</strong><p>${escapeSearchHtml(primary.station.code)} · ${escapeSearchHtml(primary.station.name)} · ${escapeSearchHtml(primary.line.name)}</p></div>
    ${landmark.accessNote ? `<div class="rail-detail-row"><strong>Access note</strong><p>${escapeSearchHtml(landmark.accessNote)}</p></div>` : ""}`;
    card.appendChild(panel);
}

function renderRailDiagram() {
    const line = currentRailLine();
    const map = document.getElementById("rail-route-map");
    if (!line || !map) return;
    const journey = railJourney(line, railGuidePrefs.from, railGuidePrefs.to);
    const highlighted = new Set(journey?.path?.map(station => station.code) || []);
    map.style.setProperty("--rail-line", line.accent || "#d75a82");
    map.classList.toggle("loop-line", Boolean(line.loop));
    map.innerHTML = line.stations.map((station, index) => {
        const selected = highlighted.has(station.code);
        return `<button class="rail-station-node ${selected ? "journey-active" : ""}" type="button" data-rail-station="${escapeSearchHtml(station.code)}" aria-label="Open ${escapeSearchHtml(station.name)} station details">
            <span class="rail-node-dot"></span>
            <span class="rail-node-copy"><b>${escapeSearchHtml(station.code)}</b><strong>${escapeSearchHtml(station.name)}</strong>${station.jp ? `<small>${escapeSearchHtml(station.jp)}</small>` : ""}</span>
        </button>`;
    }).join("");
}

function renderRailSearch(query = "") {
    const results = document.getElementById("rail-search-results");
    if (!results || !railGuideCityData) return;
    const normalized = normalizeRailSearchText(query);
    if (!normalized) {
        results.hidden = true;
        results.innerHTML = "";
        return;
    }

    const matches = [];
    for (const landmark of railGuideCityData.landmarks || []) {
        const score = railLandmarkSearchScore(normalized, landmark);
        if (score > 0) matches.push({ type:"landmark", landmark, score });
    }
    for (const line of railGuideCityData.lines) {
        for (const station of line.stations) {
            const score = railSearchScore(normalized, station, line);
            if (score > 0) matches.push({ type:"station", line, station, score });
        }
    }

    matches.sort((a,b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.type !== b.type) return a.type === "station" ? -1 : 1;
        const aName = a.type === "landmark" ? a.landmark.name : a.station.name;
        const bName = b.type === "landmark" ? b.landmark.name : b.station.name;
        return aName.localeCompare(bName);
    });

    const topMatches = matches.slice(0, 15);
    results.hidden = false;
    results.innerHTML = topMatches.length ? topMatches.map(match => {
        if (match.type === "landmark") {
            const landmark = match.landmark;
            const primary = railLandmarkPrimaryRef(landmark);
            const stationCopy = primary
                ? `${escapeSearchHtml(primary.station.code)} ${escapeSearchHtml(primary.station.name)} · ${escapeSearchHtml(primary.line.name)}`
                : "See access note";
            return `<button type="button" data-rail-landmark="${escapeSearchHtml(landmark.id)}">
                <span class="rail-search-code" style="--rail-line:#d75a82">⌖</span>
                <span><strong>${escapeSearchHtml(landmark.name)}</strong><small>Landmark · ${escapeSearchHtml(landmark.area)} · ${escapeSearchHtml(landmark.category)}</small><small>Nearest guide station: ${stationCopy}</small></span>
            </button>`;
        }
        const {line, station} = match;
        return `<button type="button" data-rail-search-line="${escapeSearchHtml(line.id)}" data-rail-search-station="${escapeSearchHtml(station.code)}">
            <span class="rail-search-code" style="--rail-line:${escapeSearchHtml(line.accent || "#d75a82")}">${escapeSearchHtml(station.code)}</span>
            <span><strong>${escapeSearchHtml(station.name)}</strong><small>${station.jp ? `${escapeSearchHtml(station.jp)} · ` : ""}${escapeSearchHtml(line.operator || "")} · ${escapeSearchHtml(line.name)}</small></span>
        </button>`;
    }).join("") : `<p>No matching landmark, station, line, operator, code, area, or connection in ${escapeSearchHtml(railGuideCityData.cityName)}.</p>`;
}

function railRenderSafely(label, renderer) {
    try {
        renderer();
        return true;
    }
    catch (error) {
        console.warn(`Rail Guide ${label} render recovered from an error.`, error);
        return false;
    }
}

function railSetText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value ?? "";
    return element;
}

function renderRailGuide() {
    const line = currentRailLine();
    if (!railGuideCityData || !line) return;

    railGuidePrefs.line = line.id;
    saveRailPrefs();

    railRenderSafely("city tabs", renderRailCityTabs);
    railRenderSafely("operator tabs", renderRailOperatorTabs);
    railRenderSafely("network planner", renderRailNetworkPlanner);
    railRenderSafely("line list", renderRailLineCards);

    railSetText("rail-city-title", `${railGuideCityData.cityName} Rail Lines`);
    const scope = document.getElementById("rail-search-scope");
    if (scope) scope.textContent = `Searches ${railGuideCityData.landmarks?.length || 0} landmarks and all ${railGuideCityData.lines.length} lines in ${railGuideCityData.cityName}, regardless of operator filter.`;
    railSetText("rail-city-note", railGuideCityData.notice || "");

    const lineCode = railSetText("rail-line-code", line.code);
    if (lineCode) lineCode.style.setProperty("--rail-line", line.accent || "#d75a82");
    railSetText("rail-line-name", line.name);
    railSetText("rail-line-jp", `${line.operator || ""}${line.jp ? ` · ${line.jp}` : ""}`);
    railSetText("rail-line-summary", line.summary || "");

    const service = document.getElementById("rail-line-service-note");
    if (service) {
        service.hidden = !line.serviceNote;
        service.textContent = line.serviceNote || "";
    }

    railRenderSafely("station selectors", () => renderRailStationOptions(line));
    railRenderSafely("single-line direction", renderRailJourney);
    railRenderSafely("route diagram", renderRailDiagram);
    railRenderSafely("search", () => renderRailSearch(document.getElementById("rail-search-input")?.value || ""));
}
async function openRailGuide() {
    normalizeRailPrefs();
    const requestId = ++railGuideLoadRequestId;
    const requestedCity = railGuidePrefs.city;
    setRailLoadingState(`Preparing ${requestedCity.charAt(0).toUpperCase() + requestedCity.slice(1)} Rail Guide…`, "loading");

    let data;
    try {
        data = await loadRailCity(requestedCity);
    }
    catch (error) {
        if (requestId !== railGuideLoadRequestId) return;
        console.warn("Rail Guide data could not load.", error);
        setRailLoadingState("Rail data is temporarily unavailable. Sakura will retry when you reopen Rail Guide.", "error");
        return;
    }

    if (requestId !== railGuideLoadRequestId) return;
    railGuideCityData = data;
    if (!railGuideCityData?.lines?.some(line => line.id === railGuidePrefs.line)) {
        railGuidePrefs.line = railGuideCityData?.lines?.[0]?.id || "";
        railGuidePrefs.from = "";
        railGuidePrefs.to = "";
    }
    saveRailPrefs();
    renderRailGuide();
    setRailLoadingState();
}

async function selectRailCity(city) {
    if (!RAIL_CITY_FILES[city]) return;
    window.clearTimeout(railNetworkSearchTimers.from);
    window.clearTimeout(railNetworkSearchTimers.to);
    if (city === railGuidePrefs.city && railGuideCityData?.city === city) {
        setRailLoadingState();
        return;
    }

    const requestId = ++railGuideLoadRequestId;
    const label = city.charAt(0).toUpperCase() + city.slice(1);
    setRailLoadingState(`Loading ${label} rail data…`, "loading");

    let data;
    try {
        data = await loadRailCity(city);
    }
    catch (error) {
        if (requestId !== railGuideLoadRequestId) return;
        console.warn(`Rail Guide could not switch to ${city}.`, error);
        railRenderSafely("city tabs", renderRailCityTabs);
        setRailLoadingState(`${label} rail data is temporarily unavailable. Your current city is unchanged. Tap ${label} again to retry.`, "error");
        return;
    }

    if (requestId !== railGuideLoadRequestId) return;
    railGuideCityData = data;
    railGuidePrefs.city = city;
    railGuidePrefs.line = data.lines?.[0]?.id || "";
    railGuidePrefs.operator = "all";
    railGuidePrefs.from = "";
    railGuidePrefs.to = "";
    railNetworkPlannerState = { city, from:"", to:"" };
    saveRailPrefs();
    renderRailGuide();
    setRailLoadingState();
}
function selectRailLine(lineId, stationCode = "") {
    const line = railGuideCityData?.lines?.find(item => item.id === lineId);
    if (!line) return;
    const lineChanged = railGuidePrefs.line !== line.id;
    railGuidePrefs.line = line.id;
    if (lineChanged) {
        railGuidePrefs.from = "";
        railGuidePrefs.to = "";
    }
    saveRailPrefs();
    renderRailGuide();
    if (stationCode && line.stations.some(station => station.code === stationCode)) {
        renderRailStationDetail(stationCode);
    }
}

function travelCategoryMetadata(category) {
    return window.TRAVEL_CATEGORIES?.[category] || null;
}

function travelPhrasePool() {
    if (!currentTravelCategory || !window.SakuraTravelLoader) return [];
    const phrases = window.SakuraTravelLoader.getTravelPhrasesByCategory(currentTravelCategory);
    return currentTravelFilter === "All" ? phrases : phrases.filter(phrase => phrase.subcategory === currentTravelFilter);
}

function travelTagLabel(value) {
    return String(value || "").split("-").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function renderTravelPhraseCard(phrase) {
    currentTravelPhrase = phrase || null;
    const list = document.getElementById("travel-phrase-list");
    const empty = document.getElementById("travel-category-empty");
    const controls = ["previous-travel-phrase", "random-travel-phrase", "next-travel-phrase"].map(id => document.getElementById(id));
    const pool = travelPhrasePool();
    const isSmartVariant = Boolean(phrase?.smartVariant);
    controls.forEach(button => { button.disabled = !phrase || !pool.length || isSmartVariant; });
    empty.hidden = Boolean(phrase);
    if (!phrase) {
        list.innerHTML = "";
        document.getElementById("travel-category-status").textContent = "0 phrases";
        return;
    }
    const position = Math.max(0, pool.findIndex(item => item.id === phrase.id));
    currentTravelIndex = position;
    document.getElementById("travel-category-status").textContent = isSmartVariant ? `Suggested phrase · ${travelCategoryMetadata(phrase.category)?.title || "Travel"}` : pool.length ? `${position + 1} of ${pool.length} · ${currentTravelFilter}` : "Saved travel phrase";
    const saved = !isSmartVariant && isSaved(phrase);
    list.innerHTML = `<article class="travel-phrase-card">
        <div class="card-topline"><span class="status-label">${escapeSearchHtml(isSmartVariant ? "Suggested phrase" : phrase.subcategory)}</span><div class="card-topline-actions"><button class="suite-audio-mini" type="button" data-sakura-speak data-speak-text="${escapeSearchHtml(phrase.japanese)}">🔊 Hear</button>${isSmartVariant ? "" : `<button class="save-button ${saved ? "saved" : ""}" type="button" data-save-travel-phrase aria-label="${saved ? "Unsave" : "Save"} travel phrase" aria-pressed="${saved}">${saved ? "♥" : "♡"}</button>`}</div></div>
        <h2>${escapeSearchHtml(phrase.japanese)}</h2>
        <p class="travel-reading">${escapeSearchHtml(phrase.reading)}</p>
        <p class="travel-romaji">${escapeSearchHtml(phrase.romaji)}</p>
        <p class="travel-english">${escapeSearchHtml(phrase.english)}</p>
        <div class="travel-phrase-tags"><span>${escapeSearchHtml(travelTagLabel(phrase.priority))}</span><span>${escapeSearchHtml(travelTagLabel(phrase.politeness))}</span></div>
        <details class="travel-phrase-details"><summary>Usage details</summary><div><strong>Literal meaning</strong><p>${escapeSearchHtml(phrase.literalMeaning || "—")}</p><strong>Natural usage</strong><p>${escapeSearchHtml(phrase.naturalUsage || "—")}</p>${phrase.tags?.length ? `<strong>Tags</strong><p>${phrase.tags.map(escapeSearchHtml).join(" · ")}</p>` : ""}</div></details>
    </article>`;
}

function renderTravelFilters(category) {
    const metadata = travelCategoryMetadata(category);
    const container = document.getElementById("travel-category-filters");
    if (!metadata) { container.innerHTML = ""; return; }
    container.innerHTML = metadata.filters.map(filter => `<button class="search-filter-chip ${filter === currentTravelFilter ? "active" : ""}" type="button" data-travel-filter="${escapeSearchHtml(filter)}" aria-pressed="${filter === currentTravelFilter}">${escapeSearchHtml(filter)}</button>`).join("");
}

function browseTravelPhrase(direction = 1, random = false) {
    const pool = travelPhrasePool();
    if (!pool.length) { renderTravelPhraseCard(null); return; }
    const existingIndex = pool.findIndex(phrase => phrase.id === currentTravelPhrase?.id);
    if (random && pool.length > 1) {
        const alternatives = pool.filter(phrase => phrase.id !== currentTravelPhrase?.id);
        currentTravelIndex = Math.floor(Math.random() * alternatives.length);
        renderTravelPhraseCard(alternatives[currentTravelIndex]);
        return;
    }
    const baseIndex = existingIndex >= 0 ? existingIndex : 0;
    currentTravelIndex = (baseIndex + direction + pool.length) % pool.length;
    renderTravelPhraseCard(pool[currentTravelIndex]);
}

async function renderTravelCategory(category) {
    const metadata = travelCategoryMetadata(category);
    if (!metadata) {
        console.warn(`Travel Mode: invalid category ${JSON.stringify(category)}.`);
        showRoute("travel");
        return;
    }
    const revision = ++travelRenderRevision;
    const categoryChanged = currentTravelCategory !== category;
    currentTravelCategory = category;
    if (categoryChanged) currentTravelFilter = "All";
    document.getElementById("travel-category-icon").textContent = metadata.icon;
    document.getElementById("travel-category-heading").textContent = metadata.title;
    document.getElementById("travel-category-description").textContent = metadata.description;
    const railLaunch = document.getElementById("travel-rail-guide-launch");
    if (railLaunch) railLaunch.hidden = category !== "trains";
    document.getElementById("travel-category-status").textContent = "Loading travel phrases…";
    document.getElementById("travel-category-empty").hidden = true;
    document.getElementById("travel-phrase-list").innerHTML = "";
    renderTravelFilters(category);
    if (pendingTravelSmartPhrase?.category === category) {
        const smartPhrase = pendingTravelSmartPhrase;
        pendingTravelSmartPhrase = null;
        renderTravelPhraseCard(smartPhrase);
        return;
    }
    try {
        await window.SakuraTravelLoader.loadTravelCategory(category);
        if (revision !== travelRenderRevision || currentRoute !== `travel-${category}`) return;
        invalidateSearchIndex();
        const pool = travelPhrasePool();
        currentTravelIndex = 0;
        const requestedPhrase = pendingTravelPhraseId ? pool.find(phrase => phrase.id === pendingTravelPhraseId) : null;
        pendingTravelPhraseId = "";
        renderTravelPhraseCard(requestedPhrase || pool[0] || null);
    }
    catch (error) {
        if (revision !== travelRenderRevision || currentRoute !== `travel-${category}`) return;
        pendingTravelPhraseId = "";
        console.warn(`Travel Mode: ${category} is unavailable.`, error);
        document.getElementById("travel-category-status").textContent = "Travel phrases could not be loaded.";
        document.getElementById("travel-category-empty").hidden = false;
        document.getElementById("travel-category-empty").querySelector("strong").textContent = "This category is unavailable offline.";
        document.getElementById("travel-category-empty").querySelector("p").textContent = "Open it once while online to make it available offline.";
        ["previous-travel-phrase", "random-travel-phrase", "next-travel-phrase"].forEach(id => { document.getElementById(id).disabled = true; });
    }
}

function shuffleItems(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    return shuffled;
}

function itemTitle(item) {
    return item?.character || item?.word || item?.expression || item?.japanese || "Saved item";
}

function itemReading(item) {
    return item?.reading || item?.kana || "";
}

function savedItemMastery(item) {
    return getMastery(item)?.mastery || "New";
}

function savedItemCategories(item) {
    return Array.isArray(item?.categories) ? item.categories : item?.category ? [item.category] : [];
}

function savedItemSearchText(item) {
    return searchText([itemTitle(item), itemReading(item), item?.romaji, item?.meaning, item?.naturalMeaning, item?.english, item?.exampleSentence].filter(Boolean).join(" "));
}

function syncSavedFilterVisibility() {
    const type = document.getElementById("saved-type-filter").value;
    const levelLabel = document.getElementById("saved-level-filter-label");
    const slangLabel = document.getElementById("saved-slang-category-label");
    levelLabel.hidden = !["all", "kanji", "vocabulary"].includes(type);
    slangLabel.hidden = type !== "slang";
    if (levelLabel.hidden) document.getElementById("saved-level-filter").value = "all";
    if (slangLabel.hidden) document.getElementById("saved-slang-category-filter").value = "all";
}

function renderSavedSlangCategoryOptions() {
    const select = document.getElementById("saved-slang-category-filter");
    if (!select) return;
    select.innerHTML = '<option value="all">All categories</option>' + SLANG_CATEGORY_OPTIONS.slice(1).map(([value, label]) => `<option value="${escapeSearchHtml(value)}">${escapeSearchHtml(label)}</option>`).join("");
}

function filteredSavedItems() {
    const query = searchText(document.getElementById("saved-search-input").value);
    const type = document.getElementById("saved-type-filter").value;
    const level = document.getElementById("saved-level-filter").value;
    const slangCategory = document.getElementById("saved-slang-category-filter").value;
    const status = document.getElementById("saved-status-filter").value;
    const mastery = document.getElementById("saved-mastery-filter").value;
    const sort = document.getElementById("saved-sort").value;
    return savedItems.map((item, index) => ({ item, index, savedTime:Number.isNaN(Date.parse(item.savedAt)) ? null : Date.parse(item.savedAt) }))
        .filter(({ item }) => (!query || savedItemSearchText(item).includes(query))
            && (type === "all" || item.type === type)
            && (level === "all" || item.jlpt === level)
            && (slangCategory === "all" || (item.type === "slang" && savedItemCategories(item).includes(slangCategory)))
            && (status === "all" || flashcardStatuses[itemKey(item)] === status)
            && (mastery === "all" || savedItemMastery(item) === mastery))
        .sort((left, right) => {
            if (left.savedTime !== null && right.savedTime !== null) return sort === "oldest" ? left.savedTime - right.savedTime : right.savedTime - left.savedTime;
            return sort === "oldest" ? left.index - right.index : right.index - left.index;
        })
        .map(entry => entry.item);
}

function renderSavedItems() {
    syncSavedFilterVisibility();
    const filtered = filteredSavedItems();
    document.getElementById("saved-items").innerHTML = filtered.map(item => {
        const key = escapeSearchHtml(itemKey(item));
        const mastery = savedItemMastery(item);
        return `<article class="saved-item-card"><div class="saved-card-badges"><span class="tag">${escapeSearchHtml(item.jlpt || item.difficulty || savedItemCategories(item)[0] || item.type)}</span><span class="mastery-badge">${escapeSearchHtml(mastery)}</span></div><button class="saved-item-open" type="button" data-open-saved-key="${key}"><strong class="saved-item-title">${escapeSearchHtml(itemTitle(item))}</strong><span>${escapeSearchHtml(itemReading(item))}</span><span>${escapeSearchHtml(item.meaning || item.naturalMeaning || item.english || "")}</span></button><button class="remove-saved-button" type="button" data-remove-key="${key}">Remove</button></article>`;
    }).join("");
    document.getElementById("saved-empty").hidden = filtered.length > 0;
    document.getElementById("saved-empty").textContent = savedItems.length ? "No saved items match these filters." : "Your garden is waiting. Tap the heart on any Japanese card to save it here.";
    document.getElementById("saved-filter-summary").textContent = `${filtered.length} of ${savedItems.length} saved items`;
    document.getElementById("start-flashcards").disabled = filtered.length === 0;
}

function openSavedItem(item) {
    if (!item) return;
    if (item.type === "kana") {
        showRoute("quiz");
        showQuizTab("kana");
        currentKana = [item.character, item.reading, item.script || "Kana", item.kanaGroup || "Basic"];
        document.getElementById("kana-character").textContent = currentKana[0];
        document.getElementById("kana-type").textContent = `${currentKana[2]} · ${kanaGroup(currentKana) === "Yoon" ? "Yōon" : kanaGroup(currentKana)}`;
        document.getElementById("kana-answer").value = "";
        setFeedback("kana-feedback", "");
        setSaveButton(document.getElementById("save-kana-quiz"), kanaQuizSavedItem());
    }
    else if (item.type === "kanji") openKanjiDetail(item, "saved");
    else if (item.type === "vocabulary") openWordDetail(item, "saved");
    else if (["native", "slang"].includes(item.type)) {
        showRoute(`learn-${item.type}`);
        document.getElementById("native-difficulty-filter").value = "All";
        refreshNativeCategories();
        document.getElementById("native-category-filter").value = "All";
        renderNative(item);
    }
    else if (item.type === "travel" && travelCategoryMetadata(item.category)) {
        showRoute(`travel-${item.category}`);
        window.SakuraTravelLoader.loadTravelCategory(item.category).then(records => {
            if (currentRoute !== `travel-${item.category}`) return;
            const phrase = records.find(record => record.id === item.id) || item;
            currentTravelFilter = phrase.subcategory || "All";
            renderTravelFilters(item.category);
            renderTravelPhraseCard(phrase);
        }).catch(() => {
            if (currentRoute === `travel-${item.category}`) renderTravelPhraseCard(item);
        });
    }
    else if (item.type === "translation") {
        showRoute("translate");
        renderTranslationResult({ id:item.id, japanese:item.expression, kana:item.kana, romaji:item.romaji, naturalMeaning:item.naturalMeaning || item.meaning, literalMeaning:item.literalMeaning || "", tone:item.tone || "", usageNote:item.notes || "", alternative:item.alternative || "", offline:false });
    }
}

const SAVED_TRAVEL_FILTERS = Object.freeze([
    ["all", "All"], ["trains", "Trains"], ["restaurants", "Food"], ["shopping", "Shopping"],
    ["hotels", "Hotels"], ["taxi", "Taxi"], ["emergencies", "Emergency"], ["others", "Others"]
]);

function savedTravelItems() {
    return savedItems.filter(item => item?.type === "travel" && !item.transient && !item.smartVariant);
}

function cleanPinnedTravelIds(items = savedTravelItems()) {
    const savedIds = new Set(items.map(item => item.id));
    const clean = [...new Set(pinnedTravelPhraseIds.filter(id => savedIds.has(id)))];
    if (clean.length !== pinnedTravelPhraseIds.length || clean.some((id, index) => id !== pinnedTravelPhraseIds[index])) {
        pinnedTravelPhraseIds = clean;
        writeJson(STORAGE.pinnedTravelPhrases, pinnedTravelPhraseIds);
    }
    return clean;
}

function travelPouchCard(item, pinned = false) {
    const isPinned = pinnedTravelPhraseIds.includes(item.id);
    return `<article class="travel-pouch-card ${pinned ? "pinned" : ""}"><button class="travel-pouch-open" type="button" data-open-travel-saved="${escapeSearchHtml(itemKey(item))}"><strong>${escapeSearchHtml(item.japanese)}</strong><span>${escapeSearchHtml(item.reading || item.romaji || "")}</span><small>${escapeSearchHtml(item.english || "")}</small></button><button class="travel-pin-button ${isPinned ? "active" : ""}" type="button" data-pin-travel-id="${escapeSearchHtml(item.id)}" aria-pressed="${isPinned}">${isPinned ? "Unpin" : "Pin"}</button></article>`;
}

function renderMyTravelPhrases() {
    const content = document.getElementById("travel-pouch-content");
    if (!content) return;
    const items = savedTravelItems();
    const cleanPins = cleanPinnedTravelIds(items);
    const byId = new Map(items.map(item => [item.id, item]));
    const pinned = cleanPins.map(id => byId.get(id)).filter(Boolean);
    const recent = items.map((item, index) => ({ item, index, time: Number.isNaN(Date.parse(item.savedAt)) ? 0 : Date.parse(item.savedAt) }))
        .sort((a, b) => b.time - a.time || b.index - a.index).slice(0, 8).map(entry => entry.item);
    const filtered = savedTravelCategoryFilter === "all" ? items : items.filter(item => item.category === savedTravelCategoryFilter);
    document.getElementById("travel-pouch-empty").hidden = items.length > 0;
    content.hidden = items.length === 0;
    document.getElementById("travel-pinned-list").innerHTML = pinned.map(item => travelPouchCard(item, true)).join("");
    document.getElementById("travel-pinned-empty").hidden = pinned.length > 0;
    document.getElementById("travel-pinned-count").textContent = String(pinned.length);
    document.getElementById("travel-recent-list").innerHTML = recent.map(item => travelPouchCard(item)).join("");
    document.getElementById("travel-all-list").innerHTML = filtered.map(item => travelPouchCard(item)).join("");
    document.getElementById("travel-all-count").textContent = String(items.length);
    document.getElementById("travel-filter-empty").hidden = filtered.length > 0;
    document.getElementById("travel-saved-filters").innerHTML = SAVED_TRAVEL_FILTERS.map(([category, label]) => `<button class="search-filter-chip ${category === savedTravelCategoryFilter ? "active" : ""}" type="button" data-saved-travel-filter="${category}" aria-pressed="${category === savedTravelCategoryFilter}">${label}</button>`).join("");
}

function togglePinnedTravelPhrase(id) {
    const item = savedTravelItems().find(saved => saved.id === id);
    if (!item) return;
    pinnedTravelPhraseIds = pinnedTravelPhraseIds.includes(id) ? pinnedTravelPhraseIds.filter(savedId => savedId !== id) : [...pinnedTravelPhraseIds, id];
    writeJson(STORAGE.pinnedTravelPhrases, pinnedTravelPhraseIds);
    renderMyTravelPhrases();
}

const TRAVEL_DECK_ICONS = Object.freeze(["🌸", "🚆", "🍜", "🛍️", "🏨", "🚕", "🎟️", "🎤", "⛩️", "🎢", "📍", "🗺️", "❤️", "⭐"]);

function writeTravelDecks() {
    writeJson(STORAGE.travelPhraseDecks, travelPhraseDecks);
}

function makeTravelDeckId() {
    return `deck-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function cleanTravelDecks() {
    const validIds = new Set(savedTravelItems().map(item => item.id));
    let changed = false;
    travelPhraseDecks = travelPhraseDecks.filter(deck => deck && typeof deck.id === "string").map(deck => {
        const phraseIds = [...new Set((Array.isArray(deck.phraseIds) ? deck.phraseIds : []).filter(id => validIds.has(id)))];
        if (phraseIds.length !== (deck.phraseIds?.length || 0)) changed = true;
        return { ...deck, phraseIds };
    });
    if (changed) writeTravelDecks();
}

function travelDeckById(id = currentTravelDeckId) {
    return travelPhraseDecks.find(deck => deck.id === id) || null;
}

function renderTravelDecks() {
    const list = document.getElementById("travel-deck-list");
    if (!list) return;
    list.innerHTML = travelPhraseDecks.map(deck => `<button class="travel-deck-card" type="button" data-open-travel-deck="${escapeSearchHtml(deck.id)}"><span aria-hidden="true">${escapeSearchHtml(deck.icon || "🌸")}</span><strong>${escapeSearchHtml(deck.name)}</strong><small>${deck.phraseIds.length} phrase${deck.phraseIds.length === 1 ? "" : "s"}</small><b aria-hidden="true">→</b></button>`).join("");
    document.getElementById("travel-decks-empty").hidden = travelPhraseDecks.length > 0;
}

function deckPhraseCard(item) {
    return `<article class="travel-pouch-card"><button class="travel-pouch-open" type="button" data-open-deck-phrase="${escapeSearchHtml(itemKey(item))}"><strong>${escapeSearchHtml(item.japanese)}</strong><span>${escapeSearchHtml(item.reading || item.romaji || "")}</span><small>${escapeSearchHtml(item.english || "")}</small></button><button class="travel-pin-button" type="button" data-remove-deck-phrase="${escapeSearchHtml(item.id)}">Remove</button></article>`;
}

function renderCurrentTravelDeck() {
    const heading = document.getElementById("travel-deck-heading");
    if (!heading) return;
    const deck = travelDeckById();
    if (!deck) {
        heading.textContent = "Deck not found";
        document.getElementById("travel-deck-phrases").innerHTML = "";
        document.getElementById("travel-deck-empty").hidden = false;
        return;
    }
    const byId = new Map(savedTravelItems().map(item => [item.id, item]));
    const phrases = deck.phraseIds.map(id => byId.get(id)).filter(Boolean);
    document.getElementById("travel-deck-icon").textContent = deck.icon || "🌸";
    heading.textContent = deck.name;
    document.getElementById("travel-deck-count").textContent = `${phrases.length} phrase${phrases.length === 1 ? "" : "s"}`;
    document.getElementById("travel-deck-phrases").innerHTML = phrases.map(deckPhraseCard).join("");
    document.getElementById("travel-deck-empty").hidden = phrases.length > 0;
}

function renderTravelDeckIcons() {
    document.getElementById("travel-deck-icons").innerHTML = TRAVEL_DECK_ICONS.map(icon => `<button class="deck-icon-button ${icon === travelDeckIconChoice ? "active" : ""}" type="button" data-deck-icon="${icon}" aria-pressed="${icon === travelDeckIconChoice}">${icon}</button>`).join("");
}

function openTravelDeckEditor(deck = null) {
    travelDeckIconChoice = deck?.icon || "🌸";
    document.getElementById("travel-deck-edit-id").value = deck?.id || "";
    document.getElementById("travel-deck-name").value = deck?.name || "";
    document.getElementById("travel-deck-editor-heading").textContent = deck ? "Edit Deck" : "Create Deck";
    document.getElementById("delete-travel-deck").hidden = !deck;
    document.getElementById("travel-deck-form-message").textContent = "";
    renderTravelDeckIcons();
    document.getElementById("travel-deck-editor").showModal();
}

function saveTravelDeck(event) {
    event.preventDefault();
    const name = document.getElementById("travel-deck-name").value.trim();
    const message = document.getElementById("travel-deck-form-message");
    if (!name) { message.textContent = "Enter a deck name."; return; }
    if (name.length > 50) { message.textContent = "Keep the deck name to 50 characters or fewer."; return; }
    const id = document.getElementById("travel-deck-edit-id").value;
    const now = new Date().toISOString();
    if (id) travelPhraseDecks = travelPhraseDecks.map(deck => deck.id === id ? { ...deck, name, icon:travelDeckIconChoice, updatedAt:now } : deck);
    else {
        const deck = { id:makeTravelDeckId(), name, icon:travelDeckIconChoice, phraseIds:[], createdAt:now, updatedAt:now };
        travelPhraseDecks.push(deck);
        currentTravelDeckId = deck.id;
    }
    writeTravelDecks();
    document.getElementById("travel-deck-editor").close();
    renderTravelDecks();
    if (currentTravelDeckId) showRoute(`travel-deck-${currentTravelDeckId}`);
}

function deleteCurrentTravelDeck() {
    const id = document.getElementById("travel-deck-edit-id").value;
    const deck = travelDeckById(id);
    if (!deck || !window.confirm(`Delete “${deck.name}”? Saved phrases and pins will not be removed.`)) return;
    travelPhraseDecks = travelPhraseDecks.filter(item => item.id !== id);
    writeTravelDecks();
    currentTravelDeckId = "";
    document.getElementById("travel-deck-editor").close();
    showRoute("travel-decks");
}

function pickerEligibleTravelItems() {
    const query = searchText(document.getElementById("travel-deck-picker-search")?.value || "");
    return savedTravelItems().filter(item => travelDeckPickerFilter === "all" || item.category === travelDeckPickerFilter).filter(item => !query || searchableFields(item).some(field => field.includes(query)));
}

function renderTravelDeckPicker() {
    const deck = travelDeckById();
    if (!deck) return;
    document.getElementById("travel-deck-picker-filters").innerHTML = SAVED_TRAVEL_FILTERS.map(([category, label]) => `<button class="search-filter-chip ${category === travelDeckPickerFilter ? "active" : ""}" type="button" data-deck-picker-filter="${category}" aria-pressed="${category === travelDeckPickerFilter}">${label}</button>`).join("");
    const items = pickerEligibleTravelItems();
    document.getElementById("travel-deck-picker-list").innerHTML = items.map(item => { const selected=travelDeckPickerSelection.has(item.id); return `<label class="travel-deck-picker-item ${selected ? "selected" : ""}"><input type="checkbox" data-deck-picker-id="${escapeSearchHtml(item.id)}" ${selected ? "checked" : ""}><span><strong>${escapeSearchHtml(item.japanese)}</strong><small>${escapeSearchHtml(item.reading || item.romaji || "")}<br>${escapeSearchHtml(item.english || "")}</small></span></label>`; }).join("");
    document.getElementById("travel-deck-picker-empty").hidden = items.length > 0;
}

function openTravelDeckPicker() {
    const deck = travelDeckById();
    if (!deck) return;
    travelDeckPickerFilter = "all";
    travelDeckPickerSelection = new Set(deck.phraseIds);
    document.getElementById("travel-deck-picker-search").value = "";
    renderTravelDeckPicker();
    document.getElementById("travel-deck-picker").showModal();
}

function saveTravelDeckPicker() {
    const deck = travelDeckById();
    if (!deck) return;
    const validIds = new Set(savedTravelItems().map(item => item.id));
    deck.phraseIds = [...new Set([...deck.phraseIds, ...travelDeckPickerSelection].filter(id => validIds.has(id)))];
    deck.updatedAt = new Date().toISOString();
    writeTravelDecks();
    document.getElementById("travel-deck-picker").close();
    renderTravelDecks();
    renderCurrentTravelDeck();
}

function removePhraseFromCurrentDeck(id) {
    const deck = travelDeckById();
    if (!deck) return;
    deck.phraseIds = deck.phraseIds.filter(phraseId => phraseId !== id);
    deck.updatedAt = new Date().toISOString();
    writeTravelDecks();
    renderTravelDecks();
    renderCurrentTravelDeck();
}

const TRAVEL_NOTE_CATEGORIES = Object.freeze({
    general:{ label:"General", icon:"🌸" }, hotel:{ label:"Hotel", icon:"🏨" }, food:{ label:"Food", icon:"🍜" },
    transport:{ label:"Transport", icon:"🚆" }, event:{ label:"Event", icon:"🎟️" }, shopping:{ label:"Shopping", icon:"🛍️" }, place:{ label:"Place", icon:"📍" }
});

function writeTravelNotes() {
    writeJson(STORAGE.travelNotes, travelNotes);
}

function makeTravelNoteId() {
    return `note-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function travelNoteById(id = currentTravelNoteId) {
    return travelNotes.find(note => note.id === id) || null;
}

function normalizedTravelNotes() {
    return travelNotes.filter(note => note && typeof note.id === "string" && typeof note.content === "string").sort((a, b) => {
        const aTime = Date.parse(a.updatedAt || a.createdAt) || 0;
        const bTime = Date.parse(b.updatedAt || b.createdAt) || 0;
        return bTime - aTime;
    });
}

function filteredTravelNotes() {
    const input = document.getElementById("travel-note-search");
    const query = String(input?.value || "").normalize("NFKC").trim().toLocaleLowerCase();
    return normalizedTravelNotes().filter(note => travelNoteCategoryFilter === "all" || note.category === travelNoteCategoryFilter).filter(note => {
        if (!query) return true;
        const category = TRAVEL_NOTE_CATEGORIES[note.category]?.label || "General";
        return [note.title, note.content, category].some(value => String(value || "").normalize("NFKC").toLocaleLowerCase().includes(query));
    });
}

function travelNoteCard(note) {
    const category = TRAVEL_NOTE_CATEGORIES[note.category] || TRAVEL_NOTE_CATEGORIES.general;
    const preview = note.content.replace(/\s+/g, " ").trim().slice(0, 120);
    return `<button class="travel-note-card" type="button" data-open-travel-note="${escapeSearchHtml(note.id)}"><span class="travel-note-card-icon" aria-hidden="true">${category.icon}</span><span><strong>${escapeSearchHtml(note.title?.trim() || "Untitled Note")}</strong><small>${escapeSearchHtml(preview)}${note.content.length > 120 ? "…" : ""}</small><em>${escapeSearchHtml(category.label)}${note.pinned ? " · Pinned" : ""}</em></span><b aria-hidden="true">→</b></button>`;
}

function renderTravelNotes() {
    const allList = document.getElementById("travel-notes-all");
    if (!allList) return;
    const allNotes = normalizedTravelNotes();
    const filtered = filteredTravelNotes();
    const pinned = filtered.filter(note => note.pinned);
    document.getElementById("travel-note-filters").innerHTML = [["all", "All"], ...Object.entries(TRAVEL_NOTE_CATEGORIES).map(([id, category]) => [id, category.label])].map(([id, label]) => `<button class="search-filter-chip ${id === travelNoteCategoryFilter ? "active" : ""}" type="button" data-travel-note-filter="${id}" aria-pressed="${id === travelNoteCategoryFilter}">${label}</button>`).join("");
    document.getElementById("travel-notes-empty").hidden = allNotes.length > 0;
    document.getElementById("travel-notes-all-section").hidden = allNotes.length === 0;
    document.getElementById("travel-notes-pinned-section").hidden = pinned.length === 0;
    document.getElementById("travel-notes-pinned").innerHTML = pinned.map(travelNoteCard).join("");
    document.getElementById("travel-notes-pinned-count").textContent = String(pinned.length);
    allList.innerHTML = filtered.map(travelNoteCard).join("");
    document.getElementById("travel-notes-count").textContent = String(filtered.length);
    document.getElementById("travel-notes-filter-empty").hidden = filtered.length > 0;
}

function openTravelNoteEditor(note = null) {
    document.getElementById("travel-note-edit-id").value = note?.id || "";
    document.getElementById("travel-note-title").value = note?.title || "";
    document.getElementById("travel-note-category").value = TRAVEL_NOTE_CATEGORIES[note?.category] ? note.category : "general";
    document.getElementById("travel-note-content").value = note?.content || "";
    document.getElementById("travel-note-editor-heading").textContent = note ? "Edit Note" : "Create Note";
    document.getElementById("travel-note-form-message").textContent = "";
    document.getElementById("travel-note-editor").showModal();
}

function saveTravelNote(event) {
    event.preventDefault();
    const id = document.getElementById("travel-note-edit-id").value;
    const title = document.getElementById("travel-note-title").value.trim();
    const categoryValue = document.getElementById("travel-note-category").value;
    const category = TRAVEL_NOTE_CATEGORIES[categoryValue] ? categoryValue : "general";
    const content = document.getElementById("travel-note-content").value.trim();
    const message = document.getElementById("travel-note-form-message");
    if (!content) { message.textContent = "Enter some note content."; return; }
    const now = new Date().toISOString();
    if (id) travelNotes = travelNotes.map(note => note.id === id ? { ...note, title, category, content, updatedAt:now } : note);
    else travelNotes.push({ id:makeTravelNoteId(), title, content, category, pinned:false, createdAt:now, updatedAt:now });
    writeTravelNotes();
    document.getElementById("travel-note-editor").close();
    renderTravelNotes();
    if (id && currentTravelNoteId === id) openTravelNoteDetail(id);
}

function openTravelNoteDetail(id) {
    const note = travelNoteById(id);
    if (!note) return;
    currentTravelNoteId = id;
    const category = TRAVEL_NOTE_CATEGORIES[note.category] || TRAVEL_NOTE_CATEGORIES.general;
    document.getElementById("travel-note-detail-category").textContent = `${category.icon} ${category.label}`;
    document.getElementById("travel-note-detail-title").textContent = note.title?.trim() || "Untitled Note";
    document.getElementById("travel-note-detail-content").textContent = note.content;
    document.getElementById("pin-travel-note").textContent = note.pinned ? "Unpin" : "Pin";
    const dialog = document.getElementById("travel-note-detail");
    if (!dialog.open) dialog.showModal();
}

function toggleCurrentTravelNotePin() {
    const note = travelNoteById();
    if (!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    writeTravelNotes();
    renderTravelNotes();
    openTravelNoteDetail(note.id);
}

function deleteCurrentTravelNote() {
    const note = travelNoteById();
    if (!note || !window.confirm(`Delete “${note.title?.trim() || "Untitled Note"}”?`)) return;
    travelNotes = travelNotes.filter(item => item.id !== note.id);
    writeTravelNotes();
    currentTravelNoteId = "";
    document.getElementById("travel-note-detail").close();
    renderTravelNotes();
}

const CALENDAR_DAY_MS = 86400000;

function parseCalendarDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localDate = new Date(year, month - 1, day, 12);
    if (localDate.getFullYear() !== year || localDate.getMonth() !== month - 1 || localDate.getDate() !== day) return null;
    return { year, month, day, dayNumber: Math.floor(Date.UTC(year, month - 1, day) / CALENDAR_DAY_MS) };
}

function localCalendarDay(now = new Date()) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return { year, month, day, dayNumber: Math.floor(Date.UTC(year, month - 1, day) / CALENDAR_DAY_MS) };
}

function getTravelCountdownState(record = travelCountdown, today = localCalendarDay()) {
    const start = parseCalendarDate(record?.startDate);
    if (!start) return null;
    const end = parseCalendarDate(record?.endDate) || start;
    const daysUntilStart = start.dayNumber - today.dayNumber;
    if (daysUntilStart > 0) return { kind:"upcoming", label:"Upcoming trip", text:`${daysUntilStart} day${daysUntilStart === 1 ? "" : "s"} to go` };
    if (today.dayNumber === start.dayNumber) return { kind:"active", label:"Trip starts today", text:"Trip time! 🌸", day:1 };
    if (today.dayNumber <= end.dayNumber) return { kind:"active", label:"Trip in progress", text:"You’re on your trip 🌸", day:today.dayNumber - start.dayNumber + 1 };
    return { kind:"completed", label:"Completed trip", text:"Trip completed 🌸" };
}

function renderTravelHeaderCountdown() {
    const label = document.getElementById("travel-header-countdown-label");
    const button = document.getElementById("travel-header-countdown");
    if (!label || !button) return;
    const state = getTravelCountdownState();
    button.dataset.countdownState = state?.kind || "empty";
    if (!state) label.textContent = "Set trip →";
    else if (state.kind === "upcoming") {
        const days = parseCalendarDate(travelCountdown.startDate).dayNumber - localCalendarDay().dayNumber;
        label.textContent = `🌸 ${days} day${days === 1 ? "" : "s"}`;
    }
    else if (state.kind === "active" && state.day === 1) label.textContent = "✈️ Today";
    else if (state.kind === "active") label.textContent = `✈️ Day ${state.day}`;
    else label.textContent = "Trip complete";
}

function formatTravelCalendarDate(date, includeYear = true) {
    return new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric", ...(includeYear ? { year:"numeric" } : {}) }).format(new Date(date.year, date.month - 1, date.day, 12));
}

function formatTravelCountdownDates(record = travelCountdown) {
    const start = parseCalendarDate(record?.startDate);
    const end = parseCalendarDate(record?.endDate);
    if (!start) return "";
    if (!end || start.dayNumber === end.dayNumber) return formatTravelCalendarDate(start);
    if (start.year === end.year) return `${formatTravelCalendarDate(start, false)} – ${formatTravelCalendarDate(end)}`;
    return `${formatTravelCalendarDate(start)} – ${formatTravelCalendarDate(end)}`;
}

function renderTravelCountdown() {
    renderTravelHeaderCountdown();
    const empty = document.getElementById("travel-countdown-empty");
    if (!empty) return;
    const detail = document.getElementById("travel-countdown-card");
    const summary = document.getElementById("travel-countdown-card-summary");
    const state = getTravelCountdownState();
    const hasCountdown = Boolean(travelCountdown && state);
    empty.hidden = hasCountdown;
    detail.hidden = !hasCountdown;
    if (!hasCountdown) {
        if (summary) summary.textContent = "Plan your next adventure.";
        return;
    }
    const tripName = String(travelCountdown.tripName || "").trim() || "Japan Trip";
    document.getElementById("travel-countdown-status-label").textContent = state.label;
    document.getElementById("travel-countdown-trip-name").textContent = tripName;
    document.getElementById("travel-countdown-status").textContent = state.text;
    document.getElementById("travel-countdown-dates").textContent = formatTravelCountdownDates();
    detail.dataset.countdownState = state.kind;
    if (summary) summary.textContent = `${tripName} · ${state.text}`;
}

function renderTravelModeNavigation() {
    const nav = document.getElementById("dynamic-fourth-nav");
    const toggle = document.getElementById("travel-mode-toggle");
    if (toggle) toggle.checked = travelModeEnabled;
    if (!nav) return;
    nav.dataset.route = travelModeEnabled ? "travel" : "practice";
    nav.querySelector("span").textContent = travelModeEnabled ? "✈" : "✿";
    nav.querySelector("small").textContent = travelModeEnabled ? "Travel" : "Practice";
    nav.setAttribute("aria-label", travelModeEnabled ? "Travel" : "Practice");
}

function markNavigationModeOnboardingSeen() {
    navigationModeOnboardingSeen = true;
    localStorage.setItem(STORAGE.navigationModeOnboarding, NAVIGATION_MODE_ONBOARDING_VERSION);
}

function openNavigationModeChooser() {
    const dialog = document.getElementById("navigation-mode-dialog");
    if (!dialog || typeof dialog.showModal !== "function") {
        // Safe fallback: remain in Sakura's default Practice Mode.
        markNavigationModeOnboardingSeen();
        setTravelModeEnabled(false);
        showRoute("practice");
        return;
    }
    if (!dialog.open) dialog.showModal();
}

function chooseNavigationMode(mode) {
    const useTravel = mode === "travel";
    markNavigationModeOnboardingSeen();
    setTravelModeEnabled(useTravel);
    const dialog = document.getElementById("navigation-mode-dialog");
    if (dialog?.open) dialog.close();
    showRoute(useTravel ? "travel" : "practice");
}

function setTravelModeEnabled(enabled) {
    travelModeEnabled = Boolean(enabled);
    localStorage.setItem(STORAGE.travelModeEnabled, String(travelModeEnabled));
    renderTravelModeNavigation();
    if (!travelModeEnabled && (currentRoute === "travel" || currentRoute.startsWith("travel-"))) showRoute("practice");
}

function openTravelCountdownEditor() {
    document.getElementById("travel-countdown-editor-heading").textContent = travelCountdown ? "Edit Your Trip" : "Set Your Trip";
    document.getElementById("travel-countdown-name").value = travelCountdown?.tripName || "";
    document.getElementById("travel-countdown-start").value = travelCountdown?.startDate || "";
    document.getElementById("travel-countdown-end").value = travelCountdown?.endDate || "";
    document.getElementById("travel-countdown-form-message").textContent = "";
    document.getElementById("travel-countdown-editor").showModal();
}

function saveTravelCountdown(event) {
    event.preventDefault();
    const message = document.getElementById("travel-countdown-form-message");
    const tripName = document.getElementById("travel-countdown-name").value.normalize("NFKC").trim();
    const startDate = document.getElementById("travel-countdown-start").value;
    const endDate = document.getElementById("travel-countdown-end").value;
    const start = parseCalendarDate(startDate);
    const end = endDate ? parseCalendarDate(endDate) : null;
    if (!start) { message.textContent = "Choose a valid start date."; return; }
    if (endDate && !end) { message.textContent = "Choose a valid end date."; return; }
    if (end && end.dayNumber < start.dayNumber) { message.textContent = "The end date cannot be before the start date."; return; }
    const now = new Date().toISOString();
    travelCountdown = { tripName, startDate, endDate, createdAt:travelCountdown?.createdAt || now, updatedAt:now };
    writeJson(STORAGE.travelCountdown, travelCountdown);
    document.getElementById("travel-countdown-editor").close();
    renderTravelCountdown();
}

function removeTravelCountdown() {
    if (!travelCountdown || !window.confirm("Remove this travel countdown?")) return;
    travelCountdown = null;
    localStorage.removeItem(STORAGE.travelCountdown);
    renderTravelCountdown();
}

function travelOfflineCategories() {
    return Object.keys(window.TRAVEL_CATEGORIES || {});
}

function travelOfflineAssetUrl(category) {
    const asset = window.SakuraTravelLoader?.getTravelCategoryAsset?.(category);
    if (!asset) throw new Error(`Travel asset information is unavailable for ${category}.`);
    return new URL(asset, document.baseURI).href;
}

async function inspectTravelOfflineCache() {
    const categories = travelOfflineCategories();
    if (!window.caches) return { supported:false, ready:[], missing:[...categories] };
    const cache = await caches.open(TRAVEL_OFFLINE_CACHE);
    const checks = await Promise.all(categories.map(async category => [category, Boolean(await cache.match(travelOfflineAssetUrl(category)))]));
    return {
        supported:true,
        ready:checks.filter(([, isReady]) => isReady).map(([category]) => category),
        missing:checks.filter(([, isReady]) => !isReady).map(([category]) => category)
    };
}

function formatTravelOfflineTimestamp(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { dateStyle:"medium", timeStyle:"short" }).format(date);
}

function renderTravelOfflinePack() {
    const card = document.getElementById("travel-offline-card");
    if (!card) return;
    const categories = travelOfflineCategories();
    const total = categories.length || 7;
    const readyCount = travelOfflinePackState.ready.length;
    const status = travelOfflinePackState.status;
    const configurations = {
        checking:["Checking availability", "Checking your Travel Pack…", "Sakura is checking which phrases are ready offline.", "🌸"],
        unavailable:["Unavailable", "Offline downloads aren't available", "Sakura can still load Travel phrases normally while you are online.", "!"],
        empty:["Not downloaded", "Prepare for your trip", "Download all 720 Travel phrases before you leave.", "⇩"],
        downloading:["Downloading", "Downloading Travel Pack…", `${readyCount} of ${total} categories are ready.`, "⇩"],
        partial:["Incomplete", "Travel Pack is partly ready", `${readyCount} of ${total} categories are available offline. Retry the remaining categories.`, "!"],
        error:["Download interrupted", "Travel Pack couldn't be completed", "Your completed downloads were kept. Try again when you have a connection.", "!"],
        ready:["Ready Offline", "Your Travel Pack is ready", "All 720 Travel phrases are prepared for your trip.", "✓"]
    };
    const configuration = configurations[status] || configurations.empty;
    document.getElementById("travel-offline-label").textContent = configuration[0];
    document.getElementById("travel-offline-status").textContent = configuration[1];
    document.getElementById("travel-offline-description").textContent = configuration[2];
    document.getElementById("travel-offline-icon").textContent = configuration[3];
    document.getElementById("travel-offline-progress-text").textContent = `${readyCount} of ${total} categories ready`;
    const progress = card.querySelector("[role='progressbar']");
    progress.setAttribute("aria-valuemax", String(total));
    progress.setAttribute("aria-valuenow", String(readyCount));
    document.getElementById("travel-offline-progress-bar").style.width = `${total ? (readyCount / total) * 100 : 0}%`;
    card.dataset.offlineState = status;
    const action = document.getElementById("travel-offline-action");
    action.disabled = status === "checking" || status === "downloading" || status === "unavailable";
    action.textContent = status === "ready" ? "Refresh Travel Pack" : readyCount ? "Retry Remaining" : "Download Travel Pack";
    document.getElementById("remove-travel-offline-pack").hidden = readyCount === 0 || status === "downloading";
    const completed = formatTravelOfflineTimestamp(travelOfflinePackMetadata?.lastCompletedAt);
    document.getElementById("travel-offline-last-updated").textContent = completed ? `Last completed ${completed}` : "";
    const summary = document.getElementById("travel-offline-card-summary");
    if (summary) summary.textContent = status === "ready" ? "All 720 phrases are ready offline." : readyCount ? `${readyCount} of ${total} categories ready.` : "Prepare all 720 phrases for your trip.";
}

function saveTravelOfflineMetadata(ready, completed = false, updateCompletion = false) {
    const now = new Date().toISOString();
    travelOfflinePackMetadata = {
        version:TRAVEL_OFFLINE_PACK_VERSION,
        categories:[...ready],
        lastCheckedAt:now,
        lastCompletedAt:completed ? (updateCompletion ? now : travelOfflinePackMetadata?.lastCompletedAt || now) : travelOfflinePackMetadata?.lastCompletedAt || null
    };
    writeJson(STORAGE.travelOfflinePack, travelOfflinePackMetadata);
}

async function verifyTravelOfflinePack() {
    if (travelOfflinePackOperation) return travelOfflinePackOperation;
    travelOfflinePackState = { status:"checking", ready:[], failed:[], processed:0 };
    renderTravelOfflinePack();
    try {
        const inspection = await inspectTravelOfflineCache();
        if (!inspection.supported) travelOfflinePackState = { status:"unavailable", ready:[], failed:[], processed:0 };
        else {
            const status = inspection.ready.length === travelOfflineCategories().length ? "ready" : inspection.ready.length ? "partial" : "empty";
            travelOfflinePackState = { status, ready:inspection.ready, failed:inspection.missing, processed:0 };
            saveTravelOfflineMetadata(inspection.ready, status === "ready");
        }
    }
    catch (error) {
        console.warn("Offline Travel Pack: cache availability could not be checked.", error);
        travelOfflinePackState = { status:"unavailable", ready:[], failed:[], processed:0 };
    }
    renderTravelOfflinePack();
}

async function downloadTravelOfflinePack(refresh = false) {
    if (travelOfflinePackOperation) return travelOfflinePackOperation;
    travelOfflinePackOperation = (async () => {
        const loader = window.SakuraTravelLoader;
        const message = document.getElementById("travel-offline-message");
        message.textContent = "";
        let inspection;
        try { inspection = await inspectTravelOfflineCache(); }
        catch (error) { inspection = { supported:false, ready:[], missing:travelOfflineCategories() }; }
        if (!inspection.supported || !loader?.refreshTravelCategory) {
            travelOfflinePackState = { status:"unavailable", ready:[], failed:inspection.missing, processed:0 };
            renderTravelOfflinePack();
            return;
        }
        const categories = travelOfflineCategories();
        const pending = refresh ? categories : inspection.missing;
        const ready = new Set(inspection.ready);
        const failed = [];
        travelOfflinePackState = { status:"downloading", ready:[...ready], failed:[], processed:0 };
        renderTravelOfflinePack();
        for (const category of pending) {
            try {
                await loader.refreshTravelCategory(category);
                const cache = await caches.open(TRAVEL_OFFLINE_CACHE);
                if (!await cache.match(travelOfflineAssetUrl(category))) throw new Error("The downloaded response was not saved for offline use.");
                ready.add(category);
            }
            catch (error) {
                failed.push(category);
                console.warn(`Offline Travel Pack: ${category} could not be prepared.`, error);
            }
            travelOfflinePackState = { status:"downloading", ready:[...ready], failed:[...failed], processed:travelOfflinePackState.processed + 1 };
            renderTravelOfflinePack();
        }
        const finalInspection = await inspectTravelOfflineCache();
        const complete = finalInspection.ready.length === categories.length;
        travelOfflinePackState = { status:complete ? "ready" : finalInspection.ready.length ? "partial" : "error", ready:finalInspection.ready, failed:finalInspection.missing, processed:pending.length };
        saveTravelOfflineMetadata(finalInspection.ready, complete, complete);
        invalidateSearchIndex();
        message.textContent = complete ? "Travel Pack download complete." : "Some categories could not be downloaded. Your completed categories were kept.";
        renderTravelOfflinePack();
    })().catch(error => {
        console.warn("Offline Travel Pack: download failed.", error);
        travelOfflinePackState.status = travelOfflinePackState.ready.length ? "partial" : "error";
        document.getElementById("travel-offline-message").textContent = "The download was interrupted. Try again when you have a connection.";
        renderTravelOfflinePack();
    }).finally(() => { travelOfflinePackOperation = null; });
    return travelOfflinePackOperation;
}

async function removeTravelOfflinePack() {
    if (travelOfflinePackOperation || !window.confirm("Remove the downloaded Travel Pack? Your saved phrases, decks, notes, pins, and countdown will stay safe.")) return;
    const message = document.getElementById("travel-offline-message");
    try {
        if (!window.caches) throw new Error("Offline storage is unavailable.");
        const categories = travelOfflineCategories();
        const cache = await caches.open(TRAVEL_OFFLINE_CACHE);
        await Promise.all(categories.map(category => cache.delete(travelOfflineAssetUrl(category))));
        window.SakuraTravelLoader?.forgetTravelCategories?.(categories);
        travelSearchPreparation = null;
        invalidateSearchIndex();
        localStorage.removeItem(STORAGE.travelOfflinePack);
        travelOfflinePackMetadata = null;
        travelOfflinePackState = { status:"empty", ready:[], failed:[...categories], processed:0 };
        message.textContent = "Offline Travel Pack removed. Your saved Travel items and trip tools were not changed.";
    }
    catch (error) {
        console.warn("Offline Travel Pack: removal failed.", error);
        message.textContent = "Sakura couldn't remove the downloaded pack. Please try again.";
    }
    renderTravelOfflinePack();
}

function parseCurrencyExpression(expression) {
    const source = String(expression || "");
    if (!source.trim()) return { status:"empty", value:null, message:"" };
    if (source.length > 200) return { status:"invalid", value:null, message:"Keep the calculation under 200 characters." };
    if (/[^0-9.+\-*/()\s]/.test(source)) return { status:"invalid", value:null, message:"Use only numbers and the arithmetic controls." };
    const tokens = [];
    let position = 0;
    while (position < source.length) {
        const character = source[position];
        if (/\s/.test(character)) { position += 1; continue; }
        if (/[+\-*/()]/.test(character)) { tokens.push({ type:character }); position += 1; continue; }
        const numberMatch = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
        if (!numberMatch) return { status:"invalid", value:null, message:"Check the number or operator near the end." };
        const value = Number(numberMatch[0]);
        if (!Number.isFinite(value)) return { status:"invalid", value:null, message:"That number is too large." };
        tokens.push({ type:"number", value });
        position += numberMatch[0].length;
    }
    let index = 0;
    const fail = (message, incomplete = false) => { const error = new Error(message); error.incomplete = incomplete; throw error; };
    const bounded = value => {
        if (!Number.isFinite(value) || Math.abs(value) > 1e12) fail("That result is too large.");
        return value;
    };
    const parseFactor = () => {
        const token = tokens[index];
        if (!token) fail("Keep typing to finish the calculation.", true);
        if (token.type === "+" || token.type === "-") { index += 1; const value = parseFactor(); return token.type === "-" ? -value : value; }
        if (token.type === "number") { index += 1; return token.value; }
        if (token.type === "(") {
            index += 1;
            if (tokens[index]?.type === ")") fail("Parentheses need a calculation inside them.");
            const value = parseExpression();
            if (!tokens[index]) fail("Add a closing parenthesis.", true);
            if (tokens[index].type !== ")") fail("Check the parentheses in this calculation.");
            index += 1;
            return value;
        }
        fail("Check the number or operator near the end.");
    };
    const parseTerm = () => {
        let value = parseFactor();
        while (["*", "/"].includes(tokens[index]?.type)) {
            const operator = tokens[index++].type;
            const right = parseFactor();
            if (operator === "/" && right === 0) fail("Division by zero isn't allowed.");
            value = bounded(operator === "*" ? value * right : value / right);
        }
        return value;
    };
    const parseExpression = () => {
        let value = parseTerm();
        while (["+", "-"].includes(tokens[index]?.type)) {
            const operator = tokens[index++].type;
            const right = parseTerm();
            value = bounded(operator === "+" ? value + right : value - right);
        }
        return value;
    };
    try {
        const value = bounded(parseExpression());
        if (index !== tokens.length) fail("Check the order of the numbers and operators.");
        return { status:"valid", value, message:"" };
    }
    catch (error) {
        return { status:error.incomplete ? "incomplete" : "invalid", value:null, message:error.incomplete ? "" : error.message || "Check this calculation." };
    }
}

function formatYenCurrency(value, currency, converted = false) {
    if (!Number.isFinite(value)) return "—";
    const fractionDigits = currency === "PHP" ? 2 : converted || Number.isInteger(value) ? 0 : 2;
    return new Intl.NumberFormat("en-US", { style:"currency", currency, currencyDisplay:"narrowSymbol", minimumFractionDigits:fractionDigits, maximumFractionDigits:fractionDigits }).format(value);
}

function convertYenCurrency(value, fromCurrency, toCurrency) {
    const rate = Number(yenConverterSettings?.phpPerJpy);
    if (!Number.isFinite(value) || !Number.isFinite(rate) || rate <= 0 || fromCurrency === toCurrency) return null;
    const converted = fromCurrency === "JPY" ? value * rate : value / rate;
    return Number.isFinite(converted) && Math.abs(converted) <= 1e12 ? converted : null;
}

function renderYenConverter() {
    const view = document.getElementById("travel-yen-view");
    if (!view) return;
    const activeSide = yenConverterState.activeSide;
    const inactiveSide = activeSide === "top" ? "bottom" : "top";
    const result = parseCurrencyExpression(yenConverterState.expressions[activeSide]);
    const sourceCurrency = yenConverterState.currencies[activeSide];
    const destinationCurrency = yenConverterState.currencies[inactiveSide];
    const convertedValue = result.status === "valid" ? convertYenCurrency(result.value, sourceCurrency, destinationCurrency) : null;
    for (const side of ["top", "bottom"]) {
        const currency = yenConverterState.currencies[side];
        const active = side === activeSide;
        const panel = document.getElementById(`yen-panel-${side}`);
        panel.classList.toggle("active", active);
        document.getElementById(`yen-${side}-mode`).textContent = active ? "Editing" : "Converted";
        document.getElementById(`yen-${side}-currency`).value = currency;
        document.getElementById(`yen-${side}-symbol`).textContent = YEN_CURRENCIES[currency].symbol;
        const input = document.getElementById(`yen-${side}-expression`);
        if (input.value !== yenConverterState.expressions[side]) input.value = yenConverterState.expressions[side];
        input.placeholder = active ? "Enter an amount or calculation" : `Tap to calculate from ${currency}`;
        document.getElementById(`yen-${side}-total-label`).textContent = active ? "Evaluated total" : "Converted amount";
        document.getElementById(`yen-${side}-total`).textContent = active
            ? result.status === "valid" ? formatYenCurrency(result.value, currency) : "—"
            : convertedValue !== null ? formatYenCurrency(convertedValue, currency, true) : result.status === "valid" && !yenConverterSettings ? "Set rate" : "—";
        document.getElementById(`yen-${side}-message`).textContent = active && result.status === "invalid" ? result.message : "";
        input.setAttribute("aria-invalid", String(active && result.status === "invalid"));
    }
    const rate = Number(yenConverterSettings?.phpPerJpy);
    const hasRate = Number.isFinite(rate) && rate > 0;
    document.getElementById("yen-rate-display").textContent = hasRate ? `¥1 = ₱${new Intl.NumberFormat("en-US", { minimumFractionDigits:2, maximumFractionDigits:6 }).format(rate)}` : "Set exchange rate";
    document.getElementById("yen-rate-helper").textContent = hasRate ? `Saved manually${yenConverterSettings.updatedAt ? ` · ${new Intl.DateTimeFormat(undefined, { dateStyle:"medium" }).format(new Date(yenConverterSettings.updatedAt))}` : ""}` : "Enter how many Philippine pesos equal ¥1.";
    document.getElementById("edit-yen-rate").textContent = hasRate ? "Edit Rate" : "Set Rate";
}

function activateYenSide(side, focus = false) {
    if (!['top', 'bottom'].includes(side)) return;
    if (yenConverterState.activeSide !== side) {
        const other = side === "top" ? "bottom" : "top";
        yenConverterState.activeSide = side;
        yenConverterState.expressions[other] = "";
        renderYenConverter();
    }
    if (focus) document.getElementById(`yen-${side}-expression`).focus();
}

function setYenCurrency(side, currency) {
    if (!YEN_CURRENCIES[currency]) return;
    const other = side === "top" ? "bottom" : "top";
    yenConverterState.currencies[side] = currency;
    yenConverterState.currencies[other] = currency === "JPY" ? "PHP" : "JPY";
    renderYenConverter();
}

function editYenExpression(side, value) {
    activateYenSide(side);
    yenConverterState.expressions[side] = String(value || "");
    renderYenConverter();
}

function insertYenKey(side, key) {
    activateYenSide(side);
    const input = document.getElementById(`yen-${side}-expression`);
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    let before = input.value.slice(0, start);
    let after = input.value.slice(end);
    let insertion = key;
    if (key === "backspace") {
        if (start !== end) before = input.value.slice(0, start);
        else {
            before = before.replace(/\s+$/, "");
            if (/[+\-*/]$/.test(before)) before = before.slice(0, -1).replace(/\s+$/, "");
            else before = before.slice(0, -1);
        }
        insertion = "";
    }
    else if (["+", "-", "*", "/"].includes(key)) insertion = ` ${key} `;
    const nextValue = `${before}${insertion}${after}`.slice(0, 200);
    yenConverterState.expressions[side] = nextValue;
    renderYenConverter();
    input.focus();
    const caret = Math.min(before.length + insertion.length, nextValue.length);
    input.setSelectionRange(caret, caret);
}

function clearYenExpression(side) {
    activateYenSide(side);
    yenConverterState.expressions.top = "";
    yenConverterState.expressions.bottom = "";
    renderYenConverter();
    document.getElementById(`yen-${side}-expression`).focus();
}

function swapYenCurrencies() {
    const { top, bottom } = yenConverterState.currencies;
    yenConverterState.currencies = { top:bottom, bottom:top };
    const topExpression = yenConverterState.expressions.top;
    yenConverterState.expressions.top = yenConverterState.expressions.bottom;
    yenConverterState.expressions.bottom = topExpression;
    yenConverterState.activeSide = yenConverterState.activeSide === "top" ? "bottom" : "top";
    renderYenConverter();
}

function openYenRateEditor() {
    document.getElementById("yen-rate-input").value = yenConverterSettings?.phpPerJpy || "";
    document.getElementById("yen-rate-message").textContent = "";
    document.getElementById("yen-rate-editor").showModal();
}

function saveYenRate(event) {
    event.preventDefault();
    const rawValue = document.getElementById("yen-rate-input").value.trim();
    const message = document.getElementById("yen-rate-message");
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(rawValue)) { message.textContent = "Enter a valid positive number, such as 0.38."; return; }
    const phpPerJpy = Number(rawValue);
    if (!Number.isFinite(phpPerJpy) || phpPerJpy <= 0) { message.textContent = "The exchange rate must be greater than zero."; return; }
    yenConverterSettings = { phpPerJpy, updatedAt:new Date().toISOString(), source:"manual" };
    writeJson(STORAGE.yenConverter, yenConverterSettings);
    document.getElementById("yen-rate-editor").close();
    renderYenConverter();
}

function flashcardBack(item) {
    return [item.kana || item.reading, item.romaji, item.meaning || item.english, item.onyomi?.length ? `On: ${item.onyomi.join(", ")}` : "", item.kunyomi?.length ? `Kun: ${item.kunyomi.join(", ")}` : "", item.jlpt || item.difficulty || item.category, item.exampleSentence, item.exampleTranslation, item.naturalUsage, item.formality ? `Formality: ${item.formality}` : "", item.notes].filter(Boolean).join("\n");
}

function selectedFlashcardLevels() {
    return [...document.querySelectorAll("#flashcard-levels input:checked")].map(input => input.value);
}

function buildFlashcardDeck() {
    if (!document.getElementById("deck-type-filter")) return;
    const type = document.getElementById("deck-type-filter").value;
    const reviewOnly = document.getElementById("review-only-filter").checked;
    const levels = selectedFlashcardLevels();
    flashcardDeck = filteredFlashcardKeys
        ? savedItems.filter(item => filteredFlashcardKeys.has(itemKey(item)))
        : savedItems.filter(item => (type === "all" || item.type === type) && (!item.jlpt || levels.includes(item.jlpt)) && (!reviewOnly || flashcardStatuses[itemKey(item)] === "review"));
    flashcardIndex = 0;
    flashcardRevealed = false;
    renderFlashcard();
}

function renderFlashcard() {
    const item = flashcardDeck[flashcardIndex];
    document.getElementById("flashcard-progress").textContent = item ? `Card ${flashcardIndex + 1} of ${flashcardDeck.length}` : "Card 0 of 0";
    document.getElementById("flashcard-front").textContent = item ? itemTitle(item) : "No matching saved items";
    document.getElementById("flashcard-back").textContent = item ? flashcardBack(item) : "";
    document.getElementById("flashcard-back").hidden = !flashcardRevealed;
    document.getElementById("flashcard-side-label").textContent = flashcardRevealed ? "Answer" : "Front";
    document.getElementById("flashcard").classList.toggle("revealed", flashcardRevealed);
    document.getElementById("flashcard-empty").hidden = Boolean(item);
    const status = item ? flashcardStatuses[itemKey(item)] : "";
    document.getElementById("known-flashcard").classList.toggle("selected", status === "known");
    document.getElementById("review-flashcard").classList.toggle("selected", status === "review");
}

function renderFlashcardLevels() {
    const container = document.getElementById("flashcard-levels");
    container.innerHTML = "";
    JLPT_LEVELS.forEach(level => container.appendChild(createLevelChip(level, true, resetFlashcardSourceAndBuild)));
}

function showSavedTab(name, preserveFilteredDeck = false) {
    document.querySelectorAll("[data-saved-tab]").forEach(button => button.classList.toggle("active", button.dataset.savedTab === name));
    document.querySelectorAll("[data-saved-panel]").forEach(panel => { panel.hidden = panel.dataset.savedPanel !== name; });
    if (name === "flashcards") {
        if (!preserveFilteredDeck) filteredFlashcardKeys = null;
        buildFlashcardDeck();
    }
    else renderSavedItems();
}

function startFilteredFlashcards() {
    filteredFlashcardKeys = new Set(filteredSavedItems().map(itemKey));
    showSavedTab("flashcards", true);
}

function resetFlashcardSourceAndBuild() {
    filteredFlashcardKeys = null;
    buildFlashcardDeck();
}

function shuffleDeck() {
    for (let index = flashcardDeck.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [flashcardDeck[index], flashcardDeck[randomIndex]] = [flashcardDeck[randomIndex], flashcardDeck[index]];
    }
    flashcardIndex = 0;
    flashcardRevealed = false;
    renderFlashcard();
}

function setFlashcardStatus(status) {
    const item = flashcardDeck[flashcardIndex];
    if (!item) return;
    flashcardStatuses[itemKey(item)] = status;
    writeJson(STORAGE.statuses, flashcardStatuses);
    renderFlashcard();
}

function renderTranslationChips() {
    const render = (id, values, selected, attribute) => {
        const container = document.getElementById(id);
        if (!container) return;
        container.innerHTML = values.map(value => `<button class="translation-chip ${value === selected ? "active" : ""}" type="button" data-${attribute}="${escapeSearchHtml(value)}">${escapeSearchHtml(value)}</button>`).join("");
    };
    render("translation-contexts", TRANSLATION_CONTEXTS, translationContext, "translation-context");
    render("translation-tones", TRANSLATION_TONES, translationTone, "translation-tone");
}

function translationSearchText(value) {
    return searchText(value)
        .replace(/[’‘]/g, "'")
        .replace(/[^a-z0-9'\-\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function translationSearchTokens(value) {
    const stopWords = new Set([
        "a","an","and","are","at","be","can","could","do","does","for","from","i","in","is","it","me","my",
        "of","on","please","the","this","to","we","with","would","you","your","am","was","were","have","has"
    ]);
    return translationSearchText(value)
        .split(" ")
        .map(word => word.trim())
        .filter(word => word.length > 1 && !stopWords.has(word));
}

function prepareTranslationPhraseIndex(records) {
    return records.map(record => ({
        record,
        english:translationSearchText(record.english),
        patterns:(record.patterns || []).map(translationSearchText),
        keywords:(record.keywords || []).map(translationSearchText).filter(Boolean),
        tokens:new Set(translationSearchTokens([
            record.english,
            ...(record.patterns || []),
            ...(record.keywords || [])
        ].join(" ")))
    }));
}

async function loadTranslationPhraseData() {
    if (translationPhraseData) return translationPhraseData;
    if (translationPhraseDataPromise) return translationPhraseDataPromise;

    translationPhraseDataPromise = fetch("./data/translation-phrases.json?v=1")
        .then(response => {
            if (!response.ok) throw new Error(`Could not load Sakura's offline phrase library (HTTP ${response.status}).`);
            return response.json();
        })
        .then(records => {
            if (!Array.isArray(records)) throw new Error("The offline phrase library has an invalid format.");

            const ids = new Set();
            records.forEach((record, index) => {
                if (!record || typeof record !== "object") throw new Error(`Offline phrase ${index + 1} is invalid.`);
                ["id","english","japanese","kana","romaji","naturalMeaning","tone","usageNote"].forEach(field => {
                    if (typeof record[field] !== "string" || !record[field].trim()) {
                        throw new Error(`Offline phrase ${index + 1} is missing ${field}.`);
                    }
                });
                if (ids.has(record.id)) throw new Error(`Duplicate offline phrase ID: ${record.id}`);
                ids.add(record.id);
            });

            translationPhraseData = records;
            translationPhraseIndex = prepareTranslationPhraseIndex(records);
            return records;
        })
        .catch(error => {
            translationPhraseDataPromise = null;
            throw error;
        });

    return translationPhraseDataPromise;
}

function scoreOfflineTranslationPhrase(indexed, english, context, tone) {
    const query = translationSearchText(english);
    const queryTokens = new Set(translationSearchTokens(english));
    if (!query || !queryTokens.size) return 0;

    let score = 0;

    if (indexed.english === query) score += 180;

    indexed.patterns.forEach(pattern => {
        if (!pattern) return;
        if (pattern === query) score += 160;
        else if (query.includes(pattern) || pattern.includes(query)) score += Math.min(90, 35 + pattern.length);
    });

    queryTokens.forEach(token => {
        if (indexed.tokens.has(token)) score += Math.min(18, 4 + token.length * 2);
        indexed.keywords.forEach(keyword => {
            if (!keyword) return;
            if (keyword === token) score += 10;
            else if (keyword.includes(token) || token.includes(keyword)) score += 4;
        });
    });

    if (indexed.record.contexts?.includes(context)) score += 24;
    if (indexed.record.tones?.includes(tone)) score += 14;
    if (indexed.record.tone === tone) score += 6;

    return score;
}

async function findOfflineTranslationPhrases(english) {
    await loadTranslationPhraseData();
    const ranked = translationPhraseIndex
        .map(indexed => ({
            record:indexed.record,
            score:scoreOfflineTranslationPhrase(indexed, english, translationContext, translationTone)
        }))
        .filter(result => result.score >= 18)
        .sort((a, b) => b.score - a.score || a.record.english.localeCompare(b.record.english))
        .slice(0, 5);

    return ranked;
}

function relatedLibraryPhrases(english) {
    const stopWords = new Set(["a","an","and","are","at","be","can","could","do","for","from","i","in","is","it","me","my","of","on","please","the","this","to","until","we","with","you","your"]);
    const queryWords = new Set(searchText(english).split(" ").map(word => word.replace(/[^\p{L}\p{N}'-]/gu, "")).filter(word => word.length > 2 && !stopWords.has(word)));
    if (!queryWords.size) return [];

    const vocabulary = Array.isArray(window.VOCABULARY_DATA) ? window.VOCABULARY_DATA : [];
    const seen = new Set();
    const pool = [...nativeData(), ...slangData(), ...vocabulary, ...savedItems]
        .filter(item => {
            const key = itemKey(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

    const ranked = pool
        .map(item => {
            const haystack = searchableFields(item).join(" ");
            let score = 0;
            queryWords.forEach(word => {
                if (haystack.includes(word)) score += word.length;
            });
            return { item, score };
        })
        .filter(result => result.score > 0)
        .sort((a,b) => b.score - a.score);

    const bestScore = ranked[0]?.score || 0;
    return ranked
        .filter(result => result.score >= bestScore * .75)
        .slice(0, 4)
        .map(result => result.item);
}



function normalizeTranslationJapanese(value) {
    return String(value || "")
        .normalize("NFKC")
        .replace(/[\u3000\t\r\n ]+/g, "")
        .trim();
}

function translationReadingSourceRecord(item) {
    if (!item || typeof item !== "object") return null;
    const japanese = cleanEntryText(item.japanese || item.expression || item.word || "");
    const kana = cleanEntryText(item.kana || item.reading || "");
    const romaji = cleanEntryText(item.romaji || (kana ? kanaToRomaji(kana) : ""));
    if (!japanese || (!kana && !romaji)) return null;
    return { japanese, kana, romaji };
}

function invalidateTranslationReadingCandidates() {
    translationReadingCandidatesCache = null;
    translationReadingCandidateMapCache = null;
    translationReadingCandidatePrefixCache = null;
    translationKanjiReadingMapCache = null;
}

async function ensureTranslationReadingSources() {
    if (translationReadingSourcePromise) return translationReadingSourcePromise;

    translationReadingSourcePromise = (async () => {
        const phrasePromise = loadTranslationPhraseData().catch(() => []);
        const vocabularyPromise = window.SakuraVocabularyLoader?.loadVocabularyLevels
            ? window.SakuraVocabularyLoader.loadVocabularyLevels(["N5", "N4"]).catch(() => [])
            : Promise.resolve([]);
        const kanjiPromise = window.SakuraKanjiLoader?.loadAllKanji
            ? window.SakuraKanjiLoader.loadAllKanji().catch(() => [])
            : Promise.resolve(Array.isArray(window.KANJI_DATA) ? window.KANJI_DATA : []);

        const [, vocabulary, kanji] = await Promise.all([phrasePromise, vocabularyPromise, kanjiPromise]);
        const loadedVocabulary = window.SakuraVocabularyLoader?.getLoadedVocabulary?.();
        translationReadingVocabulary = Array.isArray(loadedVocabulary) && loadedVocabulary.length
            ? loadedVocabulary
            : Array.isArray(vocabulary) ? vocabulary : [];
        translationReadingKanji = Array.isArray(kanji) ? kanji : [];
        invalidateTranslationReadingCandidates();
        return { vocabulary:translationReadingVocabulary, kanji:translationReadingKanji };
    })().catch(error => {
        translationReadingSourcePromise = null;
        throw error;
    });

    return translationReadingSourcePromise;
}

function translationReadingCandidates() {
    if (translationReadingCandidatesCache) return translationReadingCandidatesCache;

    const seen = new Set();
    const candidates = [];
    const add = item => {
        const record = translationReadingSourceRecord(item);
        if (!record) return;
        const key = normalizeTranslationJapanese(record.japanese);
        if (!key || seen.has(key)) return;
        seen.add(key);
        candidates.push({ ...record, key });
    };

    (translationPhraseData || []).forEach(add);
    translationReadingVocabulary.forEach(add);
    translationReadingKanji.forEach(item => {
        (Array.isArray(item?.examples) ? item.examples : []).forEach(example => add({
            word:example.word, reading:example.reading
        }));
        (Array.isArray(item?.commonWords) ? item.commonWords : []).forEach(word => add({
            word:word.word, reading:word.reading
        }));
    });
    nativeData().forEach(add);
    slangData().forEach(add);
    savedItems.forEach(add);
    translationHistory.forEach(item => add(item?.result));

    candidates.sort((left, right) => right.key.length - left.key.length);
    translationReadingCandidatesCache = candidates;
    return candidates;
}

function translationReadingCandidateMap() {
    if (translationReadingCandidateMapCache) return translationReadingCandidateMapCache;
    translationReadingCandidateMapCache = new Map(
        translationReadingCandidates().map(candidate => [candidate.key, candidate])
    );
    return translationReadingCandidateMapCache;
}

function translationReadingCandidatePrefixes() {
    if (translationReadingCandidatePrefixCache) return translationReadingCandidatePrefixCache;
    const grouped = new Map();
    translationReadingCandidates().forEach(candidate => {
        const first = candidate.key[0];
        if (!first) return;
        if (!grouped.has(first)) grouped.set(first, []);
        grouped.get(first).push(candidate);
    });
    translationReadingCandidatePrefixCache = grouped;
    return translationReadingCandidatePrefixCache;
}

function translationKanjiReadingMap() {
    if (translationKanjiReadingMapCache) return translationKanjiReadingMapCache;
    const map = new Map();
    translationReadingKanji.forEach(item => {
        const character = cleanEntryText(item?.character);
        const kana = cleanEntryText(item?.reading || item?.kunyomi?.[0] || item?.onyomi?.[0]);
        const romaji = cleanEntryText(item?.romaji || (kana ? kanaToRomaji(kana) : ""));
        if (character && (kana || romaji) && !map.has(character)) map.set(character, { kana, romaji });
    });
    translationKanjiReadingMapCache = map;
    return map;
}

function translationJapaneseSegments(value) {
    const text = String(value || "").normalize("NFKC");
    if (!text) return [];
    try {
        if (typeof Intl?.Segmenter === "function") {
            return [...new Intl.Segmenter("ja", { granularity:"word" }).segment(text)].map(item => item.segment);
        }
    }
    catch {}
    return [...text];
}

function isJapaneseKanaText(value) {
    return /^[\u3040-\u30ffー]+$/u.test(String(value || ""));
}

function isJapanesePunctuation(value) {
    return /^[\s。、！？「」『』（）［］【】・…〜ー,.!?()\[\]{}:;'"\-]+$/u.test(String(value || ""));
}

function formatGeneratedRomaji(parts) {
    return parts
        .filter(part => part !== "")
        .join(" ")
        .replace(/\s+([。、！？,.!?;:])/g, "$1")
        .replace(/([「『（［【(\[])\s+/g, "$1")
        .replace(/\s+([」』）］】)\]])/g, "$1")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function generateTranslationReading(japanese) {
    const text = cleanEntryText(japanese);
    if (!text) return null;

    const exactKey = normalizeTranslationJapanese(text);
    const candidateMap = translationReadingCandidateMap();
    const candidatePrefixes = translationReadingCandidatePrefixes();
    const exact = candidateMap.get(exactKey);
    if (exact?.romaji) {
        return { kana:exact.kana, romaji:exact.romaji, confidence:"library" };
    }

    const kanjiMap = translationKanjiReadingMap();
    const kanaParts = [];
    const romajiParts = [];
    let usedKanjiFallback = false;
    let unresolvedKanji = false;

    const resolveChunk = chunk => {
        const chunkKey = normalizeTranslationJapanese(chunk);
        if (!chunkKey) return;

        const direct = candidateMap.get(chunkKey);
        if (direct) {
            kanaParts.push(direct.kana || chunk);
            romajiParts.push(direct.romaji || kanaToRomaji(direct.kana || chunk));
            return;
        }

        if (isJapaneseKanaText(chunk)) {
            kanaParts.push(chunk);
            romajiParts.push(kanaToRomaji(chunk));
            return;
        }

        if (isJapanesePunctuation(chunk) || /^[\p{L}\p{N}]+$/u.test(chunk) && !/[\u3400-\u9fff]/u.test(chunk)) {
            kanaParts.push(chunk);
            romajiParts.push(chunk);
            return;
        }

        let index = 0;
        while (index < chunk.length) {
            const remaining = chunk.slice(index);
            const remainingKey = normalizeTranslationJapanese(remaining);
            const match = (candidatePrefixes.get(remainingKey[0]) || [])
                .find(candidate => candidate.key.length > 1 && remainingKey.startsWith(candidate.key));
            if (match && remaining.startsWith(match.japanese)) {
                kanaParts.push(match.kana || match.japanese);
                romajiParts.push(match.romaji || kanaToRomaji(match.kana || match.japanese));
                index += match.japanese.length;
                continue;
            }

            const character = chunk[index];
            if (isJapaneseKanaText(character)) {
                let end = index + 1;
                while (end < chunk.length && isJapaneseKanaText(chunk[end])) end += 1;
                const kanaRun = chunk.slice(index, end);
                kanaParts.push(kanaRun);
                romajiParts.push(kanaToRomaji(kanaRun));
                index = end;
                continue;
            }

            if (/[\u3400-\u9fff]/u.test(character)) {
                const reading = kanjiMap.get(character);
                if (reading) {
                    kanaParts.push(reading.kana || character);
                    romajiParts.push(reading.romaji || kanaToRomaji(reading.kana));
                    usedKanjiFallback = true;
                }
                else {
                    kanaParts.push(character);
                    unresolvedKanji = true;
                }
                index += 1;
                continue;
            }

            kanaParts.push(character);
            romajiParts.push(character);
            index += 1;
        }
    };

    translationJapaneseSegments(text).forEach(resolveChunk);
    const romaji = unresolvedKanji ? "" : formatGeneratedRomaji(romajiParts);
    if (!romaji) return null;

    return {
        kana:kanaParts.join(" ").replace(/\s+([。、！？,.!?])/g, "$1").replace(/\s{2,}/g, " ").trim(),
        romaji,
        confidence:usedKanjiFallback ? "approximate" : "generated"
    };
}

async function enrichOnlineTranslationReading(result) {
    if (!result || !String(result.source || "").startsWith("online") || result.romaji) return result;
    await ensureTranslationReadingSources();
    let reading = generateTranslationReading(result.japanese);

    // N3 is the only large extra vocabulary pack. Load it only when the fast
    // beginner/common pass cannot produce a reliable contextual reading.
    if ((!reading?.romaji || reading.confidence === "approximate") && window.SakuraVocabularyLoader?.loadVocabularyLevel) {
        const loadedLevels = new Set(window.SakuraVocabularyLoader.getLoadedVocabularyLevels?.() || []);
        if (!loadedLevels.has("N3")) {
            try {
                await window.SakuraVocabularyLoader.loadVocabularyLevel("N3");
                translationReadingVocabulary = window.SakuraVocabularyLoader.getLoadedVocabulary?.() || translationReadingVocabulary;
                invalidateTranslationReadingCandidates();
                const upgraded = generateTranslationReading(result.japanese);
                if (upgraded?.romaji && upgraded.confidence !== "approximate") reading = upgraded;
                else if (!reading?.romaji && upgraded?.romaji) reading = upgraded;
            }
            catch (error) {
                console.info("Romaji enrichment: N3 vocabulary remained unavailable; keeping the lighter reading pass.", error);
            }
        }
    }

    if (!reading?.romaji) return result;
    Object.assign(result, {
        kana:reading.kana || result.kana || "",
        romaji:reading.romaji,
        readingConfidence:reading.confidence
    });
    translationOnlineCache.set(result.cacheKey || onlineTranslationCacheKey({ english:result.naturalMeaning, context:result.context, tone:result.tone }), result);
    return result;
}

function onlineTranslationByteLength(value) {
    try {
        return new TextEncoder().encode(String(value || "")).length;
    }
    catch {
        return unescape(encodeURIComponent(String(value || ""))).length;
    }
}

function onlineTranslationCacheKey(requestOrEnglish) {
    const request = typeof requestOrEnglish === "object" && requestOrEnglish
        ? requestOrEnglish
        : { english:requestOrEnglish, context:translationContext, tone:translationTone };
    const english = translationSearchText(request.english);
    const context = searchText(request.context || translationContext);
    const tone = searchText(request.tone || translationTone);
    return [english, context, tone].join("|");
}

function cachedOnlineTranslation(requestOrEnglish) {
    const key = onlineTranslationCacheKey(requestOrEnglish);
    if (!key) return null;

    const memory = translationOnlineCache.get(key);
    if (memory) return { ...memory, cached:true };

    const history = translationHistory.find(item =>
        item?.mode === "online" &&
        onlineTranslationCacheKey(item) === key &&
        item?.result?.japanese &&
        String(item.result.source || "").startsWith("online") &&
        item.result.naturalizerVersion === 2
    );

    if (history?.result) {
        translationOnlineCache.set(key, history.result);
        return { ...history.result, cacheKey:key, cached:true };
    }

    return null;
}

/* =====================================================
   Natural online translation layer
   Sakura prefers neutral, spoken Japanese for common English phrases before
   falling back to raw machine translation. Tone/context remain user-selected.
===================================================== */
const SAKURA_NATURAL_TRANSLATIONS = Object.freeze({
    "what are you doing here": {
        polite:["ここで何してるんですか？","ここで なに してるんですか？","koko de nani shiterun desu ka?","ここで何してるの？ / ここで何してる？"],
        casual:["ここで何してるの？","ここで なに してるの？","koko de nani shiteru no?","ここで何してる？ / ここで何してるんですか？"],
        veryPolite:["こちらで何をされているんですか？","こちらで なにを されているんですか？","kochira de nani o sarete irun desu ka?","ここで何してるんですか？"],
        friendly:["ここで何してるの？","ここで なに してるの？","koko de nani shiteru no?","ここで何してる？"],
        social:["ここで何してる？","ここで なに してる？","koko de nani shiteru?","ここで何してるの？"]
    },
    "what are you doing": {
        polite:["何してるんですか？","なに してるんですか？","nani shiterun desu ka?","何してるの？ / 何してますか？"],
        casual:["何してるの？","なに してるの？","nani shiteru no?","何してる？"],
        veryPolite:["何をされているんですか？","なにを されているんですか？","nani o sarete irun desu ka?","何してるんですか？"],
        friendly:["何してるの？","なに してるの？","nani shiteru no?","何してる？"],
        social:["何してる？","なに してる？","nani shiteru?","何してるの？"]
    },
    "where are you": {
        polite:["今どこにいるんですか？","いま どこに いるんですか？","ima doko ni irun desu ka?","今どこですか？ / 今どこ？"],
        casual:["今どこ？","いま どこ？","ima doko?","今どこにいるの？"],
        veryPolite:["今どちらにいらっしゃいますか？","いま どちらに いらっしゃいますか？","ima dochira ni irasshaimasu ka?","今どこにいるんですか？"],
        friendly:["今どこにいるの？","いま どこに いるの？","ima doko ni iru no?","今どこ？"],
        social:["今どこ？","いま どこ？","ima doko?","どこいる？"]
    },
    "where are you going": {
        polite:["どこに行くんですか？","どこに いくんですか？","doko ni ikun desu ka?","どこ行くんですか？ / どこ行くの？"],
        casual:["どこ行くの？","どこ いくの？","doko iku no?","どこ行く？"],
        veryPolite:["どちらへ行かれるんですか？","どちらへ いかれるんですか？","dochira e ikarerun desu ka?","どこに行くんですか？"],
        friendly:["どこ行くの？","どこ いくの？","doko iku no?","どこ行く？"],
        social:["どこ行く？","どこ いく？","doko iku?","どこ行くの？"]
    },
    "what happened": {
        polite:["どうしたんですか？","どうしたんですか？","doushitan desu ka?","何かあったんですか？ / どうしたの？"],
        casual:["どうしたの？","どうしたの？","doushita no?","何かあった？ / どうした？"],
        veryPolite:["どうされましたか？","どう されましたか？","dou saremashita ka?","何かありましたか？"],
        friendly:["どうしたの？","どうしたの？","doushita no?","何かあった？"],
        social:["どうした？","どうした？","doushita?","何かあった？"]
    },
    "are you okay": {
        polite:["大丈夫ですか？","だいじょうぶですか？","daijoubu desu ka?","大丈夫？"],
        casual:["大丈夫？","だいじょうぶ？","daijoubu?","平気？"],
        veryPolite:["大丈夫ですか？","だいじょうぶですか？","daijoubu desu ka?","お加減はいかがですか？"],
        friendly:["大丈夫？","だいじょうぶ？","daijoubu?","平気？"],
        social:["大丈夫？","だいじょうぶ？","daijoubu?","平気？"]
    },
    "what do you mean": {
        polite:["どういう意味ですか？","どういう いみですか？","dou iu imi desu ka?","どういうことですか？"],
        casual:["どういう意味？","どういう いみ？","dou iu imi?","どういうこと？"],
        veryPolite:["どういう意味でしょうか？","どういう いみでしょうか？","dou iu imi deshou ka?","どういうことでしょうか？"],
        friendly:["どういう意味？","どういう いみ？","dou iu imi?","どういうこと？"],
        social:["どういう意味？","どういう いみ？","dou iu imi?","どういうこと？"]
    },
    "can you help me": {
        polite:["手伝ってもらえますか？","てつだって もらえますか？","tetsudatte moraemasu ka?","手伝ってくれますか？"],
        casual:["手伝ってくれる？","てつだって くれる？","tetsudatte kureru?","ちょっと手伝って。"],
        veryPolite:["手伝っていただけますか？","てつだって いただけますか？","tetsudatte itadakemasu ka?","お手伝いいただけますか？"],
        friendly:["手伝ってくれる？","てつだって くれる？","tetsudatte kureru?","ちょっと手伝って。"],
        social:["手伝ってくれる？","てつだって くれる？","tetsudatte kureru?","ちょっと手伝って！"]
    },
    "can you say that again": {
        polite:["もう一回言ってもらえますか？","もう いっかい いって もらえますか？","mou ikkai itte moraemasu ka?","もう一度言ってもらえますか？"],
        casual:["もう一回言って。","もう いっかい いって。","mou ikkai itte.","もう一回言ってくれる？"],
        veryPolite:["もう一度言っていただけますか？","もう いちど いって いただけますか？","mou ichido itte itadakemasu ka?","もう一度お願いできますか？"],
        friendly:["もう一回言ってくれる？","もう いっかい いって くれる？","mou ikkai itte kureru?","もう一回言って。"],
        social:["もう一回言って！","もう いっかい いって！","mou ikkai itte!","もう一回！"]
    },
    "can you speak more slowly": {
        polite:["もう少しゆっくり話してもらえますか？","もう すこし ゆっくり はなして もらえますか？","mou sukoshi yukkuri hanashite moraemasu ka?","もう少しゆっくりお願いします。"],
        casual:["もうちょっとゆっくり話して。","もう ちょっと ゆっくり はなして。","mou chotto yukkuri hanashite.","もうちょっとゆっくり。"],
        veryPolite:["もう少しゆっくり話していただけますか？","もう すこし ゆっくり はなして いただけますか？","mou sukoshi yukkuri hanashite itadakemasu ka?","もう少しゆっくりお願いできますか？"],
        friendly:["もうちょっとゆっくり話して。","もう ちょっと ゆっくり はなして。","mou chotto yukkuri hanashite.","もうちょっとゆっくりお願い。"],
        social:["もうちょいゆっくり話して！","もう ちょい ゆっくり はなして！","mou choi yukkuri hanashite!","もうちょいゆっくり！"]
    },
    "do you speak english": {
        polite:["英語話せますか？","えいご はなせますか？","eigo hanasemasu ka?","英語は話せますか？"],
        casual:["英語話せる？","えいご はなせる？","eigo hanaseru?","英語できる？"],
        veryPolite:["英語は話せますか？","えいごは はなせますか？","eigo wa hanasemasu ka?","英語でお願いできますか？"],
        friendly:["英語話せる？","えいご はなせる？","eigo hanaseru?","英語できる？"],
        social:["英語話せる？","えいご はなせる？","eigo hanaseru?","英語いける？"]
    },
    "where is the bathroom": {
        polite:["トイレはどこですか？","トイレは どこですか？","toire wa doko desu ka?","お手洗いはどこですか？"],
        casual:["トイレどこ？","トイレ どこ？","toire doko?","トイレってどこ？"],
        veryPolite:["お手洗いはどちらですか？","おてあらいは どちらですか？","otearai wa dochira desu ka?","お手洗いはどこでしょうか？"],
        friendly:["トイレどこ？","トイレ どこ？","toire doko?","トイレってどこ？"],
        social:["トイレどこ？","トイレ どこ？","toire doko?","お手洗いどこ？"]
    },
    "how much is this": {
        polite:["これ、いくらですか？","これ、いくらですか？","kore, ikura desu ka?","これはいくらですか？"],
        casual:["これいくら？","これ いくら？","kore ikura?","いくら？"],
        veryPolite:["こちらはいくらですか？","こちらは いくらですか？","kochira wa ikura desu ka?","こちら、おいくらですか？"],
        friendly:["これいくら？","これ いくら？","kore ikura?","これっていくら？"],
        social:["これいくら？","これ いくら？","kore ikura?","いくら？"]
    },
    "can i have some water": {
        polite:["お水もらえますか？","おみず もらえますか？","omizu moraemasu ka?","お水をもらえますか？"],
        casual:["水もらえる？","みず もらえる？","mizu moraeru?","水ちょうだい。"],
        veryPolite:["お水をいただけますか？","おみずを いただけますか？","omizu o itadakemasu ka?","お水をお願いできますか？"],
        friendly:["お水もらえる？","おみず もらえる？","omizu moraeru?","水ちょうだい。"],
        social:["水もらえる？","みず もらえる？","mizu moraeru?","水ほしい！"]
    },
    "i don't understand": {
        polite:["よく分かりません。","よく わかりません。","yoku wakarimasen.","ちょっと分かりません。"],
        casual:["よくわかんない。","よく わかんない。","yoku wakannai.","ちょっとわかんない。"],
        veryPolite:["よく分かりません。","よく わかりません。","yoku wakarimasen.","すみません、よく分かりません。"],
        friendly:["よくわかんない。","よく わかんない。","yoku wakannai.","ちょっとわかんない。"],
        social:["よくわかんない。","よく わかんない。","yoku wakannai.","わかんない。"]
    },
    "i miss you": {
        polite:["会いたいです。","あいたいです。","aitai desu.","また会いたいです。"],
        casual:["会いたい。","あいたい。","aitai.","会いたいな。"],
        veryPolite:["またお会いしたいです。","また おあい したいです。","mata oai shitai desu.","また会いたいです。"],
        friendly:["会いたいな。","あいたいな。","aitai na.","会いたい。"],
        social:["会いたい〜","あいたい〜","aitai~","会いたい！"]
    },
    "i'm tired": {
        polite:["疲れました。","つかれました。","tsukaremashita.","ちょっと疲れました。"],
        casual:["疲れた。","つかれた。","tsukareta.","もう疲れた。"],
        veryPolite:["少し疲れました。","すこし つかれました。","sukoshi tsukaremashita.","ちょっと疲れました。"],
        friendly:["もう疲れた〜","もう つかれた〜","mou tsukareta~","疲れた。"],
        social:["疲れた〜","つかれた〜","tsukareta~","もう無理〜"]
    },
    "wait a second": {
        polite:["ちょっと待ってください。","ちょっと まって ください。","chotto matte kudasai.","少し待ってください。"],
        casual:["ちょっと待って。","ちょっと まって。","chotto matte.","待って。"],
        veryPolite:["少し待っていただけますか？","すこし まって いただけますか？","sukoshi matte itadakemasu ka?","少々お待ちいただけますか？"],
        friendly:["ちょっと待って。","ちょっと まって。","chotto matte.","待って待って。"],
        social:["ちょっと待って！","ちょっと まって！","chotto matte!","待って！"]
    },
    "thank you": {
        polite:["ありがとうございます。","ありがとうございます。","arigatou gozaimasu.","どうもありがとうございます。"],
        casual:["ありがとう！","ありがとう！","arigatou!","ありがと！"],
        veryPolite:["どうもありがとうございます。","どうも ありがとうございます。","doumo arigatou gozaimasu.","ありがとうございます。"],
        friendly:["ありがとう！","ありがとう！","arigatou!","ありがと！"],
        social:["ありがと〜！","ありがと〜！","arigato~!","ありがとう！"]
    }
});

function canonicalNaturalTranslationEnglish(value) {
    return translationSearchText(value)
        .replace(/\bwhat's\b/g, "what is")
        .replace(/\bwhat're\b/g, "what are")
        .replace(/\bwhere're\b/g, "where are")
        .replace(/\byou're\b/g, "you are")
        .replace(/\bi'm\b/g, "i'm")
        .replace(/\bdon't\b/g, "don't")
        .replace(/\bcan't\b/g, "cannot")
        .replace(/\bcould you\b/g, "can you")
        .replace(/\bwould you\b/g, "can you")
        .replace(/\bplease\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function naturalTranslationToneKey(tone) {
    if (tone === "Casual") return "casual";
    if (tone === "Very polite") return "veryPolite";
    if (tone === "Friendly") return "friendly";
    if (tone === "Social media / texting") return "social";
    return "polite";
}

function naturalTranslationOverride(request) {
    const key = canonicalNaturalTranslationEnglish(request?.english);
    const entry = SAKURA_NATURAL_TRANSLATIONS[key];
    if (!entry) return null;
    const toneKey = naturalTranslationToneKey(request.tone);
    const variant = entry[toneKey] || entry.polite;
    if (!variant) return null;
    const [japanese, kana, romaji, alternative] = variant;
    const cacheKey = onlineTranslationCacheKey(request);
    return {
        id:`online-sakura-natural-${Date.now().toString(36)}`,
        japanese,
        kana,
        romaji,
        naturalMeaning:request.english,
        literalMeaning:"",
        tone:`${request.tone} · natural spoken Japanese`,
        usageNote:`Sakura natural phrasing for ${request.context}. Neutral, contemporary wording is prioritized over literal textbook translation.`,
        alternative:alternative || "",
        context:request.context,
        source:"online-sakura-natural",
        provider:"Sakura",
        naturalizerVersion:2,
        cacheKey,
        offline:false
    };
}

async function naturalTranslationFromPhraseLibrary(request) {
    try {
        await loadTranslationPhraseData();
        const query = translationSearchText(request?.english);
        if (!query || !Array.isArray(translationPhraseIndex)) return null;

        const ranked = translationPhraseIndex
            .map(indexed => ({
                record:indexed.record,
                score:scoreOfflineTranslationPhrase(indexed, request.english, request.context, request.tone),
                exact:[indexed.english, ...indexed.patterns].includes(query)
            }))
            .filter(item => item.exact && item.record?.tone === request.tone)
            .sort((a, b) => b.score - a.score || a.record.english.localeCompare(b.record.english));

        const best = ranked[0];
        if (!best) return null;
        const alternatives = ranked.slice(1, 3).map(item => item.record);
        const base = offlinePhraseResult(best.record, alternatives);
        const cacheKey = onlineTranslationCacheKey(request);
        return {
            ...base,
            id:`online-sakura-library-${best.record.id}-${Date.now().toString(36)}`,
            naturalMeaning:request.english,
            tone:`${request.tone} · curated Sakura phrasing`,
            usageNote:`Sakura matched this English to a curated phrase with the same requested tone. Context: ${request.context}.`,
            context:request.context,
            source:"online-sakura-natural",
            provider:"Sakura phrase library",
            naturalizerVersion:2,
            cacheKey,
            offline:false
        };
    }
    catch (error) {
        console.info("Online translation: curated phrase pass was unavailable; using the web fallback.", error);
        return null;
    }
}

function neutralizeMachineJapanese(value, request) {
    let text = cleanEntryText(value);
    if (!text) return "";
    const tone = request?.tone || "Polite and natural";
    const conversational = ["Everyday","Friends","Social media","Travel","Restaurant","Café","Shopping","Hotel","Train","Airport"].includes(request?.context);

    // Japanese normally drops explicit second-person pronouns when the listener is obvious.
    if (conversational && tone !== "Very polite") {
        text = text.replace(/^(?:あなたは|あなたが|あなた、)\s*/u, "");
    }

    // Avoid unexpectedly gendered / theatrical sentence endings from generic MT.
    if (tone === "Polite and natural") {
        text = text
            .replace(/何をしているのですか/gu, "何してるんですか")
            .replace(/何をしていますか/gu, "何してるんですか")
            .replace(/何をしてるのよ/gu, "何してるんですか")
            .replace(/何してるのよ/gu, "何してるんですか")
            .replace(/のですか([？?]?)/gu, "んですか$1");
    }
    else if (["Casual","Friendly","Social media / texting"].includes(tone)) {
        text = text
            .replace(/何をしているのですか/gu, "何してるの")
            .replace(/何をしていますか/gu, "何してるの")
            .replace(/何をしてるのよ/gu, "何してるの")
            .replace(/何してるのよ/gu, "何してるの")
            .replace(/のよ([？?])/gu, "の$1")
            .replace(/かしら([？?]?)/gu, "$1")
            .replace(/わよ([。！!？?]?)/gu, "よ$1");
    }

    return text.replace(/\s{2,}/g, " ").trim();
}

function machineTranslationNaturalnessScore(value, request, index = 0) {
    const text = String(value || "");
    if (!text) return -999;
    let score = 100 - index;
    if (/あなた(?:は|が|を|に)/u.test(text)) score -= 5;
    if (/(?:のよ|わよ|かしら|だぜ|だぞ)(?:[。！!？?]|$)/u.test(text)) score -= 18;
    if (/することができます/u.test(text)) score -= 5;
    if (/何をしていますか|何をしているのですか/u.test(text)) score -= 8;
    if (/Polite/.test(request?.tone || "") && /(?:です|ます|んです)/u.test(text)) score += 3;
    if (["Casual","Friendly","Social media / texting"].includes(request?.tone) && /(?:てる|ちゃう|じゃない|だよ|だね|？)$/u.test(text)) score += 2;
    if (request?.tone === "Very polite" && /(?:いただけ|でしょうか|ございます|いらっしゃ)/u.test(text)) score += 3;
    if (text.length > 80) score -= Math.min(8, Math.floor((text.length - 80) / 20));
    return score;
}

function naturalMyMemoryCandidates(data, request) {
    const raw = [
        cleanEntryText(data?.responseData?.translatedText),
        ...(Array.isArray(data?.matches) ? data.matches.map(match => cleanEntryText(match?.translation)) : [])
    ].filter(Boolean);
    const seen = new Set();
    return raw
        .map((value, index) => ({
            value:neutralizeMachineJapanese(value, request),
            index
        }))
        .filter(candidate => {
            const key = searchText(candidate.value);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .map(candidate => ({
            ...candidate,
            score:machineTranslationNaturalnessScore(candidate.value, request, candidate.index)
        }))
        .sort((a, b) => b.score - a.score || a.index - b.index);
}


function distinctMyMemoryAlternatives(data, primary) {
    const seen = new Set([searchText(primary)]);
    const alternatives = [];

    (Array.isArray(data?.matches) ? data.matches : []).forEach(match => {
        const candidate = cleanEntryText(match?.translation);
        if (!candidate) return;
        const key = searchText(candidate);
        if (!key || seen.has(key)) return;
        seen.add(key);
        alternatives.push(candidate);
    });

    return alternatives.slice(0, 2);
}

function validateMyMemoryTranslationResponse(data, request) {
    const status = Number(data?.responseStatus || 0);
    const details = cleanEntryText(data?.responseDetails);

    if (data?.quotaFinished === true || status === 429) {
        throw new Error("The online translator's free daily quota has been reached. Offline Phrase Finder still works.");
    }
    if (status && status !== 200) {
        throw new Error(details || "The online translator returned an error.");
    }

    const candidates = naturalMyMemoryCandidates(data, request);
    const translatedText = candidates[0]?.value || "";
    if (!translatedText) {
        throw new Error(details || "The online translator returned an empty result.");
    }
    const alternatives = candidates.slice(1, 3).map(candidate => candidate.value);
    const cacheKey = onlineTranslationCacheKey(request);

    return {
        id:`online-mymemory-${Date.now().toString(36)}`,
        japanese:translatedText,
        kana:"",
        romaji:"",
        naturalMeaning:request.english,
        literalMeaning:"",
        tone:`${request.tone} · naturalized web translation`,
        usageNote:`Sakura cleaned the web translation for more neutral, conversational Japanese. Context: ${request.context}. For subtle or high-stakes wording, compare the alternatives too.`,
        alternative:alternatives.join(" / "),
        context:request.context,
        source:"online-mymemory",
        provider:"MyMemory + Sakura naturalizer",
        naturalizerVersion:2,
        cacheKey,
        offline:false
    };
}

async function requestMyMemoryTranslation(request) {
    const cached = cachedOnlineTranslation(request);
    if (cached) return cached;

    const byteLength = onlineTranslationByteLength(request.english);
    if (byteLength > ONLINE_TRANSLATION_MAX_BYTES) {
        throw new Error(`Online Translation supports up to ${ONLINE_TRANSLATION_MAX_BYTES} UTF-8 bytes per request. Please shorten this sentence.`);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ONLINE_TRANSLATION_TIMEOUT_MS);

    try {
        const params = new URLSearchParams({
            q:request.english,
            langpair:"en|ja",
            mt:"1"
        });

        const response = await fetch(`${MYMEMORY_TRANSLATION_ENDPOINT}?${params.toString()}`, {
            method:"GET",
            mode:"cors",
            credentials:"omit",
            cache:"no-store",
            referrerPolicy:"no-referrer",
            signal:controller.signal,
            headers:{ "Accept":"application/json" }
        });

        if (!response.ok) {
            if (response.status === 429) throw new Error("The online translator's free daily quota has been reached. Offline Phrase Finder still works.");
            throw new Error(`The online translator is unavailable right now (HTTP ${response.status}).`);
        }

        const result = validateMyMemoryTranslationResponse(await response.json(), request);
        translationOnlineCache.set(result.cacheKey || onlineTranslationCacheKey(request), result);
        return result;
    }
    catch (error) {
        if (error?.name === "AbortError") {
            throw new Error("Online Translation took too long to respond. Try again or use Offline Phrase Finder.");
        }
        if (/Failed to fetch|NetworkError|Load failed/i.test(String(error?.message || ""))) {
            throw new Error("Sakura could not reach the online translator. Check your connection, then try again.");
        }
        throw error;
    }
    finally {
        window.clearTimeout(timeout);
    }
}

async function requestOnlineTranslation(request) {
    // Future-compatible: if a private secure endpoint is configured later, use it.
    if (TRANSLATION_API_ENDPOINT) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), ONLINE_TRANSLATION_TIMEOUT_MS);
        try {
            const response = await fetch(TRANSLATION_API_ENDPOINT, {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify(request),
                signal:controller.signal,
                cache:"no-store",
                credentials:"omit"
            });
            if (!response.ok) throw new Error("The secure translation service is unavailable right now.");
            return validateTranslationResponse(await response.json());
        }
        catch (error) {
            if (error?.name === "AbortError") throw new Error("Online Translation took too long to respond.");
            throw error;
        }
        finally {
            window.clearTimeout(timeout);
        }
    }

    const natural = naturalTranslationOverride(request);
    if (natural) {
        translationOnlineCache.set(natural.cacheKey || onlineTranslationCacheKey(request), natural);
        return natural;
    }

    const curated = await naturalTranslationFromPhraseLibrary(request);
    if (curated) {
        translationOnlineCache.set(curated.cacheKey || onlineTranslationCacheKey(request), curated);
        return curated;
    }

    return requestMyMemoryTranslation(request);
}

async function offlineFallbackForOnlineTranslation(request) {
    try {
        const ranked = await findOfflineTranslationPhrases(request.english);
        if (!ranked.length || ranked[0].score < 55) return null;
        return offlinePhraseResult(ranked[0].record, ranked.slice(1).map(item => item.record));
    }
    catch {
        return null;
    }
}

function validateTranslationResponse(data) {
    if (!data || typeof data !== "object" || !cleanEntryText(data.japanese) || !cleanEntryText(data.naturalMeaning)) {
        throw new Error("The translation service returned an incomplete response.");
    }
    return {
        id:`online-secure-${Date.now().toString(36)}`,
        japanese:cleanEntryText(data.japanese),
        kana:cleanEntryText(data.kana),
        romaji:cleanEntryText(data.romaji),
        naturalMeaning:cleanEntryText(data.naturalMeaning),
        literalMeaning:cleanEntryText(data.literalMeaning),
        tone:cleanEntryText(data.tone),
        usageNote:cleanEntryText(data.usageNote),
        alternative:cleanEntryText(data.alternative),
        context:cleanEntryText(data.context) || translationContext,
        source:"online",
        offline:false
    };
}

function offlinePhraseResult(record, alternatives = []) {
    return {
        id:`offline-${record.id}`,
        japanese:record.japanese,
        kana:record.kana || "",
        romaji:record.romaji || "",
        naturalMeaning:record.naturalMeaning || record.english,
        literalMeaning:record.literalMeaning || "",
        tone:record.tone || translationTone,
        usageNote:record.usageNote || "",
        alternative:alternatives.slice(0, 2).map(item => item.japanese).join(" / "),
        context:(record.contexts || [translationContext])[0],
        source:"offline-phrase",
        offline:true
    };
}

function libraryPhraseResult(item) {
    return {
        id:`library-${itemKey(item)}`,
        japanese:item.expression || item.word || item.character || "",
        kana:item.kana || item.reading || "",
        romaji:item.romaji || "",
        naturalMeaning:item.naturalMeaning || item.meaning || item.english || "",
        literalMeaning:item.literalMeaning || item.literal || "",
        tone:item.tone || item.formality || "",
        usageNote:`Related item already in Sakura's learning library${item.categories?.length ? ` · ${item.categories.join(", ")}` : ""}.`,
        alternative:"",
        context:translationContext,
        source:"library",
        offline:true
    };
}

function renderTranslationMode() {
    document.querySelectorAll("[data-translation-mode]").forEach(button => {
        const active = button.dataset.translationMode === translationMode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });

    const note = document.getElementById("translation-mode-note");
    const submit = document.getElementById("submit-translation");
    const onlineReady = navigator.onLine;

    if (translationMode === "offline") {
        if (note) note.innerHTML = "<strong>Offline Phrase Finder</strong><span>Searches Sakura's curated phrase library. It does not pretend to translate arbitrary English.</span>";
        if (submit) {
            submit.disabled = false;
            submit.textContent = "Find Japanese";
        }
        loadTranslationPhraseData().catch(error => {
            if (note) note.innerHTML = `<strong>Offline Phrase Finder</strong><span>${escapeSearchHtml(error.message || "The phrase library could not load.")}</span>`;
        });
    }
    else {
        if (note) {
            note.innerHTML = onlineReady
                ? "<strong>Online Translation</strong><span>Natural Japanese first: Sakura prioritizes neutral spoken phrasing for common expressions, then cleans web translation for arbitrary English. Internet required.</span>"
                : "<strong>Online Translation</strong><span>You appear to be offline. Switch to Offline Phrase Finder or reconnect to the internet.</span>";
        }
        if (submit) {
            submit.disabled = !onlineReady;
            submit.textContent = onlineReady ? "Translate Online" : "You're offline";
        }
    }
}

function setTranslationMode(mode) {
    if (!["offline","online"].includes(mode)) return;
    translationMode = mode;
    renderTranslationResult(null);
    renderTranslationSuggestions([]);
    document.getElementById("translation-message").textContent = "";
    renderTranslationMode();
}

function openTranslationTool() {
    renderTranslationChips();
    renderTranslationMode();
    if (translationMode === "offline") loadTranslationPhraseData().catch(() => {});
}

function renderTranslationSuggestions(results, libraryMatches = []) {
    const section = document.getElementById("translation-suggestions-section");
    const container = document.getElementById("translation-suggestions");
    const librarySection = document.getElementById("translation-library-matches-section");
    const libraryContainer = document.getElementById("translation-library-matches");

    if (!section || !container || !librarySection || !libraryContainer) return;

    section.hidden = !results.length;
    container.innerHTML = results.map(({record, score}, index) => `
        <button class="translation-suggestion-card" type="button" data-translation-suggestion="${escapeSearchHtml(record.id)}">
            <span class="translation-suggestion-rank">${index === 0 ? "Best match" : "Suggestion"}</span>
            <strong>${escapeSearchHtml(record.japanese)}</strong>
            <span>${escapeSearchHtml(record.kana || "")}</span>
            <small>${escapeSearchHtml(record.naturalMeaning || record.english)} · ${escapeSearchHtml(record.tone || "")}</small>
        </button>
    `).join("");

    librarySection.hidden = !libraryMatches.length;
    libraryContainer.innerHTML = libraryMatches.map(item => `
        <button class="translation-suggestion-card library-match" type="button" data-translation-library-key="${escapeSearchHtml(itemKey(item))}">
            <span class="translation-suggestion-rank">Sakura Library</span>
            <strong>${escapeSearchHtml(item.expression || item.word || item.character || "")}</strong>
            <span>${escapeSearchHtml(item.kana || item.reading || item.romaji || "")}</span>
            <small>${escapeSearchHtml(item.naturalMeaning || item.meaning || item.english || "")}</small>
        </button>
    `).join("");
}

function renderTranslationResult(result, options = {}) {
    if (result && !result.id) result.id = `translation-${searchText(result.japanese).slice(0,30)}-${Date.now().toString(36)}`;
    currentTranslationResult = result;
    const card = document.getElementById("translation-result");
    if (!card) return;
    card.hidden = !result;
    if (!result) return;

    const label = result.source === "offline-phrase"
        ? "Offline Sakura phrase"
        : result.source === "library"
            ? "Related Sakura library item"
            : result.source === "online-sakura-natural"
                ? "Natural Japanese · Sakura"
                : result.source === "online-mymemory"
                    ? "Online translation · naturalized"
                    : "Recommended translation";

    document.getElementById("translation-result-label").textContent = label;
    document.getElementById("translation-japanese").textContent = result.japanese;

    const kana = document.getElementById("translation-kana");
    const romaji = document.getElementById("translation-romaji");
    const readingNote = document.getElementById("translation-reading-note");
    kana.textContent = result.kana || "";
    romaji.textContent = result.romaji || "";
    kana.hidden = !result.kana;
    romaji.hidden = !result.romaji;
    if (readingNote) {
        const isOnline = String(result.source || "").startsWith("online");
        if (!isOnline || result.readingConfidence === "library") {
            readingNote.hidden = true;
        }
        else if (result.romaji && result.readingConfidence === "approximate") {
            readingNote.hidden = false;
            readingNote.textContent = "Romaji is auto-generated from Sakura's local reading data. Kanji readings can change with context, so verify important wording.";
        }
        else if (result.romaji) {
            readingNote.hidden = false;
            readingNote.textContent = "Romaji was generated locally from Sakura's reading data.";
        }
        else {
            readingNote.hidden = false;
            readingNote.textContent = "Generating romaji… Japanese is ready now.";
        }
    }

    document.getElementById("translation-natural-meaning").textContent = result.naturalMeaning;
    document.getElementById("translation-literal-meaning").textContent = result.literalMeaning;
    document.getElementById("translation-literal-group").hidden = !result.literalMeaning;
    document.getElementById("translation-usage").textContent = [result.tone, result.usageNote].filter(Boolean).join(" · ");
    document.getElementById("translation-alternative").textContent = result.alternative;
    document.getElementById("translation-alternative-group").hidden = !result.alternative;

    const copyReading = document.getElementById("copy-translation-reading");
    if (copyReading) {
        copyReading.disabled = !result.kana && !result.romaji;
        copyReading.title = copyReading.disabled ? "Reading is unavailable for this online machine translation." : "";
    }

    const savedItem = translationResultItem(result);
    setSaveButton(document.getElementById("save-translation"), savedItem);
    document.getElementById("save-translation").textContent = isSaved(savedItem) ? "Saved" : "Save";

    if (options.focus) {
        requestAnimationFrame(() => {
            const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
            card.scrollIntoView({ behavior:reducedMotion ? "auto" : "smooth", block:"start" });
        });
    }
}

function translationResultItem(result = currentTranslationResult) {
    if (!result) return null;
    return {
        id:result.id,
        type:"translation",
        expression:result.japanese,
        kana:result.kana,
        romaji:result.romaji,
        meaning:result.naturalMeaning,
        naturalMeaning:result.naturalMeaning,
        literalMeaning:result.literalMeaning,
        tone:result.tone,
        notes:result.usageNote,
        alternative:result.alternative,
        context:result.context || translationContext,
        source:result.source || "saved"
    };
}

function addTranslationHistory(request, result) {
    const record = {
        id:`history-${Date.now().toString(36)}`,
        english:request.english,
        context:request.context,
        tone:request.tone,
        mode:request.mode,
        result,
        createdAt:new Date().toISOString()
    };
    translationHistory = [
        record,
        ...translationHistory.filter(item => onlineTranslationCacheKey(item) !== onlineTranslationCacheKey(request))
    ].slice(0, 20);
    writeJson(STORAGE.translationHistory, translationHistory);
    invalidateTranslationReadingCandidates();
    renderTranslationHistory();
}

function renderTranslationHistory() {
    const container = document.getElementById("translation-history");
    if (!container) return;

    container.innerHTML = translationHistory.map(item => {
        const source = item.mode === "online" ? "Online" : "Offline";
        return `<article class="translation-history-item"><button type="button" data-translation-history="${item.id}"><strong>${escapeSearchHtml(item.english)}</strong><small>${escapeSearchHtml(source)} · ${escapeSearchHtml(item.context || "Everyday")} · ${escapeSearchHtml(item.tone || "")}</small></button><button class="history-delete" type="button" data-delete-translation-history="${item.id}" aria-label="Delete ${escapeSearchHtml(item.english)}">×</button></article>`;
    }).join("");

    document.getElementById("translation-history-empty").hidden = translationHistory.length > 0;
    document.getElementById("clear-translation-history").hidden = !translationHistory.length;
}

async function requestTranslation(event) {
    event.preventDefault();
    if (translationLoading) return;

    const english = cleanEntryText(document.getElementById("translation-english").value);
    const message = document.getElementById("translation-message");

    if (!english) {
        message.textContent = "Enter an English sentence first.";
        return;
    }
    if (english.length > 500) {
        message.textContent = "Keep the sentence under 500 characters.";
        return;
    }

    const request = {
        english,
        context:translationContext,
        tone:translationTone,
        mode:translationMode
    };

    translationLoading = true;
    const submit = document.getElementById("submit-translation");
    submit.disabled = true;

    try {
        if (translationMode === "online") {
            if (!navigator.onLine) {
                renderTranslationResult(null);
                renderTranslationSuggestions([]);
                message.textContent = "Online Translation needs an internet connection. Offline Phrase Finder still works.";
                return;
            }

            message.textContent = "Translating online…";
            try {
                const result = await requestOnlineTranslation(request);
                renderTranslationSuggestions([]);
                renderTranslationResult(result, { focus:true });
                message.textContent = result.romaji
                    ? (result.cached ? "Loaded from your recent online translations." : "Online translation complete.")
                    : "Online translation complete. Generating romaji…";

                const resultId = result.id;
                void enrichOnlineTranslationReading(result)
                    .then(enriched => {
                        if (currentTranslationResult?.id === resultId) {
                            renderTranslationResult(enriched);
                            message.textContent = enriched.romaji
                                ? "Online translation complete · romaji ready."
                                : "Online translation complete. Romaji could not be generated reliably for this sentence.";
                        }
                        addTranslationHistory(request, enriched);
                    })
                    .catch(() => {
                        if (currentTranslationResult?.id === resultId) {
                            message.textContent = "Online translation complete. Romaji could not be generated reliably for this sentence.";
                        }
                        addTranslationHistory(request, result);
                    });
            }
            catch (onlineError) {
                const fallback = await offlineFallbackForOnlineTranslation(request);
                if (fallback) {
                    renderTranslationSuggestions([]);
                    renderTranslationResult(fallback, { focus:true });
                    message.textContent = `${onlineError.message || "The online translator is unavailable."} Showing Sakura's closest offline phrase instead.`;
                }
                else {
                    throw onlineError;
                }
            }
            return;
        }

        message.textContent = "Searching Sakura's offline phrase library…";
        const ranked = await findOfflineTranslationPhrases(english);
        const libraryMatches = relatedLibraryPhrases(english);
        renderTranslationSuggestions(ranked, libraryMatches);

        if (!ranked.length) {
            renderTranslationResult(null);
            message.textContent = libraryMatches.length
                ? "No close curated phrase was found. Similar learning items from Sakura are shown below."
                : "No close offline phrase was found. Try simpler wording or choose a more specific context.";
            return;
        }

        const result = offlinePhraseResult(ranked[0].record, ranked.slice(1).map(item => item.record));
        renderTranslationResult(result, { focus:true });
        addTranslationHistory(request, result);
        message.textContent = ranked.length > 1
            ? "Best offline match shown. You can choose another suggestion below."
            : "Offline phrase match found.";
    }
    catch (error) {
        renderTranslationResult(null);
        renderTranslationSuggestions([]);
        message.textContent = error.message || "Sakura could not complete that request.";
    }
    finally {
        translationLoading = false;
        renderTranslationMode();
    }
}

function initializeLibrary() {
    if (libraryInitialized) return;
    libraryInitialized = true;
    document.getElementById("library-kanji-count").textContent = LIBRARY_TOTALS.kanji.toLocaleString();
    document.getElementById("library-vocabulary-count").textContent = LIBRARY_TOTALS.vocabulary.toLocaleString();
    document.getElementById("library-slang-count").textContent = slangData().length.toLocaleString();
    document.getElementById("library-kana-count").textContent = KANA_DATA.length.toLocaleString();
    document.getElementById("library-travel-count").textContent = LIBRARY_TOTALS.travel.toLocaleString();
}

function libraryHome() {
    libraryRepository = "";
    document.getElementById("library-home").hidden = false;
    document.getElementById("library-repository").hidden = true;
    document.getElementById("library-search-input").value = "";
}

function libraryFilterOptions(type) {
    if (type === "kanji") return [{value:"All",label:"All Kanji"}, ...["N5","N4","N3","N2","N1"].map(value=>({value,label:value}))];
    if (type === "vocabulary") return [{value:"All",label:"All Vocabulary"}, ...["N5","N4","N3","N2","N1"].map(value=>({value,label:value}))];
    if (type === "slang") return SLANG_CATEGORY_OPTIONS.map(([value, label]) => ({ value, label }));
    if (type === "travel") return [{value:"All",label:"All Travel"}, ...Object.entries(window.TRAVEL_CATEGORIES || {}).map(([value,metadata])=>({value,label:metadata.title}))];
    return [
        {value:"All",label:"All Kana"}, {value:"script:Hiragana",label:"Hiragana"}, {value:"script:Katakana",label:"Katakana"},
        {value:"group:Basic",label:"Basic"}, {value:"group:Dakuten",label:"Dakuten"}, {value:"group:Handakuten",label:"Handakuten"},
        {value:"group:Yoon",label:"Yōon"}, {value:"group:Extended",label:"Extended Katakana"}
    ];
}

function renderLibraryFilters() {
    document.getElementById("library-collection-select").value = libraryRepository;
    const options = libraryFilterOptions(libraryRepository);
    const category = document.getElementById("library-category-select");
    category.innerHTML = options.map(option => `<option value="${escapeSearchHtml(option.value)}">${escapeSearchHtml(option.label)}</option>`).join("");
    category.value = options.some(option=>option.value===libraryFilter) ? libraryFilter : options[0]?.value || "All";
    libraryFilter = category.value;
}

function libraryKanaItem(item, index) {
    return { id:`kana-${index}-${item[0]}`, type:"kana", kana:item[0], romaji:item[1], script:item[2], group:kanaGroup(item), quizEligible:kanaQuizEligible(item) };
}

function librarySource(type = libraryRepository) {
    if (type === "kanji") return window.SakuraKanjiLoader?.getLoadedKanji() || [];
    if (type === "vocabulary") return window.SakuraVocabularyLoader?.getLoadedVocabulary() || [];
    if (type === "slang") return slangData();
    if (type === "kana") return KANA_DATA.map(libraryKanaItem);
    if (type === "travel") return window.SakuraTravelLoader?.getLoadedTravelPhrases() || [];
    return [];
}

function libraryMatches(item, query) {
    if (!query) return true;
    let values = [];
    if (libraryRepository === "kanji") values = [item.character, item.reading, item.romaji, item.meaning];
    if (libraryRepository === "vocabulary") values = [item.word, item.kana, item.romaji, item.meaning];
    if (libraryRepository === "slang") values = [item.expression, item.kana, item.romaji, item.meaning, ...(item.categories || [])];
    if (libraryRepository === "kana") values = [item.kana, item.romaji, item.script, item.group];
    if (libraryRepository === "travel") values = [item.japanese, item.reading, item.romaji, item.english];
    return values.some(value => searchText(value).includes(query));
}

function filteredLibraryItems() {
    const query = searchText(document.getElementById("library-search-input").value);
    const seen = new Set();
    return librarySource().filter(item => {
        const identity = itemKey(item) || `${item.type}:${item.kana}`;
        if (seen.has(identity)) return false;
        seen.add(identity);
        if (["kanji", "vocabulary"].includes(libraryRepository) && libraryFilter !== "All" && item.jlpt !== libraryFilter) return false;
        if (libraryRepository === "slang" && libraryFilter !== "All" && !item.categories.includes(libraryFilter)) return false;
        if (libraryRepository === "kana" && libraryFilter.startsWith("script:") && item.script !== libraryFilter.slice(7)) return false;
        if (libraryRepository === "kana" && libraryFilter.startsWith("group:") && item.group !== libraryFilter.slice(6)) return false;
        if (libraryRepository === "travel" && libraryFilter !== "All" && item.category !== libraryFilter) return false;
        return libraryMatches(item, query);
    });
}

function libraryCard(item) {
    const key = encodeURIComponent(itemKey(item) || `${item.type}:${item.kana}`);
    if (item.type === "kanji") return `<article class="library-item-card"><button type="button" class="library-item-main" data-library-open="${key}"><strong class="library-japanese">${escapeSearchHtml(item.character)}</strong><span>${escapeSearchHtml(item.reading || "")}</span><span class="learning-romaji">${escapeSearchHtml(item.romaji || "")}</span><b>${escapeSearchHtml(item.meaning)}</b><em>${escapeSearchHtml(item.jlpt)}</em></button><button type="button" class="library-save ${isSaved(item) ? "saved" : ""}" data-library-save="${key}" aria-label="${isSaved(item) ? "Unsave" : "Save"} ${escapeSearchHtml(item.character)}">${isSaved(item) ? "♥" : "♡"}</button></article>`;
    if (item.type === "vocabulary") return `<article class="library-item-card"><button type="button" class="library-item-main" data-library-open="${key}"><strong class="library-japanese library-word">${escapeSearchHtml(item.word)}</strong><span>${escapeSearchHtml(item.kana || "")}</span><span class="learning-romaji">${escapeSearchHtml(item.romaji || "")}</span><b>${escapeSearchHtml(item.meaning)}</b><em>${escapeSearchHtml(item.jlpt)}</em></button><button type="button" class="library-save ${isSaved(item) ? "saved" : ""}" data-library-save="${key}" aria-label="${isSaved(item) ? "Unsave" : "Save"} ${escapeSearchHtml(item.word)}">${isSaved(item) ? "♥" : "♡"}</button></article>`;
    if (item.type === "slang") return `<article class="library-item-card"><button type="button" class="library-item-main" data-library-open="${key}"><strong class="library-japanese library-word">${escapeSearchHtml(item.expression)}</strong><span>${escapeSearchHtml(item.kana || "")}</span><span class="learning-romaji">${escapeSearchHtml(item.romaji || "")}</span><b>${escapeSearchHtml(item.meaning)}</b><em>${escapeSearchHtml(item.categories.slice(0,2).join(" · "))}</em></button><button type="button" class="library-save ${isSaved(item) ? "saved" : ""}" data-library-save="${key}" aria-label="${isSaved(item) ? "Unsave" : "Save"} ${escapeSearchHtml(item.expression)}">${isSaved(item) ? "♥" : "♡"}</button></article>`;
    if (item.type === "travel") return `<article class="library-item-card library-travel-card"><button type="button" class="library-item-main" data-library-open="${key}"><strong class="library-japanese library-word">${escapeSearchHtml(item.japanese)}</strong><span>${escapeSearchHtml(item.reading || "")}</span><span class="learning-romaji">${escapeSearchHtml(item.romaji || "")}</span><b>${escapeSearchHtml(item.english)}</b><em>${escapeSearchHtml(travelCategoryMetadata(item.category)?.title || item.category)}</em></button><button type="button" class="library-save ${isSaved(item) ? "saved" : ""}" data-library-save="${key}" aria-label="${isSaved(item) ? "Unsave" : "Save"} ${escapeSearchHtml(item.japanese)}">${isSaved(item) ? "♥" : "♡"}</button></article>`;
    return `<article class="library-item-card kana-library-card"><div class="library-item-main"><strong class="library-japanese">${escapeSearchHtml(item.kana)}</strong><b>${escapeSearchHtml(item.romaji)}</b><span>${escapeSearchHtml(item.script)}</span><em>${escapeSearchHtml(item.group === "Yoon" ? "Yōon" : item.group)}</em></div></article>`;
}

function renderLibraryResults() {
    libraryCurrentItems = filteredLibraryItems();
    const visible = libraryCurrentItems.slice(0, libraryVisibleCount);
    document.getElementById("library-results").innerHTML = visible.map(libraryCard).join("");
    document.getElementById("library-empty").hidden = libraryCurrentItems.length > 0;
    document.getElementById("library-show-more").hidden = visible.length >= libraryCurrentItems.length;
    document.getElementById("library-status").textContent = `${libraryCurrentItems.length.toLocaleString()} ${libraryCurrentItems.length === 1 ? "entry" : "entries"}${visible.length < libraryCurrentItems.length ? ` · showing ${visible.length.toLocaleString()}` : ""}`;
}

async function loadLibraryLevels(type, filter, revision) {
    const levels = filter === "All" ? ["N5", "N4", "N3", "N2", "N1"] : [filter];
    const ensure = type === "kanji" ? ensureKanjiLevels : ensureVocabularyLevels;
    document.getElementById("library-status").textContent = filter === "All" ? "Loading available levels…" : `Loading ${filter}…`;
    document.getElementById("library-empty").hidden = true;
    try {
        for (const level of levels) {
            await ensure([level]);
            if (revision !== libraryLoadingRevision || currentRoute !== "library") return;
            renderLibraryResults();
        }
    }
    catch {
        if (revision === libraryLoadingRevision) document.getElementById("library-status").textContent = "This level could not be loaded. Check your connection and try again.";
    }
}

async function loadLibraryTravel(filter, revision) {
    const categories = filter === "All" ? Object.keys(window.TRAVEL_CATEGORIES || {}) : [filter];
    document.getElementById("library-status").textContent = filter === "All" ? "Loading Travel collections…" : `Loading ${travelCategoryMetadata(filter)?.title || "Travel"}…`;
    document.getElementById("library-empty").hidden = true;
    try {
        for (const category of categories) {
            await window.SakuraTravelLoader.loadTravelCategory(category);
            if (revision !== libraryLoadingRevision || currentRoute !== "library") return;
            renderLibraryResults();
        }
        invalidateSearchIndex();
    }
    catch {
        if (revision === libraryLoadingRevision) document.getElementById("library-status").textContent = "This Travel collection could not be loaded. Check your connection and try again.";
    }
}

function openLibraryRepository(type) {
    initializeLibrary();
    libraryRepository = type;
    libraryFilter = ["kanji", "vocabulary"].includes(type) ? "N5" : "All";
    libraryVisibleCount = LIBRARY_BATCH_SIZE;
    document.getElementById("library-home").hidden = true;
    document.getElementById("library-repository").hidden = false;
    document.getElementById("library-search-input").value = "";
    const titles = { kana:"Kana", kanji:"Kanji", vocabulary:"Vocabulary", slang:"Slang", travel:"Travel" };
    document.getElementById("library-repository-title").textContent = titles[type];
    document.getElementById("library-repository-summary").textContent = `Browse Sakura’s ${titles[type].toLowerCase()} collection.`;
    renderLibraryFilters();
    renderLibraryResults();
    if (["kanji", "vocabulary"].includes(type)) loadLibraryLevels(type, libraryFilter, ++libraryLoadingRevision);
    if (type === "travel") loadLibraryTravel(libraryFilter, ++libraryLoadingRevision);
}

function findLibraryItem(encodedKey) {
    const key = decodeURIComponent(encodedKey);
    return libraryCurrentItems.find(item => (itemKey(item) || `${item.type}:${item.kana}`) === key);
}

function openLibraryItem(item) {
    if (!item) return;
    if (item.type === "kanji") openKanjiDetail(item, "library");
    else if (item.type === "vocabulary") openWordDetail(item, "library");
    else if (item.type === "slang") {
        showRoute("learn-slang", false);
        document.getElementById("native-difficulty-filter").value = "All";
        refreshNativeCategories();
        document.getElementById("native-category-filter").value = "All";
        renderNative(item);
    }
    else if (item.type === "travel" && travelCategoryMetadata(item.category)) {
        pendingTravelPhraseId = item.id;
        currentTravelFilter = "All";
        showRoute(`travel-${item.category}`, false);
    }
}

function loadWhatWouldYouSayBank() {
    if (Array.isArray(window.WHAT_WOULD_YOU_SAY_DATA)) return Promise.resolve(window.WHAT_WOULD_YOU_SAY_DATA);
    if (whatWouldYouSayBankPromise) return whatWouldYouSayBankPromise;
    whatWouldYouSayBankPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./data/practice-what-would-you-say.js?v=3";
        script.onload = () => Array.isArray(window.WHAT_WOULD_YOU_SAY_DATA) ? resolve(window.WHAT_WOULD_YOU_SAY_DATA) : reject(new Error("Practice questions are unavailable."));
        script.onerror = () => reject(new Error("Practice questions could not be loaded."));
        document.head.appendChild(script);
    });
    return whatWouldYouSayBankPromise;
}

function validateWhatWouldYouSayBank(bank) {
    const ids = new Set();
    return Array.isArray(bank) && bank.length >= 10 && bank.every(question => {
        const valid = question && typeof question.id === "string" && !ids.has(question.id)
            && ["Travel", "Everyday", "Real-world"].includes(question.category)
            && ["Beginner", "Intermediate", "Advanced"].includes(question.difficulty)
            && typeof question.scenario === "string" && typeof question.prompt === "string"
            && Array.isArray(question.choices) && question.choices.length === 4
            && Number.isInteger(question.correctChoice) && question.correctChoice >= 0 && question.correctChoice < question.choices.length
            && question.choices.every(choice => [choice.japanese, choice.kana, choice.romaji, choice.english].every(value => typeof value === "string" && value.trim()))
            && typeof question.explanation === "string" && question.explanation.trim();
        if (valid) ids.add(question.id);
        return Boolean(valid);
    });
}

function shuffledPracticeQuestions(bank) {
    const questions = bank.slice();
    for (let index = questions.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [questions[index], questions[target]] = [questions[target], questions[index]];
    }
    return questions;
}

function applyPracticeRomajiVisibility() {
    document.querySelectorAll("[data-practice-romaji]").forEach(element => { element.hidden = !practiceRomajiVisible; });
    document.querySelectorAll("[data-practice-romaji-toggle]").forEach(button => {
        button.textContent = practiceRomajiVisible ? "Hide Romaji" : "Show Romaji";
        button.setAttribute("aria-pressed", String(practiceRomajiVisible));
    });
}

function preparePracticeQuestion(question) {
    const correctAnswer = question.choices[question.correctChoice];
    const choices = question.choices.slice();
    for (let index = choices.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [choices[index], choices[target]] = [choices[target], choices[index]];
    }
    return { ...question, choices, correctChoice:choices.indexOf(correctAnswer) };
}

function renderWhatWouldYouSayQuestion() {
    const session = whatWouldYouSaySession;
    if (!session) return;
    const question = session.questions[session.index];
    document.getElementById("wwys-loading").hidden = true;
    document.getElementById("wwys-results").hidden = true;
    document.getElementById("wwys-question-card").hidden = false;
    document.getElementById("wwys-category").textContent = question.category;
    document.getElementById("wwys-difficulty").textContent = question.difficulty;
    document.getElementById("wwys-progress").textContent = `${session.index + 1} / ${session.questions.length}`;
    document.getElementById("wwys-scenario").textContent = question.scenario;
    document.getElementById("wwys-prompt").textContent = question.prompt;
    document.getElementById("wwys-choices").innerHTML = question.choices.map((choice, index) => `<button class="practice-choice" type="button" data-wwys-choice="${index}"><strong>${escapeSearchHtml(choice.japanese)}</strong><span class="practice-choice-romaji" data-practice-romaji hidden>${escapeSearchHtml(choice.romaji)}</span></button>`).join("");
    document.getElementById("wwys-feedback").hidden = true;
    session.answered = false;
    applyPracticeRomajiVisibility();
}

function startWhatWouldYouSaySession(bank) {
    whatWouldYouSaySession = { questions:shuffledPracticeQuestions(bank).slice(0, 10).map(preparePracticeQuestion), index:0, correct:0, answered:false };
    renderWhatWouldYouSayQuestion();
}

async function openWhatWouldYouSay() {
    const loading = document.getElementById("wwys-loading");
    loading.hidden = false;
    loading.textContent = "Preparing your practice…";
    try {
        const bank = await loadWhatWouldYouSayBank();
        if (!validateWhatWouldYouSayBank(bank)) throw new Error("Practice question validation failed.");
        if (currentRoute !== "practice-what-would-you-say") return;
        if (!whatWouldYouSaySession) startWhatWouldYouSaySession(bank);
        else if (whatWouldYouSaySession.index < whatWouldYouSaySession.questions.length) renderWhatWouldYouSayQuestion();
    }
    catch (error) {
        console.warn("What Would You Say? could not start.", error);
        loading.textContent = "Practice could not be prepared. Check your connection and try again.";
    }
}

function answerWhatWouldYouSay(choiceIndex) {
    const session = whatWouldYouSaySession;
    if (!session || session.answered) return;
    const question = session.questions[session.index];
    session.answered = true;
    const correct = choiceIndex === question.correctChoice;
    if (correct) session.correct += 1;
    document.querySelectorAll("[data-wwys-choice]").forEach(button => {
        const index = Number(button.dataset.wwysChoice);
        button.disabled = true;
        button.classList.toggle("correct", index === question.correctChoice);
        button.classList.toggle("incorrect", index === choiceIndex && !correct);
        button.classList.toggle("selected", index === choiceIndex);
        if (index === question.correctChoice) button.setAttribute("aria-label", `Correct answer: ${question.choices[index].japanese}`);
    });
    const answer = question.choices[question.correctChoice];
    const feedback = document.getElementById("wwys-feedback");
    feedback.hidden = false;
    feedback.classList.toggle("correct", correct);
    feedback.classList.toggle("incorrect", !correct);
    document.getElementById("wwys-feedback-title").textContent = correct ? "✓ Correct" : "Not quite";
    document.getElementById("wwys-answer-japanese").textContent = answer.japanese;
    document.getElementById("wwys-answer-kana").textContent = answer.kana;
    document.getElementById("wwys-answer-romaji").textContent = answer.romaji;
    document.getElementById("wwys-answer-english").textContent = answer.english;
    document.getElementById("wwys-explanation").textContent = question.explanation;
    document.getElementById("wwys-next").textContent = session.index === session.questions.length - 1 ? "See Results" : "Next";
    applyPracticeRomajiVisibility();
    feedback.scrollIntoView({ block:"nearest", behavior:"smooth" });
}

function nextWhatWouldYouSay() {
    const session = whatWouldYouSaySession;
    if (!session?.answered) return;
    if (session.index < session.questions.length - 1) {
        session.index += 1;
        renderWhatWouldYouSayQuestion();
        return;
    }
    document.getElementById("wwys-question-card").hidden = true;
    document.getElementById("wwys-results").hidden = false;
    document.getElementById("wwys-final-score").textContent = `${session.correct} / ${session.questions.length}`;
}

function loadSentenceBuilderBank() {
    if (Array.isArray(window.SENTENCE_BUILDER_DATA)) return Promise.resolve(window.SENTENCE_BUILDER_DATA);
    if (sentenceBuilderBankPromise) return sentenceBuilderBankPromise;
    sentenceBuilderBankPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./data/practice-sentence-builder.js?v=3";
        script.onload = () => Array.isArray(window.SENTENCE_BUILDER_DATA) ? resolve(window.SENTENCE_BUILDER_DATA) : reject(new Error("Sentence Builder questions are unavailable."));
        script.onerror = () => reject(new Error("Sentence Builder questions could not be loaded."));
        document.head.appendChild(script);
    });
    return sentenceBuilderBankPromise;
}

function validateSentenceBuilderBank(bank) {
    const ids = new Set();
    return Array.isArray(bank) && bank.length >= 10 && bank.every(question => {
        const order = question?.correctOrder;
        const validOrder = Array.isArray(order) && Array.isArray(question?.chunks) && order.length === question.chunks.length
            && new Set(order).size === order.length && order.every(index => Number.isInteger(index) && index >= 0 && index < question.chunks.length);
        const valid = question && typeof question.id === "string" && !ids.has(question.id)
            && ["Everyday", "Travel", "Casual"].includes(question.category)
            && ["Beginner", "Intermediate", "Advanced"].includes(question.difficulty)
            && [question.english, question.sentence, question.kana, question.romaji, question.explanation].every(value => typeof value === "string" && value.trim())
            && Array.isArray(question.chunks) && question.chunks.length >= 3 && question.chunks.every(chunk => typeof chunk === "string" && chunk.trim())
            && validOrder && order.map(index => question.chunks[index]).join("") === question.sentence;
        if (valid) ids.add(question.id);
        return Boolean(valid);
    });
}

function shuffledSentenceChunks(question) {
    const chunks = question.chunks.map((text, sourceIndex) => ({ text, sourceIndex }));
    for (let index = chunks.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [chunks[index], chunks[target]] = [chunks[target], chunks[index]];
    }
    if (chunks.length > 1 && chunks.every((chunk, index) => chunk.sourceIndex === question.correctOrder[index])) [chunks[0], chunks[1]] = [chunks[1], chunks[0]];
    return chunks;
}

function prepareSentenceBuilderQuestion(question) {
    return { ...question, available:shuffledSentenceChunks(question), selected:[], answered:false };
}

function renderSentenceBuilderChunks() {
    const question = sentenceBuilderSession?.questions[sentenceBuilderSession.index];
    if (!question) return;
    const locked = question.answered;
    document.getElementById("sentence-builder-chunks").innerHTML = question.available.map(chunk => `<button class="sentence-chunk" type="button" data-sentence-available="${chunk.sourceIndex}" ${locked ? "disabled" : ""}>${escapeSearchHtml(chunk.text)}</button>`).join("");
    document.getElementById("sentence-builder-answer").innerHTML = question.selected.length
        ? question.selected.map((chunk, index) => `<button class="sentence-chunk placed" type="button" data-sentence-selected="${index}" ${locked ? "disabled" : ""}>${escapeSearchHtml(chunk.text)}</button>`).join("")
        : '<p id="sentence-builder-placeholder">Tap the chunks below in order.</p>';
    document.getElementById("sentence-builder-check").disabled = locked || question.selected.length !== question.chunks.length;
    document.getElementById("sentence-builder-clear").disabled = locked || !question.selected.length;
}

function renderSentenceBuilderQuestion() {
    const session = sentenceBuilderSession;
    if (!session) return;
    const question = session.questions[session.index];
    document.getElementById("sentence-builder-loading").hidden = true;
    document.getElementById("sentence-builder-results").hidden = true;
    document.getElementById("sentence-builder-question").hidden = false;
    document.getElementById("sentence-builder-category").textContent = question.category;
    document.getElementById("sentence-builder-difficulty").textContent = question.difficulty;
    document.getElementById("sentence-builder-progress").textContent = `${session.index + 1} / ${session.questions.length}`;
    document.getElementById("sentence-builder-english").textContent = question.english;
    document.getElementById("sentence-builder-feedback").hidden = true;
    renderSentenceBuilderChunks();
    if (question.answered) showSentenceBuilderFeedback(question, question.wasCorrect);
    applyPracticeRomajiVisibility();
}

function startSentenceBuilderSession(bank) {
    sentenceBuilderSession = { questions:shuffledPracticeQuestions(bank).slice(0, 10).map(prepareSentenceBuilderQuestion), index:0, correct:0, completed:false };
    renderSentenceBuilderQuestion();
}

async function openSentenceBuilder() {
    const loading = document.getElementById("sentence-builder-loading");
    loading.hidden = false;
    loading.textContent = "Preparing your practice…";
    try {
        const bank = await loadSentenceBuilderBank();
        if (!validateSentenceBuilderBank(bank)) throw new Error("Sentence Builder question validation failed.");
        if (currentRoute !== "practice-sentence-builder") return;
        if (!sentenceBuilderSession) startSentenceBuilderSession(bank);
        else if (sentenceBuilderSession.completed) renderSentenceBuilderResults();
        else renderSentenceBuilderQuestion();
    }
    catch (error) {
        console.warn("Sentence Builder could not start.", error);
        loading.textContent = "Practice could not be prepared. Check your connection and try again.";
    }
}

function addSentenceBuilderChunk(sourceIndex) {
    const question = sentenceBuilderSession?.questions[sentenceBuilderSession.index];
    if (!question || question.answered) return;
    const availableIndex = question.available.findIndex(chunk => chunk.sourceIndex === sourceIndex);
    if (availableIndex < 0) return;
    question.selected.push(question.available.splice(availableIndex, 1)[0]);
    renderSentenceBuilderChunks();
}

function removeSentenceBuilderChunk(selectedIndex) {
    const question = sentenceBuilderSession?.questions[sentenceBuilderSession.index];
    if (!question || question.answered || selectedIndex < 0 || selectedIndex >= question.selected.length) return;
    question.available.push(question.selected.splice(selectedIndex, 1)[0]);
    renderSentenceBuilderChunks();
}

function clearSentenceBuilderAnswer() {
    const question = sentenceBuilderSession?.questions[sentenceBuilderSession.index];
    if (!question || question.answered) return;
    question.available.push(...question.selected.splice(0));
    renderSentenceBuilderChunks();
}

function checkSentenceBuilderAnswer() {
    const session = sentenceBuilderSession;
    const question = session?.questions[session.index];
    if (!question || question.answered || question.selected.length !== question.chunks.length) return;
    question.answered = true;
    const correct = question.selected.every((chunk, index) => chunk.sourceIndex === question.correctOrder[index]);
    question.wasCorrect = correct;
    if (correct) session.correct += 1;
    renderSentenceBuilderChunks();
    showSentenceBuilderFeedback(question, correct);
}

function showSentenceBuilderFeedback(question, correct) {
    const session = sentenceBuilderSession;
    const feedback = document.getElementById("sentence-builder-feedback");
    feedback.hidden = false;
    feedback.classList.toggle("correct", correct);
    feedback.classList.toggle("incorrect", !correct);
    document.getElementById("sentence-builder-feedback-title").textContent = correct ? "✓ Correct" : "Not quite";
    document.getElementById("sentence-builder-japanese").textContent = question.sentence;
    document.getElementById("sentence-builder-kana").textContent = question.kana;
    document.getElementById("sentence-builder-romaji").textContent = question.romaji;
    document.getElementById("sentence-builder-result-english").textContent = question.english;
    document.getElementById("sentence-builder-explanation").textContent = question.explanation;
    document.getElementById("sentence-builder-next").textContent = session.index === session.questions.length - 1 ? "See Results" : "Next";
    applyPracticeRomajiVisibility();
}

function renderSentenceBuilderResults() {
    const session = sentenceBuilderSession;
    if (!session) return;
    document.getElementById("sentence-builder-loading").hidden = true;
    document.getElementById("sentence-builder-question").hidden = true;
    document.getElementById("sentence-builder-results").hidden = false;
    document.getElementById("sentence-builder-final-score").textContent = `${session.correct} / ${session.questions.length}`;
}

function nextSentenceBuilderQuestion() {
    const session = sentenceBuilderSession;
    const question = session?.questions[session.index];
    if (!question?.answered) return;
    if (session.index < session.questions.length - 1) {
        session.index += 1;
        renderSentenceBuilderQuestion();
        return;
    }
    session.completed = true;
    renderSentenceBuilderResults();
}

function loadPersonalitiesBank() {
    if (Array.isArray(window.ONE_LINE_MANY_PERSONALITIES_DATA)) return Promise.resolve(window.ONE_LINE_MANY_PERSONALITIES_DATA);
    if (personalitiesBankPromise) return personalitiesBankPromise;
    personalitiesBankPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "./data/practice-one-line-many-personalities.js?v=3";
        script.onload = () => Array.isArray(window.ONE_LINE_MANY_PERSONALITIES_DATA) ? resolve(window.ONE_LINE_MANY_PERSONALITIES_DATA) : reject(new Error("Personality practice content is unavailable."));
        script.onerror = () => reject(new Error("Personality practice content could not be loaded."));
        document.head.appendChild(script);
    });
    return personalitiesBankPromise;
}

function validatePersonalitiesBank(bank) {
    const ids = new Set();
    return Array.isArray(bank) && bank.length >= 10 && bank.every(entry => {
        const labels = Array.isArray(entry?.variants) ? entry.variants.map(variant => variant?.label) : [];
        const valid = entry && typeof entry.id === "string" && !ids.has(entry.id)
            && ["Everyday", "Friendship", "Workplace", "Expressive"].includes(entry.category)
            && [entry.coreMeaning, entry.situation].every(value => typeof value === "string" && value.trim())
            && Array.isArray(entry.variants) && entry.variants.length >= 3 && new Set(labels).size === labels.length
            && entry.variants.every(variant => [variant.label, variant.japanese, variant.kana, variant.romaji, variant.english, variant.nuance].every(value => typeof value === "string" && value.trim()));
        if (valid) ids.add(entry.id);
        return Boolean(valid);
    });
}

function renderPersonalitiesResults() {
    document.getElementById("personalities-loading").hidden = true;
    document.getElementById("personalities-question").hidden = true;
    document.getElementById("personalities-results").hidden = false;
}

function selectPersonalityVariant(index) {
    const entry = personalitiesSession?.entries[personalitiesSession.index];
    const variant = entry?.variants[index];
    if (!variant) return;
    entry.selectedVariant = index;
    document.querySelectorAll("[data-personality-variant]").forEach(button => {
        const active = Number(button.dataset.personalityVariant) === index;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
    document.getElementById("personalities-detail").hidden = false;
    document.getElementById("personalities-selected-label").textContent = variant.label;
    const register = variant.formality || variant.tone || "";
    document.getElementById("personalities-formality").textContent = register;
    document.getElementById("personalities-formality").hidden = !register;
    document.getElementById("personalities-japanese").textContent = variant.japanese;
    document.getElementById("personalities-kana").textContent = variant.kana;
    document.getElementById("personalities-romaji").textContent = variant.romaji;
    document.getElementById("personalities-english").textContent = variant.english;
    document.getElementById("personalities-nuance").textContent = variant.nuance;
    const warning = document.getElementById("personalities-warning");
    warning.hidden = !variant.warning;
    warning.querySelector("p").textContent = variant.warning || "";
    applyPracticeRomajiVisibility();
}

function renderPersonalitiesEntry() {
    const session = personalitiesSession;
    if (!session) return;
    if (session.completed) { renderPersonalitiesResults(); return; }
    const entry = session.entries[session.index];
    document.getElementById("personalities-loading").hidden = true;
    document.getElementById("personalities-results").hidden = true;
    document.getElementById("personalities-question").hidden = false;
    document.getElementById("personalities-category").textContent = entry.category;
    document.getElementById("personalities-progress").textContent = `${session.index + 1} / ${session.entries.length}`;
    document.getElementById("personalities-core-meaning").textContent = `“${entry.coreMeaning}”`;
    document.getElementById("personalities-situation").textContent = entry.situation;
    document.getElementById("personalities-chips").innerHTML = entry.variants.map((variant, index) => `<button class="personality-chip" type="button" role="tab" data-personality-variant="${index}" aria-selected="false">${escapeSearchHtml(variant.label)}</button>`).join("");
    document.getElementById("personalities-detail").hidden = true;
    document.getElementById("personalities-next").textContent = session.index === session.entries.length - 1 ? "Finish Session" : "Next";
    if (entry.selectedVariant >= 0) selectPersonalityVariant(entry.selectedVariant);
    applyPracticeRomajiVisibility();
}

function startPersonalitiesSession(bank) {
    personalitiesSession = { entries:shuffledPracticeQuestions(bank).slice(0, 10).map(entry => ({ ...entry, variants:entry.variants.slice(), selectedVariant:-1 })), index:0, completed:false };
    renderPersonalitiesEntry();
}

async function openPersonalitiesPractice() {
    const loading = document.getElementById("personalities-loading");
    loading.hidden = false;
    loading.textContent = "Preparing your practice…";
    try {
        const bank = await loadPersonalitiesBank();
        if (!validatePersonalitiesBank(bank)) throw new Error("Personality practice validation failed.");
        if (currentRoute !== "practice-one-line-many-personalities") return;
        if (!personalitiesSession) startPersonalitiesSession(bank);
        else renderPersonalitiesEntry();
    }
    catch (error) {
        console.warn("One Line, Many Personalities could not start.", error);
        loading.textContent = "Practice could not be prepared. Check your connection and try again.";
    }
}

function nextPersonalitiesEntry() {
    const session = personalitiesSession;
    if (!session) return;
    if (session.index < session.entries.length - 1) session.index += 1;
    else session.completed = true;
    renderPersonalitiesEntry();
}


/* =====================================================
   Kaomoji quick-copy library
   Lazy-loaded, 50 visible items max, usage-ranked.
===================================================== */

function normalizeKaomojiSearch(value) {
    return String(value || "").normalize("NFKC").replace(/[\u3000\s]+/g, " ").trim().toLocaleLowerCase();
}

function normalizeKaomojiRecord(record, index) {
    const tags = [...new Set([...(Array.isArray(record.tags) ? record.tags : []), record.category].filter(Boolean).map(value => String(value).trim()).filter(Boolean))];
    const searchTerms = Array.isArray(record.searchTerms) ? record.searchTerms.map(value => String(value).trim()).filter(Boolean) : [];
    const label = String(record.label || record.category || "Kaomoji").trim();
    const category = String(record.category || "Other").trim();
    const mood = String(record.mood || "").trim();
    const semanticSource = [label, category, mood, ...tags, ...searchTerms].filter(Boolean).join(" ");
    const tagSearch = tags.map(searchText);
    const categorySearch = searchText(category);
    let fallbackRank = -1;
    KAOMOJI_DEFAULT_TAGS.forEach((value, index) => {
        if (categorySearch === value || tagSearch.includes(value)) fallbackRank = Math.max(fallbackRank, KAOMOJI_DEFAULT_TAGS.length - index);
    });
    return {
        id:String(record.id),
        type:"kaomoji",
        kaomoji:String(record.kaomoji),
        expression:String(record.kaomoji),
        label,
        category,
        tags,
        mood,
        intensity:String(record.intensity || ""),
        animationHint:String(record.animationHint || ""),
        searchTerms,
        meaning:label,
        english:label,
        _kaomojiIndex:index,
        _kaomojiRawSearch:normalizeKaomojiSearch(`${record.kaomoji} ${semanticSource}`),
        _kaomojiSemanticSearch:searchText(semanticSource),
        _kaomojiLabelSearch:searchText(label),
        _kaomojiCategorySearch:categorySearch,
        _kaomojiTagSearch:tagSearch,
        _kaomojiFallbackRank:fallbackRank
    };
}

function loadKaomojiData() {
    if (kaomojiData) return Promise.resolve(kaomojiData);
    if (kaomojiDataPromise) return kaomojiDataPromise;
    kaomojiDataPromise = fetch("./data/kaomoji.json?v=1")
        .then(response => {
            if (!response.ok) throw new Error(`Kaomoji data returned ${response.status}.`);
            return response.json();
        })
        .then(payload => {
            if (!payload || !Array.isArray(payload.records) || !payload.records.length) throw new Error("Kaomoji data validation failed.");
            const seenIds = new Set();
            const seenFaces = new Set();
            kaomojiData = payload.records
                .filter(record => record && typeof record.id === "string" && record.id && typeof record.kaomoji === "string" && record.kaomoji.trim())
                .filter(record => {
                    if (seenIds.has(record.id) || seenFaces.has(record.kaomoji)) return false;
                    seenIds.add(record.id);
                    seenFaces.add(record.kaomoji);
                    return true;
                })
                .map(normalizeKaomojiRecord);
            if (!kaomojiData.length) throw new Error("Kaomoji data did not contain usable records.");
            kaomojiById = new Map(kaomojiData.map(item => [item.id, item]));
            return kaomojiData;
        })
        .catch(error => {
            kaomojiDataPromise = null;
            throw error;
        });
    return kaomojiDataPromise;
}

function kaomojiUsageStats(id) {
    const value = kaomojiUsage[id];
    if (!value || typeof value !== "object") return { count:0, lastUsed:0 };
    const count = Number(value.count);
    const lastUsed = Number(value.lastUsed);
    return {
        count:Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0,
        lastUsed:Number.isFinite(lastUsed) ? Math.max(0, lastUsed) : 0
    };
}

function recordKaomojiUse(id) {
    const previous = kaomojiUsageStats(id);
    kaomojiUsage[id] = { count:previous.count + 1, lastUsed:Date.now() };
    writeJson(STORAGE.kaomojiUsage, kaomojiUsage);
}

function defaultKaomojiItems() {
    if (!kaomojiData) return [];
    return kaomojiData
        .map(item => ({ item, usage:kaomojiUsageStats(item.id) }))
        .sort((a, b) => b.usage.count - a.usage.count
            || b.usage.lastUsed - a.usage.lastUsed
            || b.item._kaomojiFallbackRank - a.item._kaomojiFallbackRank
            || a.item._kaomojiIndex - b.item._kaomojiIndex)
        .slice(0, KAOMOJI_VISIBLE_LIMIT)
        .map(result => result.item);
}

function prepareKaomojiQuery(query) {
    const raw = normalizeKaomojiSearch(query);
    const semantic = searchText(query);
    return {
        original:String(query || "").trim(),
        raw,
        semantic,
        tokens:semantic.split(/\s+/).filter(Boolean)
    };
}

function kaomojiSearchScore(item, preparedQuery) {
    const { raw, semantic, original, tokens } = preparedQuery;
    if (!raw && !semantic) return 0;
    let score = 0;
    const rawFace = normalizeKaomojiSearch(item.kaomoji);
    if (raw && rawFace === raw) score = 1700;
    else if (raw && original && item.kaomoji.includes(original)) score = Math.max(score, 1450);
    if (semantic) {
        if (item._kaomojiLabelSearch === semantic) score = Math.max(score, 1350);
        if (item._kaomojiCategorySearch === semantic) score = Math.max(score, 1280);
        if (item._kaomojiTagSearch.includes(semantic)) score = Math.max(score, 1240);
        if (item._kaomojiSemanticSearch.startsWith(semantic)) score = Math.max(score, 1050);
        else if (item._kaomojiSemanticSearch.includes(semantic)) score = Math.max(score, 900);
        if (tokens.length > 1) {
            let matched = 0;
            for (const token of tokens) if (item._kaomojiSemanticSearch.includes(token)) matched += 1;
            if (matched === tokens.length) score = Math.max(score, 1120 + Math.min(80, tokens.length * 10));
            else if (matched) score = Math.max(score, 450 + matched * 70);
        }
    }
    return score;
}

function findKaomojiMatches(query, limit = KAOMOJI_VISIBLE_LIMIT) {
    if (!kaomojiData) return [];
    const preparedQuery = prepareKaomojiQuery(query);
    const matches = [];
    for (const item of kaomojiData) {
        const score = kaomojiSearchScore(item, preparedQuery);
        if (score <= 0) continue;
        matches.push({ item, score, usage:kaomojiUsageStats(item.id) });
    }
    matches.sort((a, b) => b.score - a.score
        || b.usage.count - a.usage.count
        || b.usage.lastUsed - a.usage.lastUsed
        || a.item._kaomojiIndex - b.item._kaomojiIndex);
    return matches.slice(0, limit).map(({ item, score }) => ({ item, score }));
}

function kaomojiUniversalSearchResults(query) {
    if (!kaomojiData || !["all", "kaomoji"].includes(searchType)) return [];
    const limit = searchType === "kaomoji" ? KAOMOJI_VISIBLE_LIMIT : 18;
    return findKaomojiMatches(query, limit);
}

function renderKaomoji() {
    if (!kaomojiData) return;
    const input = document.getElementById("kaomoji-search");
    const query = input.value.trim();
    const matches = query ? findKaomojiMatches(query, KAOMOJI_VISIBLE_LIMIT) : defaultKaomojiItems().map(item => ({ item, score:0 }));
    const items = matches.map(result => result.item);
    const list = document.getElementById("kaomoji-list");
    list.innerHTML = items.map(item => `<button class="kaomoji-card" type="button" data-kaomoji-copy="${escapeSearchHtml(item.id)}" aria-label="Copy ${escapeSearchHtml(item.kaomoji)}">
        <span class="kaomoji-glyph">${escapeSearchHtml(item.kaomoji)}</span>
        <span class="kaomoji-card-meta"><strong>${escapeSearchHtml(item.label)}</strong><small>${escapeSearchHtml(item.category)}</small></span>
        <span class="kaomoji-copy-label" aria-hidden="true">Copy</span>
    </button>`).join("");
    const summary = document.getElementById("kaomoji-result-summary");
    summary.textContent = query
        ? `${items.length}${matches.length === KAOMOJI_VISIBLE_LIMIT ? "+" : ""} matching kaomoji`
        : `${items.length} quick picks · ${kaomojiData.length.toLocaleString()} available`;
    document.getElementById("clear-kaomoji-search").hidden = !query;
    document.getElementById("kaomoji-empty").hidden = items.length > 0;
}

function scheduleKaomojiRender() {
    window.clearTimeout(kaomojiSearchTimer);
    const input = document.getElementById("kaomoji-search");
    if (!input.value.trim()) { renderKaomoji(); return; }
    kaomojiSearchTimer = window.setTimeout(renderKaomoji, 120);
}

function showKaomojiCopyToast(message = "Copied!") {
    const toast = document.getElementById("kaomoji-copy-toast");
    if (!toast) return;
    window.clearTimeout(kaomojiCopyToastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add("show");
    kaomojiCopyToastTimer = window.setTimeout(() => {
        toast.classList.remove("show");
        window.setTimeout(() => { if (!toast.classList.contains("show")) toast.hidden = true; }, 160);
    }, 950);
}

async function copyPlainText(text) {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        }
        catch (error) {
            console.info("Clipboard API unavailable; using fallback.", error);
        }
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let copied = false;
    try { copied = document.execCommand("copy"); }
    catch (error) { console.info("Clipboard fallback unavailable.", error); }
    textarea.remove();
    return copied;
}

async function copyKaomojiItem(item) {
    if (!item?.kaomoji) return;
    const copied = await copyPlainText(item.kaomoji);
    if (!copied) {
        showKaomojiCopyToast("Copy unavailable — press and hold instead.");
        return;
    }
    recordKaomojiUse(item.id);
    showKaomojiCopyToast("Copied!");
}

function openKaomoji() {
    const loading = document.getElementById("kaomoji-loading");
    const list = document.getElementById("kaomoji-list");
    const empty = document.getElementById("kaomoji-empty");
    if (kaomojiData) {
        loading.hidden = true;
        renderKaomoji();
        return;
    }
    loading.hidden = false;
    loading.textContent = "Preparing Kaomoji…";
    list.innerHTML = "";
    empty.hidden = true;
    loadKaomojiData()
        .then(() => {
            if (currentRoute !== "kaomoji") return;
            loading.hidden = true;
            renderKaomoji();
        })
        .catch(error => {
            console.warn("Kaomoji could not load.", error);
            if (currentRoute !== "kaomoji") return;
            loading.hidden = false;
            loading.textContent = "Kaomoji could not be prepared. Check that data/kaomoji.json is in the project, then reopen Sakura.";
        });
}

function validateCountersData(records) {
    if (!Array.isArray(records) || !records.length) return false;
    const ids = new Set();
    const identities = new Set();
    const frequencies = new Set(["Essential", "Common", "Specialized", "Rare"]);
    return records.every(record => {
        const identity = `${record?.counter || ""}\u0000${record?.reading || ""}`;
        const coreValid = record?.type === "counter" && typeof record.id === "string" && record.id
            && typeof record.counter === "string" && record.counter.trim()
            && typeof record.reading === "string" && record.reading.trim()
            && typeof record.romaji === "string" && record.romaji.trim()
            && Array.isArray(record.categories) && record.categories.length
            && frequencies.has(record.frequencyTier)
            && typeof record.usedFor === "string" && record.usedFor.trim()
            && typeof record.explanation === "string" && record.explanation.trim()
            && Array.isArray(record.countTable);
        const rowsValid = record?.countTable?.every(row => Number.isFinite(Number(row.number)) && [row.japanese, row.kana, row.romaji].every(value => typeof value === "string" && value.trim()));
        if (!coreValid || !rowsValid || ids.has(record.id) || identities.has(identity)) return false;
        ids.add(record.id);
        identities.add(identity);
        return true;
    });
}

function loadCountersData() {
    if (countersData) return Promise.resolve(countersData);
    if (countersDataPromise) return countersDataPromise;
    countersDataPromise = fetch("./data/counters.json?v=2")
        .then(response => { if (!response.ok) throw new Error(`Counters data returned ${response.status}.`); return response.json(); })
        .then(records => {
            if (!validateCountersData(records)) throw new Error("Counters data validation failed.");
            countersData = records;
            return countersData;
        })
        .catch(error => { countersDataPromise = null; throw error; });
    return countersDataPromise;
}

function counterSearchText(counter) {
    return searchText([counter.counter, counter.reading, counter.romaji, counter.usedFor, ...(counter.categories || []), counter.explanation, counter.notes, counter.learnerCaution].filter(Boolean).join(" "));
}

function filteredCounters() {
    const query = searchText(document.getElementById("counters-search").value);
    const category = document.getElementById("counters-category-filter").value;
    const frequency = document.getElementById("counters-frequency-filter").value;
    return (countersData || []).filter(counter => (!query || counterSearchText(counter).includes(query))
        && (category === "all" || counter.categories.includes(category))
        && (frequency === "all" || counter.frequencyTier === frequency));
}

function applyCountersRomajiVisibility() {
    document.querySelectorAll("[data-counter-romaji]").forEach(element => { element.hidden = !countersRomajiVisible; });
    ["counters-romaji-toggle", "counter-detail-romaji-toggle"].forEach(id => {
        const button = document.getElementById(id);
        button.textContent = countersRomajiVisible ? "Hide Romaji" : "Show Romaji";
        button.setAttribute("aria-pressed", String(countersRomajiVisible));
    });
}

function renderCounterFilters() {
    const select = document.getElementById("counters-category-filter");
    const selected = select.value;
    const categories = [...new Set((countersData || []).flatMap(counter => counter.categories))];
    select.innerHTML = '<option value="all">All Counters</option>' + categories.map(category => `<option value="${escapeSearchHtml(category)}">${escapeSearchHtml(category)}</option>`).join("");
    select.value = categories.includes(selected) ? selected : "all";
}

function renderCounters() {
    if (!countersData) return;
    const counters = filteredCounters();
    document.getElementById("counters-count").textContent = `${counters.length} of ${countersData.length} counters`;
    document.getElementById("counters-list").innerHTML = counters.map(counter => `<button class="counter-card" type="button" data-counter-id="${escapeSearchHtml(counter.id)}"><span class="counter-card-character">${escapeSearchHtml(counter.counter)}</span><span class="counter-card-reading">${escapeSearchHtml(counter.reading)}</span><span class="counter-romaji" data-counter-romaji hidden>${escapeSearchHtml(counter.romaji)}</span><strong>${escapeSearchHtml(counter.usedFor)}</strong><span class="tag">${escapeSearchHtml(counter.frequencyTier)}</span></button>`).join("");
    document.getElementById("counters-empty").hidden = counters.length > 0;
    applyCountersRomajiVisibility();
}

function renderCounterDetail(counter) {
    if (!counter) return;
    currentCounter = counter;
    document.getElementById("counters-home").hidden = true;
    document.getElementById("counter-detail").hidden = false;
    document.getElementById("counter-detail-heading").textContent = counter.referenceKind === "numbers" ? "Japanese Numbers" : `${counter.counter} Counter`;
    document.getElementById("counter-detail-character").textContent = counter.counter;
    document.getElementById("counter-detail-reading").textContent = counter.reading;
    document.getElementById("counter-detail-romaji").textContent = counter.romaji;
    document.getElementById("counter-detail-romaji").dataset.counterRomaji = "";
    document.getElementById("counter-detail-frequency").textContent = counter.frequencyTier;
    document.getElementById("counter-detail-categories").innerHTML = counter.categories.map(category => `<span class="tag">${escapeSearchHtml(category)}</span>`).join("");
    document.getElementById("counter-detail-used-for").textContent = counter.usedFor;
    document.getElementById("counter-detail-explanation").textContent = counter.explanation;
    const notes = [counter.notes, counter.learnerCaution].filter(Boolean).join("\n");
    document.getElementById("counter-detail-notes").textContent = notes;
    document.getElementById("counter-detail-notes-section").hidden = !notes;
    const hasTable = counter.countTable.length > 0;
    document.getElementById("counter-table-section").hidden = !hasTable;
    document.getElementById("counter-no-table").hidden = hasTable;
    document.getElementById("counter-count-table").innerHTML = hasTable ? counter.countTable.map(row => `<article class="counter-count-row"><span>${escapeSearchHtml(row.number)}</span><strong>${escapeSearchHtml(row.japanese)}</strong><span>${escapeSearchHtml(row.kana)}</span><span class="counter-romaji" data-counter-romaji hidden>${escapeSearchHtml(row.romaji)}</span></article>`).join("") : "";
    applyCountersRomajiVisibility();
    window.scrollTo({ top:0, behavior:"smooth" });
}

function closeCounterDetail() {
    currentCounter = null;
    document.getElementById("counter-detail").hidden = true;
    document.getElementById("counters-home").hidden = false;
    window.scrollTo({ top:0, behavior:"smooth" });
}

async function openCounters() {
    currentCounter = null;
    document.getElementById("counters-home").hidden = false;
    document.getElementById("counter-detail").hidden = true;
    document.getElementById("counters-loading").hidden = false;
    try {
        await loadCountersData();
        if (currentRoute !== "counters") return;
        renderCounterFilters();
        renderCounters();
        document.getElementById("counters-loading").hidden = true;
    }
    catch (error) {
        console.warn("Japanese Counters could not load.", error);
        document.getElementById("counters-loading").textContent = "Japanese Counters could not be prepared. Please try again after Sakura updates.";
    }
}

function validateParticlesData(records) {
    if (!Array.isArray(records) || !records.length) return false;
    const ids = new Set();
    const frequencies = new Set(["Essential","Common","Advanced"]);
    return records.every(record => {
        const valid = record?.type === "particle" && typeof record.id === "string" && record.id
            && typeof record.particle === "string" && record.particle.trim()
            && typeof record.reading === "string" && record.reading.trim()
            && typeof record.romaji === "string" && record.romaji.trim()
            && Array.isArray(record.categories) && record.categories.length
            && frequencies.has(record.frequencyTier)
            && typeof record.coreMeaning === "string" && record.coreMeaning.trim()
            && typeof record.usedFor === "string" && record.usedFor.trim()
            && typeof record.explanation === "string" && record.explanation.trim()
            && Array.isArray(record.patterns) && Array.isArray(record.examples) && record.examples.length;
        if (!valid || ids.has(record.id)) return false;
        ids.add(record.id); return true;
    });
}
function loadParticlesData() {
    if (particlesData) return Promise.resolve(particlesData);
    if (particlesDataPromise) return particlesDataPromise;
    particlesDataPromise = fetch("./data/particles.json?v=1")
        .then(r => { if (!r.ok) throw new Error(`Particles data returned ${r.status}.`); return r.json(); })
        .then(records => { if (!validateParticlesData(records)) throw new Error("Particles data validation failed."); particlesData = records; return records; })
        .catch(error => { particlesDataPromise = null; throw error; });
    return particlesDataPromise;
}
function particleSearchText(item) { return searchText([item.particle,item.reading,item.romaji,item.coreMeaning,item.usedFor,...(item.categories||[]),item.explanation,item.notes,item.learnerCaution,...(item.patterns||[]).flatMap(x=>[x.form,x.meaning]),...(item.examples||[]).flatMap(x=>[x.japanese,x.kana,x.romaji,x.english])].filter(Boolean).join(" ")); }
function filteredParticles() {
    const q=searchText(document.getElementById("particles-search").value), c=document.getElementById("particles-category-filter").value, f=document.getElementById("particles-frequency-filter").value;
    return (particlesData||[]).filter(x=>(!q||particleSearchText(x).includes(q))&&(c==="all"||x.categories.includes(c))&&(f==="all"||x.frequencyTier===f));
}
function applyParticlesRomajiVisibility() {
    document.querySelectorAll("[data-particle-romaji]").forEach(el=>{el.hidden=!particlesRomajiVisible;});
    ["particles-romaji-toggle","particle-detail-romaji-toggle"].forEach(id=>{const b=document.getElementById(id); if(b){b.textContent=particlesRomajiVisible?"Hide Romaji":"Show Romaji"; b.setAttribute("aria-pressed",String(particlesRomajiVisible));}});
}
function renderParticleFilters() {
    const s=document.getElementById("particles-category-filter"), selected=s.value, cats=[...new Set((particlesData||[]).flatMap(x=>x.categories))].sort();
    s.innerHTML='<option value="all">All Particles</option>'+cats.map(x=>`<option value="${escapeSearchHtml(x)}">${escapeSearchHtml(x)}</option>`).join(""); s.value=cats.includes(selected)?selected:"all";
}
function renderParticles() {
    if(!particlesData)return; const items=filteredParticles();
    document.getElementById("particles-count").textContent=`${items.length} of ${particlesData.length} particles`;
    document.getElementById("particles-list").innerHTML=items.map(x=>`<button class="counter-card particle-card" type="button" data-particle-id="${escapeSearchHtml(x.id)}"><span class="counter-card-character">${escapeSearchHtml(x.particle)}</span><span class="counter-card-reading">${escapeSearchHtml(x.reading)}</span><span class="counter-romaji" data-particle-romaji hidden>${escapeSearchHtml(x.romaji)}</span><strong>${escapeSearchHtml(x.coreMeaning)}</strong><span class="tag">${escapeSearchHtml(x.frequencyTier)}</span></button>`).join("");
    document.getElementById("particles-empty").hidden=items.length>0; applyParticlesRomajiVisibility();
}
function renderParticleDetail(x) {
    if(!x)return; currentParticle=x; document.getElementById("particles-home").hidden=true; document.getElementById("particle-detail").hidden=false;
    document.getElementById("particle-detail-heading").textContent=`${x.particle} Particle`; document.getElementById("particle-detail-character").textContent=x.particle; document.getElementById("particle-detail-reading").textContent=x.reading; document.getElementById("particle-detail-romaji").textContent=x.romaji; document.getElementById("particle-detail-frequency").textContent=x.frequencyTier;
    document.getElementById("particle-detail-categories").innerHTML=x.categories.map(v=>`<span class="tag">${escapeSearchHtml(v)}</span>`).join(""); document.getElementById("particle-detail-core").textContent=x.coreMeaning; document.getElementById("particle-detail-used-for").textContent=x.usedFor; document.getElementById("particle-detail-explanation").textContent=x.explanation;
    document.getElementById("particle-pattern-list").innerHTML=x.patterns.map(v=>`<article class="particle-pattern-row"><strong>${escapeSearchHtml(v.form)}</strong><span>${escapeSearchHtml(v.meaning)}</span></article>`).join("");
    document.getElementById("particle-example-list").innerHTML=x.examples.map(v=>`<article class="particle-example-card"><strong>${escapeSearchHtml(v.japanese)}</strong><span>${escapeSearchHtml(v.kana)}</span><span class="counter-romaji" data-particle-romaji hidden>${escapeSearchHtml(v.romaji)}</span><p>${escapeSearchHtml(v.english)}</p><button class="suite-audio-mini" type="button" data-sakura-speak data-speak-text="${escapeSearchHtml(v.japanese)}" aria-label="Hear example">🔊 Hear</button></article>`).join("");
    const cs=document.getElementById("particle-contrast-section"), c=x.contrasts||[]; cs.hidden=!c.length; document.getElementById("particle-contrast-list").innerHTML=c.map(v=>`<article class="particle-contrast-row"><strong>${escapeSearchHtml(v.particle)}</strong><p>${escapeSearchHtml(v.explanation)}</p></article>`).join("");
    const notes=[x.notes,x.learnerCaution].filter(Boolean).join("\n"); document.getElementById("particle-detail-notes").textContent=notes; document.getElementById("particle-detail-notes-section").hidden=!notes; applyParticlesRomajiVisibility(); window.scrollTo({top:0,behavior:"smooth"});
}
function closeParticleDetail(){ currentParticle=null; document.getElementById("particle-detail").hidden=true; document.getElementById("particles-home").hidden=false; window.scrollTo({top:0,behavior:"smooth"}); }
async function openParticles(){ currentParticle=null; document.getElementById("particles-home").hidden=false; document.getElementById("particle-detail").hidden=true; const l=document.getElementById("particles-loading"); l.hidden=false; l.textContent="Preparing Japanese Particles…"; try{await loadParticlesData(); if(currentRoute!=="particles")return; renderParticleFilters(); renderParticles(); l.hidden=true;}catch(e){console.warn("Japanese Particles could not load.",e); if(currentRoute==="particles"){l.hidden=false;l.textContent="Japanese Particles could not be prepared. Please try again after Sakura updates.";}} }

function validateGrammarData(records){ if(!Array.isArray(records)||!records.length)return false; const ids=new Set(); return records.every(x=>{const v=x?.type==="grammar"&&typeof x.id==="string"&&x.id&&typeof x.pattern==="string"&&x.pattern.trim()&&typeof x.reading==="string"&&x.reading.trim()&&typeof x.romaji==="string"&&x.romaji.trim()&&JLPT_LEVELS.includes(x.jlpt)&&Array.isArray(x.categories)&&x.categories.length&&typeof x.meaning==="string"&&x.meaning.trim()&&Array.isArray(x.formation)&&x.formation.length&&typeof x.explanation==="string"&&x.explanation.trim()&&Array.isArray(x.examples)&&x.examples.length; if(!v||ids.has(x.id))return false; ids.add(x.id); return true;}); }
function loadGrammarData(){ if(grammarData)return Promise.resolve(grammarData); if(grammarDataPromise)return grammarDataPromise; grammarDataPromise=fetch("./data/grammar.json?v=2").then(r=>{if(!r.ok)throw new Error(`Grammar data returned ${r.status}.`);return r.json();}).then(records=>{if(!validateGrammarData(records))throw new Error("Grammar data validation failed."); grammarData=records; return records;}).catch(e=>{grammarDataPromise=null;throw e;}); return grammarDataPromise; }
function grammarSearchText(x){return searchText([x.pattern,x.reading,x.romaji,x.jlpt,x.meaning,x.explanation,x.nuance,x.commonMistakes,x.register,...(x.categories||[]),...(x.formation||[]),...(x.related||[]),...(x.examples||[]).flatMap(v=>[v.japanese,v.kana,v.romaji,v.english])].filter(Boolean).join(" "));}
function filteredGrammar(){
    const query=searchText(document.getElementById("grammar-search").value);
    const compactQuery=query.replace(/[\s\-_/・〜～]+/g,"");
    const level=document.getElementById("grammar-level-filter").value;
    const category=document.getElementById("grammar-category-filter").value;
    return (grammarData||[]).filter(item=>{
        const haystack=grammarSearchText(item);
        const compactHaystack=haystack.replace(/[\s\-_/・〜～]+/g,"");
        const matchesQuery=!query||haystack.includes(query)||(compactQuery&&compactHaystack.includes(compactQuery));
        return matchesQuery&&(level==="all"||item.jlpt===level)&&(category==="all"||item.categories.includes(category));
    });
}
function applyGrammarRomajiVisibility(){document.querySelectorAll("[data-grammar-romaji]").forEach(el=>{el.hidden=!grammarRomajiVisible;});["grammar-romaji-toggle","grammar-detail-romaji-toggle"].forEach(id=>{const b=document.getElementById(id);if(b){b.textContent=grammarRomajiVisible?"Hide Romaji":"Show Romaji";b.setAttribute("aria-pressed",String(grammarRomajiVisible));}});}
function renderGrammarFilters(){const s=document.getElementById("grammar-category-filter"),selected=s.value,cats=[...new Set((grammarData||[]).flatMap(x=>x.categories))].sort();s.innerHTML='<option value="all">All Categories</option>'+cats.map(x=>`<option value="${escapeSearchHtml(x)}">${escapeSearchHtml(x)}</option>`).join("");s.value=cats.includes(selected)?selected:"all";}
function renderGrammar(){if(!grammarData)return;const items=filteredGrammar();document.getElementById("grammar-count").textContent=`${items.length} of ${grammarData.length} grammar points`;document.getElementById("grammar-list").innerHTML=items.map(x=>`<button class="grammar-card" type="button" data-grammar-id="${escapeSearchHtml(x.id)}"><div class="grammar-card-top"><span class="grammar-level-badge">${escapeSearchHtml(x.jlpt)}</span><span>${escapeSearchHtml(x.register||"Neutral")}</span></div><strong>${escapeSearchHtml(x.pattern)}</strong><span class="grammar-card-reading">${escapeSearchHtml(x.reading)}</span><span class="counter-romaji" data-grammar-romaji hidden>${escapeSearchHtml(x.romaji)}</span><p>${escapeSearchHtml(x.meaning)}</p></button>`).join("");document.getElementById("grammar-empty").hidden=items.length>0;applyGrammarRomajiVisibility();}
function renderGrammarDetail(x){if(!x)return;currentGrammar=x;document.getElementById("grammar-home").hidden=true;document.getElementById("grammar-detail").hidden=false;document.getElementById("grammar-detail-heading").textContent=x.pattern;document.getElementById("grammar-detail-pattern").textContent=x.pattern;document.getElementById("grammar-detail-reading").textContent=x.reading;document.getElementById("grammar-detail-romaji").textContent=x.romaji;document.getElementById("grammar-detail-level").textContent=x.jlpt;document.getElementById("grammar-detail-register").textContent=x.register||"Neutral";document.getElementById("grammar-detail-categories").innerHTML=x.categories.map(v=>`<span class="tag">${escapeSearchHtml(v)}</span>`).join("");document.getElementById("grammar-detail-meaning").textContent=x.meaning;document.getElementById("grammar-detail-explanation").textContent=x.explanation;document.getElementById("grammar-formation-list").innerHTML=x.formation.map(v=>`<li>${escapeSearchHtml(v)}</li>`).join("");document.getElementById("grammar-example-list").innerHTML=x.examples.map(v=>`<article class="particle-example-card grammar-example-card"><strong>${escapeSearchHtml(v.japanese)}</strong><span>${escapeSearchHtml(v.kana)}</span><span class="counter-romaji" data-grammar-romaji hidden>${escapeSearchHtml(v.romaji)}</span><p>${escapeSearchHtml(v.english)}</p><button class="suite-audio-mini" type="button" data-sakura-speak data-speak-text="${escapeSearchHtml(v.japanese)}" aria-label="Hear example">🔊 Hear</button></article>`).join("");const n=[x.nuance,x.commonMistakes?`Common mistake: ${x.commonMistakes}`:""].filter(Boolean).join("\n");document.getElementById("grammar-detail-nuance").textContent=n;document.getElementById("grammar-detail-nuance-section").hidden=!n;const rel=x.related||[];document.getElementById("grammar-related-section").hidden=!rel.length;document.getElementById("grammar-related-list").innerHTML=rel.map(v=>`<span class="tag">${escapeSearchHtml(v)}</span>`).join("");applyGrammarRomajiVisibility();window.scrollTo({top:0,behavior:"smooth"});}
function closeGrammarDetail(){currentGrammar=null;document.getElementById("grammar-detail").hidden=true;document.getElementById("grammar-home").hidden=false;window.scrollTo({top:0,behavior:"smooth"});}
async function openGrammar(){currentGrammar=null;document.getElementById("grammar-home").hidden=false;document.getElementById("grammar-detail").hidden=true;const l=document.getElementById("grammar-loading");l.hidden=false;l.textContent="Preparing Grammar Garden…";try{await loadGrammarData();if(currentRoute!=="grammar")return;renderGrammarFilters();renderGrammar();l.hidden=true;}catch(e){console.warn("Grammar Garden could not load.",e);if(currentRoute==="grammar"){l.hidden=false;l.textContent="Grammar Garden could not be prepared. Please try again after Sakura updates.";}}}

function validChibiHex(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ""));
}

function normalizeChibiGuide(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
        ...source,
        character: SAKURA_GUIDES.some(option => option[0] === source.character) ? source.character : DEFAULT_CHIBI_GUIDE.character,
        companionEnabled: source.companionEnabled === true,
        companionSide: ["left", "right"].includes(source.companionSide) ? source.companionSide : DEFAULT_CHIBI_GUIDE.companionSide,
        idleAnimations: source.idleAnimations !== false,
        speechBubbles: source.speechBubbles !== false,
        contextReactions: source.contextReactions !== false,
        gestureCoach: source.gestureCoach !== false
    };
}

function chibiPoseFamily(illustration = {}) {
    const pose = searchText(`${illustration.pose || ""} ${illustration.setting || ""}`);
    if (/deep|formal bow|bowing deeply/.test(pose)) return "formal-bow";
    if (/bow|leaning forward/.test(pose)) return "small-bow";
    if (/point|explain|showing|indicating/.test(pose)) return "explaining";
    if (/hands together|palms together|praying|prayer/.test(pose)) return "hands-together";
    if (/sit|seated|kneeling|seiza|bath|onsen/.test(pose)) return "sitting";
    if (/walk|stepping|moving/.test(pose)) return "walking";
    if (/wave|raising hand|stop gesture|no gesture/.test(pose)) return "waving";
    if (/eat|chopstick|bowl|drink|dining/.test(pose)) return "dining";
    if (/hold|carrying|presenting|offering|using|phone|device/.test(pose)) return "holding";
    return "neutral";
}

function chibiProp(illustration = {}) {
    const description = searchText([...(illustration.props || []), illustration.pose, illustration.setting].join(" "));
    const props = [[/phone|smartphone|device/,"📱"],[/chopstick|bowl|food|eat|restaurant/,"🥢"],[/umbrella/,"☂️"],[/backpack|bag|suitcase|luggage/,"🧳"],[/train|station|transit/,"🚉"],[/gift|present/,"🎁"],[/ladle|shrine|temple/,"⛩️"],[/towel|bath|onsen/,"♨️"],[/credit card|payment|wallet|cash/,"💳"],[/passport|airport/,"🛂"]];
    return props.find(([pattern]) => pattern.test(description))?.[1] || "";
}

function chibiExpressionClass(illustration = {}) {
    const expression = searchText(illustration.expression || "");
    if (/wink/.test(expression)) return "wink";
    if (/laugh/.test(expression)) return "laugh";
    if (/soft smile/.test(expression)) return "soft-smile";
    if (/excit|delight|celebrat/.test(expression)) return "excited";
    if (/surpris|shock/.test(expression)) return "surprised";
    if (/angry|annoy/.test(expression)) return "angry";
    if (/sad|unhappy/.test(expression)) return "sad";
    if (/think|ponder|curious/.test(expression)) return "thinking";
    if (/sleep|tired|yawn/.test(expression)) return "sleepy";
    if (/embarrass|shy|awkward/.test(expression)) return "embarrassed";
    if (/concern|worried|nervous/.test(expression)) return "worried";
    if (/proud|confident/.test(expression)) return "proud";
    if (/happy|smile|warm|cheer/.test(expression)) return "happy";
    return "neutral";
}

function chibiTone(hex, amount) {
    const value = String(hex).replace("#", "");
    const channels = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
    const target = amount < 0 ? 0 : 255;
    const weight = Math.min(1, Math.abs(amount));
    return `#${channels.map(channel => Math.round(channel + (target - channel) * weight).toString(16).padStart(2, "0")).join("")}`;
}

function renderLegacyProceduralChibiGuide(settings = chibiGuide, illustration = {}, compact = false) {
    const guide = normalizeChibiGuide(settings);
    const skin = CHIBI_OPTIONS.skinTone.find(option => option[0] === guide.skinTone)?.[2] || "#EFC3A7";
    const pose = chibiPoseFamily(illustration);
    const prop = chibiProp(illustration);
    const expression = chibiExpressionClass(illustration);
    const outfitColors = { "sakura-casual":["#E76F99","#FFF0F5"], "school-inspired":["#6E668D","#EADFE8"], travel:["#5F9FA7","#F2C078"], cafe:["#9A695B","#F5E2D2"], yukata:["#9677B5","#F3AFC4"] }[guide.outfit] || ["#E76F99","#FFF0F5"];
    const hairShadow = chibiTone(guide.hairColor, -.28);
    const hairShade = chibiTone(guide.hairColor, -.14);
    const hairLight = chibiTone(guide.hairColor, .38);
    const eyeDark = chibiTone(guide.eyeColor, -.36);
    const eyeLight = chibiTone(guide.eyeColor, .45);
    const skinShade = chibiTone(skin, -.12);
    const hairBack = {
        bob:`<path d="M43 143C17 93 33 32 83 12c61-25 133 8 139 71 3 33-12 73-38 91l-20-3 9-22-27 24-31-3-27 4-26-23 7 25-22-7c-12-5-19-14-24-26Z"/><path class="svg-hair-shadow" d="M49 103c7 38 27 59 57 68l-31 5c-24-19-32-43-26-73Zm162-7c-2 35-19 60-48 75l27-2c24-19 30-44 21-73Z"/>`,
        long:`<path d="M39 142C11 81 44 16 112 6c70-10 121 40 110 112l13 155-30-15-4 29-31-25-18 31-31-30-25 30-17-31-32 25-3-30-29 16 14-155Z"/><path class="svg-hair-shadow" d="M42 109c8 64 17 109 40 163l20-22-19-132Zm172 2c-8 67-19 112-42 161l-17-23 20-132Z"/>`,
        ponytail:`<path d="M40 143C15 86 41 24 102 9c67-16 125 29 121 98-2 32-15 57-36 72l-34-5-31 10-38-7-28-2c-9-10-14-20-16-32Z"/><path d="M195 69c48-18 73 24 53 75-10 26-29 51-60 69l-16-23 17-10-19-5c26-31 33-67 25-106Z"/><path class="svg-hair-shadow" d="M202 78c24 14 20 65-14 112l-16-15c25-31 31-65 30-97Z"/>`,
        "twin-tails":`<path d="M40 142C15 83 43 20 106 8c65-13 120 33 117 100-2 30-13 55-34 70l-36-5-32 11-37-8-29-2c-8-9-13-20-15-32Z"/><path d="M58 62C28 42 7 59 10 96c2 31 18 65 48 87l20-17-11-8 14-4c-18-28-24-59-23-92Z"/><path d="M202 62c30-20 51-3 48 34-2 31-18 65-48 87l-20-17 11-8-14-4c18-28 24-59 23-92Z"/><path class="svg-hair-shadow" d="M51 69c-12 28-1 67 22 91l8-6c-17-28-23-57-30-85Zm158 0c12 28 1 67-22 91l-8-6c17-28 23-57 30-85Z"/>`,
        shoulder:`<path d="M40 143C13 83 43 20 106 7c68-13 124 35 116 105l8 102-29-13-1 27-29-22-17 24-32-22-28 23-20-25-27 22-2-28-28 14 9-102Z"/><path class="svg-hair-shadow" d="M43 105c7 52 19 86 40 112l18-16-20-91Zm173 2c-6 51-18 85-40 111l-17-17 20-92Z"/>`,
        bun:`<path d="M85 24C84-5 112-18 140-7c25 9 31 36 14 54Z"/><path d="M40 144C14 85 41 24 104 9c68-16 126 32 119 102-3 32-17 55-37 68l-34-6-31 11-37-8-29-2c-8-9-13-19-15-30Z"/><path class="svg-hair-shadow" d="M99 10c19-11 47-2 55 18-20-10-38-10-55-18ZM44 106c7 36 24 58 51 71l-28-2c-20-18-28-41-23-69Z"/>`
    }[guide.hairStyle] || "";
    const fringe = {
        bob:`<path d="M48 82C48 35 84 12 128 13c47 0 81 27 81 76-15-12-27-27-34-44-16 16-38 23-62 24-21 1-42 8-65 13Z"/><path class="svg-bang" d="M67 63q16 4 29-3l-5 20-15 7Zm29-3q18 4 34-1l-5 24-18 6Zm34-1q18 2 35-8l-4 27-19 9Zm35-8q15 5 25 16l-4 22-17-10Z"/><path d="M76 42q37-24 80-9m-70 24q26-15 56-13" class="svg-hair-highlight"/>`,
        long:`<path d="M48 82C46 34 83 10 129 12c48 1 82 31 79 78-15-12-25-28-31-47-20 19-45 28-73 27-19 0-37 6-56 12Z"/><path class="svg-bang" d="M72 63q19 5 35-2L98 82l-18 7Zm35-2q19 4 35-2l-8 25-18 6Zm35-2q18 2 34-9l-4 28-20 9Z"/><path d="M77 39q39-22 82-5m-72 21q28-14 57-10" class="svg-hair-highlight"/>`,
        ponytail:`<path d="M48 82C47 34 83 11 128 12c48 0 82 29 80 77-16-11-27-26-34-44-17 18-39 25-65 25-21 0-40 6-61 12Z"/><path class="svg-bang" d="M70 63q17 4 32-3l-6 22-18 7Zm32-3q19 4 36-1l-6 25-20 6Zm36-1q18 1 34-9l-3 28-20 9Z"/><path d="M78 40q38-23 79-6m-67 20q26-13 54-9" class="svg-hair-highlight"/>`,
        "twin-tails":`<path d="M48 82C47 34 83 11 128 12c48 0 82 29 80 77-16-11-27-26-34-44-17 18-39 25-65 25-21 0-40 6-61 12Z"/><path class="svg-bang" d="M69 63q17 4 32-3l-6 22-18 7Zm32-3q19 4 36-1l-6 25-20 6Zm36-1q18 1 35-9l-3 28-21 9Z"/><path d="M77 40q38-22 80-6m-69 21q27-14 56-10" class="svg-hair-highlight"/>`,
        shoulder:`<path d="M48 82C46 34 82 10 128 12c49 1 83 30 80 78-15-12-26-27-33-45-18 18-41 26-67 25-20 0-40 6-60 12Z"/><path class="svg-bang" d="M70 63q18 5 34-2l-7 21-18 7Zm34-2q19 4 35-2l-7 25-19 6Zm35-2q18 2 35-9l-3 28-21 9Z"/><path d="M77 39q39-22 82-5m-72 21q27-14 57-10" class="svg-hair-highlight"/>`,
        bun:`<path d="M48 82C47 35 82 12 127 13c48 0 82 29 81 76-16-11-27-26-34-44-18 18-40 26-66 25-20 0-39 6-60 12Z"/><path class="svg-bang" d="M70 63q17 4 32-3l-6 22-18 7Zm32-3q19 4 36-1l-6 25-20 6Zm36-1q18 1 34-9l-3 28-20 9Z"/><path d="M79 41q37-21 78-6m-68 20q27-13 55-9" class="svg-hair-highlight"/>`
    }[guide.hairStyle];
    const sideLocks = {
        bob:`<path d="M48 78C35 115 40 151 55 171l8-14c-9-27-8-50 1-70Z"/><path d="M212 78c13 37 8 73-7 93l-8-14c9-27 8-50-1-70Z"/>`,
        long:`<path d="M47 77c-14 54-9 109 7 143l10-22c-10-43-9-78 1-111Z"/><path d="M213 77c14 54 9 109-7 143l-10-22c10-43 9-78-1-111Z"/>`,
        ponytail:`<path d="M48 78c-12 43-8 82 7 104l9-16c-9-31-8-56 1-79Z"/><path d="M212 78c12 43 8 82-7 104l-9-16c9-31 8-56-1-79Z"/>`,
        "twin-tails":`<path d="M48 78c-11 41-7 77 7 99l9-15c-9-29-8-53 1-75Z"/><path d="M212 78c11 41 7 77-7 99l-9-15c9-29 8-53-1-75Z"/>`,
        shoulder:`<path d="M47 77c-13 48-8 94 7 123l10-19c-10-36-8-67 1-94Z"/><path d="M213 77c13 48 8 94-7 123l-10-19c10-36 8-67-1-94Z"/>`,
        bun:`<path d="M48 78c-11 41-7 77 7 99l9-15c-9-29-8-53 1-75Z"/><path d="M212 78c11 41 7 77-7 99l-9-15c9-29 8-53-1-75Z"/>`
    }[guide.hairStyle];
    const eye = (cx, wink = false) => wink ? `<path d="M${cx-24} 119q24 20 48-2" class="svg-eye-line"/><path d="M${cx-23} 116l-7-5m9 12-8 1" class="svg-lashes"/>` : `<path d="M${cx-26} 118Q${cx} 83 ${cx+28} 115Q${cx+8} 146 ${cx-25} 126Z" class="svg-eye-white"/><path d="M${cx-17} 112Q${cx} 89 ${cx+17} 111Q${cx+14} 140 ${cx} 145Q${cx-15} 137 ${cx-17} 112Z" fill="${guide.eyeColor}" class="svg-iris"/><path d="M${cx-14} 121Q${cx} 106 ${cx+14} 121Q${cx+10} 143 ${cx} 146Q${cx-11} 140 ${cx-14} 121Z" fill="${eyeDark}"/><path d="M${cx-12} 132q12 10 24 0" fill="${eyeLight}" opacity=".85"/><ellipse cx="${cx}" cy="122" rx="7" ry="13" class="svg-pupil"/><ellipse cx="${cx-7}" cy="108" rx="7" ry="9" class="svg-eye-shine"/><circle cx="${cx+8}" cy="126" r="3.5" class="svg-eye-shine"/><path d="M${cx-27} 117Q${cx} 80 ${cx+29} 114" class="svg-upper-lash"/><path d="M${cx+25} 108l9-7m-6 13 11-2m-12 9 9 4" class="svg-lashes"/><path d="M${cx-19} 134q19 13 39-1" class="svg-lower-eye"/>`;
    const closedEyes = `<path d="M64 119q27 ${expression === "sleepy" ? 20 : 11} 51-2M145 117q25 ${expression === "sleepy" ? 20 : 11} 51 2" class="svg-eye-line"/><path d="M66 116l-8-5m10 12-9 2m135-9 8-5m-10 12 9 2" class="svg-lashes"/>`;
    const eyes = expression === "wink" ? eye(91, true) + eye(169) : ["sleepy","thinking"].includes(expression) ? closedEyes : eye(91) + eye(169);
    const mouth = expression === "surprised" ? '<path d="M121 166q9-13 18 0-1 16-9 17-8-1-9-17Z" class="svg-mouth-fill"/>' : expression === "worried" ? '<path d="M116 176q14-13 28 0" class="svg-mouth-line"/>' : expression === "embarrassed" ? '<path d="M120 170q10 7 20-1" class="svg-mouth-line"/>' : expression === "sleepy" ? '<path d="M118 170q12 5 24 0" class="svg-mouth-line"/>' : expression === "neutral" || expression === "thinking" ? '<path d="M121 170q9 5 18-1" class="svg-mouth-line"/>' : expression === "excited" ? '<path d="M113 161q17 30 35 0c-2 28-33 30-35 0Z" class="svg-mouth-fill"/><path d="M121 176q10-7 19 0" class="svg-tongue"/>' : '<path d="M115 164q15 23 31 0c-3 23-27 24-31 0Z" class="svg-mouth-fill"/>';
    const blush = ["happy","excited","embarrassed","wink","proud"].includes(expression) ? '<g class="svg-blush-marks"><path d="M58 158l8-5m1 9 8-5m108 1 8-5m-18 9 8-5"/><path d="M54 150q14-9 29 0M177 150q14-9 29 0" class="svg-blush-soft"/></g>' : "";
    const outfit = {
        "sakura-casual":`<path class="svg-sleeve" d="M89 210q-23 5-29 29l23 10 17-28Z"/><path class="svg-sleeve" d="M171 210q23 5 29 29l-23 10-17-28Z"/><path class="svg-top" d="M91 205q39-17 78 0l-5 61H96Z"/><path class="svg-collar" d="M102 202l28 22-16 13-23-27Zm56 0-28 22 16 13 23-27Z"/><path class="svg-skirt" d="M96 257h68l17 51q-51 23-102 0Z"/><path class="svg-fold" d="M111 264l-6 46m25-48v53m20-51 8 46"/>`,
        "school-inspired":`<path class="svg-sleeve" d="M91 207q-23 5-28 30l22 9 17-27Z"/><path class="svg-sleeve" d="M169 207q23 5 28 30l-22 9-17-27Z"/><path class="svg-top" d="M92 202q38-14 76 0l-3 68H95Z"/><path class="svg-collar" d="M103 201l27 18 27-18 11 14-38 29-38-29Z"/><path class="svg-button-line" d="M130 224v42"/><circle class="svg-button" cx="130" cy="235" r="3"/><circle class="svg-button" cx="130" cy="250" r="3"/><path class="svg-trouser" d="M96 264h68l-4 47-28 2-2-31-3 31-28-2Z"/>`,
        travel:`<path class="svg-sleeve" d="M91 211q-24 6-30 30l24 10 18-29Z"/><path class="svg-sleeve" d="M169 211q24 6 30 30l-24 10-18-29Z"/><path class="svg-jacket" d="M91 204q39-15 78 0l7 70-34-3-12-46-12 46-34 3Z"/><path class="svg-top" d="M112 202h36l-5 59h-27Z"/><path class="svg-button-line" d="M105 211l13 59m37-59-13 59"/><path class="svg-trouser" d="M92 266h76l-6 46-30 2-2-31-3 31-30-2Z"/>`,
        cafe:`<path class="svg-puff-sleeve" d="M95 207q-28-3-32 24 8 17 28 10l12-22Z"/><path class="svg-puff-sleeve" d="M165 207q28-3 32 24-8 17-28 10l-12-22Z"/><path class="svg-top" d="M94 202q36-15 72 0l-2 68H96Z"/><path class="svg-collar" d="M101 202q29 19 58 0l5 12q-34 25-68 0Z"/><path class="svg-apron" d="M108 222h44l17 83q-39 17-78 0Z"/><path class="svg-apron-pocket" d="M112 260q18 12 36 0v27h-36Z"/>`,
        yukata:`<path class="svg-yukata-sleeve" d="M96 207q-30 4-42 42l33 15 21-44Z"/><path class="svg-yukata-sleeve" d="M164 207q30 4 42 42l-33 15-21-44Z"/><path class="svg-yukata" d="M94 201q36-13 72 0l12 108q-48 18-96 0Z"/><path class="svg-yukata-lapel" d="M102 202l56 66m0-66-54 67"/><path class="svg-obi" d="M91 254h78v29H91Z"/><path class="svg-obi-knot" d="M166 257l21-10-3 35-18-8Z"/>`
    }[guide.outfit];
    const accessory = guide.accessory === "sakura-clip" ? '<g class="svg-accessory" transform="translate(188 71)"><path d="M0 0c-13-8-20 8-8 14-7 13 10 20 16 8 13 7 20-10 8-16C22-7 6-14 0 0Z"/><circle cx="4" cy="7" r="4"/></g>' : guide.accessory === "ribbon" ? '<path class="svg-accessory" d="M190 63l-24-17 4 31 20-10 19 10 5-31Z"/>' : guide.accessory === "beret" ? '<path class="svg-beret" d="M59 45C80 5 168-8 207 35c9 10-1 23-14 17-46-18-87-12-126 11-13 8-18-6-8-18Z"/>' : "";
    const glasses = guide.glasses ? '<g class="svg-glasses"><path d="M61 108q31-18 57 4l-4 35q-30 17-52-5Zm81 4q27-22 57-4l-1 34q-23 22-52 5Z"/><path d="M117 119q13-8 26 0"/></g>' : "";
    const classes = ["sakura-guide-svg", `svg-pose-${pose}`, `svg-expression-${expression}`, compact ? "sakura-guide-compact" : ""].filter(Boolean).join(" ");
    return `<svg class="${classes}" viewBox="0 0 260 360" role="img" aria-label="Customized adult Sakura anime chibi guide" style="--svg-skin:${skin};--svg-skin-shade:${skinShade};--svg-hair:${guide.hairColor};--svg-hair-shadow:${hairShadow};--svg-hair-shade:${hairShade};--svg-hair-light:${hairLight};--svg-outfit:${outfitColors[0]};--svg-outfit-detail:${outfitColors[1]}" data-pose-family="${pose}" xmlns="http://www.w3.org/2000/svg"><g class="svg-character-pose"><g class="svg-hair-back" fill="${guide.hairColor}">${hairBack}</g><g class="svg-legs"><path class="svg-leg" d="M101 297q-5 27 1 43 9 10 23 0l2-43Z"/><path class="svg-leg" d="M133 297l2 43q14 10 23 0 6-16 1-43Z"/><path class="svg-shoe" d="M96 329q14-8 31 1l-1 21q-18 13-38 0-2-14 8-22Z"/><path class="svg-shoe" d="M133 330q17-9 31-1 10 8 8 22-20 13-38 0Z"/><path class="svg-shoe-detail" d="M92 340q16-9 34 1m9 0q18-10 34-1"/></g><g class="svg-body"><path class="svg-neck" d="M116 184q14 8 28 0l2 24h-32Z"/><g class="svg-outfit-layers">${outfit}</g><g class="svg-arm svg-arm-left"><path class="svg-limb" d="M82 220q-18 14-28 43-5 13 4 20 9 6 17-5l25-42Z"/><path class="svg-hand" d="M55 273q-12 7-8 17 3 8 11 3l7-7 5 5q7-2 6-10l-8-10Z"/></g><g class="svg-arm svg-arm-right"><path class="svg-limb" d="M178 220q18 14 28 43 5 13-4 20-9 6-17-5l-25-42Z"/><path class="svg-hand" d="M205 273q12 7 8 17-3 8-11 3l-7-7-5 5q-7-2-6-10l8-10Z"/></g></g><g class="svg-head"><path class="svg-face" d="M45 91C49 36 87 15 132 16c48 0 84 29 85 81 1 52-20 91-57 106-20 8-41 9-62 1-39-14-59-57-53-113Z"/><path class="svg-ear" d="M48 112q-19-8-18 18 2 25 24 24Zm164 0q19-8 18 18-2 25-24 24Z"/><path d="M67 93q19-18 43-9m39 0q24-9 43 9" class="svg-brow"/>${eyes}<path class="svg-nose" d="M129 149l-3 4 5 1"/>${blush}${mouth}</g><g class="svg-hair-front" fill="${guide.hairColor}">${fringe}</g><g class="svg-side-locks" fill="${hairShade}">${sideLocks}</g>${accessory}${glasses}${prop ? `<text x="211" y="268" class="svg-prop">${prop}</text>` : ""}</g></svg>`;
}

const CHIBI_LAYER_ORDER = Object.freeze(["back-hair", "rear-pose", "skin-body", "outfit", "face-eyes", "front-hair", "glasses", "accessory", "front-arms", "prop", "foreground"]);

function validateChibiAssetManifest(manifest) {
    const layerIds = manifest?.rendering?.layerOrder?.map(layer => layer.id);
    return manifest?.schemaVersion === 1
        && manifest.canvas?.width === 512 && manifest.canvas?.height === 768
        && manifest.rendering?.allLayersShareCanvas === true
        && JSON.stringify(layerIds) === JSON.stringify(["hairBack", "body", "expression", "eyes", "outfit", "hairFront", "accessory"])
        && [manifest.body, manifest.eyes, manifest.expressions, manifest.outfits, manifest.accessories].every(Array.isArray)
        && Array.isArray(manifest.hair?.styles) && Array.isArray(manifest.hair?.colors)
        && typeof manifest.hair.backPattern === "string" && typeof manifest.hair.frontPattern === "string";
}

function refreshChibiAssetVisuals() {
    if (currentRoute === "chibi-guide") renderChibiCustomizer();
    if (currentRoute === "etiquette" && etiquetteData) {
        if (currentEtiquetteEntry) renderEtiquetteDetail(currentEtiquetteEntry);
        else renderEtiquette();
    }
    updateChibiCompanion();
}

function loadChibiAssetManifest() {
    return Promise.resolve(null);
}

function safeChibiAssetPath(path) {
    return "";
}

function chibiAssetItem(collection, id, fallback) {
    return collection.find(item => item.id === id) || collection.find(item => item.id === fallback) || null;
}

function chibiPaletteId(value, options, ids, fallback) {
    const normalized = String(value || "").toUpperCase();
    const index = options.findIndex(option => String(option[0]).toUpperCase() === normalized);
    if (index >= 0) return ids[index] || fallback;
    if (!validChibiHex(value)) return fallback;
    const rgb = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
    const target = rgb(normalized);
    let nearest = 0;
    let nearestDistance = Infinity;
    options.forEach((option, optionIndex) => {
        const candidate = rgb(String(option[0]).toUpperCase());
        const distance = candidate.reduce((sum, channel, channelIndex) => sum + (channel - target[channelIndex]) ** 2, 0);
        if (distance < nearestDistance) { nearest = optionIndex; nearestDistance = distance; }
    });
    return ids[nearest] || fallback;
}

function resolveChibiAssetLayers(guide, illustration) {
    if (!chibiAssetManifest) return [];
    const defaults = chibiAssetManifest.defaults;
    const skinId = String(guide.skinTone || defaults.body).replace(/-/g, "_");
    const hairStyleMap = { "twin-tails":"twin_tails", shoulder:"shoulder_length" };
    const hairStyle = hairStyleMap[guide.hairStyle] || guide.hairStyle;
    const hairColor = chibiPaletteId(guide.hairColor, CHIBI_OPTIONS.hairColor, ["black", "dark_brown", "brown", "blonde", "pink", "lavender", "blue", "white_silver"], defaults.hairColor);
    const eyeColor = chibiPaletteId(guide.eyeColor, CHIBI_OPTIONS.eyeColor, ["pink", "brown", "hazel", "blue", "green", "purple", "aqua"], defaults.eyes);
    const outfitMap = { "sakura-casual":"sakura_casual", "school-inspired":"academic" };
    const outfitId = outfitMap[guide.outfit] || guide.outfit;
    const accessoryId = String(guide.accessory || defaults.accessory).replace(/-/g, "_");
    const expressionId = (illustration.expression ? chibiExpressionClass(illustration) : guide.expression).replace(/-/g, "_");
    const body = chibiAssetItem(chibiAssetManifest.body, skinId, defaults.body);
    const expression = chibiAssetItem(chibiAssetManifest.expressions, expressionId, defaults.expression);
    const eyes = chibiAssetItem(chibiAssetManifest.eyes, eyeColor, defaults.eyes);
    const outfit = chibiAssetItem(chibiAssetManifest.outfits, outfitId, defaults.outfit);
    const accessory = chibiAssetItem(chibiAssetManifest.accessories, accessoryId, defaults.accessory);
    const glasses = guide.glasses ? chibiAssetItem(chibiAssetManifest.accessories, "glasses", "none") : null;
    const hairBack = chibiAssetManifest.hair.backPattern.replace("{style}", hairStyle).replace("{color}", hairColor);
    const hairFront = chibiAssetManifest.hair.frontPattern.replace("{style}", hairStyle).replace("{color}", hairColor);
    const layers = [
        ["hairBack", hairBack, 10], ["body", body?.path, 20], ["expression", expression?.path, 30],
        ...(!expression?.suppressEyes ? [["eyes", eyes?.path, 31]] : []),
        ["outfit", outfit?.path, 40], ["hairFront", hairFront, 50],
        ["accessory", accessory?.path, 60], ["glasses", glasses?.path, 61]
    ];
    return layers.map(([layer, path, zIndex]) => ({ layer, zIndex, src:safeChibiAssetPath(path) })).filter(item => item.src);
}

function renderRetiredModularChibiGuide(settings = chibiGuide, illustration = {}, compact = false) {
    loadChibiAssetManifest();
    const guide = normalizeChibiGuide(settings);
    const pose = chibiPoseFamily(illustration);
    const placeholder = chibiAssetManifest?.placeholder || { symbol:"🌸", title:"Sakura Guide", message:"Artwork coming soon" };
    const layers = resolveChibiAssetLayers(guide, illustration);
    const images = layers.map(item => `<img class="chibi-asset-layer" data-chibi-asset-layer="${escapeSearchHtml(item.layer)}" style="--chibi-layer:${item.zIndex}" src="${escapeSearchHtml(item.src)}" alt="" decoding="async">`).join("");
    return `<div class="chibi-asset-renderer ${compact ? "chibi-asset-compact" : ""}" data-pose-family="${escapeSearchHtml(pose)}"><div class="chibi-art-placeholder" aria-label="${escapeSearchHtml(placeholder.title)} — ${escapeSearchHtml(placeholder.message)}"><span aria-hidden="true">${escapeSearchHtml(placeholder.symbol)}</span><strong>${escapeSearchHtml(placeholder.title)}</strong><small>${escapeSearchHtml(placeholder.message)}</small></div><div class="chibi-asset-layers" aria-hidden="true">${images}</div></div>`;
}

function chibiOptionButtons(key, options, color = false) {
    return options.map(option => {
        const value = option[0];
        const label = option[1];
        const selected = String(chibiGuideDraft[key]).toLowerCase() === String(value).toLowerCase();
        const swatch = color ? `<i style="--option-color:${escapeSearchHtml(value)}" aria-hidden="true"></i>` : "";
        return `<button type="button" data-chibi-key="${key}" data-chibi-value="${escapeSearchHtml(value)}" class="${selected ? "selected" : ""}" aria-pressed="${selected}">${swatch}<span>${escapeSearchHtml(label)}</span></button>`;
    }).join("");
}

function renderRetiredModularChibiCustomizer() {
    document.getElementById("chibi-skin-options").innerHTML = chibiOptionButtons("skinTone", CHIBI_OPTIONS.skinTone.map(option => [option[0], option[1], option[2]]));
    document.querySelectorAll("#chibi-skin-options [data-chibi-value]").forEach((button, index) => button.insertAdjacentHTML("afterbegin", `<i style="--option-color:${CHIBI_OPTIONS.skinTone[index][2]}" aria-hidden="true"></i>`));
    document.getElementById("chibi-hair-style-options").innerHTML = chibiOptionButtons("hairStyle", CHIBI_OPTIONS.hairStyle);
    document.getElementById("chibi-hair-color-options").innerHTML = chibiOptionButtons("hairColor", CHIBI_OPTIONS.hairColor, true);
    document.getElementById("chibi-eye-color-options").innerHTML = chibiOptionButtons("eyeColor", CHIBI_OPTIONS.eyeColor, true);
    document.getElementById("chibi-expression-options").innerHTML = chibiOptionButtons("expression", CHIBI_OPTIONS.expression);
    document.getElementById("chibi-outfit-options").innerHTML = chibiOptionButtons("outfit", CHIBI_OPTIONS.outfit);
    document.getElementById("chibi-accessory-options").innerHTML = chibiOptionButtons("accessory", CHIBI_OPTIONS.accessory);
    document.getElementById("chibi-companion-side-options").innerHTML = chibiOptionButtons("companionSide", [["left","Left"],["right","Right"]]);
    document.getElementById("chibi-glasses").checked = chibiGuideDraft.glasses;
    document.getElementById("chibi-companion-enabled").checked = chibiGuideDraft.companionEnabled;
    document.getElementById("chibi-idle-animations").checked = chibiGuideDraft.idleAnimations;
    document.getElementById("chibi-speech-bubbles").checked = chibiGuideDraft.speechBubbles;
    document.getElementById("chibi-context-reactions").checked = chibiGuideDraft.contextReactions;
    document.getElementById("chibi-guide-preview").innerHTML = renderChibiGuide(chibiGuideDraft, { pose:"standing neutral", setting:"soft Sakura garden", props:[] });
}

function openChibiGuide() {
    chibiGuideDraft = { ...chibiGuide };
    document.getElementById("chibi-guide-message").textContent = "";
    renderChibiCustomizer();
}

function applyChibiCustomColor(key) {
    const input = document.getElementById(key === "hairColor" ? "chibi-custom-hair-color" : "chibi-custom-eye-color");
    const value = input.value.trim();
    const message = document.getElementById("chibi-guide-message");
    if (!validChibiHex(value)) { message.textContent = "Enter a six-digit HEX color such as #D97FA2."; message.classList.add("error"); return; }
    chibiGuideDraft[key] = value.toUpperCase();
    message.textContent = "The closest available illustrated color is shown in the preview.";
    message.classList.remove("error");
    renderChibiCustomizer();
}

function getGuideImage(character = "sakura") {
    const validCharacter = SAKURA_GUIDES.some(option => option[0] === character) ? character : "sakura";
    return `./avatar/${validCharacter}.png`;
}

function renderChibiGuide(settings = chibiGuide, illustration = {}, compact = false) {
    const guide = normalizeChibiGuide(settings);
    const name = SAKURA_GUIDES.find(option => option[0] === guide.character)?.[1] || "Sakura";
    return `<div class="guide-image-renderer ${compact ? "guide-image-compact" : ""}" data-pose-family="${escapeSearchHtml(chibiPoseFamily(illustration))}"><img src="${getGuideImage(guide.character)}" alt="${escapeSearchHtml(name)} Sakura Guide" decoding="async"></div>`;
}

function renderChibiCustomizer() {
    document.getElementById("chibi-character-options").innerHTML = SAKURA_GUIDES.map(([character, name]) => {
        const selected = chibiGuideDraft.character === character;
        return `<button type="button" data-chibi-character="${character}" class="guide-preset-card ${selected ? "selected" : ""}" aria-pressed="${selected}"><img src="${getGuideImage(character)}" alt="" loading="lazy" decoding="async"><span>${name}</span>${selected ? '<i aria-hidden="true">✓</i>' : ""}</button>`;
    }).join("");
    document.getElementById("chibi-companion-side-options").innerHTML = chibiOptionButtons("companionSide", [["left","Left"],["right","Right"]]);
    document.getElementById("chibi-companion-enabled").checked = chibiGuideDraft.companionEnabled;
    document.getElementById("chibi-idle-animations").checked = chibiGuideDraft.idleAnimations;
    document.getElementById("chibi-speech-bubbles").checked = chibiGuideDraft.speechBubbles;
    document.getElementById("chibi-context-reactions").checked = chibiGuideDraft.contextReactions;
    document.getElementById("chibi-gesture-coach").checked = chibiGuideDraft.gestureCoach;
    document.getElementById("chibi-guide-preview").innerHTML = renderChibiGuide(chibiGuideDraft);
}

function saveChibiGuide() {
    chibiGuide = normalizeChibiGuide(chibiGuideDraft);
    writeJson(STORAGE.chibiGuide, chibiGuide);
    document.getElementById("chibi-guide-message").textContent = "Your Sakura guide is saved on this device.";
    if (etiquetteData) {
        renderEtiquette();
        if (currentEtiquetteEntry && currentRoute === "etiquette") renderEtiquetteDetail(currentEtiquetteEntry);
    }
    updateChibiCompanion();
}

function chibiReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function clearChibiCompanionTimers() {
    window.clearTimeout(chibiCompanionTimer);
    window.clearTimeout(chibiCompanionResetTimer);
    chibiCompanionTimer = 0;
    chibiCompanionResetTimer = 0;
    chibiCompanionBusy = false;
}

function renderChibiCompanion(illustration = { pose:"standing neutral", expression:"happy", setting:"Sakura app", props:[] }) {
    const character = document.getElementById("chibi-companion-character");
    if (!character) return;
    character.innerHTML = renderChibiGuide(chibiGuide, illustration, true);
}

function hideChibiBubble() {
    const bubble = document.getElementById("chibi-companion-bubble");
    if (bubble) { bubble.hidden = true; bubble.innerHTML = ""; }
}

function showChibiBubble(entry = CHIBI_SPEECH[Math.floor(Math.random() * CHIBI_SPEECH.length)]) {
    if (!chibiGuide.speechBubbles) return;
    const bubble = document.getElementById("chibi-companion-bubble");
    bubble.innerHTML = `<strong>${escapeSearchHtml(entry.japanese)}</strong><small>${escapeSearchHtml(entry.english)}</small>`;
    bubble.hidden = false;
}

function scheduleChibiCompanionIdle() {
    window.clearTimeout(chibiCompanionTimer);
    if (!chibiGuide.companionEnabled || !chibiGuide.idleAnimations || chibiReducedMotion() || currentRoute === "chibi-guide") return;
    chibiCompanionTimer = window.setTimeout(() => performChibiCompanionAction(), 18000 + Math.floor(Math.random() * 18000));
}

function performChibiCompanionAction(requested = "") {
    if (!chibiGuide.companionEnabled || chibiCompanionBusy) return;
    const companion = document.getElementById("chibi-companion");
    const reduced = chibiReducedMotion();
    const actions = reduced ? ["wink", "happy", "surprised", "thinking"] : ["wave", "wink", "bow", "sit", "look", "think", "peek", "hop", "walk", "sleepy", "happy"];
    const action = actions.includes(requested) ? requested : actions[Math.floor(Math.random() * actions.length)];
    const illustrationByAction = {
        wave:{ pose:"waving", expression:"happy" }, wink:{ pose:"standing neutral", expression:"wink" }, bow:{ pose:"small bow", expression:"happy" }, sit:{ pose:"sitting", expression:"neutral" }, look:{ pose:"standing neutral", expression:"thinking" }, think:{ pose:"explaining", expression:"thinking", props:["smartphone"] }, peek:{ pose:"standing neutral", expression:"surprised" }, hop:{ pose:"standing neutral", expression:"excited" }, walk:{ pose:"walking", expression:"happy" }, sleepy:{ pose:"sitting", expression:"sleepy" }, happy:{ pose:"waving", expression:"excited" }, surprised:{ pose:"standing neutral", expression:"surprised" }, thinking:{ pose:"standing neutral", expression:"thinking" }
    };
    const illustration = { setting:"Sakura app", props:[], ...(illustrationByAction[action] || illustrationByAction.happy) };
    chibiCompanionBusy = true;
    companion.dataset.action = action;
    renderChibiCompanion(illustration);
    if (chibiGuide.speechBubbles && (requested || Math.random() < .28)) showChibiBubble();
    chibiCompanionResetTimer = window.setTimeout(() => {
        delete companion.dataset.action;
        hideChibiBubble();
        renderChibiCompanion();
        chibiCompanionBusy = false;
        scheduleChibiCompanionIdle();
    }, reduced ? 1200 : 2100);
}


function normalizeChibiCompanionPosition(value) {
    if (!value || typeof value !== "object") return null;
    const x = Number(value.x);
    const y = Number(value.y);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function chibiCompanionBounds() {
    const companion = document.getElementById("chibi-companion");
    if (!companion) return null;
    const rect = companion.getBoundingClientRect();
    const shellRect = document.querySelector(".app-shell")?.getBoundingClientRect();
    const headerRect = document.querySelector(".app-header")?.getBoundingClientRect();
    const navRect = document.querySelector(".bottom-navigation")?.getBoundingClientRect();
    const width = rect.width || 104;
    const height = rect.height || 132;
    const minX = Math.max(4, shellRect?.left ?? 4);
    const maxX = Math.max(minX, Math.min(window.innerWidth - width - 4, (shellRect?.right ?? window.innerWidth) - width - 4));
    const minY = Math.max(4, (headerRect?.bottom ?? 0) + 4);
    const bottomEdge = Math.min(window.innerHeight - 4, navRect?.top ?? window.innerHeight - 86);
    const maxY = Math.max(minY, bottomEdge - height - 6);
    return { minX, maxX, minY, maxY, width, height };
}

function clampChibiCompanionPosition(x, y) {
    const bounds = chibiCompanionBounds();
    if (!bounds) return { x:Number(x) || 0, y:Number(y) || 0 };
    return {
        x: Math.min(bounds.maxX, Math.max(bounds.minX, Number(x) || bounds.minX)),
        y: Math.min(bounds.maxY, Math.max(bounds.minY, Number(y) || bounds.minY))
    };
}

function setChibiCompanionVisualPosition(position, persist = false) {
    const companion = document.getElementById("chibi-companion");
    if (!companion || !position) return;
    const clamped = clampChibiCompanionPosition(position.x, position.y);
    companion.style.left = `${Math.round(clamped.x)}px`;
    companion.style.top = `${Math.round(clamped.y)}px`;
    companion.style.right = "auto";
    companion.style.bottom = "auto";
    companion.dataset.dragged = "true";
    companion.dataset.side = clamped.x + companion.getBoundingClientRect().width / 2 < window.innerWidth / 2 ? "left" : "right";
    chibiCompanionPosition = clamped;
    if (persist) writeJson(STORAGE.chibiPosition, chibiCompanionPosition);
}

function clearChibiCompanionPosition() {
    chibiCompanionPosition = null;
    localStorage.removeItem(STORAGE.chibiPosition);
    const companion = document.getElementById("chibi-companion");
    if (!companion) return;
    companion.style.removeProperty("left");
    companion.style.removeProperty("top");
    companion.style.removeProperty("right");
    companion.style.removeProperty("bottom");
    delete companion.dataset.dragged;
    companion.dataset.side = chibiGuide.companionSide;
}

function applyChibiCompanionPosition() {
    const companion = document.getElementById("chibi-companion");
    if (!companion) return;
    if (chibiCompanionPosition) setChibiCompanionVisualPosition(chibiCompanionPosition, false);
    else {
        companion.style.removeProperty("left");
        companion.style.removeProperty("top");
        companion.style.removeProperty("right");
        companion.style.removeProperty("bottom");
        delete companion.dataset.dragged;
        companion.dataset.side = chibiGuide.companionSide;
    }
}

function startChibiCompanionDrag(event) {
    if (event.button !== undefined && event.button !== 0) return;
    const companion = document.getElementById("chibi-companion");
    if (!companion || companion.hidden) return;
    const rect = companion.getBoundingClientRect();
    chibiCompanionDragState = {
        pointerId: event.pointerId,
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startX: rect.left,
        startY: rect.top,
        moved: false
    };
    companion.setPointerCapture?.(event.pointerId);
    companion.classList.add("dragging");
    window.clearTimeout(chibiCompanionTimer);
    hideChibiBubble();
}

function moveChibiCompanionDrag(event) {
    const state = chibiCompanionDragState;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startPointerX;
    const dy = event.clientY - state.startPointerY;
    if (!state.moved && Math.hypot(dx, dy) < 5) return;
    state.moved = true;
    event.preventDefault();
    const companion = document.getElementById("chibi-companion");
    if (companion) delete companion.dataset.action;
    setChibiCompanionVisualPosition({ x:state.startX + dx, y:state.startY + dy }, false);
}

function finishChibiCompanionDrag(event) {
    const state = chibiCompanionDragState;
    if (!state || state.pointerId !== event.pointerId) return;
    const companion = document.getElementById("chibi-companion");
    if (companion?.hasPointerCapture?.(event.pointerId)) companion.releasePointerCapture(event.pointerId);
    companion?.classList.remove("dragging");
    chibiCompanionDragState = null;
    if (state.moved && companion) {
        const rect = companion.getBoundingClientRect();
        setChibiCompanionVisualPosition({ x:rect.left, y:rect.top }, true);
        chibiCompanionSuppressClick = true;
        window.setTimeout(() => { chibiCompanionSuppressClick = false; }, 250);
    }
    scheduleChibiCompanionIdle();
}

function updateChibiCompanion() {
    const companion = document.getElementById("chibi-companion");
    if (!companion) return;
    clearChibiCompanionTimers();
    hideChibiBubble();
    companion.dataset.side = chibiGuide.companionSide;
    companion.hidden = !chibiGuide.companionEnabled || currentRoute === "chibi-guide";
    if (!companion.hidden) {
        renderChibiCompanion();
        requestAnimationFrame(applyChibiCompanionPosition);
        scheduleChibiCompanionIdle();
    }
}

function chibiContextReaction(route) {
    if (!chibiGuide.companionEnabled || !chibiGuide.contextReactions || currentRoute === "chibi-guide") return;
    if (route === "etiquette") {
        performChibiCompanionAction("bow");
        window.setTimeout(() => {
            if (currentRoute === "etiquette" && chibiGuide.speechBubbles) {
                showChibiBubble({ japanese:"いっしょに練習しよう！", romaji:"issho ni renshuu shiyou!", english:"Let's practice together!" });
            }
        }, 350);
    }
    else if (route === "travel" || route.startsWith("travel-")) performChibiCompanionAction("happy");
}

const ETIQUETTE_IMPORTANCE = new Set(["Essential", "Common", "Useful", "Contextual", "Specialized", "Fun"]);

function validateEtiquetteData(records) {
    if (!Array.isArray(records) || records.length !== 136) return false;
    const ids = new Set();
    const slugs = new Set();
    return records.every(record => {
        const strings = ["id", "type", "slug", "title", "japaneseTerm", "kana", "romaji", "category", "importance", "summary", "do", "avoid", "whyItMatters", "whatYoullSeeInJapan", "travelerTip", "contextNote", "imageKey"];
        const illustration = record?.illustration;
        const valid = strings.every(key => typeof record?.[key] === "string" && record[key].trim())
            && record.type === "etiquette" && ETIQUETTE_IMPORTANCE.has(record.importance)
            && illustration && ["character", "pose", "expression", "setting"].every(key => typeof illustration[key] === "string" && illustration[key].trim())
            && Array.isArray(illustration.props);
        if (!valid || ids.has(record.id) || slugs.has(record.slug)) return false;
        ids.add(record.id);
        slugs.add(record.slug);
        return true;
    });
}

function loadEtiquetteData() {
    if (etiquetteData) return Promise.resolve(etiquetteData);
    if (etiquetteDataPromise) return etiquetteDataPromise;
    etiquetteDataPromise = fetch("./data/etiquette.json?v=1")
        .then(response => { if (!response.ok) throw new Error(`Etiquette data returned ${response.status}.`); return response.json(); })
        .then(records => {
            if (!validateEtiquetteData(records)) throw new Error("Etiquette data validation failed.");
            etiquetteData = records;
            return records;
        })
        .catch(error => { etiquetteDataPromise = null; throw error; });
    return etiquetteDataPromise;
}

function etiquetteSearchText(entry) {
    return searchText([entry.title, entry.japaneseTerm, entry.kana, entry.romaji, entry.category, entry.summary, entry.do, entry.avoid, entry.travelerTip, entry.contextNote].join(" "));
}

function filteredEtiquette() {
    const query = searchText(document.getElementById("etiquette-search").value);
    const category = document.getElementById("etiquette-category-filter").value;
    const importance = document.getElementById("etiquette-importance-filter").value;
    return (etiquetteData || []).filter(entry => (!query || etiquetteSearchText(entry).includes(query))
        && (category === "all" || entry.category === category)
        && (importance === "all" || entry.importance === importance));
}


function selectedChibiGuideName() {
    return SAKURA_GUIDES.find(option => option[0] === chibiGuide.character)?.[1] || "Sakura";
}

function etiquetteGestureCue(entry) {
    return cleanEntryText(entry?.illustration?.pose) || "follow the etiquette guidance";
}

function etiquetteGestureProp(entry) {
    return chibiProp(entry?.illustration || {});
}

function etiquetteGestureCoachVisual(entry, compact = false) {
    if (!entry || !chibiGuide.gestureCoach) return "";
    const name = selectedChibiGuideName();
    const poseFamily = chibiPoseFamily(entry.illustration || {});
    const prop = etiquetteGestureProp(entry);
    const cue = etiquetteGestureCue(entry);
    const loading = compact ? ' loading="lazy"' : "";

    return `<span class="gesture-coach-visual ${compact ? "compact" : ""}" data-gesture-pose="${escapeSearchHtml(poseFamily)}">
        <span class="gesture-coach-avatar">
            <img src="${getGuideImage(chibiGuide.character)}" alt="${escapeSearchHtml(name)} demonstrating ${escapeSearchHtml(cue)}"${loading} decoding="async">
            ${prop ? `<span class="gesture-coach-prop" aria-hidden="true">${escapeSearchHtml(prop)}</span>` : ""}
        </span>
        ${compact ? "" : `<span class="gesture-coach-caption"><strong>${escapeSearchHtml(name)} demonstrates</strong><small>${escapeSearchHtml(cue)}</small></span>`}
    </span>`;
}

function replayEtiquetteGesture() {
    if (!currentEtiquetteEntry || !chibiGuide.gestureCoach) return;

    const demo = document.getElementById("etiquette-gesture-coach-demo");
    if (demo) {
        demo.classList.remove("is-performing");
        void demo.offsetWidth;
        demo.classList.add("is-performing");
        window.setTimeout(() => demo.classList.remove("is-performing"), 1400);
    }

    if (chibiGuide.companionEnabled && !chibiCompanionBusy) {
        const companion = document.getElementById("chibi-companion");
        if (companion && !companion.hidden) {
            chibiCompanionBusy = true;
            companion.dataset.action = "gesture";
            renderChibiCompanion(currentEtiquetteEntry.illustration || {});
            const bubble = document.getElementById("chibi-companion-bubble");
            if (bubble && chibiGuide.speechBubbles) {
                bubble.innerHTML = `<strong>やってみよう！</strong><small>Try the gesture with me!</small>`;
                bubble.hidden = false;
            }
            window.clearTimeout(chibiCompanionResetTimer);
            chibiCompanionResetTimer = window.setTimeout(() => {
                delete companion.dataset.action;
                hideChibiBubble();
                renderChibiCompanion();
                chibiCompanionBusy = false;
                scheduleChibiCompanionIdle();
            }, chibiReducedMotion() ? 900 : 1500);
        }
    }
}

function etiquetteIllustration(entry) {
    const details = [entry.illustration.pose, entry.illustration.expression, entry.illustration.setting].filter(Boolean).join(" · ");
    if (!chibiGuide.gestureCoach) return `<small>${escapeSearchHtml(details)}</small>`;
    return `${etiquetteGestureCoachVisual(entry, true)}<small>${escapeSearchHtml(details)}</small>`;
}

function applyEtiquetteRomajiVisibility() {
    document.querySelectorAll("[data-etiquette-romaji]").forEach(element => { element.hidden = !etiquetteRomajiVisible; });
    ["etiquette-romaji-toggle", "etiquette-detail-romaji-toggle"].forEach(id => {
        const button = document.getElementById(id);
        button.textContent = etiquetteRomajiVisible ? "Hide Romaji" : "Show Romaji";
        button.setAttribute("aria-pressed", String(etiquetteRomajiVisible));
    });
}

function renderEtiquetteFilters() {
    const select = document.getElementById("etiquette-category-filter");
    const selected = select.value;
    const categories = [...new Set((etiquetteData || []).map(entry => entry.category))];
    select.innerHTML = '<option value="all">All</option>' + categories.map(category => `<option value="${escapeSearchHtml(category)}">${escapeSearchHtml(category)}</option>`).join("");
    select.value = categories.includes(selected) ? selected : "all";
}

function renderEtiquette() {
    if (!etiquetteData) return;
    const entries = filteredEtiquette();
    document.getElementById("etiquette-count").textContent = `${entries.length} of ${etiquetteData.length} entries`;
    const coachName = selectedChibiGuideName();
    document.getElementById("etiquette-list").innerHTML = entries.map(entry => `<button class="etiquette-card" type="button" data-etiquette-id="${escapeSearchHtml(entry.id)}"><span class="etiquette-card-illustration etiquette-illustration" data-image-key="${escapeSearchHtml(entry.imageKey)}">${etiquetteIllustration(entry)}</span><span class="etiquette-card-copy">${chibiGuide.gestureCoach ? `<span class="gesture-coach-card-label">${escapeSearchHtml(coachName)} demo</span>` : ""}<strong>${escapeSearchHtml(entry.title)}</strong><span class="etiquette-japanese">${escapeSearchHtml(entry.japaneseTerm)}</span><span class="etiquette-kana">${escapeSearchHtml(entry.kana)}</span><span class="etiquette-romaji" data-etiquette-romaji hidden>${escapeSearchHtml(entry.romaji)}</span><span class="etiquette-summary">${escapeSearchHtml(entry.summary)}</span><span class="tag-row"><span class="tag">${escapeSearchHtml(entry.importance)}</span><span class="tag">${escapeSearchHtml(entry.category)}</span></span></span></button>`).join("");
    document.getElementById("etiquette-empty").hidden = entries.length > 0;
    applyEtiquetteRomajiVisibility();
}

function renderEtiquetteDetail(entry) {
    if (!entry) return;
    currentEtiquetteEntry = entry;
    document.getElementById("etiquette-home").hidden = true;
    document.getElementById("etiquette-detail").hidden = false;
    document.getElementById("etiquette-detail-heading").textContent = entry.title;
    const illustration = document.getElementById("etiquette-detail-illustration");
    illustration.dataset.imageKey = entry.imageKey;
    illustration.dataset.guideCharacter = chibiGuide.character;
    illustration.innerHTML = chibiGuide.gestureCoach
        ? `<div id="etiquette-gesture-coach-demo" class="gesture-coach-detail-demo">
            ${etiquetteGestureCoachVisual(entry, false)}
            <div class="gesture-coach-practice">
                <span class="section-kicker">Gesture Coach</span>
                <strong>Watch → copy → check the Do / Avoid notes</strong>
                <small>Sakura’s motion is an illustrative cue. Use the written guidance for the exact etiquette.</small>
                <button id="replay-etiquette-gesture" class="secondary-button" type="button">Replay gesture</button>
            </div>
        </div>`
        : `<div class="gesture-coach-disabled-note"><strong>Gesture Coach is off.</strong><small>You can turn it on in Chibi Guide to use your selected companion in these lessons.</small></div>`;
    const values = { japanese:entry.japaneseTerm, kana:entry.kana, romaji:entry.romaji, importance:entry.importance, category:entry.category, summary:entry.summary, do:entry.do, avoid:entry.avoid, why:entry.whyItMatters, see:entry.whatYoullSeeInJapan, tip:entry.travelerTip, context:entry.contextNote };
    Object.entries(values).forEach(([key, value]) => { document.getElementById(`etiquette-detail-${key}`).textContent = value; });
    applyEtiquetteRomajiVisibility();
    window.scrollTo({ top:0, behavior:"smooth" });
}

function closeEtiquetteDetail() {
    currentEtiquetteEntry = null;
    document.getElementById("etiquette-detail").hidden = true;
    document.getElementById("etiquette-home").hidden = false;
    window.scrollTo({ top:0, behavior:"smooth" });
}

async function openEtiquette() {
    currentEtiquetteEntry = null;
    document.getElementById("etiquette-home").hidden = false;
    document.getElementById("etiquette-detail").hidden = true;
    const loading = document.getElementById("etiquette-loading");
    loading.hidden = false;
    loading.textContent = "Preparing Gestures & Etiquette…";
    try {
        await loadEtiquetteData();
        if (currentRoute !== "etiquette") return;
        renderEtiquetteFilters();
        renderEtiquette();
        loading.hidden = true;
    }
    catch (error) {
        console.warn("Japanese Gestures & Etiquette could not load.", error);
        loading.textContent = "Gestures & Etiquette could not be prepared. Please try again after Sakura updates.";
    }
}

function openHubDrawer() {
    const layer = document.getElementById("hub-drawer-layer");
    if (!layer || layer.classList.contains("open")) return;
    hubDrawerReturnFocus = document.activeElement;
    layer.hidden = false;
    document.body.classList.add("hub-drawer-open");
    document.getElementById("open-hub").setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
        layer.classList.add("open");
        document.getElementById("close-hub").focus({ preventScroll:true });
    });
}

function closeHubDrawer(restoreFocus = true) {
    const layer = document.getElementById("hub-drawer-layer");
    if (!layer || layer.hidden) return;
    layer.classList.remove("open");
    document.body.classList.remove("hub-drawer-open");
    document.getElementById("open-hub").setAttribute("aria-expanded", "false");
    if (location.hash === "#hub") history.replaceState(null, "", `#${currentRoute}`);
    window.setTimeout(() => { if (!layer.classList.contains("open")) layer.hidden = true; }, 270);
    if (restoreFocus && hubDrawerReturnFocus instanceof HTMLElement) hubDrawerReturnFocus.focus({ preventScroll:true });
    hubDrawerReturnFocus = null;
}

function showRoute(route, updateHash = true) {
    const normalizedRoute = route === "native" ? "learn-native" : route;
    if (normalizedRoute === "hub") { openHubDrawer(); return; }
    closeHubDrawer(false);
    const previousRoute = currentRoute;
    const nativeMode = normalizedRoute === "learn-slang" ? "slang" : normalizedRoute === "learn-native" ? "native" : null;
    const deckRouteMatch = normalizedRoute.match(/^travel-deck-(deck-.+)$/);
    if (deckRouteMatch) currentTravelDeckId = deckRouteMatch[1];
    const requestedTravelCategory = normalizedRoute.startsWith("travel-") && !deckRouteMatch ? normalizedRoute.slice(7) : null;
    const travelCategory = travelCategoryMetadata(requestedTravelCategory) ? requestedTravelCategory : null;
    const isTravelUtilityRoute = ["travel-my-phrases", "travel-decks", "travel-notes", "travel-countdown", "travel-offline", "travel-yen", "travel-rail"].includes(normalizedRoute) || Boolean(deckRouteMatch);
    const viewRoute = nativeMode ? "native" : travelCategory ? "travel-category" : deckRouteMatch ? "travel-deck" : normalizedRoute;
    currentRoute = normalizedRoute;
    if (STUDY_SUITE_ROUTES.has(normalizedRoute) && !window.SakuraStudySuite) {
        ensureStudySuite().then(suite => { if (currentRoute === normalizedRoute) suite?.open?.(normalizedRoute); }).catch(() => {});
    }
    updateChibiCompanion();
    chibiContextReaction(normalizedRoute);
    if (normalizedRoute === "home") renderDailyProgress();
    if (normalizedRoute === "saved") renderSavedItems();
    if (normalizedRoute === "library") {
        initializeLibrary();
        ensureSlangExpansionsLoaded().catch(() => {});
    }
    if (normalizedRoute === "search") {
        buildSearchIndex();
        ensureSlangExpansionsLoaded()
            .then(() => { if (currentRoute === "search") renderSearchResults(); })
            .catch(() => {});
    }
    if (normalizedRoute === "practice-what-would-you-say") openWhatWouldYouSay();
    if (normalizedRoute === "practice-sentence-builder") openSentenceBuilder();
    if (normalizedRoute === "practice-one-line-many-personalities") openPersonalitiesPractice();
    if (normalizedRoute === "counters") openCounters();
    if (normalizedRoute === "particles") openParticles();
    if (normalizedRoute === "grammar") openGrammar();
    if (normalizedRoute === "etiquette") openEtiquette();
    if (normalizedRoute === "kaomoji") openKaomoji();
    if (normalizedRoute === "chibi-guide") openChibiGuide();
    if (normalizedRoute === "translate") openTranslationTool();
    if (nativeMode) {
        currentNativeMode = nativeMode;
        if (nativeMode === "slang") ensureSlangExpansionsLoaded().catch(() => {});
        document.getElementById("native-heading").textContent = nativeMode === "slang" ? "Slang" : "Native Japanese";
        document.querySelector(".native-page-heading p").textContent = nativeMode === "slang" ? "Current expressions, online language, and casual slang." : "Everyday expressions and natural Japanese.";
        refreshNativeCategories();
        if (currentNativeItem?.type !== nativeMode) browseNative(1, true);
    }
    document.querySelectorAll(".view").forEach(view => {
        const active = view.dataset.view === viewRoute;
        view.hidden = !active;
        view.classList.toggle("active-view", active);
    });
    if (window.SakuraStudySuite) {
        if (STUDY_SUITE_ROUTES.has(normalizedRoute)) window.SakuraStudySuite.open?.(normalizedRoute);
        else requestAnimationFrame(() => window.SakuraStudySuite?.augmentAudioButtons?.(normalizedRoute));
    }
    if (travelCategory) {
        const travelBack = document.querySelector("#travel-category-view .back-button");
        travelBack.dataset.route = previousRoute === "library" ? "library" : "travel";
        travelBack.setAttribute("aria-label", previousRoute === "library" ? "Back to Library" : "Back to Travel");
        renderTravelCategory(travelCategory);
    }
    if (normalizedRoute === "travel-my-phrases") renderMyTravelPhrases();
    if (normalizedRoute === "travel-decks") renderTravelDecks();
    if (normalizedRoute === "travel-notes") renderTravelNotes();
    if (normalizedRoute === "travel-countdown") renderTravelCountdown();
    if (normalizedRoute === "travel-offline") verifyTravelOfflinePack();
    if (normalizedRoute === "travel-yen") renderYenConverter();
    if (normalizedRoute === "travel-rail") openRailGuide();
    if (normalizedRoute === "travel") renderTravelHeaderCountdown();
    if (deckRouteMatch) renderCurrentTravelDeck();
    const mainRoute = travelCategory || isTravelUtilityRoute ? "travel" : ["practice-what-would-you-say", "practice-sentence-builder", "practice-one-line-many-personalities", ...STUDY_SUITE_ROUTES].includes(normalizedRoute) ? "practice" : ["search", "translate", "learn-native", "learn-slang", "library", "counters", "particles", "grammar", "etiquette", "chibi-guide"].includes(normalizedRoute) || (normalizedRoute.includes("detail") && detailReturnRoute === "library") ? "learn" : normalizedRoute.replace("-detail", "");
    document.querySelectorAll(".nav-button").forEach(button => button.classList.toggle("active", button.dataset.route === mainRoute || (normalizedRoute.includes("detail") && button.dataset.route === detailReturnRoute)));
    const learnView = normalizedRoute === "learn" ? "library" : nativeMode;
    document.querySelectorAll("[data-learn-view]").forEach(button => {
        const active = button.dataset.learnView === learnView;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
    });
    if (updateHash && !normalizedRoute.includes("detail")) history.replaceState(null, "", `#${normalizedRoute}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function refreshSection(sectionName) {
    const actions = {
        kanjiOfDay: () => browseDailyKanji(1, true),
        wordOfDay: () => browseDailyWord(1, true),
        randomKanji: () => browseKanji(1, true),
        randomVocabulary: () => browseWord(1, true),
        kanjiQuiz: newKanjiQuiz,
        vocabularyQuiz: newVocabularyQuiz
    };
    actions[sectionName]?.();
}

function refreshAllFilteredContent() {
    SECTION_NAMES.forEach(refreshSection);
}

function initializePwaUpdates() {
    if (!("serviceWorker" in navigator)) return;
    const notification = document.getElementById("update-notification");
    const updateButton = document.getElementById("apply-update");
    let waitingWorker = null;
    let reloading = false;

    const showUpdate = worker => {
        waitingWorker = worker;
        notification.hidden = false;
    };

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register("service-worker.js");
            if (registration.waiting && navigator.serviceWorker.controller) showUpdate(registration.waiting);
            registration.addEventListener("updatefound", () => {
                const installing = registration.installing;
                installing?.addEventListener("statechange", () => {
                    if (installing.state === "installed" && navigator.serviceWorker.controller) showUpdate(installing);
                });
            });
            registration.update().catch(() => {});
        }
        catch (error) {
            console.warn("Service worker registration failed.", error);
        }
    };

    if (document.readyState === "complete") registerServiceWorker();
    else window.addEventListener("load", registerServiceWorker, { once: true });

    updateButton.addEventListener("click", () => {
        updateButton.disabled = true;
        waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        location.reload();
    });
}

function setAppearanceMessage(message, error = false) {
    const element = document.getElementById("appearance-message");
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("incorrect", error);
}

function openAppearanceDb() {
    return new Promise((resolve, reject) => {
        if (!("indexedDB" in window)) { reject(new Error("IndexedDB is unavailable.")); return; }
        const request = indexedDB.open(APPEARANCE_DB, 1);
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(APPEARANCE_STORE)) request.result.createObjectStore(APPEARANCE_STORE); };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not open wallpaper storage."));
    });
}

async function wallpaperRecord(action, value) {
    const db = await openAppearanceDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(APPEARANCE_STORE, action === "get" ? "readonly" : "readwrite");
        const store = transaction.objectStore(APPEARANCE_STORE);
        const request = action === "get" ? store.get(WALLPAPER_RECORD) : action === "delete" ? store.delete(WALLPAPER_RECORD) : store.put(value, WALLPAPER_RECORD);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Wallpaper storage failed."));
        transaction.oncomplete = () => db.close();
    });
}

const CUSTOM_ACCENT_PROPERTIES = ["--color-primary", "--color-primary-dark", "--color-primary-soft", "--color-secondary", "--color-background", "--color-surface-soft", "--color-border", "--color-shadow", "--blossom-theme-accent"];

function normalizeCustomHex(value) {
    const candidate = String(value || "").trim();
    const match = candidate.match(/^#?([0-9a-f]{6})$/i);
    return match ? `#${match[1].toUpperCase()}` : "";
}

function hexToRgb(hex) {
    const number = Number.parseInt(hex.slice(1), 16);
    return { r:(number >> 16) & 255, g:(number >> 8) & 255, b:number & 255 };
}

function mixRgb(rgb, target, amount) {
    const channel = key => Math.round(rgb[key] + (target[key] - rgb[key]) * amount);
    return `rgb(${channel("r")} ${channel("g")} ${channel("b")})`;
}

function contrastSafeAccent(rgb) {
    const linear = value => { const channel=value/255; return channel <= .04045 ? channel/12.92 : ((channel+.055)/1.055) ** 2.4; };
    const luminance = value => .2126*linear(value.r) + .7152*linear(value.g) + .0722*linear(value.b);
    if (1.05 / (luminance(rgb) + .05) >= 4.5) return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;
    for (let amount=.05; amount<=.65; amount+=.05) {
        const mixed = { r:Math.round(rgb.r*(1-amount)), g:Math.round(rgb.g*(1-amount)), b:Math.round(rgb.b*(1-amount)) };
        if (1.05 / (luminance(mixed) + .05) >= 4.5) return `rgb(${mixed.r} ${mixed.g} ${mixed.b})`;
    }
    return mixRgb(rgb, { r:0, g:0, b:0 }, .65);
}

function clearCustomAccent({ persist=true, render=true } = {}) {
    CUSTOM_ACCENT_PROPERTIES.forEach(property => document.documentElement.style.removeProperty(property));
    document.documentElement.removeAttribute("data-custom-accent");
    if (persist) localStorage.removeItem(STORAGE.customAccent);
    if (render) renderAppearanceControls();
}

function applyCustomAccent(value, { persist=true, announce=true } = {}) {
    const hex = normalizeCustomHex(value);
    if (!hex) {
        if (announce) setCustomAccentMessage("Enter a six-digit HEX color, such as #D94F7A.", true);
        return false;
    }
    const rgb = hexToRgb(hex);
    const root = document.documentElement;
    root.style.setProperty("--color-primary", contrastSafeAccent(rgb));
    root.style.setProperty("--color-primary-dark", mixRgb(rgb, { r:35, g:28, b:34 }, .38));
    root.style.setProperty("--color-primary-soft", mixRgb(rgb, { r:255, g:255, b:255 }, .88));
    root.style.setProperty("--color-secondary", mixRgb(rgb, { r:205, g:156, b:185 }, .48));
    root.style.setProperty("--color-background", mixRgb(rgb, { r:255, g:252, b:251 }, .94));
    root.style.setProperty("--color-surface-soft", mixRgb(rgb, { r:255, g:255, b:255 }, .91));
    root.style.setProperty("--color-border", mixRgb(rgb, { r:239, g:231, b:234 }, .82));
    root.style.setProperty("--color-shadow", `rgba(${rgb.r},${rgb.g},${rgb.b},.11)`);
    root.style.setProperty("--blossom-theme-accent", mixRgb(rgb, { r:255, g:224, b:234 }, .58));
    root.dataset.customAccent = "true";
    if (persist) localStorage.setItem(STORAGE.customAccent, hex);
    renderAppearanceControls();
    if (announce) setCustomAccentMessage(`${hex} is now Sakura's accent color.`);
    return true;
}

function setCustomAccentMessage(message, isError=false) {
    const element = document.getElementById("custom-accent-message");
    if (!element) return;
    element.textContent = message;
    element.dataset.error = String(isError);
}

function applyTheme(theme, { clearCustom=true } = {}) {
    const selected = THEMES[theme] ? theme : "pink";
    if (clearCustom) clearCustomAccent({ render:false });
    document.documentElement.dataset.theme = selected;
    localStorage.setItem(STORAGE.appearanceTheme, selected);
    renderAppearanceControls();
}

function applyOverlay(value) {
    const selected = ["light","medium","strong"].includes(value) ? value : "medium";
    const strengths = { light:"58%", medium:"76%", strong:"88%" };
    localStorage.setItem(STORAGE.wallpaperOverlay, selected);
    document.documentElement.style.setProperty("--wallpaper-overlay-strength", strengths[selected]);
    document.querySelectorAll("[data-overlay]").forEach(button => button.classList.toggle("active", button.dataset.overlay === selected));
}

function clampWallpaperValue(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function normalizeWallpaperFraming(value) {
    const framing = value && typeof value === "object" ? value : DEFAULT_WALLPAPER_FRAMING;
    return {
        positionX: clampWallpaperValue(framing.positionX ?? 50, 0, 100),
        positionY: clampWallpaperValue(framing.positionY ?? 50, 0, 100),
        zoom: clampWallpaperValue(framing.zoom ?? 1, 1, 2)
    };
}

function applyWallpaperFraming(value = wallpaperFraming) {
    const framing = normalizeWallpaperFraming(value);
    document.documentElement.style.setProperty("--wallpaper-position-x", `${framing.positionX}%`);
    document.documentElement.style.setProperty("--wallpaper-position-y", `${framing.positionY}%`);
    document.documentElement.style.setProperty("--wallpaper-zoom", framing.zoom);
}

function renderWallpaperEditor() {
    const image = document.getElementById("wallpaper-editor-image");
    if (!image) return;
    wallpaperFramingDraft = normalizeWallpaperFraming(wallpaperFramingDraft);
    image.style.setProperty("--editor-wallpaper-url", `url("${wallpaperObjectUrl}")`);
    image.style.setProperty("--editor-position-x", `${wallpaperFramingDraft.positionX}%`);
    image.style.setProperty("--editor-position-y", `${wallpaperFramingDraft.positionY}%`);
    image.style.setProperty("--editor-zoom", wallpaperFramingDraft.zoom);
    document.getElementById("wallpaper-zoom").value = wallpaperFramingDraft.zoom;
    document.getElementById("wallpaper-zoom-value").value = `${wallpaperFramingDraft.zoom.toFixed(2)}×`;
}

function setWallpaperEditorMessage(message) {
    const element = document.getElementById("wallpaper-editor-message");
    if (element) element.textContent = message;
}

function openWallpaperEditor() {
    if (!wallpaperObjectUrl) return;
    wallpaperFramingDraft = { ...wallpaperFraming };
    renderWallpaperEditor();
    setWallpaperEditorMessage("");
    const dialog = document.getElementById("wallpaper-editor-dialog");
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => document.getElementById("wallpaper-editor-preview").focus());
}

function cancelWallpaperEditor() {
    wallpaperFramingDraft = { ...wallpaperFraming };
    applyWallpaperFraming(wallpaperFraming);
    const dialog = document.getElementById("wallpaper-editor-dialog");
    if (dialog.open) dialog.close();
}

function saveWallpaperEditor() {
    wallpaperFraming = normalizeWallpaperFraming(wallpaperFramingDraft);
    writeJson(STORAGE.wallpaperFraming, wallpaperFraming);
    applyWallpaperFraming(wallpaperFraming);
    const dialog = document.getElementById("wallpaper-editor-dialog");
    if (dialog.open) dialog.close();
    setAppearanceMessage("Wallpaper framing saved.");
}

function resetWallpaperEditorDraft() {
    wallpaperFramingDraft = { ...DEFAULT_WALLPAPER_FRAMING };
    renderWallpaperEditor();
    setWallpaperEditorMessage("Centered framing restored. Tap Save to keep it.");
}

function setWallpaperDraftZoom(value) {
    wallpaperFramingDraft.zoom = clampWallpaperValue(value, 1, 2);
    renderWallpaperEditor();
}

function nudgeWallpaper(direction, amount = 5) {
    if (direction === "left") wallpaperFramingDraft.positionX += amount;
    if (direction === "right") wallpaperFramingDraft.positionX -= amount;
    if (direction === "up") wallpaperFramingDraft.positionY += amount;
    if (direction === "down") wallpaperFramingDraft.positionY -= amount;
    wallpaperFramingDraft = normalizeWallpaperFraming(wallpaperFramingDraft);
    renderWallpaperEditor();
}

async function loadStoredWallpaper() {
    try {
        const blob = await wallpaperRecord("get");
        if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl);
        wallpaperObjectUrl = blob instanceof Blob ? URL.createObjectURL(blob) : "";
        if (wallpaperObjectUrl) document.body.style.setProperty("--wallpaper-url", `url("${wallpaperObjectUrl}")`);
        applyWallpaperFraming(wallpaperFraming);
        document.body.classList.toggle("wallpaper-enabled", Boolean(wallpaperObjectUrl) && localStorage.getItem(STORAGE.wallpaperEnabled) === "true");
        renderWallpaperState(Boolean(wallpaperObjectUrl));
    }
    catch (error) {
        document.body.classList.remove("wallpaper-enabled");
        renderWallpaperState(false);
        setAppearanceMessage("Custom wallpaper storage is unavailable. Color themes still work normally.", true);
    }
}

function renderWallpaperState(hasWallpaper) {
    const preview = document.getElementById("wallpaper-preview");
    if (!preview) return;
    const enabled = hasWallpaper && localStorage.getItem(STORAGE.wallpaperEnabled) === "true";
    preview.src = wallpaperObjectUrl || "";
    document.getElementById("wallpaper-preview-wrap").hidden = !hasWallpaper;
    document.getElementById("wallpaper-empty").hidden = hasWallpaper;
    document.getElementById("remove-wallpaper").hidden = !hasWallpaper;
    document.getElementById("adjust-wallpaper").hidden = !hasWallpaper;
    document.getElementById("choose-wallpaper").textContent = hasWallpaper ? "Replace Photo" : "Choose Photo";
    document.getElementById("wallpaper-toggle").checked = enabled;
    document.getElementById("wallpaper-toggle").disabled = !hasWallpaper;
    document.getElementById("wallpaper-status").textContent = enabled ? "On" : "Off";
}

function renderAppearanceControls() {
    const container = document.getElementById("theme-options");
    if (!container) return;
    const active = document.documentElement.dataset.theme || "pink";
    const customHex = normalizeCustomHex(localStorage.getItem(STORAGE.customAccent));
    const customActive = document.documentElement.dataset.customAccent === "true" && Boolean(customHex);
    container.innerHTML = Object.entries(THEMES).map(([key, theme]) => `<button class="theme-card ${!customActive && key === active ? "active" : ""}" type="button" data-theme-choice="${key}"><span class="theme-swatch" style="--swatch:${theme.swatch}"></span><strong>${theme.name}</strong><span class="theme-check">${!customActive && key === active ? "✓" : ""}</span></button>`).join("");
    document.getElementById("selected-theme-label").textContent = customActive ? `Custom ${customHex}` : THEMES[active].name;
    const input = document.getElementById("custom-accent-input");
    const preview = document.getElementById("custom-accent-preview");
    const reset = document.getElementById("reset-custom-accent");
    if (input && document.activeElement !== input) input.value = customActive ? customHex : "";
    if (preview) preview.style.setProperty("--preview-color", customActive ? customHex : THEMES[active].swatch);
    if (reset) reset.hidden = !customActive;
    applyOverlay(localStorage.getItem(STORAGE.wallpaperOverlay) || "medium");
}

async function decodeAndCompressWallpaper(file) {
    if (!file || !file.type.startsWith("image/")) throw new Error("Please choose an image file.");
    let source;
    try {
        source = "createImageBitmap" in window ? await createImageBitmap(file, { imageOrientation:"from-image" }) : await new Promise((resolve, reject) => { const image=new Image(); const url=URL.createObjectURL(file); image.onload=()=>{URL.revokeObjectURL(url);resolve(image);}; image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Image decoding failed."));}; image.src=url; });
    }
    catch { throw new Error("Sakura could not read that image. Try a JPEG, PNG, or WebP file."); }
    const width = source.width || source.naturalWidth, height = source.height || source.naturalHeight;
    const scale = Math.min(1, 1920 / Math.max(width, height));
    const canvas = document.createElement("canvas"); canvas.width=Math.max(1,Math.round(width*scale)); canvas.height=Math.max(1,Math.round(height*scale));
    const context = canvas.getContext("2d"); if (!context) throw new Error("Image resizing is unavailable in this browser.");
    context.drawImage(source,0,0,canvas.width,canvas.height); source.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .84));
    if (blob) return blob;
    const jpeg = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", .84));
    if (!jpeg) throw new Error("Sakura could not compress that image.");
    return jpeg;
}

async function previewWallpaperFile(file) {
    if (!file) return;
    setAppearanceMessage("Preparing preview…");
    try {
        pendingWallpaperBlob = await decodeAndCompressWallpaper(file);
        const previewUrl = URL.createObjectURL(pendingWallpaperBlob);
        document.getElementById("wallpaper-preview").src = previewUrl;
        document.getElementById("wallpaper-preview-wrap").hidden = false;
        document.getElementById("wallpaper-preview-label").textContent = "Preview — not applied yet";
        document.getElementById("wallpaper-confirm-actions").hidden = false;
        setAppearanceMessage("Preview ready. Confirm to save it on this device.");
    }
    catch (error) { pendingWallpaperBlob=null; setAppearanceMessage(error.message, true); }
}

async function confirmWallpaperPreview() {
    if (!pendingWallpaperBlob) return;
    try {
        await wallpaperRecord("put", pendingWallpaperBlob);
        pendingWallpaperBlob=null; localStorage.setItem(STORAGE.wallpaperEnabled,"true");
        wallpaperFraming = { ...DEFAULT_WALLPAPER_FRAMING };
        writeJson(STORAGE.wallpaperFraming, wallpaperFraming);
        applyWallpaperFraming(wallpaperFraming);
        document.getElementById("wallpaper-confirm-actions").hidden=true; document.getElementById("wallpaper-preview-label").textContent="Saved wallpaper";
        await loadStoredWallpaper(); setAppearanceMessage("Wallpaper saved and turned on. Adjust the framing if you like."); openWallpaperEditor();
    }
    catch (error) { setAppearanceMessage(error?.name === "QuotaExceededError" ? "This photo is too large for available device storage." : "Sakura could not save this wallpaper on this device.", true); }
}

async function removeWallpaper() {
    try { await wallpaperRecord("delete"); } catch {}
    pendingWallpaperBlob=null; localStorage.setItem(STORAGE.wallpaperEnabled,"false"); localStorage.removeItem(STORAGE.wallpaperFraming);
    wallpaperFraming={...DEFAULT_WALLPAPER_FRAMING}; wallpaperFramingDraft={...wallpaperFraming}; applyWallpaperFraming(wallpaperFraming);
    if (wallpaperObjectUrl) URL.revokeObjectURL(wallpaperObjectUrl); wallpaperObjectUrl="";
    document.body.classList.remove("wallpaper-enabled"); document.body.style.removeProperty("--wallpaper-url"); renderWallpaperState(false); setAppearanceMessage("Wallpaper removed. Your color theme is unchanged.");
}

async function resetAppearance() {
    if (!window.confirm("Reset the color theme and remove the saved wallpaper?")) return;
    applyTheme("pink"); applyOverlay("medium"); await removeWallpaper(); setAppearanceMessage("Appearance reset to Sakura Pink.");
}

function openAppearanceSettings() {
    renderAppearanceControls();
    loadStoredWallpaper();
    document.getElementById("settings-dialog").showModal();
}

function addListeners() {
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-sakura-speak]");
        if (!button || window.SakuraStudySuite) return;
        event.preventDefault();
        ensureStudySuite().then(suite => suite?.handleSpeakButton?.(button)).catch(() => {});
    });
    document.addEventListener("click", event => {
        if (!event.target.closest("[data-practice-romaji-toggle]")) return;
        practiceRomajiVisible = !practiceRomajiVisible;
        applyPracticeRomajiVisibility();
    });
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-mastery-state]");
        const container = button?.closest("[data-mastery-type][data-mastery-id]");
        if (!button || !container) return;
        setMastery({ type:container.dataset.masteryType, id:container.dataset.masteryId }, button.dataset.masteryState);
        refreshVisibleMasteryControls();
    });
    document.querySelectorAll("[data-route]").forEach(control => control.addEventListener("click", event => {
        event.preventDefault();
        if (control.id === "dynamic-fourth-nav" && !navigationModeOnboardingSeen) {
            openNavigationModeChooser();
            return;
        }
        const quizTarget = control.dataset.quizTarget;
        showRoute(control.dataset.route);
        if (quizTarget) showQuizTab(quizTarget);
    }));
    document.getElementById("open-hub").addEventListener("click", openHubDrawer);
    document.getElementById("close-hub").addEventListener("click", () => closeHubDrawer());
    document.getElementById("hub-drawer-overlay").addEventListener("click", () => closeHubDrawer());
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeHubDrawer(); });
    document.getElementById("library-view").addEventListener("click", event => {
        const repository = event.target.closest("[data-library-repository]");
        const save = event.target.closest("[data-library-save]");
        const open = event.target.closest("[data-library-open]");
        if (repository) openLibraryRepository(repository.dataset.libraryRepository);
        else if (save) { toggleSaved(findLibraryItem(save.dataset.librarySave)); }
        else if (open) openLibraryItem(findLibraryItem(open.dataset.libraryOpen));
    });
    document.getElementById("library-repository-back").addEventListener("click", libraryHome);
    document.getElementById("library-collection-select").addEventListener("change", event => openLibraryRepository(event.target.value));
    document.getElementById("library-category-select").addEventListener("change", event => {
        libraryFilter = event.target.value;
        libraryVisibleCount = LIBRARY_BATCH_SIZE;
        renderLibraryResults();
        if (["kanji", "vocabulary"].includes(libraryRepository)) loadLibraryLevels(libraryRepository, libraryFilter, ++libraryLoadingRevision);
        if (libraryRepository === "travel") loadLibraryTravel(libraryFilter, ++libraryLoadingRevision);
    });
    document.getElementById("library-search-input").addEventListener("input", () => { libraryVisibleCount=LIBRARY_BATCH_SIZE; renderLibraryResults(); });
    document.getElementById("clear-library-search").addEventListener("click", () => { document.getElementById("library-search-input").value=""; libraryVisibleCount=LIBRARY_BATCH_SIZE; renderLibraryResults(); document.getElementById("library-search-input").focus(); });
    document.getElementById("library-show-more").addEventListener("click", () => { libraryVisibleCount += LIBRARY_BATCH_SIZE; renderLibraryResults(); });
    document.getElementById("practice-what-would-you-say-view").addEventListener("click", event => {
        const choice = event.target.closest("[data-wwys-choice]");
        if (choice) answerWhatWouldYouSay(Number(choice.dataset.wwysChoice));
    });
    document.getElementById("wwys-next").addEventListener("click", nextWhatWouldYouSay);
    document.getElementById("wwys-practice-again").addEventListener("click", async () => {
        const bank = await loadWhatWouldYouSayBank();
        if (validateWhatWouldYouSayBank(bank)) startWhatWouldYouSaySession(bank);
    });
    document.getElementById("practice-sentence-builder-view").addEventListener("click", event => {
        const available = event.target.closest("[data-sentence-available]");
        const selected = event.target.closest("[data-sentence-selected]");
        if (available) addSentenceBuilderChunk(Number(available.dataset.sentenceAvailable));
        else if (selected) removeSentenceBuilderChunk(Number(selected.dataset.sentenceSelected));
    });
    document.getElementById("sentence-builder-clear").addEventListener("click", clearSentenceBuilderAnswer);
    document.getElementById("sentence-builder-check").addEventListener("click", checkSentenceBuilderAnswer);
    document.getElementById("sentence-builder-next").addEventListener("click", nextSentenceBuilderQuestion);
    document.getElementById("sentence-builder-practice-again").addEventListener("click", async () => {
        const bank = await loadSentenceBuilderBank();
        if (validateSentenceBuilderBank(bank)) startSentenceBuilderSession(bank);
    });
    document.getElementById("practice-one-line-many-personalities-view").addEventListener("click", event => {
        const variant = event.target.closest("[data-personality-variant]");
        if (variant) selectPersonalityVariant(Number(variant.dataset.personalityVariant));
    });
    document.getElementById("personalities-next").addEventListener("click", nextPersonalitiesEntry);
    document.getElementById("personalities-practice-again").addEventListener("click", async () => {
        const bank = await loadPersonalitiesBank();
        if (validatePersonalitiesBank(bank)) startPersonalitiesSession(bank);
    });
    document.getElementById("counters-search").addEventListener("input", renderCounters);
    document.getElementById("counters-category-filter").addEventListener("change", renderCounters);
    document.getElementById("counters-frequency-filter").addEventListener("change", renderCounters);
    document.getElementById("counters-list").addEventListener("click", event => {
        const card = event.target.closest("[data-counter-id]");
        if (card) renderCounterDetail(countersData?.find(counter => counter.id === card.dataset.counterId));
    });
    document.getElementById("close-counter-detail").addEventListener("click", closeCounterDetail);
    ["counters-romaji-toggle", "counter-detail-romaji-toggle"].forEach(id => document.getElementById(id).addEventListener("click", () => {
        countersRomajiVisible = !countersRomajiVisible;
        applyCountersRomajiVisibility();
    }));
    document.getElementById("particles-search").addEventListener("input", renderParticles);
    document.getElementById("particles-category-filter").addEventListener("change", renderParticles);
    document.getElementById("particles-frequency-filter").addEventListener("change", renderParticles);
    document.getElementById("particles-list").addEventListener("click", event => { const card=event.target.closest("[data-particle-id]"); if(card) renderParticleDetail(particlesData?.find(x=>x.id===card.dataset.particleId)); });
    document.getElementById("close-particle-detail").addEventListener("click", closeParticleDetail);
    ["particles-romaji-toggle","particle-detail-romaji-toggle"].forEach(id=>document.getElementById(id).addEventListener("click",()=>{particlesRomajiVisible=!particlesRomajiVisible;applyParticlesRomajiVisibility();}));
    document.getElementById("grammar-search").addEventListener("input", renderGrammar);
    document.getElementById("grammar-level-filter").addEventListener("change", renderGrammar);
    document.getElementById("grammar-category-filter").addEventListener("change", renderGrammar);
    document.getElementById("grammar-list").addEventListener("click", event => { const card=event.target.closest("[data-grammar-id]"); if(card) renderGrammarDetail(grammarData?.find(x=>x.id===card.dataset.grammarId)); });
    document.getElementById("close-grammar-detail").addEventListener("click", closeGrammarDetail);
    ["grammar-romaji-toggle","grammar-detail-romaji-toggle"].forEach(id=>document.getElementById(id).addEventListener("click",()=>{grammarRomajiVisible=!grammarRomajiVisible;applyGrammarRomajiVisibility();}));
    document.getElementById("etiquette-search").addEventListener("input", renderEtiquette);
    document.getElementById("etiquette-category-filter").addEventListener("change", renderEtiquette);
    document.getElementById("etiquette-importance-filter").addEventListener("change", renderEtiquette);
    document.getElementById("etiquette-list").addEventListener("click", event => {
        const card = event.target.closest("[data-etiquette-id]");
        if (card) renderEtiquetteDetail(etiquetteData?.find(entry => entry.id === card.dataset.etiquetteId));
    });
    document.getElementById("close-etiquette-detail").addEventListener("click", closeEtiquetteDetail);
    document.getElementById("etiquette-detail").addEventListener("click", event => {
        if (event.target.closest("#replay-etiquette-gesture")) replayEtiquetteGesture();
    });
    ["etiquette-romaji-toggle", "etiquette-detail-romaji-toggle"].forEach(id => document.getElementById(id).addEventListener("click", () => {
        etiquetteRomajiVisible = !etiquetteRomajiVisible;
        applyEtiquetteRomajiVisibility();
    }));
    document.getElementById("open-chibi-guide").addEventListener("click", () => {
        document.getElementById("settings-dialog").close();
        showRoute("chibi-guide");
    });
    document.getElementById("chibi-guide-form").addEventListener("click", event => {
        const character = event.target.closest("[data-chibi-character]");
        const option = event.target.closest("[data-chibi-key]");
        if (character) {
            chibiGuideDraft.character = character.dataset.chibiCharacter;
            renderChibiCustomizer();
            return;
        }
        if (option) {
            chibiGuideDraft[option.dataset.chibiKey] = option.dataset.chibiValue;
            if (option.dataset.chibiKey === "companionSide") clearChibiCompanionPosition();
            renderChibiCustomizer();
        }
    });
    [["chibi-companion-enabled","companionEnabled"],["chibi-idle-animations","idleAnimations"],["chibi-speech-bubbles","speechBubbles"],["chibi-context-reactions","contextReactions"],["chibi-gesture-coach","gestureCoach"]].forEach(([id, key]) => {
        document.getElementById(id).addEventListener("change", event => {
            chibiGuideDraft[key] = event.target.checked;
            renderChibiCustomizer();
        });
    });
    document.getElementById("chibi-guide-form").addEventListener("submit", event => {
        event.preventDefault();
        saveChibiGuide();
    });
    document.getElementById("reset-chibi-guide").addEventListener("click", () => {
        chibiGuideDraft = normalizeChibiGuide({ ...chibiGuide, character:"sakura" });
        chibiGuide = { ...chibiGuideDraft };
        writeJson(STORAGE.chibiGuide, chibiGuide);
        renderChibiCustomizer();
        document.getElementById("chibi-guide-message").textContent = "The default Sakura guide has been restored.";
        if (etiquetteData) renderEtiquette();
        updateChibiCompanion();
    });
    const chibiCompanion = document.getElementById("chibi-companion");
    chibiCompanion.addEventListener("pointerdown", startChibiCompanionDrag);
    chibiCompanion.addEventListener("pointermove", moveChibiCompanionDrag);
    chibiCompanion.addEventListener("pointerup", finishChibiCompanionDrag);
    chibiCompanion.addEventListener("pointercancel", finishChibiCompanionDrag);
    chibiCompanion.addEventListener("click", () => {
        if (chibiCompanionSuppressClick) return;
        performChibiCompanionAction();
    });
    window.addEventListener("resize", () => {
        if (chibiCompanionPosition && !chibiCompanion.hidden) requestAnimationFrame(applyChibiCompanionPosition);
    }, { passive:true });
    window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener?.("change", updateChibiCompanion);
    const homeStudyLevelDialog = document.getElementById("home-study-level-dialog");
    document.getElementById("home-study-level-button")?.addEventListener("click", () => {
        if (typeof homeStudyLevelDialog?.showModal === "function") homeStudyLevelDialog.showModal();
    });
    document.getElementById("close-home-study-level")?.addEventListener("click", () => homeStudyLevelDialog?.close());
    document.getElementById("done-home-study-level")?.addEventListener("click", () => homeStudyLevelDialog?.close());

    const navigationModeDialog = document.getElementById("navigation-mode-dialog");
    navigationModeDialog?.addEventListener("cancel", event => {
        // First-time users should make an explicit choice rather than dismissing
        // the explanation accidentally with Escape/back.
        if (!navigationModeOnboardingSeen) event.preventDefault();
    });
    document.getElementById("stay-practice-mode")?.addEventListener("click", () => chooseNavigationMode("practice"));
    document.getElementById("switch-travel-mode")?.addEventListener("click", () => chooseNavigationMode("travel"));

    document.getElementById("travel-mode-toggle").addEventListener("change", event => {
        markNavigationModeOnboardingSeen();
        setTravelModeEnabled(event.target.checked);
    });
    document.getElementById("header-appearance").addEventListener("click", openAppearanceSettings);
    document.querySelectorAll("[data-hub-action]").forEach(button => button.addEventListener("click", () => {
        closeHubDrawer(false);
        if (button.dataset.hubAction === "appearance") openAppearanceSettings();
        if (button.dataset.hubAction === "search") openSearch("hub");
        if (button.dataset.hubAction === "flashcards") { showRoute("saved"); showSavedTab("flashcards"); }
    }));
    document.querySelectorAll("[data-learn-view]").forEach(button => button.addEventListener("click", () => {
        const learnView = button.dataset.learnView;
        showRoute(learnView === "library" ? "learn" : `learn-${learnView}`);
    }));
    document.getElementById("travel-rail-view").addEventListener("click", async event => {
        const cityButton = event.target.closest("[data-rail-city]");
        if (cityButton) {
            await selectRailCity(cityButton.dataset.railCity);
            return;
        }
        const operatorButton = event.target.closest("[data-rail-operator]");
        if (operatorButton) {
            railGuidePrefs.operator = operatorButton.dataset.railOperator || "all";
            const visibleLines = railGuidePrefs.operator === "all"
                ? railGuideCityData?.lines || []
                : (railGuideCityData?.lines || []).filter(line => line.operator === railGuidePrefs.operator);
            if (!visibleLines.some(line => line.id === currentRailLine()?.id) && visibleLines[0]) {
                railGuidePrefs.line = visibleLines[0].id;
                railGuidePrefs.from = "";
                railGuidePrefs.to = "";
            }
            saveRailPrefs();
            renderRailGuide();
            return;
        }
        const networkPick = event.target.closest("[data-rail-network-pick]");
        if (networkPick) {
            selectRailNetworkHub(networkPick.dataset.railNetworkPick, networkPick.dataset.railNetworkHub);
            return;
        }
        const routeOption = event.target.closest("[data-rail-route-option]");
        if (routeOption) {
            selectRailNetworkRouteOption(routeOption.dataset.railRouteOption);
            return;
        }
        if (event.target.closest("#rail-network-swap")) {
            const fromInput = document.getElementById("rail-network-from-input");
            const toInput = document.getElementById("rail-network-to-input");
            const fromValue = fromInput?.value || "";
            const toValue = toInput?.value || "";
            [railNetworkPlannerState.from, railNetworkPlannerState.to] = [railNetworkPlannerState.to, railNetworkPlannerState.from];
            railNetworkRouteOptions = [];
            railNetworkSelectedRouteIndex = 0;
            if (fromInput) fromInput.value = toValue;
            if (toInput) toInput.value = fromValue;
            const panel = document.getElementById("rail-network-route-result");
            if (panel) {
                panel.hidden = true;
                panel.innerHTML = "";
            }
            updateRailNetworkPlanButton();
            return;
        }
        if (event.target.closest("#rail-network-reset")) {
            clearRailNetworkPlanner();
            document.getElementById("rail-network-from-input")?.focus();
            return;
        }
        if (event.target.closest("#rail-network-plan-button")) {
            planRailNetworkFromInputs();
            return;
        }
        const lineButton = event.target.closest("[data-rail-line]");
        if (lineButton) {
            selectRailLine(lineButton.dataset.railLine);
            return;
        }
        const stationButton = event.target.closest("[data-rail-station]");
        if (stationButton) {
            renderRailStationDetail(stationButton.dataset.railStation);
            return;
        }
        const landmarkButton = event.target.closest("[data-rail-landmark]");
        if (landmarkButton) {
            const landmark = (railGuideCityData?.landmarks || []).find(item => item.id === landmarkButton.dataset.railLandmark);
            const primary = railLandmarkPrimaryRef(landmark);
            if (landmark && primary) {
                document.getElementById("rail-search-input").value = "";
                renderRailSearch("");
                selectRailLine(primary.line.id, primary.station.code);
                renderRailLandmarkDetail(landmark);
            }
            return;
        }
        const searchButton = event.target.closest("[data-rail-search-line]");
        if (searchButton) {
            document.getElementById("rail-search-input").value = "";
            renderRailSearch("");
            selectRailLine(searchButton.dataset.railSearchLine, searchButton.dataset.railSearchStation);
            return;
        }
        if (event.target.closest("#rail-swap-stations")) {
            [railGuidePrefs.from, railGuidePrefs.to] = [railGuidePrefs.to, railGuidePrefs.from];
            saveRailPrefs();
            renderRailStationOptions(currentRailLine());
            renderRailJourney();
            renderRailDiagram();
        }
    });
    document.getElementById("rail-from-station").addEventListener("change", event => {
        railGuidePrefs.from = event.target.value;
        saveRailPrefs();
        renderRailJourney();
        renderRailDiagram();
    });
    document.getElementById("rail-to-station").addEventListener("change", event => {
        railGuidePrefs.to = event.target.value;
        saveRailPrefs();
        renderRailJourney();
        renderRailDiagram();
    });
    ["from","to"].forEach(side => {
        const input = document.getElementById(`rail-network-${side}-input`);
        if (!input) return;
        input.addEventListener("input", event => {
            ensureRailNetworkPlannerCity();
            railNetworkPlannerState[side] = "";
            railNetworkRouteOptions = [];
            railNetworkSelectedRouteIndex = 0;
            const panel = document.getElementById("rail-network-route-result");
            if (panel) {
                panel.hidden = true;
                panel.innerHTML = "";
            }
            updateRailNetworkPlanButton();
            window.clearTimeout(railNetworkSearchTimers[side]);
            railNetworkSearchTimers[side] = window.setTimeout(() => renderRailNetworkSuggestions(side, event.target.value), 80);
        });
        input.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                const results = document.getElementById(`rail-network-${side}-results`);
                if (results) results.hidden = true;
                return;
            }
            if (event.key === "Enter") {
                event.preventDefault();
                const resolved = railNetworkResolveTypedHub(side);
                if (resolved) {
                    const results = document.getElementById(`rail-network-${side}-results`);
                    if (results) {
                        results.hidden = true;
                        results.innerHTML = "";
                    }
                    updateRailNetworkPlanButton();
                    if (railNetworkInputValue("from") && railNetworkInputValue("to")) {
                        planRailNetworkFromInputs();
                    }
                    else {
                        document.getElementById(`rail-network-${side === "from" ? "to" : "from"}-input`)?.focus();
                    }
                }
                else {
                    renderRailNetworkSuggestions(side, input.value);
                }
            }
        });
    });
    document.getElementById("rail-search-input").addEventListener("input", event => {
        window.clearTimeout(railGuideSearchTimer);
        railGuideSearchTimer = window.setTimeout(() => renderRailSearch(event.target.value), 100);
    });
    document.getElementById("rail-search-clear").addEventListener("click", () => {
        const input = document.getElementById("rail-search-input");
        input.value = "";
        renderRailSearch("");
        input.focus();
    });

    document.getElementById("travel-category-filters").addEventListener("click", event => {
        const button = event.target.closest("[data-travel-filter]");
        if (!button) return;
        currentTravelFilter = button.dataset.travelFilter;
        renderTravelFilters(currentTravelCategory);
        const pool = travelPhrasePool();
        currentTravelIndex = 0;
        renderTravelPhraseCard(pool[0] || null);
    });
    document.getElementById("previous-travel-phrase").addEventListener("click", () => browseTravelPhrase(-1));
    document.getElementById("random-travel-phrase").addEventListener("click", () => browseTravelPhrase(1, true));
    document.getElementById("next-travel-phrase").addEventListener("click", () => browseTravelPhrase(1));
    document.getElementById("travel-phrase-list").addEventListener("click", event => {
        if (!event.target.closest("[data-save-travel-phrase]") || !currentTravelPhrase) return;
        toggleSaved(currentTravelPhrase);
        renderTravelPhraseCard(currentTravelPhrase);
    });
    document.getElementById("travel-my-phrases-view").addEventListener("click", event => {
        const filter = event.target.closest("[data-saved-travel-filter]");
        const pin = event.target.closest("[data-pin-travel-id]");
        const open = event.target.closest("[data-open-travel-saved]");
        if (filter) { savedTravelCategoryFilter = filter.dataset.savedTravelFilter; renderMyTravelPhrases(); }
        else if (pin) togglePinnedTravelPhrase(pin.dataset.pinTravelId);
        else if (open) openSavedItem(savedItems.find(item => itemKey(item) === open.dataset.openTravelSaved));
    });
    document.getElementById("create-travel-deck").addEventListener("click", () => openTravelDeckEditor());
    document.getElementById("travel-decks-empty").addEventListener("click", event => { if (event.target.closest("[data-create-travel-deck]")) openTravelDeckEditor(); });
    document.getElementById("travel-deck-list").addEventListener("click", event => { const button=event.target.closest("[data-open-travel-deck]"); if(button)showRoute(`travel-deck-${button.dataset.openTravelDeck}`); });
    document.getElementById("edit-travel-deck").addEventListener("click", () => openTravelDeckEditor(travelDeckById()));
    document.getElementById("add-travel-deck-phrases").addEventListener("click", openTravelDeckPicker);
    document.getElementById("travel-deck-empty").addEventListener("click", event => { if(event.target.closest("[data-add-deck-phrases]"))openTravelDeckPicker(); });
    document.getElementById("travel-deck-phrases").addEventListener("click", event => { const remove=event.target.closest("[data-remove-deck-phrase]");const open=event.target.closest("[data-open-deck-phrase]");if(remove)removePhraseFromCurrentDeck(remove.dataset.removeDeckPhrase);else if(open)openSavedItem(savedItems.find(item=>itemKey(item)===open.dataset.openDeckPhrase)); });
    document.getElementById("travel-deck-form").addEventListener("submit", saveTravelDeck);
    document.getElementById("close-travel-deck-editor").addEventListener("click", () => document.getElementById("travel-deck-editor").close());
    document.getElementById("travel-deck-icons").addEventListener("click", event => { const button=event.target.closest("[data-deck-icon]");if(button){travelDeckIconChoice=button.dataset.deckIcon;renderTravelDeckIcons();} });
    document.getElementById("delete-travel-deck").addEventListener("click", deleteCurrentTravelDeck);
    document.getElementById("close-travel-deck-picker").addEventListener("click", () => document.getElementById("travel-deck-picker").close());
    document.getElementById("cancel-travel-deck-picker").addEventListener("click", () => document.getElementById("travel-deck-picker").close());
    document.getElementById("travel-deck-picker-search").addEventListener("input", renderTravelDeckPicker);
    document.getElementById("travel-deck-picker-filters").addEventListener("click", event => { const button=event.target.closest("[data-deck-picker-filter]");if(button){travelDeckPickerFilter=button.dataset.deckPickerFilter;renderTravelDeckPicker();} });
    document.getElementById("travel-deck-picker-list").addEventListener("change", event => { const input=event.target.closest("[data-deck-picker-id]");if(!input)return;if(input.checked)travelDeckPickerSelection.add(input.dataset.deckPickerId);else travelDeckPickerSelection.delete(input.dataset.deckPickerId);renderTravelDeckPicker(); });
    document.getElementById("save-travel-deck-phrases").addEventListener("click", saveTravelDeckPicker);
    document.getElementById("create-travel-note").addEventListener("click", () => openTravelNoteEditor());
    document.getElementById("travel-notes-empty").addEventListener("click", event => { if(event.target.closest("[data-create-travel-note]"))openTravelNoteEditor(); });
    document.getElementById("travel-note-search").addEventListener("input", renderTravelNotes);
    document.getElementById("travel-note-filters").addEventListener("click", event => { const button=event.target.closest("[data-travel-note-filter]");if(button){travelNoteCategoryFilter=button.dataset.travelNoteFilter;renderTravelNotes();} });
    document.getElementById("travel-notes-view").addEventListener("click", event => { const button=event.target.closest("[data-open-travel-note]");if(button)openTravelNoteDetail(button.dataset.openTravelNote); });
    document.getElementById("travel-note-form").addEventListener("submit", saveTravelNote);
    document.getElementById("close-travel-note-editor").addEventListener("click", () => document.getElementById("travel-note-editor").close());
    document.getElementById("cancel-travel-note").addEventListener("click", () => document.getElementById("travel-note-editor").close());
    document.getElementById("close-travel-note-detail").addEventListener("click", () => document.getElementById("travel-note-detail").close());
    document.getElementById("edit-travel-note").addEventListener("click", () => { const note=travelNoteById();document.getElementById("travel-note-detail").close();openTravelNoteEditor(note); });
    document.getElementById("pin-travel-note").addEventListener("click", toggleCurrentTravelNotePin);
    document.getElementById("delete-travel-note").addEventListener("click", deleteCurrentTravelNote);
    document.querySelectorAll("[data-edit-travel-countdown]").forEach(button => button.addEventListener("click", openTravelCountdownEditor));
    document.getElementById("edit-travel-countdown").addEventListener("click", openTravelCountdownEditor);
    document.getElementById("remove-travel-countdown").addEventListener("click", removeTravelCountdown);
    document.getElementById("travel-countdown-form").addEventListener("submit", saveTravelCountdown);
    document.getElementById("close-travel-countdown-editor").addEventListener("click", () => document.getElementById("travel-countdown-editor").close());
    document.getElementById("cancel-travel-countdown").addEventListener("click", () => document.getElementById("travel-countdown-editor").close());
    document.getElementById("travel-offline-action").addEventListener("click", () => downloadTravelOfflinePack(travelOfflinePackState.status === "ready"));
    document.getElementById("remove-travel-offline-pack").addEventListener("click", removeTravelOfflinePack);
    document.querySelectorAll("[data-yen-expression]").forEach(input => {
        input.addEventListener("focus", () => activateYenSide(input.dataset.yenExpression));
        input.addEventListener("input", () => editYenExpression(input.dataset.yenExpression, input.value));
    });
    document.querySelectorAll("[data-yen-panel]").forEach(panel => panel.addEventListener("click", event => {
        if (!event.target.closest("button, input, select, label")) activateYenSide(panel.dataset.yenPanel, true);
    }));
    document.querySelectorAll("[data-yen-currency]").forEach(select => select.addEventListener("change", () => setYenCurrency(select.dataset.yenCurrency, select.value)));
    document.querySelectorAll("[data-yen-key]").forEach(button => button.addEventListener("click", () => insertYenKey(button.dataset.yenSide, button.dataset.yenKey)));
    document.querySelectorAll("[data-yen-clear]").forEach(button => button.addEventListener("click", () => clearYenExpression(button.dataset.yenClear)));
    document.getElementById("swap-yen-currencies").addEventListener("click", swapYenCurrencies);
    document.getElementById("edit-yen-rate").addEventListener("click", openYenRateEditor);
    document.getElementById("yen-rate-form").addEventListener("submit", saveYenRate);
    document.getElementById("close-yen-rate-editor").addEventListener("click", () => document.getElementById("yen-rate-editor").close());
    document.getElementById("cancel-yen-rate").addEventListener("click", () => document.getElementById("yen-rate-editor").close());
    window.addEventListener("online", () => { if (currentRoute === "translate") renderTranslationMode(); });
    window.addEventListener("offline", () => { if (currentRoute === "translate") renderTranslationMode(); });

    document.getElementById("translation-mode-switch")?.addEventListener("click", event => {
        const button = event.target.closest("[data-translation-mode]");
        if (button) setTranslationMode(button.dataset.translationMode);
    });
    document.getElementById("translation-contexts").addEventListener("click", event => {
        const button = event.target.closest("[data-translation-context]");
        if (button) {
            translationContext = button.dataset.translationContext;
            renderTranslationChips();
        }
    });
    document.getElementById("translation-tones").addEventListener("click", event => {
        const button = event.target.closest("[data-translation-tone]");
        if (button) {
            translationTone = button.dataset.translationTone;
            renderTranslationChips();
        }
    });
    document.getElementById("translation-form").addEventListener("submit", requestTranslation);
    document.getElementById("translation-english").addEventListener("input", event => {
        document.getElementById("translation-character-count").textContent = event.target.value.length;
    });
    document.getElementById("clear-translation").addEventListener("click", () => {
        document.getElementById("translation-form").reset();
        document.getElementById("translation-character-count").textContent = "0";
        document.getElementById("translation-message").textContent = "";
        renderTranslationResult(null);
        renderTranslationSuggestions([]);
    });
    document.getElementById("translation-suggestions")?.addEventListener("click", event => {
        const button = event.target.closest("[data-translation-suggestion]");
        if (!button || !translationPhraseData) return;
        const record = translationPhraseData.find(item => item.id === button.dataset.translationSuggestion);
        if (!record) return;
        const result = offlinePhraseResult(record);
        renderTranslationResult(result);
        document.getElementById("translation-message").textContent = "Offline phrase selected.";
    });
    document.getElementById("translation-library-matches")?.addEventListener("click", event => {
        const button = event.target.closest("[data-translation-library-key]");
        if (!button) return;
        const vocabulary = Array.isArray(window.VOCABULARY_DATA) ? window.VOCABULARY_DATA : [];
        const pool = [...nativeData(), ...slangData(), ...vocabulary, ...savedItems];
        const item = pool.find(candidate => itemKey(candidate) === button.dataset.translationLibraryKey);
        if (!item) return;
        renderTranslationResult(libraryPhraseResult(item));
        document.getElementById("translation-message").textContent = "Related Sakura library item selected.";
    });
    document.getElementById("copy-translation").addEventListener("click", async () => {
        if (!currentTranslationResult) return;
        try {
            await navigator.clipboard.writeText(currentTranslationResult.japanese);
            document.getElementById("translation-message").textContent = "Copied Japanese to the clipboard.";
        }
        catch {
            document.getElementById("translation-message").textContent = "Copy is unavailable. Press and hold the Japanese text to copy it.";
        }
    });
    document.getElementById("copy-translation-reading")?.addEventListener("click", async () => {
        if (!currentTranslationResult) return;
        const text = [
            currentTranslationResult.japanese,
            currentTranslationResult.kana,
            currentTranslationResult.romaji
        ].filter(Boolean).join("\n");
        try {
            await navigator.clipboard.writeText(text);
            document.getElementById("translation-message").textContent = "Copied Japanese with reading.";
        }
        catch {
            document.getElementById("translation-message").textContent = "Copy is unavailable. Press and hold the text to copy it.";
        }
    });
    document.getElementById("save-translation").addEventListener("click", () => {
        const item = translationResultItem();
        if (!item) return;
        toggleSaved(item);
        invalidateSearchIndex();
        renderTranslationResult(currentTranslationResult);
    });
    document.getElementById("translation-history").addEventListener("click", event => {
        const remove = event.target.closest("[data-delete-translation-history]");
        if (remove) {
            translationHistory = translationHistory.filter(item => item.id !== remove.dataset.deleteTranslationHistory);
            writeJson(STORAGE.translationHistory, translationHistory);
            renderTranslationHistory();
            return;
        }

        const reuse = event.target.closest("[data-translation-history]");
        if (reuse) {
            const item = translationHistory.find(record => record.id === reuse.dataset.translationHistory);
            if (!item) return;
            document.getElementById("translation-english").value = item.english;
            document.getElementById("translation-character-count").textContent = String(item.english.length);
            translationContext = item.context || "Everyday";
            translationTone = item.tone || "Polite and natural";
            translationMode = item.mode === "online" ? "online" : "offline";
            renderTranslationChips();
            renderTranslationMode();
            renderTranslationSuggestions([]);
            renderTranslationResult(item.result);
        }
    });
    document.getElementById("clear-translation-history").addEventListener("click", () => {
        if (window.confirm("Clear all translation history?")) {
            translationHistory = [];
            writeJson(STORAGE.translationHistory, translationHistory);
            renderTranslationHistory();
        }
    });
    const entryDialog = document.getElementById("entry-manager-dialog");
    document.getElementById("open-entry-manager").addEventListener("click", () => { resetEntryForm(); showEntryTab("form"); entryDialog.showModal(); });
    document.getElementById("close-entry-manager").addEventListener("click", () => entryDialog.close());
    document.querySelectorAll("[data-entry-tab]").forEach(button => button.addEventListener("click", () => showEntryTab(button.dataset.entryTab)));
    document.getElementById("entry-type").addEventListener("change", () => renderEntryCategoryChips());
    document.getElementById("cancel-entry-edit").addEventListener("click", () => resetEntryForm());
    document.getElementById("entry-form").addEventListener("submit", event => {
        event.preventDefault();
        const editingId = document.getElementById("entry-edit-id").value;
        const entry = readEntryForm();
        const errors = validateUserEntry(entry, editingId);
        if (errors.length) { document.getElementById("entry-form-message").textContent = errors.join(" "); return; }
        const near = possibleNearDuplicate(entry, editingId);
        if (near && !confirm(`Possible near duplicate: “${near.expression}”. Save anyway?`)) return;
        userNativeEntries = userNativeEntries.filter(item => item.id !== editingId);
        userSlangEntries = userSlangEntries.filter(item => item.id !== editingId);
        (entry.type === "slang" ? userSlangEntries : userNativeEntries).push(entry);
        persistUserEntries(); resetEntryForm(); showEntryTab("list");
    });
    document.getElementById("my-entry-search").addEventListener("input", renderMyEntries);
    document.getElementById("my-entry-type-filter").addEventListener("change", renderMyEntries);
    document.getElementById("my-entry-list").addEventListener("click", event => {
        const edit = event.target.closest("[data-edit-user-entry]");
        const remove = event.target.closest("[data-delete-user-entry]");
        if (edit) { resetEntryForm(userEntries().find(item => item.id === edit.dataset.editUserEntry)); showEntryTab("form"); }
        if (remove && confirm("Delete this user-created entry?")) { userNativeEntries = userNativeEntries.filter(item => item.id !== remove.dataset.deleteUserEntry); userSlangEntries = userSlangEntries.filter(item => item.id !== remove.dataset.deleteUserEntry); persistUserEntries(); }
    });
    document.getElementById("export-user-entries").addEventListener("click", exportUserEntries);
    document.getElementById("import-user-entries").addEventListener("change", event => { if (event.target.files[0]) importUserEntries(event.target.files[0]); event.target.value = ""; });
    document.getElementById("delete-all-user-entries").addEventListener("click", () => { if (confirm("Delete all user-created entries? This cannot be undone.")) { userNativeEntries = []; userSlangEntries = []; persistUserEntries(); } });
    document.getElementById("header-search").addEventListener("click", () => openSearch(currentRoute));
    document.getElementById("open-learn-search").addEventListener("click", () => openSearch("learn"));
    document.getElementById("close-search").addEventListener("click", () => showRoute(searchReturnRoute));
    document.getElementById("universal-search-input").addEventListener("input", () => {
        resetSearchResultLimit();
        renderSearchResults();
        prepareTravelSearchForCurrentQuery();
        prepareKaomojiSearchForCurrentQuery();
    });
    document.getElementById("search-form").addEventListener("submit", event => {
        event.preventDefault();
        addRecentSearch(document.getElementById("universal-search-input").value);
        renderSearchResults();
        prepareTravelSearchForCurrentQuery();
        prepareKaomojiSearchForCurrentQuery();
    });
    document.getElementById("clear-search-input").addEventListener("click", () => {
        document.getElementById("universal-search-input").value = "";
        resetSearchResultLimit();
        renderSearchResults();
        document.getElementById("universal-search-input").focus();
    });
    document.getElementById("search-type-filters").addEventListener("click", event => {
        const button = event.target.closest("[data-search-type]");
        if (!button) return;
        searchType = button.dataset.searchType;
        resetSearchResultLimit();
        document.querySelectorAll("[data-search-type]").forEach(filter => filter.classList.toggle("active", filter === button));
        document.getElementById("search-jlpt-panel").hidden = !["all", "kanji", "vocabulary"].includes(searchType);
        renderSearchResults();
        if (["all", "travel"].includes(searchType)) prepareTravelSearchForCurrentQuery();
        if (["all", "kaomoji"].includes(searchType)) prepareKaomojiSearchForCurrentQuery();
    });
    document.getElementById("show-more-search-results").addEventListener("click", () => {
        searchVisibleCount += 40;
        renderSearchResults();
    });
    document.getElementById("search-results").addEventListener("click", event => {
        const saveButton = event.target.closest("[data-search-save]");
        if (saveButton) {
            toggleSaved(findSearchItem(saveButton.dataset.searchSave));
            renderSearchResults();
            return;
        }
        const openButton = event.target.closest("[data-search-open]");
        if (openButton) openSearchResult(findSearchItem(openButton.dataset.searchOpen));
    });
    document.getElementById("recent-search-list").addEventListener("click", event => {
        const removeButton = event.target.closest("[data-remove-recent]");
        if (removeButton) {
            recentSearches.splice(Number(removeButton.dataset.removeRecent), 1);
            writeJson(STORAGE.recentSearches, recentSearches);
            renderRecentSearches();
            return;
        }
        const useButton = event.target.closest("[data-recent-index]");
        if (useButton) {
            document.getElementById("universal-search-input").value = recentSearches[Number(useButton.dataset.recentIndex)] || "";
            resetSearchResultLimit();
            renderSearchResults();
            prepareTravelSearchForCurrentQuery();
            prepareKaomojiSearchForCurrentQuery();
        }
    });
    document.getElementById("clear-recent-searches").addEventListener("click", () => {
        recentSearches = [];
        writeJson(STORAGE.recentSearches, recentSearches);
        renderRecentSearches();
    });

    document.getElementById("kaomoji-search-form").addEventListener("submit", event => {
        event.preventDefault();
        window.clearTimeout(kaomojiSearchTimer);
        renderKaomoji();
    });
    document.getElementById("kaomoji-search").addEventListener("input", scheduleKaomojiRender);
    document.getElementById("clear-kaomoji-search").addEventListener("click", () => {
        const input = document.getElementById("kaomoji-search");
        input.value = "";
        window.clearTimeout(kaomojiSearchTimer);
        renderKaomoji();
        input.focus();
    });
    document.getElementById("kaomoji-list").addEventListener("click", event => {
        const button = event.target.closest("[data-kaomoji-copy]");
        if (!button) return;
        copyKaomojiItem(kaomojiById.get(button.dataset.kaomojiCopy));
    });

    document.querySelectorAll("[data-open-detail]").forEach(button => button.addEventListener("click", () => button.dataset.openDetail === "kanji" ? openKanjiDetail(currentDailyKanji, "home") : openWordDetail(currentDailyWord, "home")));
    document.getElementById("open-browse-kanji-detail").addEventListener("click", () => openKanjiDetail(currentBrowseKanji, "learn"));
    document.getElementById("open-browse-word-detail").addEventListener("click", () => openWordDetail(currentBrowseWord, "learn"));
    document.querySelectorAll("[data-detail-back]").forEach(button => button.addEventListener("click", () => showRoute(detailReturnRoute)));

    document.getElementById("previous-daily-kanji").addEventListener("click", () => browseDailyKanji(-1));
    document.getElementById("random-daily-kanji").addEventListener("click", () => browseDailyKanji(1, true));
    document.getElementById("refresh-daily-kanji").addEventListener("click", () => browseDailyKanji(1, true));
    document.getElementById("next-daily-kanji").addEventListener("click", () => browseDailyKanji(1));
    document.getElementById("previous-daily-word").addEventListener("click", () => browseDailyWord(-1));
    document.getElementById("random-daily-word").addEventListener("click", () => browseDailyWord(1, true));
    document.getElementById("refresh-daily-word").addEventListener("click", () => browseDailyWord(1, true));
    document.getElementById("next-daily-word").addEventListener("click", () => browseDailyWord(1));
    document.getElementById("save-daily-kanji").addEventListener("click", () => toggleSaved(currentDailyKanji));
    document.getElementById("save-daily-word").addEventListener("click", () => toggleSaved(currentDailyWord));

    document.getElementById("previous-kanji").addEventListener("click", () => browseKanji(-1));
    document.getElementById("random-kanji").addEventListener("click", () => browseKanji(1, true));
    document.getElementById("next-kanji").addEventListener("click", () => browseKanji(1));
    document.getElementById("save-browse-kanji").addEventListener("click", () => toggleSaved(currentBrowseKanji));
    document.getElementById("previous-word").addEventListener("click", () => browseWord(-1));
    document.getElementById("random-word").addEventListener("click", () => browseWord(1, true));
    document.getElementById("next-word").addEventListener("click", () => browseWord(1));
    document.getElementById("save-browse-word").addEventListener("click", () => toggleSaved(currentBrowseWord));

    document.getElementById("save-detail-kanji").addEventListener("click", () => toggleSaved(currentDetailKanji));
    document.getElementById("save-detail-word").addEventListener("click", () => toggleSaved(currentDetailWord));
    document.getElementById("detail-previous-kanji").addEventListener("click", () => moveDetailKanji(-1));
    document.getElementById("detail-random-kanji").addEventListener("click", () => moveDetailKanji(1, true));
    document.getElementById("detail-next-kanji").addEventListener("click", () => moveDetailKanji(1));
    document.getElementById("detail-previous-word").addEventListener("click", () => moveDetailWord(-1));
    document.getElementById("detail-random-word").addEventListener("click", () => moveDetailWord(1, true));
    document.getElementById("detail-next-word").addEventListener("click", () => moveDetailWord(1));
    document.getElementById("detail-kanji-examples").addEventListener("click", event => {
        const button = event.target.closest("[data-example-id]");
        if (!button) return;
        toggleSaved(JSON.parse(decodeURIComponent(button.dataset.exampleId)));
        renderKanjiDetail(currentDetailKanji);
    });

    document.querySelectorAll("[data-quiz-tab]").forEach(button => button.addEventListener("click", () => showQuizTab(button.dataset.quizTab)));
    document.querySelectorAll("[data-reset-quiz]").forEach(button => button.addEventListener("click", () => resetQuizSession(button.dataset.resetQuiz)));
    document.getElementById("kana-quiz-groups").addEventListener("click", event => {
        const button = event.target.closest("[data-kana-group]");
        if (button) toggleKanaQuizGroup(button.dataset.kanaGroup);
    });
    document.getElementById("check-kana").addEventListener("click", checkKana);
    document.getElementById("save-kana-quiz").addEventListener("click", () => toggleSaved(kanaQuizSavedItem()));
    document.getElementById("reveal-kana").addEventListener("click", () => setFeedback("kana-feedback", `${currentKana[0]} is ${currentKana[1]}.`));
    document.getElementById("next-kana").addEventListener("click", newKana);
    document.getElementById("kana-answer").addEventListener("keydown", event => { if (event.key === "Enter") checkKana(); });
    document.getElementById("check-kanji-quiz").addEventListener("click", checkKanjiQuiz);
    document.getElementById("save-kanji-quiz").addEventListener("click", () => toggleSaved(currentKanjiQuiz));
    document.getElementById("reveal-kanji-quiz").addEventListener("click", () => {
        kanjiQuizFeedbackRevealed = true;
        setFeedback("kanji-quiz-feedback", kanjiQuizRevealText(currentKanjiQuiz));
    });
    document.getElementById("kanji-quiz-romaji-toggle").addEventListener("click", () => {
        kanjiQuizRomajiVisible = !kanjiQuizRomajiVisible;
        writeJson(STORAGE.quizRomaji, kanjiQuizRomajiVisible);
        applyKanjiQuizRomajiVisibility();
    });
    document.getElementById("next-kanji-quiz").addEventListener("click", newKanjiQuiz);
    document.getElementById("kanji-quiz-answer").addEventListener("keydown", event => { if (event.key === "Enter") checkKanjiQuiz(); });
    document.getElementById("check-vocabulary-quiz").addEventListener("click", checkVocabularyQuiz);
    document.getElementById("save-vocabulary-quiz").addEventListener("click", () => toggleSaved(currentVocabularyQuiz));
    document.getElementById("reveal-vocabulary-quiz").addEventListener("click", () => setFeedback("vocabulary-quiz-feedback", currentVocabularyQuiz?.meaning || "No content available."));
    document.getElementById("next-vocabulary-quiz").addEventListener("click", newVocabularyQuiz);
    document.getElementById("vocabulary-quiz-answer").addEventListener("keydown", event => { if (event.key === "Enter") checkVocabularyQuiz(); });

    document.getElementById("native-difficulty-filter").addEventListener("change", () => { localStorage.setItem(STORAGE.nativeDifficulty, document.getElementById("native-difficulty-filter").value); browseNative(1, true); });
    document.getElementById("native-category-filter").addEventListener("change", () => browseNative(1, true));
    document.getElementById("previous-native").addEventListener("click", () => browseNative(-1));
    document.getElementById("random-native").addEventListener("click", () => browseNative(1, true));
    document.getElementById("next-native").addEventListener("click", () => browseNative(1));
    document.getElementById("save-native-item").addEventListener("click", () => toggleSaved(currentNativeItem));

    document.querySelectorAll("[data-saved-tab]").forEach(button => button.addEventListener("click", () => showSavedTab(button.dataset.savedTab)));
    document.getElementById("saved-search-input").addEventListener("input", renderSavedItems);
    ["saved-type-filter", "saved-level-filter", "saved-slang-category-filter", "saved-status-filter", "saved-mastery-filter", "saved-sort"].forEach(id => document.getElementById(id).addEventListener("change", renderSavedItems));
    document.getElementById("saved-items").addEventListener("click", event => {
        const removeButton = event.target.closest("[data-remove-key]");
        const openButton = event.target.closest("[data-open-saved-key]");
        if (removeButton) removeItem(savedItems.find(item => itemKey(item) === removeButton.dataset.removeKey));
        else if (openButton) openSavedItem(savedItems.find(item => itemKey(item) === openButton.dataset.openSavedKey));
    });
    document.getElementById("clear-saved").addEventListener("click", () => {
        if (!savedItems.length || !window.confirm("Clear every saved learning item? This cannot be undone.")) return;
        savedItems = [];
        flashcardStatuses = {};
        writeJson(STORAGE.saved, savedItems);
        writeJson(STORAGE.statuses, flashcardStatuses);
        updateSavedUi();
    });
    document.getElementById("start-flashcards").addEventListener("click", startFilteredFlashcards);
    document.getElementById("deck-type-filter").addEventListener("change", resetFlashcardSourceAndBuild);
    document.getElementById("review-only-filter").addEventListener("change", resetFlashcardSourceAndBuild);
    document.getElementById("flashcard").addEventListener("click", () => { flashcardRevealed = !flashcardRevealed; renderFlashcard(); });
    document.getElementById("reveal-flashcard").addEventListener("click", () => { flashcardRevealed = true; renderFlashcard(); });
    document.getElementById("previous-flashcard").addEventListener("click", () => { if (flashcardDeck.length) flashcardIndex = (flashcardIndex - 1 + flashcardDeck.length) % flashcardDeck.length; flashcardRevealed = false; renderFlashcard(); });
    document.getElementById("next-flashcard").addEventListener("click", () => { if (flashcardDeck.length) flashcardIndex = (flashcardIndex + 1) % flashcardDeck.length; flashcardRevealed = false; renderFlashcard(); });
    document.getElementById("shuffle-flashcards").addEventListener("click", shuffleDeck);
    document.getElementById("known-flashcard").addEventListener("click", () => setFlashcardStatus("known"));
    document.getElementById("review-flashcard").addEventListener("click", () => setFlashcardStatus("review"));
    document.getElementById("restart-flashcards").addEventListener("click", buildFlashcardDeck);

    const settings = document.getElementById("settings-dialog");
    document.getElementById("close-settings").addEventListener("click", () => settings.close());
    document.getElementById("done-settings").addEventListener("click", () => settings.close());
    document.getElementById("theme-options").addEventListener("click", event => { const button=event.target.closest("[data-theme-choice]"); if(button) applyTheme(button.dataset.themeChoice); });
    document.getElementById("daily-goal-select").addEventListener("change", event => {
        const isCustom = event.target.value === "custom";
        setDailyCustomGoalVisibility(isCustom);
        if (isCustom) {
            setDailyGoalMessage("Type any target from 1 to 999.");
            requestAnimationFrame(() => document.getElementById("daily-custom-goal")?.focus());
            return;
        }
        setDailyGoal(event.target.value);
        setDailyGoalMessage("");
    });
    document.getElementById("set-daily-custom-goal").addEventListener("click", applyCustomDailyGoal);
    document.getElementById("daily-custom-goal").addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            applyCustomDailyGoal();
        }
    });
    document.getElementById("daily-custom-goal").addEventListener("input", () => setDailyGoalMessage(""));
    document.getElementById("apply-custom-accent").addEventListener("click", () => applyCustomAccent(document.getElementById("custom-accent-input").value));
    document.getElementById("custom-accent-input").addEventListener("keydown", event => { if(event.key === "Enter"){ event.preventDefault(); applyCustomAccent(event.currentTarget.value); } });
    document.getElementById("custom-accent-input").addEventListener("input", event => { const hex=normalizeCustomHex(event.currentTarget.value); document.getElementById("custom-accent-preview").style.setProperty("--preview-color",hex||"var(--color-primary)"); setCustomAccentMessage(""); });
    document.getElementById("reset-custom-accent").addEventListener("click", () => { clearCustomAccent(); setCustomAccentMessage("The selected preset theme is active again."); });
    document.getElementById("overlay-options").addEventListener("click", event => { const button=event.target.closest("[data-overlay]"); if(button) applyOverlay(button.dataset.overlay); });
    document.getElementById("choose-wallpaper").addEventListener("click", () => document.getElementById("wallpaper-file-input").click());
    document.getElementById("wallpaper-file-input").addEventListener("change", event => { if(event.target.files[0]) previewWallpaperFile(event.target.files[0]); event.target.value=""; });
    document.getElementById("apply-wallpaper-preview").addEventListener("click", confirmWallpaperPreview);
    document.getElementById("cancel-wallpaper-preview").addEventListener("click", () => { pendingWallpaperBlob=null; document.getElementById("wallpaper-confirm-actions").hidden=true; loadStoredWallpaper(); setAppearanceMessage("Preview cancelled."); });
    document.getElementById("remove-wallpaper").addEventListener("click", removeWallpaper);
    document.getElementById("wallpaper-toggle").addEventListener("change", event => { localStorage.setItem(STORAGE.wallpaperEnabled,String(event.target.checked)); document.body.classList.toggle("wallpaper-enabled",event.target.checked&&Boolean(wallpaperObjectUrl)); renderWallpaperState(Boolean(wallpaperObjectUrl)); });
    const wallpaperEditor = document.getElementById("wallpaper-editor-dialog");
    const wallpaperEditorPreview = document.getElementById("wallpaper-editor-preview");
    document.getElementById("adjust-wallpaper").addEventListener("click", openWallpaperEditor);
    document.getElementById("close-wallpaper-editor").addEventListener("click", cancelWallpaperEditor);
    document.getElementById("cancel-wallpaper-editor").addEventListener("click", cancelWallpaperEditor);
    document.getElementById("save-wallpaper-position").addEventListener("click", saveWallpaperEditor);
    document.getElementById("reset-wallpaper-position").addEventListener("click", resetWallpaperEditorDraft);
    document.getElementById("wallpaper-zoom").addEventListener("input", event => setWallpaperDraftZoom(event.target.value));
    document.getElementById("wallpaper-zoom-out").addEventListener("click", () => setWallpaperDraftZoom(wallpaperFramingDraft.zoom - .1));
    document.getElementById("wallpaper-zoom-in").addEventListener("click", () => setWallpaperDraftZoom(wallpaperFramingDraft.zoom + .1));
    document.querySelectorAll("[data-wallpaper-nudge]").forEach(button => button.addEventListener("click", () => nudgeWallpaper(button.dataset.wallpaperNudge)));
    wallpaperEditorPreview.addEventListener("pointerdown", event => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        wallpaperEditorPreview.setPointerCapture(event.pointerId);
        wallpaperDragState = { pointerId:event.pointerId, x:event.clientX, y:event.clientY, positionX:wallpaperFramingDraft.positionX, positionY:wallpaperFramingDraft.positionY };
    });
    wallpaperEditorPreview.addEventListener("pointermove", event => {
        if (!wallpaperDragState || wallpaperDragState.pointerId !== event.pointerId) return;
        event.preventDefault();
        const bounds = wallpaperEditorPreview.getBoundingClientRect();
        wallpaperFramingDraft.positionX = wallpaperDragState.positionX - ((event.clientX - wallpaperDragState.x) / Math.max(1, bounds.width)) * 100;
        wallpaperFramingDraft.positionY = wallpaperDragState.positionY - ((event.clientY - wallpaperDragState.y) / Math.max(1, bounds.height)) * 100;
        wallpaperFramingDraft = normalizeWallpaperFraming(wallpaperFramingDraft);
        renderWallpaperEditor();
    });
    const finishWallpaperDrag = event => {
        if (!wallpaperDragState || wallpaperDragState.pointerId !== event.pointerId) return;
        if (wallpaperEditorPreview.hasPointerCapture(event.pointerId)) wallpaperEditorPreview.releasePointerCapture(event.pointerId);
        wallpaperDragState = null;
    };
    wallpaperEditorPreview.addEventListener("pointerup", finishWallpaperDrag);
    wallpaperEditorPreview.addEventListener("pointercancel", finishWallpaperDrag);
    wallpaperEditorPreview.addEventListener("keydown", event => {
        const directions = { ArrowLeft:"left", ArrowRight:"right", ArrowUp:"up", ArrowDown:"down" };
        if (!directions[event.key]) return;
        event.preventDefault();
        nudgeWallpaper(directions[event.key], event.shiftKey ? 10 : 3);
    });
    wallpaperEditor.addEventListener("cancel", event => { event.preventDefault(); cancelWallpaperEditor(); });
    document.getElementById("reset-appearance").addEventListener("click", resetAppearance);
}

function initializeApp() {
    if (!Array.isArray(globalLevels) || !globalLevels.length) globalLevels = [...DEFAULT_LEVELS];
    applyTheme(localStorage.getItem(STORAGE.appearanceTheme) || "pink", { clearCustom:false });
    const storedCustomAccent = normalizeCustomHex(localStorage.getItem(STORAGE.customAccent));
    if (storedCustomAccent) applyCustomAccent(storedCustomAccent, { persist:false, announce:false });
    applyOverlay(localStorage.getItem(STORAGE.wallpaperOverlay) || "medium");
    applyWallpaperFraming(wallpaperFraming);
    loadStoredWallpaper();
    renderGlobalLevels();
    renderAllSectionControls();
    renderFlashcardLevels();
    renderSavedSlangCategoryOptions();
    renderSearchJlptFilters();
    renderRecentSearches();
    renderTranslationChips();
    renderTranslationHistory();
    renderTravelCountdown();
    renderTravelModeNavigation();
    renderTravelOfflinePack();
    renderYenConverter();
    refreshNativeCategories();
    const storedDifficulty = localStorage.getItem(STORAGE.nativeDifficulty);
    if (["All", "Beginner", "Intermediate", "Advanced"].includes(storedDifficulty)) document.getElementById("native-difficulty-filter").value = storedDifficulty;
    addListeners();
    browseDailyKanji(1, true);
    browseDailyWord(1, true);
    browseKanji(1, true);
    browseWord(1, true);
    renderKanaQuizGroups();
    applyKanjiQuizRomajiVisibility();
    newKana();
    newKanjiQuiz();
    newVocabularyQuiz();
    Object.keys(QUIZ_UI).forEach(updateQuizStatus);
    showQuizTab(localStorage.getItem(STORAGE.activeQuiz) || "kana");
    browseNative(1, true);
    updateSavedUi();
    scheduleSlangExpansionsLoad();
    const requestedRoute = location.hash.replace("#", "");
    const travelRoutes = Object.keys(window.TRAVEL_CATEGORIES || {}).map(category => `travel-${category}`);
    const validDeckRoute = /^travel-deck-deck-.+/.test(requestedRoute);
    showRoute(["home", "hub", "library", "learn", "learn-native", "learn-slang", "counters", "particles", "grammar", "etiquette", "kaomoji", "chibi-guide", "search", "translate", "quiz", "practice", "practice-what-would-you-say", "practice-sentence-builder", "practice-one-line-many-personalities", ...STUDY_SUITE_ROUTES, "native", "travel", "travel-my-phrases", "travel-decks", "travel-notes", "travel-countdown", "travel-offline", "travel-yen", "saved", ...travelRoutes].includes(requestedRoute) || validDeckRoute ? requestedRoute : "home", false);
    initializePwaUpdates();
    scheduleStudySuiteLoad();
}

initializeApp();
