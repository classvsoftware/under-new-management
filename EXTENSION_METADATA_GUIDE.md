# Extension Metadata Fetcher — TypeScript Implementation Guide

This document describes how to replicate the metadata-fetching logic from `utils/chrome_web_store.py` and `utils/firefox_addons_store.py` as a single TypeScript module for use inside a browser extension.

## TypeScript Interfaces

```typescript
interface ExtensionData {
  extensionId: string;
  extensionIconUrl: string;
  extensionName: string;
  extensionRating: number;
  ratingCount: number;
  roundedExtensionRating: number;
  extensionDescription: string;
  extensionCategory: string | null;
  installCount: number;
  installCountSuffix: string;
}

interface ExtensionDeveloperData {
  developerName: string | null;
  developerEmail: string | null;
  developerWebsite: string | null;
  offeredByName: string | null;
}

interface PageData {
  extensionData: ExtensionData;
  developerData: ExtensionDeveloperData;
  recommendations: ExtensionData[];
}
```

## Entry Point

```typescript
async function getExtensionMetadata(extensionId: string, locale: string = "en-US"): Promise<PageData> {
  if (/^[a-z]{32}$/.test(extensionId)) {
    return getChromeExtensionMetadata(extensionId, locale);
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(extensionId)) {
    return getFirefoxExtensionMetadata(extensionId, locale);
  }

  throw new Error(`Unrecognized extension ID format: ${extensionId}`);
}
```

