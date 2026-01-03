import { App, Editor, MarkdownView, ItemView, WorkspaceLeaf, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { marked } from 'marked';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export const MEDIUM_PREVIEW_VIEW_TYPE = "medium-preview-view";

class MediumPreviewView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return MEDIUM_PREVIEW_VIEW_TYPE;
    }

    getDisplayText() {
        return "Medium Preview";
    }

    async onOpen() {
        this.update(); // Initial render
        
        this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.update()));
		this.registerEvent(this.app.workspace.on('editor-change', () => this.update()));
    }

    async onClose() {
        // Nothing to clean up.
    }

    update() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const container = this.containerEl.children[1];

        // If there's no active markdown view, do nothing.
        // This prevents the view from clearing itself when it (or another non-markdown view) gains focus.
        if (!view) {
            // But if the view is empty, show a placeholder.
            if (!container.hasChildNodes()) {
                container.createEl("div", { text: "Open a Markdown file to see the Medium preview.", cls: "medium-preview-placeholder" });
            }
            return;
        }
        
		container.empty();

        // Re-create the header and button every time we update
        const header = container.createEl("div", { 
            cls: "medium-preview-header", 
            attr: { 'style': 'display: flex; justify-content: space-between; align-items: center; padding: 10px;' } 
        });
        header.createEl("h4", { text: "Medium Preview", attr: { 'style': 'margin: 0;' } });
        const copyButton = header.createEl("button", { text: "Copy to Medium", cls: "mod-cta" });
        copyButton.onClickEvent(() => {
            this.copyRenderedContent();
        });

        const markdown = view.editor.getValue();
        const finalHtml = this.getMediumHtml(markdown);

        const previewEl = container.createEl("div", { 
            cls: "medium-preview",
            attr: { 'style': 'padding: 0 10px 10px 10px; user-select: text; -webkit-user-select: text;' }
        });
        previewEl.innerHTML = finalHtml;
    }

    getMediumHtml(markdown: string): string {
        // This method now focuses on creating a good PREVIEW.
        // The special Medium transformation is moved to the copy function.
        const initialHtml = marked(markdown, { headerIds: false });

        const parser = new DOMParser();
		const doc = parser.parseFromString(initialHtml, 'text/html');
		const body = doc.body;

		// Clean attributes from all elements to be safe
		body.querySelectorAll("*").forEach(el => {
			el.removeAttribute("class");
			el.removeAttribute("id");
		});

		// Bolden headings
		body.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(el => {
			el.innerHTML = `<strong>${el.innerHTML}</strong>`;
		});

        // Add styling to pre blocks for better preview, but do not convert them
        body.querySelectorAll("pre").forEach(el => {
            el.setAttribute('style', 'background-color: #f0f0f0; padding: 1em; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word;');
        });

		// Unwrap figures
		body.querySelectorAll("figure").forEach(el => {
			el.outerHTML = el.innerHTML;
		});

        return body.innerHTML;
    }

    copyRenderedContent() {
        const previewEl = this.containerEl.querySelector(".medium-preview") as HTMLElement;
        if (!previewEl) {
            new Notice('No content to copy.');
            return;
        }

        // 1. Save the original, good-looking preview HTML
        const originalPreviewHtml = previewEl.innerHTML;

        try {
            // 2. Create the transformed HTML for the clipboard
            const parser = new DOMParser();
            const doc = parser.parseFromString(originalPreviewHtml, 'text/html');
            const body = doc.body;

            // Perform the PRE transformation for Medium's clipboard
            body.querySelectorAll("pre").forEach(el => {
                // Keep the <pre> tag, but replace its content with just the text.
                // This strips out the inner <code> and any syntax highlighting classes.
                const codeText = el.textContent;
                el.innerHTML = ''; // Clear the inside of the <pre>
                el.textContent = codeText; // Set its text content directly
                el.removeAttribute('style'); // Remove preview styling
            });

            const finalHtmlForClipboard = body.innerHTML;

            // 3. Temporarily replace the visible content with the clipboard version
            previewEl.innerHTML = finalHtmlForClipboard;
            
            // 4. Select and copy from the visible element
            const range = document.createRange();
            range.selectNodeContents(previewEl);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);

            document.execCommand('copy');
            
            selection?.removeAllRanges();

            new Notice('Medium-compatible content copied to clipboard!');

        } catch (err) {
            new Notice('Error copying rich text to clipboard: ' + err);
            console.error(err);
        } finally {
            // 5. ALWAYS restore the original content, even if copy fails
            previewEl.innerHTML = originalPreviewHtml;
        }
    }
}


export default class MediumConverterPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			MEDIUM_PREVIEW_VIEW_TYPE,
			(leaf) => new MediumPreviewView(leaf)
		);

		// This adds a ribbon icon to the left bar
		this.addRibbonIcon('documents', 'Open Medium Preview', () => {
			this.activateView();
		});

		// This adds a command that can be triggered anywhere
		this.addCommand({
			id: 'open-medium-preview',
			name: 'Open Medium Preview Pane',
			callback: () => {
				this.activateView();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(MEDIUM_PREVIEW_VIEW_TYPE);
	}

	async activateView() {
		this.app.workspace.detachLeavesOfType(MEDIUM_PREVIEW_VIEW_TYPE);
	
		const leaf = this.app.workspace.getRightLeaf(false);
		if (leaf) {
			await leaf.setViewState({
				type: MEDIUM_PREVIEW_VIEW_TYPE,
				active: true,
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: MediumConverterPlugin;

	constructor(app: App, plugin: MediumConverterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Medium Converter plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
