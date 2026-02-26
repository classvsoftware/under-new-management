import { PageData } from "./interfaces";
import {
  OFFSCREEN_ACTION,
  OffscreenRequest,
  OffscreenResponse,
} from "./offscreen-messages";

const OFFSCREEN_DOCUMENT_PATH = "offscreen/offscreen.html";

async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
  });

  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: "Parse Chrome Web Store HTML to extract extension metadata",
  });
}

async function closeOffscreenDocument(): Promise<void> {
  await chrome.offscreen.closeDocument();
}

async function fetchChromeExtensionPage(
  extensionId: string,
  _locale: string
): Promise<string> {
  const targetUrl = `https://chromewebstore.google.com/detail/${extensionId}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Chrome Web Store page: ${response.status}`
    );
  }
  return response.text();
}

export async function getChromeExtensionMetadata(
  extensionId: string,
  locale: string
): Promise<PageData> {
  const html = await fetchChromeExtensionPage(extensionId, locale);

  await ensureOffscreenDocument();

  const response: OffscreenResponse = await chrome.runtime.sendMessage({
    action: OFFSCREEN_ACTION,
    html,
  } as OffscreenRequest);

  await closeOffscreenDocument();

  if (!response.success) {
    throw new Error(response.error);
  }

  const { extensionId: parsedId, developerData, allExtensionData } =
    response.data;

  const extensionData = allExtensionData.find(
    (ext) => ext.extensionId === parsedId
  );
  if (!extensionData) {
    throw new Error(`Could not match extension data to ${parsedId}`);
  }

  return {
    extensionData,
    developerData,
    recommendations: allExtensionData.filter(
      (ext) => ext.extensionId !== parsedId
    ),
  };
}
