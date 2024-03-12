import _ from "lodash-es"

import {
  ALARM_INTERVAL_MIN,
  CHANGELOG_KEY,
  LAST_CHECK_KEY,
  PREVIOUS_API_DATA_KEY,
  RED_BADGE_COLOR
} from "./consts"
import { IApiResponse, IChangelogEntry } from "./interfaces"

// Set an alarm to fire every hour
chrome.alarms.create("hourlyAlarm", { periodInMinutes: ALARM_INTERVAL_MIN })

chrome.action.setBadgeBackgroundColor({ color: RED_BADGE_COLOR })

// Listen for the alarm and execute some action
chrome.alarms.onAlarm.addListener(() => {
  updateDeveloperData()
})

async function updateDeveloperData() {
  const installedExtensionIds = (await chrome.management.getAll()).map(
    (x) => x.id
  )

  const response = await fetch(
    `https://api.extensionboost.com/v1/developer?extension_ids=${installedExtensionIds.join(
      ","
    )}`,
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  )

  if (response.status !== 200) {
    return
  }

  const currentApiData: IApiResponse = await response.json()

  const previousApiData: IApiResponse = (
    await chrome.storage.local.get(PREVIOUS_API_DATA_KEY)
  )[PREVIOUS_API_DATA_KEY] ?? {
    unmatched_extension_ids: [],
    ignored_extension_ids: [],
    matched_extension_data: []
  }

  const changelogData: IChangelogEntry[] =
    (await chrome.storage.local.get(CHANGELOG_KEY))[CHANGELOG_KEY] ?? []

  const newChangelogData = generateNewChangelogEntries(
    previousApiData,
    currentApiData
  )

  const updatedChangelogData: IChangelogEntry[] = [
    ...newChangelogData,
    ...changelogData
  ]

  let badgeText: string = ""
  if (updatedChangelogData.length > 0) {
    badgeText = updatedChangelogData.length.toString()
  }

  if (newChangelogData.length > 0) {
    chrome.storage.local.set({ [CHANGELOG_KEY]: updatedChangelogData })
  }

  chrome.action.setBadgeText({ text: badgeText })

  chrome.storage.local.set({ [PREVIOUS_API_DATA_KEY]: currentApiData })

  chrome.storage.local.set({
    [LAST_CHECK_KEY]: {
      timestamp: new Date().toISOString()
    }
  })
}

function generateNewChangelogEntries(
  previousApiData: IApiResponse,
  currentApiData: IApiResponse
): IChangelogEntry[] {
  const timestamp = new Date().toISOString()

  const newChangelogEntries: IChangelogEntry[] = []

  // Create a Map for quick lookup of current extension data by extension_id
  const currentExtensionsMap = new Map(
    currentApiData.matched_extension_data.map((extension) => [
      extension.extension_id,
      extension
    ])
  )

  for (const previousExtensionData of previousApiData.matched_extension_data) {
    const currentExtensionData = currentExtensionsMap.get(
      previousExtensionData.extension_id
    )

    console.log(previousExtensionData, currentExtensionData)

    // Proceed if we have a match in the current extension data
    if (
      currentExtensionData &&
      !_.isEqual(previousExtensionData, currentExtensionData)
    ) {
      newChangelogEntries.push({
        timestamp,
        before: previousExtensionData,
        after: currentExtensionData
      })
    }
  }

  return newChangelogEntries
}

updateDeveloperData()
