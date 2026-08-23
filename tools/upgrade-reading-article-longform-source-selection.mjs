import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "tools", "discover-reading-article-topic-sources.mjs");
let source = fs.readFileSync(file, "utf8");

function replaceOnce(find, replacement, label) {
  if (!source.includes(find)) throw new Error(`Could not find ${label}`);
  source = source.replace(find, replacement);
}

replaceOnce("const MIN_JP = 320;", "const MIN_JP = 350;", "Article minimum Japanese source threshold");
replaceOnce("const MAX_FETCHES_PER_TOPIC = 420;", "const MAX_FETCHES_PER_TOPIC = 900;", "Article discovery fetch budget");

const startMarker = "const capacity=Object.fromEntries(TOPICS.map((topic)=>[topic,TARGET_PER_TOPIC]));";
const endMarker = "const selected=[];let inventoryPosition=1;";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);
if (start < 0 || end < 0 || end <= start) throw new Error("Could not locate Article source selection block");

const selection = `const LONGFORM_SOURCE_FLOORS = Object.freeze({N5:350,N4:450,N3:600,N2:800,N1:1000});
const slotNeedsByTopic = Object.fromEntries(TOPICS.map((topic)=>[topic,articleRows
  .filter((row)=>row.topic===topic)
  .map((row)=>({level:row.jlpt,floor:LONGFORM_SOURCE_FLOORS[row.jlpt]||MIN_JP}))
  .sort((a,b)=>b.floor-a.floor||LEVELS.indexOf(b.level)-LEVELS.indexOf(a.level))]));
const selectedByTopic=Object.fromEntries(TOPICS.map((topic)=>[topic,[]]));
const selectedUrls=new Set(); const selectedBodies=new Set();
const eligiblePairsByTopic=Object.fromEntries(TOPICS.map((topic)=>[topic,[]]));
for(const candidate of candidates){
  if(candidate.sourceTextCharacterCount<MIN_JP)continue;
  for(const topic of TOPICS){
    if(!TOPIC_CONFIG[topic].families.includes(candidate.family.sourceFamilyId))continue;
    const part=candidate.scores[topic]; if(!part||part.score<MIN_TOPIC_SCORE)continue;
    const seed=candidate.seedTopics.has(topic); const strong=topic!=="beauty"||beautyStrongEvidence(part,seed); if(!strong)continue;
    const bestGap=Math.max(0,candidate.bestScore-part.score); if(bestGap>MAX_BEST_TOPIC_GAP&&!seed&&!(topic==="beauty"&&strong))continue;
    eligiblePairsByTopic[topic].push({candidate,topic,score:part.score,bestGap,evidence:part.evidence,seed,strong});
  }
}
const topicOrder=[...TOPICS].sort((a,b)=>eligiblePairsByTopic[a].length-eligiblePairsByTopic[b].length||a.localeCompare(b));
const longformSelectionErrors=[];
for(const topic of topicOrder){
  const needs=slotNeedsByTopic[topic];
  for(const need of needs){
    const pool=eligiblePairsByTopic[topic].filter((pair)=>
      !selectedUrls.has(pair.candidate.url)
      && !selectedBodies.has(pair.candidate.sourceBodyFingerprint)
      && pair.candidate.sourceTextCharacterCount>=need.floor
    ).sort((a,b)=>
      Number(b.candidate.bestTopic===topic)-Number(a.candidate.bestTopic===topic)
      || Number(b.seed)-Number(a.seed)
      || b.score-a.score
      || b.candidate.sourceTextCharacterCount-a.candidate.sourceTextCharacterCount
      || a.bestGap-b.bestGap
      || a.candidate.url.localeCompare(b.candidate.url)
    );
    const pair=pool[0];
    if(!pair){
      longformSelectionErrors.push(\`${'${topic}'}: no unused source >= ${'${need.floor}'} Japanese characters for ${'${need.level}'} slot\`);
      continue;
    }
    selectedByTopic[topic].push({...pair,recommendedLevel:need.level,requiredFloor:need.floor});
    selectedUrls.add(pair.candidate.url); selectedBodies.add(pair.candidate.sourceBodyFingerprint);
  }
}

`;
source = source.slice(0, start) + selection + source.slice(end);

