# Obsidian to Medium Converter

An Obsidian plugin to streamline publishing your notes to Medium. It provides a real-time preview pane and a one-click copy button that formats your Markdown into clean, Medium-compatible rich text.

## Features

- **Medium Preview Pane**: Adds a new view that shows a live, rendered version of your Markdown note, optimized to look like it will on Medium.
- **One-Click Rich Text Copy**: A "Copy to Medium" button in the preview pane copies your entire note to the clipboard as rich text, ready to be pasted directly into the Medium editor.
- **Intelligent Code Block Handling**: Code blocks are automatically processed to ensure Medium's editor recognizes them correctly upon pasting.
- **Manual Selection**: The preview pane allows you to manually select and copy only parts of your note if needed.
- **Live Updates**: The preview pane updates in real-time as you type in your editor.

## How to Use

1.  **Open the Preview Pane**: With a Markdown note open, click the **ribbon icon** (shaped like a document) in Obsidian's left sidebar. This will open the "Medium Preview" pane on the right.
2.  **Preview Your Content**: The new pane will show your rendered note. You will notice that code blocks and other elements are displayed correctly.
3.  **Copy Your Content**: You have two options:
    - **One-Click Copy**: Click the **"Copy to Medium"** button at the top of the preview pane. This copies the entire note in a Medium-compatible format.
    - **Manual Copy**: Simply use your mouse to select any part of the text in the preview pane and copy it using `Cmd+C` or `Ctrl+C`.
4.  **Paste into Medium**: Go to the Medium editor and paste (`Cmd+V` or `Ctrl+V`). Your content, including headers, bold/italic text, and code blocks, should appear correctly formatted.

## Installation

### From Obsidian's Community Plugins (Recommended)

*This plugin is not yet in the community store. Once it is approved, this will be the recommended installation method.*

1.  Open **Settings** > **Community Plugins**.
2.  Turn off **Safe mode**.
3.  Click **Browse** community plugins and search for "Medium Converter".
4.  Click **Install**.
5.  Once installed, close the community plugins window and **enable** the plugin.

### Manual Installation

1.  Download the `main.js` and `manifest.json` files from the [latest release](https://github.com/YOUR_USERNAME/YOUR_REPONAME/releases).
2.  Navigate to your Obsidian vault's plugin folder: `VaultFolder/.obsidian/plugins/`.
3.  Create a new folder named `obsidian-medium-converter`.
4.  Copy the downloaded `main.js` and `manifest.json` files into this new folder.
5.  Reload Obsidian.
6.  Go to **Settings** > **Community Plugins**, find the "Medium Converter" plugin, and enable it.

## For Developers

### Building from source

1.  Clone this repository.
2.  Run `npm install` to install dependencies.
3.  Run `npm run dev` to start development mode with auto-recompilation.
4.  Run `npm run build` to create a production build.

## Acknowledgements

The core conversion logic for Medium compatibility was heavily inspired by the implementation in the [wenyan](https://github.com/geekplux/wenyan) project.
