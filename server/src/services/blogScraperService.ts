// Developer Blogs Scraping Service
// Scrapes the OSRS Developer Blogs wiki page and stores blog entries
// Reference: https://oldschool.runescape.wiki/w/Developer_Blogs

import { db } from '../db/index.js'
import { blogs } from '../db/schema.js'
import { eq, and, gte } from 'drizzle-orm'
import * as cheerio from 'cheerio'

interface BlogEntry {
  title: string
  date: Date
  url: string
  category?: string
  content?: string
}

/**
 * Parse date string from wiki format (e.g., "27 October", "19 August", "15 August")
 * Returns null if date cannot be parsed
 */
function parseBlogDate(dateStr: string, year: number): Date | null {
  try {
    // Remove any leading/trailing whitespace
    dateStr = dateStr.trim()
    
    // Common date formats:
    // "27 October" -> October 27, {year}
    // "19 August" -> August 19, {year}
    // "15 August" -> August 15, {year}
    
    const monthMap: Record<string, number> = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    }
    
    const parts = dateStr.split(/\s+/)
    if (parts.length < 2) return null
    
    const day = parseInt(parts[0])
    const monthName = parts[1].toLowerCase()
    const month = monthMap[monthName]
    
    if (isNaN(day) || month === undefined) return null
    
    const date = new Date(year, month, day)
    return date
  } catch (error) {
    console.error(`[BlogScraper] Error parsing date "${dateStr}":`, error)
    return null
  }
}

/**
 * Extract blog entries from HTML content using cheerio
 * The wiki page structure has sections by year (h3), then lists of blog entries (ul > li)
 */
function extractBlogEntries(html: string): BlogEntry[] {
  const entries: BlogEntry[] = []
  
  try {
    const $ = cheerio.load(html)
    let currentYear = new Date().getFullYear()
    
    // Find all h3 headings (year sections)
    $('h3').each((_index, element) => {
      const $heading = $(element)
      const yearText = $heading.find('.mw-headline').text().trim() || $heading.text().trim()
      const yearMatch = yearText.match(/(\d{4})/)
      
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1])
        console.log(`[BlogScraper] Found year section: ${currentYear}`)
      }
      
      // Look for the next ul element after this h3
      let $next = $heading.next()
      while ($next.length > 0) {
        // Stop if we hit another h3
        if ($next.is('h3')) {
          break
        }
        
        // Process ul elements
        if ($next.is('ul')) {
          $next.find('li').each((_liIndex, liElement) => {
            const $li = $(liElement)
            const text = $li.text().trim()
            
            // Find the link
            const $link = $li.find('a').first()
            if ($link.length === 0) return
            
            const href = $link.attr('href')
            const title = $link.text().trim()
            
            if (!href || !title) return
            
            // Extract date from text (format: "27 October – Title" or "27 October 2025 – Title")
            // Look for date pattern before the dash
            const dateMatch = text.match(/^(\d{1,2}\s+[A-Za-z]+)(?:\s+\d{4})?\s*[–-]\s*/)
            
            if (dateMatch) {
              const dateStr = dateMatch[1].trim()
              const date = parseBlogDate(dateStr, currentYear)
              
              if (date) {
                const fullUrl = href.startsWith('http') ? href : `https://oldschool.runescape.wiki${href}`
                
                entries.push({
                  title,
                  date,
                  url: fullUrl,
                  category: undefined
                })
              }
            }
          })
        }
        
        $next = $next.next()
      }
    })
    
    console.log(`[BlogScraper] Extracted ${entries.length} blog entries`)
  } catch (error) {
    console.error('[BlogScraper] Error extracting blog entries:', error)
  }
  
  return entries
}

/**
 * Scrape the Developer Blogs wiki page
 */
export async function scrapeDeveloperBlogs(): Promise<BlogEntry[]> {
  try {
    const url = 'https://oldschool.runescape.wiki/w/Developer_Blogs'
    console.log(`[BlogScraper] Fetching Developer Blogs from: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GE-Metrics-Bot/1.0 (https://ge-metrics.com)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Developer Blogs: ${response.status} ${response.statusText}`)
    }
    
    const html = await response.text()
    const entries = extractBlogEntries(html)
    
    console.log(`[BlogScraper] Extracted ${entries.length} blog entries`)
    return entries
  } catch (error) {
    console.error('[BlogScraper] Error scraping Developer Blogs:', error)
    throw error
  }
}

/**
 * Store blog entries in the database
 * Only inserts new blogs (checks by date + URL to prevent duplicates)
 */
export async function storeBlogs(blogEntries: BlogEntry[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0
  
  try {
    for (const entry of blogEntries) {
      try {
        // Check if blog already exists (by date + URL)
        const existing = await db
          .select()
          .from(blogs)
          .where(and(
            eq(blogs.date, entry.date),
            eq(blogs.url, entry.url)
          ))
          .limit(1)
        
        if (existing.length > 0) {
          skipped++
          continue
        }
        
        // Insert new blog
        const year = entry.date.getFullYear()
        const month = entry.date.getMonth() + 1 // getMonth() returns 0-11
        const day = entry.date.getDate()
        
        await db.insert(blogs).values({
          title: entry.title,
          date: entry.date,
          url: entry.url,
          category: entry.category,
          content: entry.content,
          year,
          month,
          day
        })
        
        inserted++
      } catch (error) {
        console.error(`[BlogScraper] Error storing blog "${entry.title}":`, error)
        // Continue with next entry
      }
    }
    
    console.log(`[BlogScraper] Stored blogs: ${inserted} inserted, ${skipped} skipped`)
    return { inserted, skipped }
  } catch (error) {
    console.error('[BlogScraper] Error storing blogs:', error)
    throw error
  }
}

/**
 * Main function to scrape and store blogs
 * Called by cron job
 */
export async function updateDeveloperBlogs(): Promise<{ success: boolean; inserted: number; skipped: number; error?: string }> {
  try {
    console.log('[BlogScraper] Starting Developer Blogs update...')
    const entries = await scrapeDeveloperBlogs()
    const result = await storeBlogs(entries)
    
    return {
      success: true,
      inserted: result.inserted,
      skipped: result.skipped
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[BlogScraper] Failed to update Developer Blogs:', errorMessage)
    
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      error: errorMessage
    }
  }
}

