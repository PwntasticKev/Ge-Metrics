// Game Updates Scraper using Cheerio (faster alternative to Puppeteer)
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

export class GameUpdatesScraperCheerio {
  private static instance: GameUpdatesScraperCheerio
  private readonly BASE_URL = 'https://oldschool.runescape.wiki'
  private readonly UPDATES_PAGE = '/w/Game_updates'

  private constructor() {}

  public static getInstance(): GameUpdatesScraperCheerio {
    if (!GameUpdatesScraperCheerio.instance) {
      GameUpdatesScraperCheerio.instance = new GameUpdatesScraperCheerio()
    }
    return GameUpdatesScraperCheerio.instance
  }

  /**
   * Get the latest update date from database
   */
  private async getLatestUpdateDate(): Promise<Date> {
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
   * Parse date from update text
   */
  private parseUpdateDate(dateText: string, year: number): Date {
    try {
      const months = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      }

      // Extract day and month from text like "2 July" or "26 June"
      const match = dateText.match(/(\d+)\s+(\w+)/)
      if (match) {
        const day = parseInt(match[1])
        const monthName = match[2]
        const month = months[monthName as keyof typeof months]
        
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
   * Determine update type based on title
   */
  private determineUpdateType(title: string): string {
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
   * Scrape game updates using cheerio
   */
  async scrapeGameUpdates(): Promise<GameUpdate[]> {
    try {
      console.log('🔍 Fetching game updates page with cheerio...')
      
      const response = await fetch(this.BASE_URL + this.UPDATES_PAGE, {
        headers: {
          'User-Agent': 'GE-Metrics-Bot/1.0 (https://ge-metrics.com)'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)
      
      console.log('📖 Parsing game updates with cheerio...')
      
      const updates: GameUpdate[] = []
      const latestDbDate = await this.getLatestUpdateDate()

      // Find all year sections
      $('h3 span.mw-headline').each((_, yearElement) => {
        const yearText = $(yearElement).text().trim()
        if (!yearText || !yearText.match(/^\d{4}$/)) return
        
        const year = parseInt(yearText)
        if (year < 2020) return // Only get recent updates
        
        console.log(`📅 Processing year: ${year}`)
        
        // Find the next sibling element that contains the updates
        let currentElement = $(yearElement).parent().next()
        
        while (currentElement.length > 0 && !currentElement.find('span.mw-headline').length) {
          // Look for update links
          currentElement.find('a[href*="/w/Update:"]').each((_, linkElement) => {
            const $link = $(linkElement)
            const href = $link.attr('href')
            const title = $link.text().trim()
            
            if (href && title) {
              // Find the date (usually before the link)
              const listItem = $link.closest('li')
              if (listItem.length) {
                const fullText = listItem.text().trim()
                const dateMatch = fullText.match(/^(\d+\s+\w+)/)
                
                if (dateMatch) {
                  const updateDate = this.parseUpdateDate(dateMatch[1], year)
                  
                  // Only process updates newer than what we have in the database
                  if (updateDate > latestDbDate) {
                    const fullUrl = href.startsWith('http') ? href : this.BASE_URL + href
                    const updateType = this.determineUpdateType(title)
                    
                    updates.push({
                      date: updateDate,
                      title: title,
                      description: `Update from ${dateMatch[1]}, ${year}`,
                      type: updateType,
                      url: fullUrl,
                      category: updateType
                    })
                  }
                }
              }
            }
          })
          
          currentElement = currentElement.next()
        }
      })

      console.log(`✅ Found ${updates.length} new updates to process`)
      return updates.slice(0, 50) // Limit to 50 most recent

    } catch (error) {
      console.error('❌ Error scraping game updates:', error)
      return []
    }
  }

  /**
   * Save updates to database
   */
  private async saveUpdatesToDatabase(updates: GameUpdate[]): Promise<void> {
    if (updates.length === 0) {
      console.log('No new updates to save')
      return
    }

    let inserted = 0
    let skipped = 0

    try {
      for (const update of updates) {
        try {
          const year = update.date.getFullYear()
          const month = update.date.getMonth() + 1
          const day = update.date.getDate()

          // Check if update already exists
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

          // Insert new update
          await db.insert(gameUpdates).values({
            updateDate: update.date,
            title: update.title,
            description: update.description,
            type: update.type,
            color: this.getTypeColor(update.type),
            url: update.url,
            content: update.content,
            category: update.category || update.type,
            year,
            month,
            day
          })

          inserted++
          console.log(`✅ Inserted: ${update.title}`)
        } catch (error) {
          console.error(`❌ Error storing update "${update.title}":`, error)
        }
      }

      console.log(`📊 Stored updates: ${inserted} inserted, ${skipped} skipped`)
    } catch (error) {
      console.error('❌ Error saving updates to database:', error)
      throw error
    }
  }

  /**
   * Get color for update type
   */
  private getTypeColor(type: string): string {
    const colors = {
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
    
    return colors[type as keyof typeof colors] || '#9E9E9E'
  }

  /**
   * Main scraping function
   */
  async scrapeAndSaveUpdates(): Promise<void> {
    console.log('🚀 Starting game updates scraping with cheerio...')
    
    try {
      const updates = await this.scrapeGameUpdates()
      
      if (updates.length === 0) {
        console.log('✅ No new updates found')
        return
      }

      await this.saveUpdatesToDatabase(updates)
      console.log('✅ Game updates scraping completed successfully')
      
    } catch (error) {
      console.error('❌ Error during game updates scraping:', error)
      throw error
    }
  }

  /**
   * Get cached updates from database
   */
  async getCachedUpdates(limit: number = 50): Promise<any[]> {
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
}

export default GameUpdatesScraperCheerio.getInstance()