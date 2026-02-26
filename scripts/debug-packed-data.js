// Run the actual parser on a live Chrome Web Store page
// to compare extracted email vs what we expect

const { JSDOM } = require('jsdom');
const fs = require('fs');

const CHROME_ID_REGEX = /^[a-z]{32}$/;

// Import the parser functions by re-implementing the key parts
// (can't import TS directly, so we replicate the extraction logic)

function extractDeveloperData(doc) {
  let developerName = null;
  let developerAddress = null;
  let developerEmail = null;
  let developerWebsite = null;
  let offeredByName = null;

  const h2Elements = doc.querySelectorAll("h2");
  let detailsH2 = null;
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
            // Website extraction
            try {
              const anchor = infoDiv.querySelector("a");
              if (anchor) {
                developerWebsite = anchor.getAttribute("href");
              }
            } catch {}

            // Email extraction
            try {
              for (const details of infoDiv.querySelectorAll("details")) {
                const summary = details.querySelector("summary");
                if (!summary) continue;
                const summaryText = summary.textContent?.trim() || "";
                if (summaryText.includes("Email")) {
                  const contentDiv = details.querySelector("div");
                  if (contentDiv) {
                    developerEmail = contentDiv.textContent?.trim() || null;
                  }
                  break;
                }
              }
            } catch {}

            // Name/address extraction
            try {
              const wrapperDiv = infoDiv.querySelector("div > div");
              if (wrapperDiv) {
                for (const child of wrapperDiv.children) {
                  if (child.tagName === "DIV" && !child.closest("details")) {
                    const br = child.querySelector("br");
                    if (br) {
                      const nameNode = br.previousSibling;
                      developerName = nameNode?.textContent?.trim() || null;
                      const addressParts = [];
                      let node = br.nextSibling;
                      while (node) {
                        if (node.textContent?.trim()) {
                          addressParts.push(node.textContent.trim());
                        }
                        node = node.nextSibling;
                      }
                      developerAddress = addressParts.length > 0
                        ? addressParts.join("\n")
                        : null;
                    } else {
                      developerName = child.textContent?.trim() || null;
                    }
                    break;
                  }
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

  return { developerName, developerAddress, developerEmail, developerWebsite, offeredByName };
}

// Test against all 5 fixtures
const FIXTURES = JSON.parse(fs.readFileSync('fixtures/index.json', 'utf8'));
const EXPECTED = {
  "ublock-origin-lite": { developerEmail: "ubo@raymondhill.net" },
  "chatgpt-search": { developerEmail: null },
  "bitwarden": { developerEmail: "hello@bitwarden.com" },
  "capital-one-shopping": { developerEmail: "help@capitaloneshopping.com" },
  "tampermonkey": { developerEmail: "support@tampermonkey.net" },
};

console.log("=== Fixture DOM extraction (matches test env) ===");
for (const [name, expected] of Object.entries(EXPECTED)) {
  const html = fs.readFileSync(`fixtures/cws/${name}.html`, 'utf8');
  const dom = new JSDOM(html);
  const result = extractDeveloperData(dom.window.document);
  const match = result.developerEmail === expected.developerEmail ? 'OK' : 'MISMATCH';
  console.log(`${name}: extracted="${result.developerEmail}" expected="${expected.developerEmail}" ${match}`);
}

// Now test with live page
console.log("\n=== Live page DOM extraction ===");
fetch('https://chromewebstore.google.com/detail/nngceckbapebfimnlniiiahkandclblb')
  .then(r => r.text())
  .then(html => {
    const dom = new JSDOM(html);
    const result = extractDeveloperData(dom.window.document);
    console.log(`bitwarden (live): extracted="${result.developerEmail}" expected="hello@bitwarden.com"`);
    console.log(`  developerName: ${result.developerName}`);
    console.log(`  developerAddress: ${result.developerAddress}`);
    console.log(`  developerWebsite: ${result.developerWebsite}`);
    console.log(`  offeredByName: ${result.offeredByName}`);

    // Also check: what does the wrapperDiv > div > details structure look like?
    const doc = dom.window.document;
    const h2s = doc.querySelectorAll('h2');
    for (const h2 of h2s) {
      if (h2.textContent?.trim() === 'Details') {
        const section = h2.closest('section');
        if (section) {
          const lis = section.querySelectorAll('li');
          for (const li of lis) {
            const fd = li.querySelector('div');
            if (fd?.textContent?.trim() === 'Developer') {
              const infoDiv = fd.nextElementSibling;
              if (!infoDiv) { console.log('  NO infoDiv!'); break; }

              // Check all <a> elements
              const anchors = infoDiv.querySelectorAll('a');
              console.log(`\n  All <a> elements in developer info (${anchors.length}):`);
              anchors.forEach((a, i) => {
                console.log(`    a#${i}: href="${a.getAttribute('href')}" text="${a.textContent?.trim()?.substring(0, 50)}"`);
              });
            }
          }
        }
        break;
      }
    }
  })
  .catch(e => console.error('Fetch error:', e.message));
