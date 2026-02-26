import { ExtensionData, ExtensionDeveloperData } from "./interfaces";

export interface ChromeParseResult {
  extensionId: string;
  developerData: ExtensionDeveloperData;
  allExtensionData: ExtensionData[];
}

const CHROME_ID_REGEX = /^[a-z]{32}$/;

export function parseChromeExtensionPage(html: string): ChromeParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const extensionId = extractExtensionIdFromCanonical(doc);
  const { allExtensionData, scriptDeveloperData } =
    extractExtensionDataFromScripts(doc, extensionId);
  const domDeveloperData = extractDeveloperData(doc);
  const developerData = mergeDeveloperData(scriptDeveloperData, domDeveloperData);

  return { extensionId, developerData, allExtensionData };
}

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

function extractDeveloperData(doc: Document): ExtensionDeveloperData {
  let developerName: string | null = null;
  let developerEmail: string | null = null;
  let developerWebsite: string | null = null;
  let offeredByName: string | null = null;

  const h2Elements = doc.querySelectorAll("h2");
  let detailsH2: Element | null = null;
  for (const h2 of h2Elements) {
    if (h2.textContent?.trim() === "Details") {
      detailsH2 = h2;
      break;
    }
  }

  if (detailsH2) {
    const section = detailsH2.closest("section");

    if (section) {
      const listItems = section.querySelectorAll("li");

      for (const li of listItems) {
        const firstDiv = li.querySelector("div");
        if (!firstDiv) continue;
        const label = firstDiv.textContent?.trim();

        if (label === "Developer") {
          const infoDiv = firstDiv.nextElementSibling;
          if (infoDiv) {
            try {
              const nameDiv = infoDiv.querySelector("div > div");
              if (nameDiv) {
                developerName = nameDiv.textContent?.trim() || null;
              }
            } catch {}

            try {
              const anchor = infoDiv.querySelector("a");
              if (anchor) {
                developerWebsite = anchor.getAttribute("href");
              }
            } catch {}

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

  return {
    developerName,
    developerEmail,
    developerWebsite,
    offeredByName,
    developerAccountId: null,
  };
}

interface ScriptExtractionResult {
  allExtensionData: ExtensionData[];
  scriptDeveloperData: ExtensionDeveloperData | null;
}

function extractExtensionDataFromScripts(
  doc: Document,
  extensionId: string
): ScriptExtractionResult {
  const scripts = doc.querySelectorAll("script");
  const allExtensionData: ExtensionData[] = [];
  const devDataRef: { value: ExtensionDeveloperData | null } = { value: null };

  for (const script of scripts) {
    const text = script.textContent || "";
    if (!text.includes("AF_initDataCallback")) continue;

    const initMatch = text.match(/AF_initDataCallback\((\{.*?\})\);/s);
    if (!initMatch) continue;

    const unparsableDictStr = initMatch[1];

    const dataMatch = unparsableDictStr.match(/data:(.*?), sideChannel/s);
    if (!dataMatch) continue;

    const jsonStr = dataMatch[1].trim();

    try {
      const packedData = JSON.parse(jsonStr);
      extractExtensionDataFromNestedLists(
        packedData,
        allExtensionData,
        extensionId,
        devDataRef
      );
    } catch {
      continue;
    }
  }

  return { allExtensionData, scriptDeveloperData: devDataRef.value };
}

function extractExtensionDataFromNestedLists(
  packedData: unknown,
  allExtensionData: ExtensionData[],
  mainExtensionId: string,
  devDataRef: { value: ExtensionDeveloperData | null }
): void {
  if (!Array.isArray(packedData) || packedData.length === 0) return;

  if (typeof packedData[0] === "string" && CHROME_ID_REGEX.test(packedData[0])) {
    try {
      allExtensionData.push(unpackExtensionData(packedData));

      if (packedData[0] === mainExtensionId && !devDataRef.value) {
        devDataRef.value = extractDeveloperDataFromPackedArray(packedData);
      }
    } catch {
      // Silently skip malformed entries
    }
    return;
  }

  for (const item of packedData) {
    extractExtensionDataFromNestedLists(
      item,
      allExtensionData,
      mainExtensionId,
      devDataRef
    );
  }
}

function extractDeveloperDataFromPackedArray(
  packedData: any[]
): ExtensionDeveloperData | null {
  if (packedData.length < 30) return null;

  const developerSubArray = packedData[29];
  if (!Array.isArray(developerSubArray)) return null;

  return {
    developerEmail:
      typeof developerSubArray[0] === "string" ? developerSubArray[0] : null,
    developerName:
      typeof developerSubArray[5] === "string" ? developerSubArray[5] : null,
    developerWebsite:
      typeof packedData[7] === "string" ? packedData[7] : null,
    offeredByName: null,
    developerAccountId:
      typeof developerSubArray[10] === "string" ? developerSubArray[10] : null,
  };
}

function mergeDeveloperData(
  scriptData: ExtensionDeveloperData | null,
  domData: ExtensionDeveloperData
): ExtensionDeveloperData {
  if (!scriptData) return domData;

  return {
    developerName: scriptData.developerName ?? domData.developerName,
    developerEmail: scriptData.developerEmail ?? domData.developerEmail,
    developerWebsite: scriptData.developerWebsite ?? domData.developerWebsite,
    offeredByName: domData.offeredByName,
    developerAccountId: scriptData.developerAccountId,
  };
}

function unpackExtensionData(packedData: any[]): ExtensionData {
  const extensionId: string = packedData[0];
  if (!CHROME_ID_REGEX.test(extensionId)) {
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

  const extensionRating: number =
    typeof packedData[3] === "number" ? packedData[3] : 0;
  const ratingCount: number =
    typeof packedData[4] === "number" ? packedData[4] : 0;

  const extensionDescription: string = packedData[6];
  if (typeof extensionDescription !== "string") {
    throw new Error(`Description must be string, got: ${extensionDescription}`);
  }

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

  let installCount = 0;
  try {
    if (typeof packedData[14] === "number") {
      installCount = packedData[14];
    }
  } catch {}

  let version: string | null = null;
  if (packedData.length > 32 && typeof packedData[32] === "string") {
    version = packedData[32];
  }

  let lastUpdated: string | null = null;
  if (
    packedData.length > 33 &&
    Array.isArray(packedData[33]) &&
    typeof packedData[33][0] === "number"
  ) {
    lastUpdated = new Date(packedData[33][0] * 1000).toISOString();
  }

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
    version,
    lastUpdated,
  };
}