- Chrome extension IDs are exactly 32 lowercase letters: `/^[a-z]{32}$/`
- Firefox extension IDs are UUID v4: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`

---

## Chrome Web Store

The Chrome Web Store has no public API. Metadata is extracted by fetching the extension's detail page HTML and parsing embedded data.

### Step 1: Fetch the Extension Page

```typescript
async function fetchChromeExtensionPage(extensionId: string, locale: string): Promise<string> {
  const url = `https://chromewebstore.google.com/detail/${extensionId}`;
  const headers: Record<string, string> = {
    "accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": `${locale};q=0.9,pt;q=0.8`,
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "sec-ch-ua-arch": '"arm"',
    "sec-ch-ua-bitness": '"64"',
    "sec-ch-ua-full-version": '"120.0.6099.234"',
    "sec-ch-ua-full-version-list":
      '"Not_A Brand";v="8.0.0.0", "Chromium";v="120.0.6099.234", "Google Chrome";v="120.0.6099.234"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-model": '""',
    "sec-ch-ua-platform": '"macOS"',
    "sec-ch-ua-platform-version": '"14.2.1"',
    "sec-ch-ua-wow64": "?0",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch Chrome Web Store page: ${response.status}`);
  }
  return response.text();
}
```

These headers mimic a real Chrome browser request. They originate from `utils/http.py:6-29`.

### Step 2: Parse the HTML

Use the browser-native `DOMParser` (no external library needed — this replaces Python's BeautifulSoup).

```typescript
function parseChromeExtensionPage(html: string): PageData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // --- Extract extension ID from canonical link ---
  const extensionId = extractExtensionIdFromCanonical(doc);

  // --- Extract developer data from the Details section ---
  const developerData = extractDeveloperData(doc);

  // --- Extract extension data + recommendations from script tags ---
  const allExtensionData = extractExtensionDataFromScripts(doc);

  // --- Separate the target extension from recommendations ---
  const extensionData = allExtensionData.find((ext) => ext.extensionId === extensionId);
  if (!extensionData) {
    throw new Error(`Could not match extension data to ${extensionId}`);
  }

  return {
    extensionData,
    developerData,
    recommendations: allExtensionData.filter((ext) => ext.extensionId !== extensionId),
  };
}
```

### Step 2a: Extract Extension ID from Canonical Link

The canonical `<link>` tag contains the extension URL. The extension ID is the last path segment.

Source: `utils/chrome_web_store.py:191-198`

```typescript
function extractExtensionIdFromCanonical(doc: Document): string {
  const canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) {
    throw new Error("Could not find canonical link in page");
  }
  const href = canonical.getAttribute("href");
  if (!href) {
    throw new Error("Canonical link has no href");
  }
  const parts = href.split("/").filter(Boolean);
  const extensionId = parts[parts.length - 1];
  if (!extensionId) {
    throw new Error("Could not extract extension ID from canonical link");
  }
  return extensionId;
}
```

### Step 2b: Extract Developer Data from Details Section

Navigate the DOM: find the `<h2>` with text "Details", go up to its parent `<section>`, then look for `<li>` elements containing "Developer" and "Offered by".

Source: `utils/chrome_web_store.py:203-253`

```typescript
function extractDeveloperData(doc: Document): ExtensionDeveloperData {
  let developerName: string | null = null;
  let developerEmail: string | null = null;
  let developerWebsite: string | null = null;
  let offeredByName: string | null = null;

  // Find the <h2> with text "Details"
  const h2Elements = doc.querySelectorAll("h2");
  let detailsH2: Element | null = null;
  for (const h2 of h2Elements) {
    if (h2.textContent?.trim() === "Details") {
      detailsH2 = h2;
      break;
    }
  }

  if (detailsH2) {
    // Walk up to the parent <section>
    const section = detailsH2.closest("section");

    if (section) {
      const listItems = section.querySelectorAll("li");

      for (const li of listItems) {
        const firstDiv = li.querySelector("div");
        if (!firstDiv) continue;
        const label = firstDiv.textContent?.trim();

        if (label === "Developer") {
          // The developer info is in the next sibling div after the label div
          const infoDiv = firstDiv.nextElementSibling;
          if (infoDiv) {
            // Developer name: nested div > div text
            try {
              const nameDiv = infoDiv.querySelector("div > div");
              if (nameDiv) {
                developerName = nameDiv.textContent?.trim() || null;
              }
            } catch {}

            // Developer website: first <a> tag href
            try {
              const anchor = infoDiv.querySelector("a");
              if (anchor) {
                developerWebsite = anchor.getAttribute("href");
              }
            } catch {}

            // Developer email: inside a <details> element
            try {
              const details = infoDiv.querySelector("details");
              if (details) {
                const detailsDiv = details.querySelector("div");
                if (detailsDiv) {
                  developerEmail = detailsDiv.textContent?.trim() || null;
                }
              }
            } catch {}
          }
        }

        if (label === "Offered by") {
          const infoDiv = firstDiv.nextElementSibling;
          if (infoDiv) {
            offeredByName = infoDiv.textContent?.trim() || null;
          }
        }
      }
    }
  }

  return { developerName, developerEmail, developerWebsite, offeredByName };
}
```

### Step 2c: Extract Extension Data from Script Tags

Chrome Web Store embeds extension data in `<script>` tags as `AF_initDataCallback(...)` calls. The data is a nested list structure containing extension metadata at known array indices.

Source: `utils/chrome_web_store.py:256-304` and `utils/chrome_web_store.py:19-38`

```typescript
function extractExtensionDataFromScripts(doc: Document): ExtensionData[] {
  const scripts = doc.querySelectorAll("script");
  const allExtensionData: ExtensionData[] = [];
  const chromeIdRegex = /^[a-z]{32}$/;

  for (const script of scripts) {
    const text = script.textContent || "";
    if (!text.includes("AF_initDataCallback")) continue;

    // Extract the object argument passed to AF_initDataCallback
    const initMatch = text.match(/AF_initDataCallback\((\{.*?\})\);/s);
    if (!initMatch) continue;

    const unparsableDictStr = initMatch[1];

    // Extract the JSON array between "data:" and ", sideChannel"
    const dataMatch = unparsableDictStr.match(/data:(.*?), sideChannel/s);
    if (!dataMatch) continue;

    const jsonStr = dataMatch[1].trim();

    try {
      const packedData = JSON.parse(jsonStr);
      extractExtensionDataFromNestedLists(packedData, allExtensionData, chromeIdRegex);
    } catch {
      continue;
    }
  }

  return allExtensionData;
}
```

### Step 2d: Recursively Walk Nested Lists

The JSON data is deeply nested arrays. Recursively walk through them looking for arrays where the first element is a 32-character lowercase string (a Chrome extension ID).

Source: `utils/chrome_web_store.py:19-38`

```typescript
function extractExtensionDataFromNestedLists(
  packedData: unknown,
  allExtensionData: ExtensionData[],
  chromeIdRegex: RegExp
): void {
  if (!Array.isArray(packedData) || packedData.length === 0) return;

  // If the first element matches a Chrome extension ID, try to unpack this array
  if (typeof packedData[0] === "string" && chromeIdRegex.test(packedData[0])) {
    try {
      allExtensionData.push(unpackExtensionData(packedData));
    } catch {
      // Silently skip malformed entries
    }
    return;
  }

  // Otherwise, recurse into each element
  for (const item of packedData) {
    extractExtensionDataFromNestedLists(item, allExtensionData, chromeIdRegex);
  }
}
```

### Step 2e: Unpack a Single Extension from the Positional Array

Each extension is represented as an array with data at fixed indices:

| Index | Field | Type |
|-------|-------|------|
| 0 | Extension ID | `string` (32 lowercase chars) |
| 1 | Icon URL | `string` |
| 2 | Name | `string` |
| 3 | Rating | `number` (0 if null) |
| 4 | Rating count | `number` (0 if null) |
| 6 | Description | `string` |
| 11 | Category data | `[categoryString, ...]` or null |
| 14 | Install count | `number` (0 if missing) |

Source: `utils/chrome_web_store.py:41-140`

```typescript
function unpackExtensionData(packedData: any[]): ExtensionData {
  const extensionId: string = packedData[0];
  if (!/^[a-z]{32}$/.test(extensionId)) {
    throw new Error(`Invalid extension ID: ${extensionId}`);
  }

  const extensionIconUrl: string = packedData[1];
  if (typeof extensionIconUrl !== "string") {
    throw new Error(`Icon URL must be string, got: ${extensionIconUrl}`);
  }

  const extensionName: string = packedData[2];
  if (typeof extensionName !== "string") {
    throw new Error(`Name must be string, got: ${extensionName}`);
  }

  const extensionRating: number = typeof packedData[3] === "number" ? packedData[3] : 0;
  const ratingCount: number = typeof packedData[4] === "number" ? packedData[4] : 0;

  const extensionDescription: string = packedData[6];
  if (typeof extensionDescription !== "string") {
    throw new Error(`Description must be string, got: ${extensionDescription}`);
  }

  // Category is nested: [categoryString, ...]
  let extensionCategory: string | null = null;
  const categoryData = packedData[11];
  if (
    Array.isArray(categoryData) &&
    categoryData.length > 0 &&
    typeof categoryData[0] === "string" &&
    categoryData[0].length > 0
  ) {
    extensionCategory = categoryData[0];
  }

  // Install count may not be present
  let installCount = 0;
  try {
    if (typeof packedData[14] === "number") {
      installCount = packedData[14];
    }
  } catch {}

  return {
    extensionId,
    extensionIconUrl,
    extensionName,
    extensionRating,
    ratingCount,
    roundedExtensionRating: Math.round(extensionRating * 10) / 10,
    extensionDescription,
    extensionCategory,
    installCount,
    installCountSuffix: installCount > 999 ? "+" : "",
  };
}
```

### Step 3: Wire It Together

```typescript
async function getChromeExtensionMetadata(extensionId: string, locale: string): Promise<PageData> {
  const html = await fetchChromeExtensionPage(extensionId, locale);
  return parseChromeExtensionPage(html);
}
```

---

## Firefox Add-ons

Firefox has a proper public REST API, so this is much simpler.

### Step 1: Fetch Extension Data from the API

```typescript
async function getFirefoxExtensionMetadata(
  extensionId: string,
  locale: string = "en-US"
): Promise<PageData> {
  const url = `https://addons.mozilla.org/api/v5/addons/addon/${extensionId}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Firefox addon data: ${response.status}`);
  }

  const addonInfo = await response.json();

  return {
    extensionData: {
      extensionId,
      extensionName: addonInfo.name?.[locale] ?? "",
      extensionIconUrl: "",
      extensionRating: 0,
      extensionCategory: null,
      ratingCount: 0,
      roundedExtensionRating: 0,
      extensionDescription: "",
      installCount: 0,
      installCountSuffix: "",
    },
    developerData: {
      developerName: (addonInfo.authors ?? []).map((u: any) => u.id).join(",") || null,
      developerWebsite: addonInfo.homepage?.url?.[locale] ?? null,
      developerEmail: addonInfo.support_email?.[locale] ?? null,
      offeredByName: (addonInfo.authors ?? []).map((u: any) => u.name).join(",") || null,
    },
    recommendations: [],
  };
}
```

Source: `utils/firefox_addons_store.py:13-54` and `utils/http.py:34-40`

The Firefox API returns no recommendation data, so `recommendations` is always an empty array.

---

## Caveats

- **Chrome scraping is fragile.** Google can change the HTML structure or the `AF_initDataCallback` format at any time, which will break the Chrome parser. The Firefox API is stable.
- **`DOMParser` availability.** `DOMParser` is available in extension content scripts and in extension pages (popup, options, etc). It is NOT available in Manifest V3 service workers. If running from a service worker, you will need to use a library like `linkedom` or `parse5`, or offload the parsing to an offscreen document.
- **CORS / Host permissions.** `fetch()` from an extension context requires host permissions in `manifest.json` for the target origins.
