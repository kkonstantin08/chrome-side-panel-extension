# Chrome Side Panel Extension

A Chrome extension that turns the browser side panel into a compact workspace
for translators, research tools, and other frequently used websites.

## Features

- Open the side panel from the extension action button
- Save custom websites in local Chrome storage
- Pin favorite websites for faster access
- Use a fullscreen-style work mode for the embedded website
- Open an overlay navigation sheet from a floating action button
- Reset the list to the default starter websites

## How It Works

The extension uses the Chrome Side Panel API and renders a custom interface in
`sidepanel.html`. Websites are stored in `chrome.storage.local`, and the panel
switches between:

- `library mode` for browsing and managing saved websites
- `work mode` for focusing on the currently opened website

In work mode, navigation and utility actions are moved into an overlay bottom
sheet so the embedded page can use almost the entire available area.

## Project Structure

- `manifest.json` — Chrome extension manifest
- `background.js` — side panel activation behavior
- `sidepanel.html` — panel markup
- `sidepanel.css` — panel styles
- `sidepanel.js` — panel behavior and storage logic
- `rules.json` — declarative net request ruleset

## Local Usage

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder
5. Click the extension icon to open the side panel

## Notes

- Some websites may block iframe embedding through their own security headers
- Saved websites are stored locally in the browser profile

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE)
file for details.
