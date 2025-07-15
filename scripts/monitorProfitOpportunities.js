const axios = require('axios')
const cheerio = require('cheerio')
const { Client } = require('@notionhq/client')
const cron = require('node-cron')
const fs = require('fs').promises
const path = require('path')

// Configuration for rate limiting and efficiency
const CONFIG = {
  // Rate limiting
  reddit: {
    requestsPerHour: 50, // Conservative limit
    delayBetweenRequests: 2000, // 2 seconds
    maxPostsPerSubreddit: 5, // Reduced from 10
    userAgent: 'Ge-Metrics-Profit-Monitor/1.0 (Educational Project)'
  },
  wiki: {
    requestsPerHour: 30,
    delayBetweenRequests: 5000, // 5 seconds
    userAgent: 'Ge-Metrics-Profit-Monitor/1.0 (Educational Project)'
  },
  // Caching
  cacheDuration: 15 * 60 * 1000, // 15 minutes
  cacheFile: path.join(__dirname, '../data/opportunity-cache.json'),
  // Optimized monitoring frequency for OSRS trading
  // Run more frequently during peak times and after updates
  schedules: {
    // Daily monitoring - 4 times per day during peak hours
    daily: '0 8,12,16,20 * * *', // 8am, 12pm, 4pm, 8pm UTC (covers US/EU peak hours)
    // Update day monitoring - Tuesday/Wednesday when updates usually happen
    updateDay: '0 */2 * * 2,3', // Every 2 hours on Tuesday/Wednesday
    // Weekend monitoring - More frequent on weekends
    weekend: '0 */3 * * 6,0', // Every 3 hours on Saturday/Sunday
    // Event monitoring - Check for special events
    event: '0 6,18 * * *', // 6am and 6pm daily for events
    // Night monitoring - Less frequent during low activity
    night: '0 2,6 * * *' // 2am and 6am UTC
  },
  // Batch processing
  batchSize: 3, // Process 3 sources at a time
  maxConcurrentRequests: 2
}

// Database schema for profit opportunities
const PROFIT_OPPORTUNITIES_TABLE = `
CREATE TABLE IF NOT EXISTS profit_opportunities (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  item_id INTEGER,
  source_type VARCHAR(50) NOT NULL, -- 'reddit', 'blog', 'twitter', 'discord', 'manual'
  source_url TEXT,
  source_title TEXT,
  source_content TEXT,
  confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
  profit_potential DECIMAL(15,2), -- Estimated profit in GP
  risk_level VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
  category VARCHAR(100), -- 'combat', 'skilling', 'quest', 'event', 'update'
  keywords TEXT[], -- Array of relevant keywords
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'completed', 'failed'
  notes TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_profit DECIMAL(15,2),
  verified_at TIMESTAMP
);
`

// Sources to monitor (reduced scope)
const SOURCES = {
  reddit: {
    subreddits: ['2007scape'], // Reduced from multiple subreddits
    keywords: ['update', 'buff', 'nerf', 'new item', 'price', 'profit'],
    url: 'https://www.reddit.com/r/{subreddit}/hot.json'
  },
  wiki: [
    'https://oldschool.runescape.wiki/w/Special:RecentChanges'
  ]
  // Removed Twitter and Discord due to ToS concerns
}

class ProfitOpportunityMonitor {
  constructor () {
    this.notion = new Client({ auth: process.env.NOTION_TOKEN })
    this.db = null
    this.opportunities = []
    this.requestCounts = {
      reddit: { count: 0, lastReset: Date.now() },
      wiki: { count: 0, lastReset: Date.now() }
    }
    this.cache = new Map()
  }

  async initialize () {
    console.log('Initializing Profit Opportunity Monitor...')
    await this.setupDatabase()
    await this.loadCache()
    console.log('Database setup complete')
  }

  async setupDatabase () {
    console.log('Setting up profit_opportunities table...')
    // Database setup code here
  }

  async loadCache () {
    try {
      const cacheData = await fs.readFile(CONFIG.cacheFile, 'utf8')
      const cache = JSON.parse(cacheData)
      this.cache = new Map(Object.entries(cache))
      console.log(`Loaded ${this.cache.size} cached items`)
    } catch (error) {
      console.log('No cache file found, starting fresh')
      this.cache = new Map()
    }
  }

