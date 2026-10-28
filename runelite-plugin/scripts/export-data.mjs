// Exports the web app's GE item sets and tax-exempt list as JSON plugin resources,
// so the plugin's set profits match the website. Run from repo root:
//   node runelite-plugin/scripts/export-data.mjs
import { writeFileSync } from 'node:fs'
import geItemSets from '../../src/domain/flipping/data/geItemSets.js'
import taxExempt from '../../src/domain/flipping/data/taxExempt.js'

const out = new URL('../src/main/resources/com/gemetrics/plugin/', import.meta.url)
writeFileSync(new URL('item-sets.json', out), JSON.stringify(geItemSets) + '\n')
writeFileSync(new URL('tax-exempt.json', out), JSON.stringify(taxExempt) + '\n')
console.log(`Exported ${geItemSets.length} item sets, ${taxExempt.length} tax-exempt ids`)
