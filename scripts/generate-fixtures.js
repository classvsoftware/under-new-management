const fs = require("fs");
const path = require("path");

const SOURCE_URLS = {
  cws: (id) => `https://chromewebstore.google.com/detail/${id}`,
  // Add other sources here, e.g.:
  // amo: (id) => `https://addons.mozilla.org/en-US/firefox/addon/${id}/`,
};

const FIXTURES = [
  { source: "cws", name: "ublock-origin-lite", id: "ddkjiahejlhfcafbddmgiahcphecmpfh" },
  { source: "cws", name: "chatgpt-search", id: "ejcfepkfckglbgocfkanmcdngdijcgld" },
  { source: "cws", name: "bitwarden", id: "nngceckbapebfimnlniiiahkandclblb" },
];

async function main() {
  for (const { source, name, id } of FIXTURES) {
    const urlBuilder = SOURCE_URLS[source];
    if (!urlBuilder) {
      console.error(`Unknown source: ${source}`);
      process.exit(1);
    }

    const url = urlBuilder(id);
    const outDir = path.join(__dirname, "..", "fixtures", source);
    const outFile = path.join(outDir, `${name}.html`);

    console.log(`Fetching ${source}/${name} from ${url}`);

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  Failed: ${res.status} ${res.statusText}`);
      process.exit(1);
    }

    const html = await res.text();

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, html);
    console.log(`  Wrote ${path.relative(process.cwd(), outFile)} (${html.length} bytes)`);
  }

  console.log("Done.");
}

main();
