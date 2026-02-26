import { parseChromeExtensionPage } from "../metadata/chrome-parser";
import {
  OFFSCREEN_ACTION,
  OffscreenRequest,
  OffscreenResponse,
} from "../metadata/offscreen-messages";

chrome.runtime.onMessage.addListener(
  (
    message: OffscreenRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: OffscreenResponse) => void
  ) => {
    if (message.action !== OFFSCREEN_ACTION) return;

    try {
      const data = parseChromeExtensionPage(message.html);
      sendResponse({ success: true, data });
    } catch (err) {
      sendResponse({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return true;
  }
);