  async saveCache () {
    try {
      const cacheData = Object.fromEntries(this.cache)
      await fs.writeFile(CONFIG.cacheFile, JSON.stringify(cacheData, null, 2))
    } catch (error) {
      console.error('Error saving cache:', error)
    }
  }

  async checkRateLimit (source) {
    const now = Date.now()
    const hourAgo = now - (60 * 60 * 1000)

    // Reset counter if an hour has passed
    if (this.requestCounts[source].lastReset < hourAgo) {
      this.requestCounts[source] = { count: 0, lastReset: now }
    }

    const limit = CONFIG[source].requestsPerHour
    if (this.requestCounts[source].count >= limit) {
      throw new Error(`Rate limit exceeded for ${source}`)
    }

    this.requestCounts[source].count++
  }

  async delay (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async monitorReddit () {
    console.log('Monitoring Reddit for profit opportunities...')

    for (const subreddit of SOURCES.reddit.subreddits) {
      try {
        await this.checkRateLimit('reddit')

        const response = await axios.get(
          SOURCES.reddit.url.replace('{subreddit}', subreddit),
          {
            headers: {
              'User-Agent': CONFIG.reddit.userAgent
            },
            timeout: 10000 // 10 second timeout
          }
        )

        const posts = response.data.data.children
        const processedCount = 0

        for (const post of posts.slice(0, CONFIG.reddit.maxPostsPerSubreddit)) {
          // Check cache first
          const cacheKey = `reddit_${post.data.id}`
          if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)
            if (Date.now() - cached.timestamp < CONFIG.cacheDuration) {
              console.log(`Skipping cached post: ${post.data.title}`)
              continue
            }
          }

          const { title, selftext, url, score, created_utc } = post.data
          const content = `${title}\n${selftext}`.toLowerCase()

          // More efficient keyword matching
          const relevantKeywords = SOURCES.reddit.keywords.filter(keyword =>
            content.includes(keyword.toLowerCase())
          )

          if (relevantKeywords.length > 0) {
            const opportunity = await this.analyzeOpportunity({
              source_type: 'reddit',
              source_url: url,
              source_title: title,
              source_content: selftext,
              keywords: relevantKeywords,
              score,
              created_at: new Date(created_utc * 1000)
            })

            if (opportunity) {
              await this.saveOpportunity(opportunity)
              // Cache the processed post
              this.cache.set(cacheKey, {
                timestamp: Date.now(),
                opportunity
              })
            }
          }

          processedCount++
          if (processedCount < CONFIG.reddit.maxPostsPerSubreddit) {
            await this.delay(CONFIG.reddit.delayBetweenRequests)
          }
        }

        console.log(`Processed ${processedCount} posts from r/${subreddit}`)
      } catch (error) {
        if (error.message.includes('Rate limit')) {
          console.warn(`Rate limit hit for Reddit, skipping ${subreddit}`)
        } else {
          console.error(`Error monitoring Reddit subreddit ${subreddit}:`, error.message)
        }
      }
    }
  }

  async monitorWiki () {
    console.log('Monitoring OSRS Wiki...')

    for (const wikiUrl of SOURCES.wiki) {
      try {
        await this.checkRateLimit('wiki')

        const response = await axios.get(wikiUrl, {
          headers: {
            'User-Agent': CONFIG.wiki.userAgent
          },
          timeout: 15000 // 15 second timeout
        })

        const $ = cheerio.load(response.data)

        // More targeted scraping
        const articles = $('article, .post, .entry, .update').slice(0, 3) // Reduced from 5
        let processedCount = 0

        for (let i = 0; i < articles.length; i++) {
          const element = articles[i]
          const title = $(element).find('h1, h2, h3, .title').first().text().trim()
          const content = $(element).text().toLowerCase()
          const url = $(element).find('a').attr('href') || wikiUrl

          // Check cache
          const cacheKey = `wiki_${Buffer.from(url).toString('base64').slice(0, 20)}`
          if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)
            if (Date.now() - cached.timestamp < CONFIG.cacheDuration) {
              continue
            }
          }

          const relevantKeywords = SOURCES.reddit.keywords.filter(keyword =>
            content.includes(keyword.toLowerCase())
          )

          if (relevantKeywords.length > 0) {
            const opportunity = await this.analyzeOpportunity({
              source_type: 'wiki',
              source_url: url,
              source_title: title,
              source_content: content.substring(0, 500), // Reduced content length
              keywords: relevantKeywords
            })

            if (opportunity) {
              await this.saveOpportunity(opportunity)
              this.cache.set(cacheKey, {
                timestamp: Date.now(),
                opportunity
              })
            }
          }

          processedCount++
          if (processedCount < 3) {
            await this.delay(CONFIG.wiki.delayBetweenRequests)
          }
        }

        console.log(`Processed ${processedCount} articles from Wiki`)
      } catch (error) {
        if (error.message.includes('Rate limit')) {
          console.warn(`Rate limit hit for Wiki, skipping ${wikiUrl}`)
        } else {
          console.error(`Error monitoring Wiki ${wikiUrl}:`, error.message)
        }
      }
    }
  }

  async analyzeOpportunity (data) {
    const { source_type, source_title, source_content, keywords } = data

    // Extract potential items mentioned
    const items = this.extractItems(source_content)

    if (items.length === 0) {
      return null
    }

    // Calculate confidence score based on various factors
    const confidenceScore = this.calculateConfidenceScore(data)

    // Only process high-confidence opportunities
    if (confidenceScore < 0.6) {
      return null
    }

    // Estimate profit potential
    const profitPotential = await this.estimateProfitPotential(items, source_content)

    // Determine risk level
    const riskLevel = this.assessRiskLevel(source_content, keywords)

    // Categorize the opportunity
    const category = this.categorizeOpportunity(source_content, keywords)

    return {
      item_name: items[0]?.name || 'Unknown Item',
      item_id: items[0]?.id,
      source_type,
      source_url: data.source_url,
      source_title,
      source_content: source_content.substring(0, 1000), // Reduced from 2000
      confidence_score: confidenceScore,
      profit_potential: profitPotential,
      risk_level: riskLevel,
      category,
      keywords,
      status: 'active'
    }
  }

  extractItems (content) {
    // Simplified item extraction to reduce processing time
    const itemPatterns = [
      /(\w+\s+)?(sword|axe|pickaxe|armor|helmet|boots|gloves|cape|ring|amulet|potion|food|rune|log|ore|bar|gem|herb)/gi,
      /(\w+\s+)?(dragon|rune|adamant|mithril|steel|iron|bronze|black|white|red|blue|green|yellow|purple|orange)/gi
    ]

    const items = []
    for (const pattern of itemPatterns) {
      const matches = content.match(pattern)
      if (matches) {
        items.push(...matches.slice(0, 3).map(match => ({ // Limit to 3 items
          name: match.trim(),
          id: null
        })))
      }
    }

    return items.slice(0, 3) // Return top 3 items found
  }

  calculateConfidenceScore (data) {
    let score = 0.0

    // Source reliability
    const sourceScores = {
      reddit: 0.6,
      wiki: 0.8,
      manual: 1.0
    }

    score += sourceScores[data.source_type] || 0.5

    // Keyword relevance
    score += Math.min(data.keywords.length * 0.1, 0.3)

    // Content length (more content = higher confidence)
    const contentLength = data.source_content?.length || 0
    score += Math.min(contentLength / 1000, 0.2)

    return Math.min(score, 1.0)
  }

  async estimateProfitPotential (items, content) {
    let baseProfit = 100000 // 100k base

    // Adjust based on keywords
    if (content.includes('buff') || content.includes('improved')) {
      baseProfit *= 2
    }
    if (content.includes('nerf') || content.includes('reduced')) {
      baseProfit *= 0.5
    }
    if (content.includes('new item') || content.includes('introduced')) {
      baseProfit *= 3
    }

    return baseProfit
  }

  assessRiskLevel (content, keywords) {
    let riskScore = 0

    // High risk indicators
    if (content.includes('speculation') || content.includes('rumor')) riskScore += 2
    if (content.includes('maybe') || content.includes('possibly')) riskScore += 1
    if (content.includes('jmod') || content.includes('official')) riskScore -= 1

    if (riskScore >= 2) return 'high'
    if (riskScore <= -1) return 'low'
    return 'medium'
  }

  categorizeOpportunity (content, keywords) {
    if (content.includes('combat') || content.includes('pvp') || content.includes('weapon')) {
      return 'combat'
    }
    if (content.includes('skill') || content.includes('training') || content.includes('xp')) {
      return 'skilling'
    }
    if (content.includes('quest') || content.includes('story')) {
      return 'quest'
    }
    if (content.includes('event') || content.includes('holiday')) {
      return 'event'
    }
    return 'update'
  }

  async saveOpportunity (opportunity) {
    try {
      console.log(`Saving opportunity: ${opportunity.item_name} (${opportunity.confidence_score} confidence)`)

      // This would use your database connection
      // await this.db.query(`
      //   INSERT INTO profit_opportunities
      //   (item_name, item_id, source_type, source_url, source_title, source_content,
      //    confidence_score, profit_potential, risk_level, category, keywords, status)
      //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      // `, [opportunity.item_name, opportunity.item_id, opportunity.source_type,
      //      opportunity.source_url, opportunity.source_title, opportunity.source_content,
      //      opportunity.confidence_score, opportunity.profit_potential, opportunity.risk_level,
      //      opportunity.category, opportunity.keywords, opportunity.status])

      this.opportunities.push(opportunity)

      // Update AI predictions and future items when high-confidence opportunities are found
      if (opportunity.confidence_score > 0.7) {
        await this.updateAIPredictions(opportunity)
        await this.updateFutureItems(opportunity)
      }
    } catch (error) {
      console.error('Error saving opportunity:', error)
    }
  }

  async updateAIPredictions (opportunity) {
    try {
      console.log(`Updating AI predictions for ${opportunity.item_name}`)

      // This would update your AI predictions system
      // Example: Add the opportunity to AI training data
      const aiPredictionData = {
        item_id: opportunity.item_id,
        item_name: opportunity.item_name,
        confidence_score: opportunity.confidence_score,
        profit_potential: opportunity.profit_potential,
        risk_level: opportunity.risk_level,
        source_type: opportunity.source_type,
        keywords: opportunity.keywords,
        category: opportunity.category,
        timestamp: new Date().toISOString()
      }

      // Save to AI predictions database/table
      // await this.db.query(`
      //   INSERT INTO ai_predictions_training
      //   (item_id, item_name, confidence_score, profit_potential, risk_level,
      //    source_type, keywords, category, created_at)
      //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      // `, [aiPredictionData.item_id, aiPredictionData.item_name, aiPredictionData.confidence_score,
      //      aiPredictionData.profit_potential, aiPredictionData.risk_level, aiPredictionData.source_type,
      //      aiPredictionData.keywords, aiPredictionData.category, aiPredictionData.timestamp])

      console.log(`AI predictions updated for ${opportunity.item_name}`)
    } catch (error) {
      console.error('Error updating AI predictions:', error)
    }
  }

  async updateFutureItems (opportunity) {
    try {
      console.log(`Updating future items for ${opportunity.item_name}`)

      // This would update your future items system
      // Example: Add the opportunity as a potential future item
      const futureItemData = {
        item_id: opportunity.item_id,
        item_name: opportunity.item_name,
        expected_release: this.estimateReleaseDate(opportunity),
        confidence_score: opportunity.confidence_score,
        source_type: opportunity.source_type,
        source_url: opportunity.source_url,
        notes: opportunity.source_title,
        status: 'predicted',
        created_at: new Date().toISOString()
      }

      // Save to future items database/table
      // await this.db.query(`
      //   INSERT INTO future_items
      //   (item_id, item_name, expected_release, confidence_score, source_type,
      //    source_url, notes, status, created_at)
      //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      // `, [futureItemData.item_id, futureItemData.item_name, futureItemData.expected_release,
      //      futureItemData.confidence_score, futureItemData.source_type, futureItemData.source_url,
      //      futureItemData.notes, futureItemData.status, futureItemData.created_at])

      console.log(`Future items updated for ${opportunity.item_name}`)
    } catch (error) {
      console.error('Error updating future items:', error)
    }
  }

  estimateReleaseDate (opportunity) {
    // Estimate when the item/update might be released based on source and content
    const now = new Date()

    if (opportunity.source_type === 'reddit' && opportunity.source_content.includes('next update')) {
      // If mentioned for "next update", estimate 1-2 weeks
      return new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)) // 1 week
    }

    if (opportunity.source_type === 'wiki' && opportunity.source_content.includes('development')) {
      // If in development, estimate 2-4 weeks
      return new Date(now.getTime() + (21 * 24 * 60 * 60 * 1000)) // 3 weeks
    }

    // Default: estimate 1 month
    return new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)) // 1 month
  }

  getCurrentSchedule () {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getHours()

    // Tuesday (2) or Wednesday (3) - Update days
    if (dayOfWeek === 2 || dayOfWeek === 3) {
      return CONFIG.schedules.updateDay
    }

    // Saturday (6) or Sunday (0) - Weekend
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      return CONFIG.schedules.weekend
    }

    // Night hours (2am-6am UTC) - Low activity
    if (hour >= 2 && hour <= 6) {
      return CONFIG.schedules.night
    }

    // Event check times (6am, 6pm)
    if (hour === 6 || hour === 18) {
      return CONFIG.schedules.event
    }

    // Peak hours (8am, 12pm, 4pm, 8pm)
    if ([8, 12, 16, 20].includes(hour)) {
      return CONFIG.schedules.daily
    }

    // Default to daily schedule
    return CONFIG.schedules.daily
  }

  async run () {
    console.log('Starting profit opportunity monitoring...')

    try {
      // Run monitoring with proper delays
      await this.monitorReddit()
      await this.delay(5000) // 5 second delay between sources
      await this.monitorWiki()

      // Save cache
      await this.saveCache()

      console.log(`Monitoring complete. Found ${this.opportunities.length} opportunities.`)

      // Send notifications for high-confidence opportunities
      const highConfidence = this.opportunities.filter(opp => opp.confidence_score > 0.7)
      if (highConfidence.length > 0) {
        await this.sendNotifications(highConfidence)
      }
    } catch (error) {
      console.error('Error in monitoring run:', error)
    }
  }

  async sendNotifications (opportunities) {
    console.log(`Sending notifications for ${opportunities.length} high-confidence opportunities`)

    for (const opportunity of opportunities) {
      const message = `
🚨 High-Confidence Profit Opportunity Detected!

Item: ${opportunity.item_name}
Confidence: ${(opportunity.confidence_score * 100).toFixed(1)}%
Profit Potential: ${this.formatCurrency(opportunity.profit_potential)} GP
Risk Level: ${opportunity.risk_level}
Category: ${opportunity.category}
Source: ${opportunity.source_type}

${opportunity.source_title}
${opportunity.source_url}
      `.trim()

      console.log(message)
      // Send via your preferred notification method
    }
  }

  formatCurrency (value) {
    return new Intl.NumberFormat('en-US').format(value)
  }
}

