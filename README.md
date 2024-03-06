![Under New Management](src/logo128.png)

# Under New Management

**Detect when your extensions have changed owners**

Intermittenty checks your installed extensions to see if the developer information listed on the Chrome Web Store has changed. If anything is different, the extension icon will display a red badge, alerting you to the change.

![image](unm-screenshot-1280x800.png)

## Installation

Install here: (pending Chrome Web Store approval)

## Building from source

**Under New Management** uses Parcel, React, Typescript, and TailwindCSS

`yarn install` to install dependencies

`yarn start` to run locally

`yarn build` to build a release

## Why does this need an external server?

Browsers have special rules about modifying extension marketplace domains. For example, you cannot set `declarative_net_request` rules for `chromewebstore.google.com`. Therefore, this extension delegates the developer info checking to the ExBoost API server.
