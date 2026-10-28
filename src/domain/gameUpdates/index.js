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
export { CONFIDENCE, findDateMentions, parseDayCell, resolveYear, addDays, daysBetween, toIsoDate } from './releaseDates.js'
export { releasesFromPost, releaseFromPostTitle, releasesFromHeadings, subjectBefore } from './releaseCandidates.js'
export {
  MAJOR_UPDATE_TITLE,
  RELEASED_TITLE,
  isBigRelease,
  cleanReleaseTitle,
  isUsableTitle,
  titleTokens,
  titlesMatch
} from './releaseTitles.js'
export {
  parseScheduleTable,
  parseUpcomingProse,
  parseUpcomingPage,
  citedSource,
  latestCitationDate,
  UPCOMING_PAGE_TITLE,
  UPCOMING_PAGE_URL
} from './upcomingPage.js'
export {
  buildUpcomingReleases,
  candidateFromPage,
  candidatesFromPost,
  mergeCandidates,
  releasedBy,
  parseUpcomingReleasesPayload,
  POST_LOOKBACK_DAYS,
  KEEP_AFTER_DAYS
} from './upcomingFeed.js'