// Initialize and run the monitor
const monitor = new ProfitOpportunityMonitor()

// Set up multiple cron jobs for different schedules
console.log('Setting up profit opportunity monitoring schedules...')

// Daily monitoring - 4 times per day during peak hours
cron.schedule(CONFIG.schedules.daily, async () => {
  console.log('Running daily profit opportunity monitoring...')
  try {
    await monitor.run()
  } catch (error) {
    console.error('Error in daily monitoring:', error)
  }
})

// Update day monitoring - Tuesday/Wednesday when updates usually happen
cron.schedule(CONFIG.schedules.updateDay, async () => {
  console.log('Running update day profit opportunity monitoring...')
  try {
    await monitor.run()
  } catch (error) {
    console.error('Error in update day monitoring:', error)
  }
})

// Weekend monitoring - More frequent on weekends
cron.schedule(CONFIG.schedules.weekend, async () => {
  console.log('Running weekend profit opportunity monitoring...')
  try {
    await monitor.run()
  } catch (error) {
    console.error('Error in weekend monitoring:', error)
  }
})

// Event monitoring - Check for special events
cron.schedule(CONFIG.schedules.event, async () => {
  console.log('Running event profit opportunity monitoring...')
  try {
    await monitor.run()
  } catch (error) {
    console.error('Error in event monitoring:', error)
  }
})

// Night monitoring - Less frequent during low activity
cron.schedule(CONFIG.schedules.night, async () => {
  console.log('Running night profit opportunity monitoring...')
  try {
    await monitor.run()
  } catch (error) {
    console.error('Error in night monitoring:', error)
  }
})

// Also run immediately on startup
monitor.initialize().then(() => {
  console.log('Initial profit opportunity monitoring run...')
  monitor.run()
})

module.exports = ProfitOpportunityMonitor
