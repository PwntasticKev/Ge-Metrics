import puppeteer from 'puppeteer'
import { db } from '../db/index.js'
import { gameUpdates } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'

interface GameUpdate {
  date: Date
  title: string
  description: string
  type: string
  url: string
  content?: string
}

export class GameUpdatesScraper {
  private static instance: GameUpdatesScraper
  private browser: any = null
  private readonly BASE_URL = 'https://oldschool.runescape.wiki'
  private readonly UPDATES_PAGE = '/w/Game_updates'

  private constructor() {}

  public static getInstance(): GameUpdatesScraper {
    if (!GameUpdatesScraper.instance) {
      GameUpdatesScraper.instance = new GameUpdatesScraper()
    }
    return GameUpdatesScraper.instance
  }

  /**
   * Initialize browser for scraping
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      console.log('🚀 Starting browser for scraping...')
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      })
    }
  }

  /**
   * Close browser
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
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
      // Handle different date formats
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

      // Fallback to current date if parsing fails
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
   * Scrape game updates from the main page
   */
  async scrapeGameUpdates(): Promise<GameUpdate[]> {
    await this.initBrowser()
    const page = await this.browser.newPage()
    
    try {
      console.log('🔍 Navigating to game updates page...')
      await page.goto(this.BASE_URL + this.UPDATES_PAGE, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      console.log('📖 Parsing game updates...')
      const updates = await page.evaluate(() => {
        const updates: any[] = []
        
        // Find all year sections
        const yearSections = document.querySelectorAll('h3 span.mw-headline')
        
        for (const yearSection of yearSections) {
          const yearText = yearSection.textContent?.trim()
          if (!yearText || !yearText.match(/^\d{4}$/)) continue
          
          const year = parseInt(yearText)
          if (year < 2020) continue // Only get recent updates
          
          // Find the next sibling element that contains the updates
          let currentElement = yearSection.parentElement?.nextElementSibling
          
          while (currentElement && !currentElement.querySelector('span.mw-headline')) {
            // Look for update links
            const updateLinks = currentElement.querySelectorAll('a[href*="/w/Update:"]')
            
            for (const link of updateLinks) {
              const href = link.getAttribute('href')
              const title = link.textContent?.trim()
              
              if (href && title) {
                // Find the date (usually before the link)
                const listItem = link.closest('li')
                if (listItem) {
                  const fullText = listItem.textContent?.trim() || ''
                  const dateMatch = fullText.match(/^(\d+\s+\w+)/)
                  
                  if (dateMatch) {
                    updates.push({
                      dateText: dateMatch[1],
                      title: title,
                      url: href,
                      year: year
                    })
                  }
                }
              }
            }
            
            currentElement = currentElement.nextElementSibling
          }
        }
        
        return updates
      })

      console.log(`📊 Found ${updates.length} potential updates`)
      
      const parsedUpdates: GameUpdate[] = []
      const latestDbDate = await this.getLatestUpdateDate()
      
      for (const update of updates) {
        const updateDate = this.parseUpdateDate(update.dateText, update.year)
        
        // Only process updates newer than what we have in the database
        if (updateDate > latestDbDate) {
          const fullUrl = update.url.startsWith('http') ? update.url : this.BASE_URL + update.url
          
          parsedUpdates.push({
            date: updateDate,
            title: update.title,
            description: `Update from ${update.dateText}, ${update.year}`,
            type: this.determineUpdateType(update.title),
            url: fullUrl
          })
        }
      }

      console.log(`✅ Found ${parsedUpdates.length} new updates to process`)
      return parsedUpdates.slice(0, 50) // Limit to 50 most recent

    } catch (error) {
      console.error('Error scraping game updates:', error)
      return []
    } finally {
      await page.close()
    }
  }

  /**
   * Scrape detailed content from individual update pages
   */
  async scrapeUpdateContent(update: GameUpdate): Promise<string> {
    const page = await this.browser.newPage()
    
    try {
      console.log(`📄 Scraping content for: ${update.title}`)
      await page.goto(update.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      const content = await page.evaluate(() => {
        // Try to find the main content area
        const contentSelectors = [
          '.mw-parser-output',
          '#mw-content-text',
          '.mw-content-ltr'
        ]
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector)
          if (element) {
            // Remove navigation, infoboxes, and other non-content elements
            const unwantedSelectors = [
              '.navbox',
              '.infobox',
              '.toc',
              '.mw-editsection',
              '.printfooter',
              '.catlinks'
            ]
            
            for (const unwanted of unwantedSelectors) {
              const elements = element.querySelectorAll(unwanted)
              elements.forEach(el => el.remove())
            }
            
            // Get text content and clean it up
            let text = element.textContent || ''
            text = text.replace(/\s+/g, ' ').trim()
            return text.substring(0, 2000) // Limit content length
          }
        }
        
        return 'Content not found'
      })

      return content
    } catch (error) {
      console.error(`Error scraping content for ${update.title}:`, error)
      return 'Error retrieving content'
    } finally {
      await page.close()
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

    try {
      const records = updates.map(update => ({
        updateDate: update.date,
        title: update.title,
        description: update.description,
        type: update.type,
        color: this.getTypeColor(update.type)
      }))

      await db.insert(gameUpdates).values(records)
      console.log(`💾 Saved ${records.length} updates to database`)
    } catch (error) {
      console.error('Error saving updates to database:', error)
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
    console.log('🚀 Starting game updates scraping...')
    
    try {
      await this.initBrowser()
      
      // Scrape updates from main page
      const updates = await this.scrapeGameUpdates()
      
      if (updates.length === 0) {
        console.log('✅ No new updates found')
        return
      }

      // Scrape detailed content for each update (limit to avoid overwhelming)
      const detailedUpdates = []
      for (const update of updates.slice(0, 10)) { // Limit to 10 detailed scrapes
        const content = await this.scrapeUpdateContent(update)
        detailedUpdates.push({
          ...update,
          content,
          description: content.substring(0, 500) + '...'
        })
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Save to database
      await this.saveUpdatesToDatabase(detailedUpdates)
      
      console.log('✅ Game updates scraping completed successfully')
      
    } catch (error) {
      console.error('❌ Error during game updates scraping:', error)
    } finally {
      await this.closeBrowser()
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

  /**
   * Get updates by type
   */
  async getUpdatesByType(type: string, limit: number = 20): Promise<any[]> {
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
}

export default GameUpdatesScraper.getInstance()
