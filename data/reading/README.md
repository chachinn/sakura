# Reading Garden source and rights workflow

`source-registry.json` is the legal-source registry for Reading Garden. A domain name alone is never sufficient evidence. A record must reference a known `sourceFamilyId`, match that family's domain and approved path patterns, retain item-level source metadata, and use one of the registry's allowed `rightsStatus` values.

## Existing records

Run `tools/normalize-reading-rights.mjs` to apply the registry metadata to the existing Article and Story archives. This tool does not change learner text, IDs, or shelf readiness.

Article adaptations use only text facts from covered government pages. Attribution and an edit/adaptation disclosure are required. Logos, photographs, charts, video, and separately credited material are excluded unless separately cleared.

## Aozora Bunko

Download Aozora Bunko's official extended UTF-8 catalog and pass the extracted CSV to:

```text
node tools/build-aozora-reading-inventory.mjs <catalog.csv>
```

Automatic `public-domain` approval requires all of the following:

- work copyright flag is `なし`;
- every credited author, translator, or other contributor row has copyright flag `なし`;
- a valid Aozora card URL exists;
- an HTML or text-file URL exists.

Translations are not approved merely because the original author is public domain. Any missing or conflicting work/contributor status becomes `needs-review`. The tool also checks every existing Story against the catalog and records the work/contributor evidence. Run `tools/build-aozora-chapter-inventory.mjs` after the work inventory to retain only real named divisions for the Serialized Novels inventory.

## Government candidates

`tools/build-government-reading-inventory.mjs` starts only from the existing verified sources and explicit approved-family index pages. It records metadata; it does not copy source text or assets. A later population pass must re-check the item for a contrary notice and third-party credits before importing or adapting text.

## Body-ready source inventory

Run `tools/rebuild-reading-body-ready-inventory.mjs` while online to crawl only registry-approved government families. It inspects the fetched item, rejects obvious landing/index pages and thin or unavailable sources, excludes third-party media, fingerprints extracted Japanese, and allocates only appropriately typed items to `body-ready/*.json`. These packs are editorial evidence, not production readings, and are deliberately outside the runtime loader and service-worker shell.

The crawl writes `qa/body-ready-source-report.json` and `qa/body-ready-rejections.json`. A target shortage is a valid failure result: never weaken shelf typing or retain a bad page merely to make a target count pass. Run `tools/validate-reading-body-ready.mjs` afterward for offline schema, source-family, domain/path, uniqueness, body-evidence, and report/pack consistency checks.

Run `tools/audit-aozora-body-ready.mjs` separately to verify current Aozora candidates using charset-aware source decoding. Serialized Novel candidates require a decoded named division that exists in the source and is not simply the work title. Its machine-readable result is `qa/aozora-body-ready-report.json`.

## Validation

Run:

```text
node tools/validate-reading-rights.mjs
node tools/validate-reading-body-ready.mjs
```

The validator checks record IDs, rights statuses, source-family/domain/path compatibility, terms and attribution, full-text/adaptation permissions, Aozora public-domain evidence, third-party asset flags, candidate counts, and real serialized-source section names. It writes `qa/source-rights-report.json`.