replaceOnce(
  'targetShelf:"articles",articleTopic:topic,topicScore:pair.score,topicEvidence:pair.evidence,sourceBestTopic:item.bestTopic,sourceBestTopicScore:item.bestScore,',
  'targetShelf:"articles",articleTopic:topic,recommendedArticleLevel:pair.recommendedLevel,longformSourceFloor:pair.requiredFloor,topicScore:pair.score,topicEvidence:pair.evidence,sourceBestTopic:item.bestTopic,sourceBestTopicScore:item.bestScore,',
  "selected Article source metadata"
);
replaceOnce(
  'const pass=selected.length===300&&selectedUrls.size===300&&selectedBodies.size===300&&Object.values(gaps).every((gap)=>gap===0);',
  'const pass=selected.length===300&&selectedUrls.size===300&&selectedBodies.size===300&&Object.values(gaps).every((gap)=>gap===0)&&longformSelectionErrors.length===0;',
  "Article discovery pass condition"
);
replaceOnce(
  'version:2,generatedDate:TODAY,pass,',
  'version:3,generatedDate:TODAY,pass,',
  "Article discovery report version"
);
replaceOnce(
  'policy:"Exactly 30 unique, body-ready, semantically fitting official sources per Article topic. Every source is used once. Thin pages, contrary-rights signals, third-party media assets, duplicate URLs/bodies, weak topic matches, and forced cross-topic assignments are rejected. Beauty additionally requires title/URL-level beauty evidence or a pre-existing trusted Beauty seed so shared navigation cannot create false positives.",',
  'policy:"Exactly 30 unique, semantically fitting official sources per Article topic, selected against the real N5–N1 Article slot mix. Sources must meet the long-form source floor for the specific level they are reserved to support. Thin pages, contrary-rights signals, third-party media assets, duplicate URLs/bodies, weak topic matches, forced cross-topic assignments, and source inflation are rejected. Beauty additionally requires title/URL-level beauty evidence or a trusted Beauty seed so shared navigation cannot create false positives.",',
  "Article discovery report policy"
);
replaceOnce(
  'thresholds:{minimumJapaneseCharacters:MIN_JP,minimumTopicScore:MIN_TOPIC_SCORE,maximumBestTopicGap:MAX_BEST_TOPIC_GAP,maxFetchesPerTopic:MAX_FETCHES_PER_TOPIC},',
  'thresholds:{minimumJapaneseCharacters:MIN_JP,longformSourceFloors:LONGFORM_SOURCE_FLOORS,minimumTopicScore:MIN_TOPIC_SCORE,maximumBestTopicGap:MAX_BEST_TOPIC_GAP,maxFetchesPerTopic:MAX_FETCHES_PER_TOPIC},',
  "Article discovery thresholds"
);
replaceOnce(
  'crawl,discoveredUniqueCandidatePages:candidates.length,eligibleCounts,selectedCount:selected.length,uniqueSelectedUrls:selectedUrls.size,uniqueSelectedBodies:selectedBodies.size,gaps,',
  'crawl,discoveredUniqueCandidatePages:candidates.length,eligibleCounts,selectedCount:selected.length,uniqueSelectedUrls:selectedUrls.size,uniqueSelectedBodies:selectedBodies.size,gaps,longformSelectionErrors,longformReservedLevels:Object.fromEntries(LEVELS.map((level)=>[level,selected.filter((row)=>row.recommendedArticleLevel===level).length])),',
  "Article discovery long-form report fields"
);
replaceOnce(
  'console.log(JSON.stringify({pass,startingSeeds:report.startingSeeds,crawl,discoveredUniqueCandidatePages:candidates.length,eligibleCounts,selectedCount:selected.length,gaps,rejectionSummary:report.rejectionSummary},null,2));',
  'console.log(JSON.stringify({pass,startingSeeds:report.startingSeeds,crawl,discoveredUniqueCandidatePages:candidates.length,eligibleCounts,selectedCount:selected.length,gaps,longformSelectionErrors,longformReservedLevels:report.longformReservedLevels,rejectionSummary:report.rejectionSummary},null,2));',
  "Article discovery console summary"
);

fs.writeFileSync(file, source);
console.log(JSON.stringify({pass:true,file:"tools/discover-reading-article-topic-sources.mjs",minimumJapaneseSourceCharacters:350,longformSourceFloors:{N5:350,N4:450,N3:600,N2:800,N1:1000},maxFetchesPerTopic:900}, null, 2));
