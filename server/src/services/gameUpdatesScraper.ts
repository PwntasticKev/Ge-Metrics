import * as cheerio from 'cheerio'
import { db } from '../db/index.js'
import { gameUpdates } from '../db/schema.js'
import { eq, desc, and } from 'drizzle-orm'

interface GameUpdate {
  date: Date
  title: string
  description: string
  type: string
  url: string
  content?: string
  category?: string
}

interface RawUpdate {
  dateText: string
  title: string
  url: string
  year: number
}

const BASE_URL = 'https://oldschool.runescape.wiki'
const UPDATES_PAGE = '/w/Game_updates'

/**
 * Parse date from update text like "2 July" with a given year
 */
export function parseUpdateDate(dateText: string, year: number): Date {
  try {
    const months: Record<string, number> = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    }

    const match = dateText.match(/(\d+)\s+(\w+)/)
    if (match) {
      const day = parseInt(match[1])
      const monthName = match[2]
      const month = months[monthName]

      if (month !== undefined) {
        return new Date(year, month, day)
      }
    }

    return new Date()
  } catch (error) {
    console.error('Error parsing date:', dateText, error)
    return new Date()
  }
}

/**
 * Determine update type based on title keywords
 */
export function determineUpdateType(title: string): string {
  const titleLower = title.toLowerCase()

  if (titleLower.includes('poll')) return 'poll'
  if (titleLower.includes('quest')) return 'quest'
  if (titleLower.includes('event')) return 'event'
  if (titleLower.includes('christmas') || titleLower.includes('halloween') || titleLower.includes('easter')) return 'holiday'
  if (titleLower.includes('beta')) return 'beta'
  if (titleLower.includes('hotfix') || titleLower.includes('fix')) return 'hotfix'
  if (titleLower.includes('qol') || titleLower.includes('quality of life')) return 'qol'
  if (titleLower.includes('deadman') || titleLower.includes('dmm')) return 'deadman'
  if (titleLower.includes('league')) return 'leagues'
  if (titleLower.includes('mobile')) return 'mobile'
  if (titleLower.includes('pvp')) return 'pvp'
  if (titleLower.includes('raid') || titleLower.includes('boss')) return 'pvm'
  if (titleLower.includes('skill')) return 'skilling'

  return 'general'
}

/**
 * Get color for update type
 */
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'quest': '#4CAF50',
    'event': '#FF9800',
    'holiday': '#E91E63',
    'poll': '#2196F3',
    'beta': '#9C27B0',
    'hotfix': '#F44336',
    'qol': '#00BCD4',
    'deadman': '#795548',
    'leagues': '#FF5722',
    'mobile': '#607D8B',
    'pvp': '#F44336',
    'pvm': '#4CAF50',
    'skilling': '#FFC107',
    'general': '#9E9E9E'
  }

  return colors[type] || '#9E9E9E'
}

/**
 * Extract game update entries from HTML using cheerio
 * Same h3-based year section pattern as blogScraperService
 */
export function extractGameUpdates(html: string): RawUpdate[] {
  const updates: RawUpdate[] = []

  try {
    const $ = cheerio.load(html)
    let currentYear = new Date().getFullYear()

    $('h3').each((_index, element) => {
      const $heading = $(element)
      const yearText = $heading.find('.mw-headline').text().trim() || $heading.text().trim()
      const yearMatch = yearText.match(/(\d{4})/)

      if (yearMatch) {
        currentYear = parseInt(yearMatch[1])
        if (currentYear < 2020) return // skip old years
      }

      let $next = $heading.next()
      while ($next.length > 0) {
        if ($next.is('h3')) break

        if ($next.is('ul')) {
          $next.find('li').each((_liIndex, liElement) => {
            const $li = $(liElement)
            const text = $li.text().trim()

            const $link = $li.find('a[href*="/w/Update:"]').first()
            if ($link.length === 0) return

            const href = $link.attr('href')
            const title = $link.text().trim()
            if (!href || !title) return

            const dateMatch = text.match(/^(\d{1,2}\s+[A-Za-z]+)/)
            if (dateMatch) {
              updates.push({
                dateText: dateMatch[1].trim(),
                title,
                url: href,
                year: currentYear
              })
            }
          })
        }

        $next = $next.next()
      }
    })

    console.log(`[GameUpdatesScraper] Extracted ${updates.length} raw updates`)
  } catch (error) {
    console.error('[GameUpdatesScraper] Error extracting updates:', error)
  }

  return updates
}

/**
 * Get the latest update date from database
 */
async function getLatestUpdateDate(): Promise<Date> {
  try {
    const latestUpdate = await db
      .select({ updateDate: gameUpdates.updateDate })
      .from(gameUpdates)
      .orderBy(desc(gameUpdates.updateDate))
      .limit(1)

    return latestUpdate.length > 0 ? latestUpdate[0].updateDate : new Date('2020-01-01')
  } catch (error) {
    console.error('Error getting latest update date:', error)
    return new Date('2020-01-01')
  }
}

