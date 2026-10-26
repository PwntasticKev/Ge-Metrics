// Pure helpers for OSRS game updates / dev blogs (wiki "Update:" pages).
// Used by scripts/generate-game-updates.js to build public/data/game-updates.json
// and by the charts to place update markers. No React, no fetching.

export {
  parseWikiDate,
  findTemplate,
  splitTemplateParams,
  parseUpdateTemplate,
  normalizeCategory,
  stripUpdatePrefix,
  wikiUrlForTitle,
  UPDATE_PREFIX
} from './parseUpdatePage.js'
export { extractLinks, normalizeTarget } from './extractLinks.js'
export { createItemMatcher, createItemIndexes, matchItemIds, nameVariants } from './itemMatcher.js'
export { createMentionFinder, stripWikiMarkup, AMBIGUOUS_NAMES, SINGLE_WORD_MIN_LENGTH } from './textMentions.js'
export { buildUpdateEntry, sortUpdatesNewestFirst, MIN_UPDATE_DATE } from './buildEntry.js'
export {
  updateTime,
  filterUpdatesByDateRange,
  filterUpdatesByItem,
  mentionsItem,
  isBlogCategory,
  toChartEvents,
  parseGameUpdatesPayload
} from './filters.js'
