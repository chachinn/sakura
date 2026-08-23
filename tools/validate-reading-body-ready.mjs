import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const reading=path.join(root,"data","reading");
const registry=JSON.parse(fs.readFileSync(path.join(reading,"source-registry.json"),"utf8"));
const familyById=new Map(registry.sourceFamilies.map(x=>[x.sourceFamilyId,x]));
const report=JSON.parse(fs.readFileSync(path.join(reading,"qa","body-ready-source-report.json"),"utf8"));
const files=fs.readdirSync(path.join(reading,"body-ready")).filter(x=>x.endsWith(".json"));
const required=["candidateId","targetShelf","sourceFamilyId","sourceTitle","sourcePublisher","sourceUrl","rightsStatus","rightsBasis","thirdPartyContentReview","sourceBodyExtractionStatus","sourceJapaneseSubstance","sourceTextCharacterCount","reuseMode","sourceBodyFingerprint","sourceAttribution"];
const errors=[],ids=new Set(),urls=new Set(),bodies=new Set(),counts={};
for(const name of files){const pack=JSON.parse(fs.readFileSync(path.join(reading,"body-ready",name),"utf8"));counts[pack.shelf]=pack.records.length;if(pack.bodyReadyCount!==pack.records.length)errors.push(`${name}: bodyReadyCount mismatch`);for(const x of pack.records){for(const key of required)if(x[key]===undefined||x[key]===null||x[key]==="")errors.push(`${x.candidateId||name}: missing ${key}`);if(ids.has(x.candidateId))errors.push(`${x.candidateId}: duplicate ID`);ids.add(x.candidateId);if(urls.has(x.sourceUrl))errors.push(`${x.candidateId}: duplicate URL`);urls.add(x.sourceUrl);if(bodies.has(x.sourceBodyFingerprint))errors.push(`${x.candidateId}: duplicate body`);bodies.add(x.sourceBodyFingerprint);const family=familyById.get(x.sourceFamilyId);if(!family)errors.push(`${x.candidateId}: unknown family`);else{const u=new URL(x.sourceUrl);if(u.hostname!==family.domain)errors.push(`${x.candidateId}: family/domain mismatch`);if(!family.approvedPathPatterns.some(p=>new RegExp(p).test(u.pathname)))errors.push(`${x.candidateId}: unapproved path`)}if(x.rightsStatus!=="adaptation-permitted")errors.push(`${x.candidateId}: invalid rights status`);if(x.sourceBodyExtractionStatus!=="body-ready"||x.sourceTextCharacterCount<320)errors.push(`${x.candidateId}: insufficient body evidence`);if(x.thirdPartyContentReview.assetsBundled!==false)errors.push(`${x.candidateId}: assets must be excluded`)}}
for(const [shelf,count] of Object.entries(counts))if(report.acceptedCountsByShelf[shelf]!==count)errors.push(`${shelf}: QA report count differs from pack`);
const result={pass:errors.length===0,packCount:files.length,recordCount:ids.size,counts,duplicateIds:0,duplicateUrls:0,duplicateBodies:0,errors};console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
