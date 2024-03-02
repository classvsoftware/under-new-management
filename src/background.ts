import { IExtensionDeveloperInformation } from "./interfaces";

chrome.runtime.onInstalled.addListener((object) => {
  console.log("Installed background!");
});

const ALARM_INTERVAL_MIN = 1;

// Set an alarm to fire every hour
chrome.alarms.create("hourlyAlarm", { periodInMinutes: ALARM_INTERVAL_MIN });

// Listen for the alarm and execute some action
chrome.alarms.onAlarm.addListener((alarm) => {
  showNotification(alarm);
});

function showNotification(alarm) {
  if (alarm.name === "hourlyAlarm") {
    console.log("This is your hourly reminder!");

    // You can add any action here, like showing a notification
    chrome.permissions.contains(
      { permissions: ["notifications"] },
      function (result) {
        if (result) {
          // Show notification only if permission is granted
          chrome.notifications.create({
            type: "basic",
            iconUrl: "",
            title: "Time to Stretch!",
            message: "This is your hourly reminder to stretch your legs.",
            // priority: 2
          });
        }
      }
    );
  }
}

const domParser = new DOMParser();

async function getDeveloperInformationFromExtensionId(
  extensionId: string
): Promise<IExtensionDeveloperInformation | null> {
  try {
    const response = await fetch(
      `https://chromewebstore.google.com/detail/${extensionId}`
    );

    const html = await response.text();

    console.log(domParser.parseFromString(html, "text/xml"));

    return null;
  } catch {
    return null;
  }
}
