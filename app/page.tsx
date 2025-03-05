"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Upload, MessageSquare, Repeat, Calendar, Clock } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { Vortex } from "@/components/ui/vortex"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Define the window interface to access YTD property
interface MyWindow extends Window {
  YTD?: {
    tweets?: any
  }
}

interface TweetMetadata {
  created_at: string
  id: string
  is_retweet: boolean
  is_reply: boolean
  date?: Date // Add date object for easier sorting/filtering
  year?: number
  month?: number
}

type TimeRange = "all" | "recent" | "year" | "month" | "balanced"

export default function TweetViewer() {
  const [tweets, setTweets] = useState<string[]>([])
  const [currentTweet, setCurrentTweet] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hideRetweets, setHideRetweets] = useState(false)
  const [hideReplies, setHideReplies] = useState(false)
  const [allTweets, setAllTweets] = useState<any>(null)
  const [currentTweetMetadata, setCurrentTweetMetadata] = useState<TweetMetadata | null>(null)
  const [tweetMetadataArray, setTweetMetadataArray] = useState<TweetMetadata[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>("balanced")
  const [tweetsByYear, setTweetsByYear] = useState<Record<number, number>>({})
  const [tweetsByMonth, setTweetsByMonth] = useState<Record<string, number>>({})

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const fileContent = e.target?.result as string

        // First attempt: Try to extract JSON directly using regex
        // tweets.js typically contains a pattern like: window.YTD.tweets.part0 = [ ... ]
        const jsonMatch = fileContent.match(/\[\s*{.+}\s*\]/s)

        if (jsonMatch) {
          try {
            // Parse the JSON array directly
            const parsedTweets = JSON.parse(jsonMatch[0])

            if (Array.isArray(parsedTweets) && parsedTweets.length > 0) {
              // Create a synthetic YTD object structure
              const syntheticYTD = {
                tweets: {
                  part0: parsedTweets,
                },
              }

              setAllTweets(syntheticYTD.tweets)
              const processedTweets = processTweets(syntheticYTD.tweets, hideRetweets, hideReplies)
              setTweets(processedTweets.tweetTexts)
              setTweetMetadataArray(processedTweets.metadata)

              // Calculate tweet distribution by time period
              calculateTweetDistribution(processedTweets.metadata)

              // Show a random tweet
              if (processedTweets.tweetTexts.length > 0) {
                showRandomTweet(processedTweets.tweetTexts, processedTweets.metadata, timeRange)
              }
              return
            }
          } catch (jsonError) {
            console.error("Failed to parse JSON directly:", jsonError)
            // Continue to the next method if this fails
          }
        }

        // Second attempt: Try the script injection method
        try {
          // Create a temporary variable to hold the data
          const tempVarName = `__tweetData_${Date.now()}`

          // Modify the script to assign to our temp variable instead of window.YTD
          const modifiedContent = fileContent.replace(/window\.YTD\s*=/, `window.${tempVarName} =`)

          // Create and execute the script
          const script = document.createElement("script")
          script.textContent = modifiedContent
          document.body.appendChild(script)

          // Access our temporary variable
          const tweetData = (window as any)[tempVarName]

          if (tweetData && tweetData.tweets) {
            setAllTweets(tweetData.tweets)
            const processedTweets = processTweets(tweetData.tweets, hideRetweets, hideReplies)
            setTweets(processedTweets.tweetTexts)
            setTweetMetadataArray(processedTweets.metadata)

            // Calculate tweet distribution by time period
            calculateTweetDistribution(processedTweets.metadata)

            // Show a random tweet
            if (processedTweets.tweetTexts.length > 0) {
              showRandomTweet(processedTweets.tweetTexts, processedTweets.metadata, timeRange)
            }

            // Clean up
            document.body.removeChild(script)
            delete (window as any)[tempVarName]
            return
          }

          // Clean up even if unsuccessful
          document.body.removeChild(script)
          delete (window as any)[tempVarName]
        } catch (scriptError) {
          console.error("Script execution method failed:", scriptError)
          // Continue to the fallback method
        }

        // Final fallback: Try to parse the file as direct JSON
        try {
          // Look for any JSON array in the file
          const jsonStart = fileContent.indexOf("[")
          const jsonEnd = fileContent.lastIndexOf("]") + 1

          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const jsonContent = fileContent.substring(jsonStart, jsonEnd)
            const parsedTweets = JSON.parse(jsonContent)

            if (Array.isArray(parsedTweets) && parsedTweets.length > 0) {
              // Create a synthetic YTD object structure
              const syntheticYTD = {
                tweets: {
                  part0: parsedTweets,
                },
              }

              setAllTweets(syntheticYTD.tweets)
              const processedTweets = processTweets(syntheticYTD.tweets, hideRetweets, hideReplies)
              setTweets(processedTweets.tweetTexts)
              setTweetMetadataArray(processedTweets.metadata)

              // Calculate tweet distribution by time period
              calculateTweetDistribution(processedTweets.metadata)

              // Show a random tweet
              if (processedTweets.tweetTexts.length > 0) {
                showRandomTweet(processedTweets.tweetTexts, processedTweets.metadata, timeRange)
              }
              return
            }
          }

          throw new Error("Could not find valid tweet data in the file")
        } catch (fallbackError) {
          throw new Error(
            `Failed to parse tweets.js file: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`,
          )
        }
      } catch (err) {
        setError(`Failed to parse tweets.js file: ${err instanceof Error ? err.message : "Unknown error"}`)
      } finally {
        setIsLoading(false)
      }
    }

    reader.onerror = () => {
      setError("Failed to read the file")
      setIsLoading(false)
    }

    reader.readAsText(file)
  }

  const calculateTweetDistribution = (metadata: TweetMetadata[]) => {
    const yearCounts: Record<number, number> = {}
    const monthCounts: Record<string, number> = {}

    metadata.forEach((tweet) => {
      if (tweet.date) {
        const year = tweet.year || tweet.date.getFullYear()
        const month = tweet.month || tweet.date.getMonth()
        const yearMonthKey = `${year}-${month}`

        // Count tweets by year
        yearCounts[year] = (yearCounts[year] || 0) + 1

        // Count tweets by year-month
        monthCounts[yearMonthKey] = (monthCounts[yearMonthKey] || 0) + 1
      }
    })

    setTweetsByYear(yearCounts)
    setTweetsByMonth(monthCounts)
  }

  // Function to decode HTML entities
  const decodeHTMLEntities = (text: string): string => {
    const textarea = document.createElement("textarea")
    textarea.innerHTML = text
    return textarea.value
  }

  const processTweets = (tweetsData: any, hideRTs: boolean, hideReplies: boolean) => {
    let tweetTexts: string[] = []
    let metadata: TweetMetadata[] = []

    try {
      // Handle different possible structures of the tweets data
      let tweetItems: any[] = []

      if (tweetsData && tweetsData.part0 && Array.isArray(tweetsData.part0)) {
        // Standard structure: YTD.tweets.part0 is an array
        tweetItems = tweetsData.part0
      } else if (tweetsData && Array.isArray(tweetsData)) {
        // Alternative structure: tweets data is directly an array
        tweetItems = tweetsData
      } else {
        console.warn("Unexpected tweets data structure:", tweetsData)
        return { tweetTexts: [], metadata: [] }
      }

      // Process the tweets
      const filteredTweets = tweetItems
        .filter((item: any) => {
          // Handle different tweet structures
          const tweet = item.tweet || item
          const isReply = tweet.in_reply_to_status_id_str !== undefined
          return !hideReplies || !isReply
        })
        .filter((item: any) => {
          // Handle different tweet structures
          const tweet = item.tweet || item
          const tweetText = tweet.full_text || tweet.text || ""
          const isRetweet = tweetText.startsWith("RT ")
          return !hideRTs || !isRetweet
        })

      // Create parallel arrays for tweet texts and metadata
      for (const item of filteredTweets) {
        // Handle different tweet structures
        const tweet = item.tweet || item
        let tweetText = tweet.full_text || tweet.text || ""

        if (tweetText) {
          // Decode HTML entities in the tweet text
          tweetText = decodeHTMLEntities(tweetText)

          // Store the decoded tweet text
          tweetTexts.push(tweetText)

          // Parse the date
          let tweetDate: Date | undefined
          let year: number | undefined
          let month: number | undefined

          try {
            if (tweet.created_at) {
              tweetDate = new Date(tweet.created_at)
              year = tweetDate.getFullYear()
              month = tweetDate.getMonth()
            }
          } catch (e) {
            console.warn("Failed to parse tweet date:", tweet.created_at)
          }

          metadata.push({
            created_at: tweet.created_at || "",
            id: tweet.id_str || tweet.id || "",
            is_retweet: tweetText.startsWith("RT "),
            is_reply: tweet.in_reply_to_status_id_str !== undefined,
            date: tweetDate,
            year,
            month,
          })
        }
      }

      // Ensure the arrays have the same length
      if (tweetTexts.length !== metadata.length) {
        console.error("Mismatch between tweet texts and metadata array lengths")
      }
    } catch (error) {
      console.error("Error processing Twitter data:", error)
      tweetTexts = []
      metadata = []
    }

    return { tweetTexts, metadata }
  }

  const showRandomTweet = (
    tweetArray: string[],
    metadataArray: TweetMetadata[],
    selectedTimeRange: TimeRange = "balanced",
  ) => {
    if (!tweetArray || tweetArray.length === 0 || !metadataArray || metadataArray.length === 0) {
      setCurrentTweet(null)
      setCurrentTweetMetadata(null)
      return
    }

    // Create a mapping between tweets and their metadata
    const tweetMap = tweetArray
      .map((text, index) => ({
        text,
        metadata: metadataArray[index],
      }))
      .filter((item) => item.metadata && item.metadata.date) // Ensure we have valid dates

    if (tweetMap.length === 0) {
      // Fallback to simple random if no valid dates
      const randomIndex = Math.floor(Math.random() * tweetArray.length)
      setCurrentTweet(tweetArray[randomIndex])
      setCurrentTweetMetadata(metadataArray[randomIndex] || null)
      return
    }

    let selectedTweet

    switch (selectedTimeRange) {
      case "recent": {
        // Sort by date (newest first) and pick from the top 10%
        const sortedTweets = [...tweetMap].sort((a, b) => {
          return (b.metadata.date?.getTime() || 0) - (a.metadata.date?.getTime() || 0)
        })

        // Take the most recent 10% of tweets
        const recentCount = Math.max(1, Math.ceil(sortedTweets.length * 0.1))
        const recentTweets = sortedTweets.slice(0, recentCount)

        // Pick a random tweet from the recent ones
        const randomIndex = Math.floor(Math.random() * recentTweets.length)
        selectedTweet = recentTweets[randomIndex]
        break
      }

      case "year": {
        // Group tweets by year
        const years = Object.keys(tweetsByYear)
          .map(Number)
          .sort((a, b) => b - a) // Sort years descending

        if (years.length === 0) {
          // Fallback to simple random if no years data
          const randomIndex = Math.floor(Math.random() * tweetMap.length)
          selectedTweet = tweetMap[randomIndex]
          break
        }

        // First randomly select a year
        const randomYearIndex = Math.floor(Math.random() * years.length)
        const selectedYear = years[randomYearIndex]

        // Then find tweets from that year
        const tweetsFromYear = tweetMap.filter((item) => item.metadata.year === selectedYear)

        if (tweetsFromYear.length === 0) {
          // Fallback if no tweets found for the year
          const randomIndex = Math.floor(Math.random() * tweetMap.length)
          selectedTweet = tweetMap[randomIndex]
        } else {
          // Pick a random tweet from the selected year
          const randomIndex = Math.floor(Math.random() * tweetsFromYear.length)
          selectedTweet = tweetsFromYear[randomIndex]
        }
        break
      }

      case "month": {
        // Group tweets by month
        const months = Object.keys(tweetsByMonth).sort().reverse() // Sort year-month keys descending

        if (months.length === 0) {
          // Fallback to simple random if no months data
          const randomIndex = Math.floor(Math.random() * tweetMap.length)
          selectedTweet = tweetMap[randomIndex]
          break
        }

        // First randomly select a month
        const randomMonthIndex = Math.floor(Math.random() * months.length)
        const selectedMonth = months[randomMonthIndex]
        const [yearStr, monthStr] = selectedMonth.split("-")
        const selectedYear = Number.parseInt(yearStr)
        const selectedMonthNum = Number.parseInt(monthStr)

        // Then find tweets from that month
        const tweetsFromMonth = tweetMap.filter(
          (item) => item.metadata.year === selectedYear && item.metadata.month === selectedMonthNum,
        )

        if (tweetsFromMonth.length === 0) {
          // Fallback if no tweets found for the month
          const randomIndex = Math.floor(Math.random() * tweetMap.length)
          selectedTweet = tweetMap[randomIndex]
        } else {
          // Pick a random tweet from the selected month
          const randomIndex = Math.floor(Math.random() * tweetsFromMonth.length)
          selectedTweet = tweetsFromMonth[randomIndex]
        }
        break
      }

      case "balanced": {
        // Divide tweets into time buckets and give equal weight to each bucket
        // This ensures a more balanced distribution across your entire tweet history

        // Sort tweets by date
        const sortedTweets = [...tweetMap].sort((a, b) => {
          return (a.metadata.date?.getTime() || 0) - (b.metadata.date?.getTime() || 0)
        })

        // Divide into 10 equal-sized buckets by time
        const bucketSize = Math.max(1, Math.ceil(sortedTweets.length / 10))
        const buckets = []

        for (let i = 0; i < sortedTweets.length; i += bucketSize) {
          buckets.push(sortedTweets.slice(i, i + bucketSize))
        }

        // First randomly select a bucket
        const randomBucketIndex = Math.floor(Math.random() * buckets.length)
        const selectedBucket = buckets[randomBucketIndex]

        // Then randomly select a tweet from that bucket
        const randomIndex = Math.floor(Math.random() * selectedBucket.length)
        selectedTweet = selectedBucket[randomIndex]
        break
      }

      case "all":
      default: {
        // Simple random selection from all tweets
        const randomIndex = Math.floor(Math.random() * tweetMap.length)
        selectedTweet = tweetMap[randomIndex]
        break
      }
    }

    // Set the selected tweet
    if (selectedTweet) {
      setCurrentTweet(selectedTweet.text)
      setCurrentTweetMetadata(selectedTweet.metadata)
    } else {
      // Fallback to simple random if something went wrong
      const randomIndex = Math.floor(Math.random() * tweetArray.length)
      setCurrentTweet(tweetArray[randomIndex])
      setCurrentTweetMetadata(metadataArray[randomIndex] || null)
    }
  }

  const handleNextTweet = () => {
    if (tweets && tweets.length > 0) {
      showRandomTweet(tweets, tweetMetadataArray, timeRange)
    }
  }

  const handleTimeRangeChange = (value: string) => {
    const newTimeRange = value as TimeRange
    setTimeRange(newTimeRange)

    // Show a new tweet with the updated time range
    if (tweets && tweets.length > 0) {
      showRandomTweet(tweets, tweetMetadataArray, newTimeRange)
    }
  }

  const toggleRetweets = () => {
    const newHideRetweets = !hideRetweets
    setHideRetweets(newHideRetweets)

    if (allTweets) {
      const processedTweets = processTweets(allTweets, newHideRetweets, hideReplies)
      setTweets(processedTweets.tweetTexts)
      setTweetMetadataArray(processedTweets.metadata)

      // Recalculate tweet distribution
      calculateTweetDistribution(processedTweets.metadata)

      // Show a random tweet from the filtered list
      if (processedTweets.tweetTexts.length > 0) {
        showRandomTweet(processedTweets.tweetTexts, processedTweets.metadata, timeRange)
      } else {
        setCurrentTweet(null)
        setCurrentTweetMetadata(null)
      }
    }
  }

  const toggleReplies = () => {
    const newHideReplies = !hideReplies
    setHideReplies(newHideReplies)

    if (allTweets) {
      const processedTweets = processTweets(allTweets, hideRetweets, newHideReplies)
      setTweets(processedTweets.tweetTexts)
      setTweetMetadataArray(processedTweets.metadata)

      // Recalculate tweet distribution
      calculateTweetDistribution(processedTweets.metadata)

      // Show a random tweet from the filtered list
      if (processedTweets.tweetTexts.length > 0) {
        showRandomTweet(processedTweets.tweetTexts, processedTweets.metadata, timeRange)
      } else {
        setCurrentTweet(null)
        setCurrentTweetMetadata(null)
      }
    }
  }

  const formatTweetDate = (tweetCreatedAt: string) => {
    if (!tweetCreatedAt) return "unknown date"

    try {
      const date = new Date(tweetCreatedAt)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (e) {
      return "unknown date"
    }
  }

  const formatTweetExactDate = (tweetCreatedAt: string) => {
    if (!tweetCreatedAt) return ""

    try {
      const date = new Date(tweetCreatedAt)
      return format(date, "MMM d, yyyy")
    } catch (e) {
      return ""
    }
  }

  // Function to format tweet text with line breaks preserved
  const formatTweetText = (text: string) => {
    if (!text) return null

    // Split the text by newlines
    const lines = text.split("\n")

    // Return the lines with <br> tags between them
    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ))
  }

  return (
    <Vortex
      className="min-h-screen w-full"
      baseRadius={1}
      rangeRadius={2}
      baseSpeed={0.0}
      rangeSpeed={1.5}
      baseHue={123}
      particleCount={700}
      backgroundColor="#000000"
    >
      <div className="container mx-auto px-4 py-8 max-w-3xl relative z-10">
        <h1 className="text-3xl font-bold text-center mb-8">Your Tweet Time Machine</h1>

        {tweets.length === 0 ? (
          <Card className="w-full backdrop-blur-sm bg-background/80">
            <CardHeader>
              <CardTitle>Upload Your Twitter Archive</CardTitle>
              <CardDescription>
                Upload your tweets.js file from your Twitter archive to view your past tweets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop your tweets.js file or click to browse
                </p>
                <label htmlFor="file-upload">
                  <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md cursor-pointer">
                    Select File
                  </div>
                  <input id="file-upload" type="file" accept=".js" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
              {isLoading && <p className="text-center mt-4">Loading your tweets...</p>}
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full backdrop-blur-sm bg-background/80">
            <CardHeader>
              <CardTitle>Your Random Tweet</CardTitle>
              <CardDescription>Showing 1 of {tweets.length} tweets from your archive</CardDescription>

              <div className="flex flex-col gap-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="hide-retweets" checked={hideRetweets} onCheckedChange={toggleRetweets} />
                    <Label htmlFor="hide-retweets" className="flex items-center cursor-pointer">
                      <Repeat className="h-4 w-4 mr-1" /> Hide Retweets
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="hide-replies" checked={hideReplies} onCheckedChange={toggleReplies} />
                    <Label htmlFor="hide-replies" className="flex items-center cursor-pointer">
                      <MessageSquare className="h-4 w-4 mr-1" /> Hide Replies
                    </Label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">Time Range:</span>
                  </div>
                  <Select value={timeRange} onValueChange={handleTimeRangeChange}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time (Random)</SelectItem>
                      <SelectItem value="recent">Recent Tweets (Last 10%)</SelectItem>
                      <SelectItem value="year">Random Year</SelectItem>
                      <SelectItem value="month">Random Month</SelectItem>
                      <SelectItem value="balanced">Balanced Timeline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {currentTweet ? (
                <div className="p-4 bg-muted/80 rounded-lg">
                  <h2 className="text-2xl font-medium mb-2 whitespace-pre-line">{formatTweetText(currentTweet)}</h2>
                  {currentTweetMetadata && (
                    <div className="flex flex-col sm:flex-row sm:items-center text-sm text-muted-foreground gap-2">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatTweetDate(currentTweetMetadata.created_at || "")}</span>
                        {currentTweetMetadata.created_at && (
                          <span className="ml-1 text-xs">
                            ({formatTweetExactDate(currentTweetMetadata.created_at)})
                          </span>
                        )}
                      </div>
                      {currentTweetMetadata.is_retweet && (
                        <span className="flex items-center">
                          <Repeat className="h-3 w-3 mr-1" /> Retweet
                        </span>
                      )}
                      {currentTweetMetadata.is_reply && (
                        <span className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" /> Reply
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-muted/80 rounded-lg text-center">
                  <p>No tweets match your current filters. Try changing the filters or uploading a different file.</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleNextTweet} className="w-full flex items-center justify-center gap-2">
                Next Tweet <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </Vortex>
  )
}