/**
 * Save updates to database (skips duplicates by date+URL and date-only)
 */
async function saveUpdatesToDatabase(updates: GameUpdate[]): Promise<{ inserted: number; skipped: number }> {
  if (updates.length === 0) {
    console.log('[GameUpdatesScraper] No new updates to save')
    return { inserted: 0, skipped: 0 }
  }

  let inserted = 0
  let skipped = 0

  for (const update of updates) {
    try {
      const existingByUrl = await db
        .select()
        .from(gameUpdates)
        .where(
          and(
            eq(gameUpdates.updateDate, update.date),
            eq(gameUpdates.url, update.url)
          )
        )
        .limit(1)

      if (existingByUrl.length > 0) {
        skipped++
        continue
      }

      const existingByDate = await db
        .select()
        .from(gameUpdates)
        .where(eq(gameUpdates.updateDate, update.date))
        .limit(1)

      if (existingByDate.length > 0) {
        console.log(`[GameUpdatesScraper] Update with date ${update.date.toISOString()} already exists, skipping`)
        skipped++
        continue
      }

      const year = update.date.getFullYear()
      const month = update.date.getMonth() + 1
      const day = update.date.getDate()

      await db.insert(gameUpdates).values({
        updateDate: update.date,
        title: update.title,
        description: update.description,
        type: update.type,
        color: getTypeColor(update.type),
        url: update.url,
        content: update.content,
        category: update.category || update.type,
        year,
        month,
        day
      })

      inserted++
    } catch (error) {
      console.error(`[GameUpdatesScraper] Error storing update "${update.title}":`, error)
    }
  }

  console.log(`[GameUpdatesScraper] Stored updates: ${inserted} inserted, ${skipped} skipped`)
  return { inserted, skipped }
}

/**
 * Scrape game updates page using fetch + cheerio
 */
async function scrapeGameUpdates(): Promise<GameUpdate[]> {
  try {
    const url = BASE_URL + UPDATES_PAGE
    console.log(`[GameUpdatesScraper] Fetching game updates from: ${url}`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GE-Metrics-Bot/1.0 (https://ge-metrics.com)'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch game updates: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    const rawUpdates = extractGameUpdates(html)

    console.log(`[GameUpdatesScraper] Found ${rawUpdates.length} potential updates`)

    const latestDbDate = await getLatestUpdateDate()
    const parsedUpdates: GameUpdate[] = []

    for (const raw of rawUpdates) {
      const updateDate = parseUpdateDate(raw.dateText, raw.year)

      if (updateDate > latestDbDate) {
        const fullUrl = raw.url.startsWith('http') ? raw.url : BASE_URL + raw.url
        const updateType = determineUpdateType(raw.title)

        parsedUpdates.push({
          date: updateDate,
          title: raw.title,
          description: `Update from ${raw.dateText}, ${raw.year}`,
          type: updateType,
          url: fullUrl,
          category: updateType
        })
      }
    }

    console.log(`[GameUpdatesScraper] Found ${parsedUpdates.length} new updates to process`)
    return parsedUpdates.slice(0, 50)
  } catch (error) {
    console.error('[GameUpdatesScraper] Error scraping game updates:', error)
    return []
  }
}

/**
 * Main entry: scrape and save game updates
 * Called by cron job
 */
export async function scrapeAndSaveUpdates(): Promise<{ success: boolean; inserted: number; skipped: number; error?: string }> {
  try {
    console.log('[GameUpdatesScraper] Starting game updates scraping...')
    const updates = await scrapeGameUpdates()

    if (updates.length === 0) {
      console.log('[GameUpdatesScraper] No new updates found')
      return { success: true, inserted: 0, skipped: 0 }
    }

    const result = await saveUpdatesToDatabase(updates)
    console.log('[GameUpdatesScraper] Game updates scraping completed successfully')

    return { success: true, ...result }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[GameUpdatesScraper] Failed to update game updates:', errorMessage)

    return { success: false, inserted: 0, skipped: 0, error: errorMessage }
  }
}

/**
 * Get cached updates from database
 */
export async function getCachedUpdates(limit: number = 50): Promise<any[]> {
  try {
    const updates = await db
      .select()
      .from(gameUpdates)
      .orderBy(desc(gameUpdates.updateDate))
      .limit(limit)

    return updates
  } catch (error) {
    console.error('Error getting cached updates:', error)
    return []
  }
}

/**
 * Get updates by type
 */
export async function getUpdatesByType(type: string, limit: number = 20): Promise<any[]> {
  try {
    const updates = await db
      .select()
      .from(gameUpdates)
      .where(eq(gameUpdates.type, type))
      .orderBy(desc(gameUpdates.updateDate))
      .limit(limit)

    return updates
  } catch (error) {
    console.error('Error getting updates by type:', error)
    return []
  }
}

// Default export for backwards compatibility with existing imports
export default { scrapeAndSaveUpdates, getCachedUpdates, getUpdatesByType }
