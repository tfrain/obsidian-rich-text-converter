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
    private markdownContent: string;
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
        this.markdownContent = "";
        this.update(); // Initial render
        
        this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.update()));
		this.registerEvent(this.app.workspace.on('editor-change', () => this.update()));
    }

    async onClose() {
        // Nothing to clean up.
    }

    // Creates a custom renderer with all the fixes
    private getRenderer(forPreview: boolean): marked.Renderer {
        const renderer = new marked.Renderer();

        // FIX: Strip <p> tags from blockquotes to remove the extra bottom margin they create in Medium.
        renderer.blockquote = (quote) => {
            const strippedQuote = quote.replace(/^<p>|<\/p>$/g, '');
            return `<blockquote>${strippedQuote}</blockquote>`;
        };
        
        // --- Other fixes remain the same ---

        renderer.hr = () => `<hr>`;
        renderer.paragraph = (text) => `<p>${text}</p>`;
        
        renderer.heading = (text, level) => {
            const tag = level <= 2 ? 'h3' : 'h4';
            return `<${tag}><strong style="font-weight: bold;">${text}</strong></${tag}>`;
        };
        renderer.strong = (text) => `<strong style="font-weight: bold;">${text}</strong>`;

        renderer.code = (code, lang) => {
            const effectiveLang = lang || 'go';

            const lines = code.split('\n');
            const processedLines = lines.map(line => {
                const unindentedLine = line.trimStart();
                if (unindentedLine === '') {
                    return '&nbsp;';
                }
                return unindentedLine
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            });
            const finalCode = processedLines.join('\n');
            
            if (forPreview) {
                const langClass = `language-${effectiveLang}`;
                return `<pre style="background-color: #f0f0f0; padding: 1em; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word;"><code class="${langClass}">${finalCode}</code></pre>`;
            } else {
                // For the clipboard, Medium uses a data attribute.
                return `<pre data-code-language="${effectiveLang}">${finalCode}</pre>`;
            }
        };

        renderer.list = (body, ordered, start) => {
            const tag = ordered ? 'ol' : 'ul';
            const startAttr = (ordered && start !== 1) ? ` start="${start}"` : '';
            return `<${tag}${startAttr}>${body}</${tag}>`;
        };
        renderer.listitem = (text) => `<li>${text}</li>`;

        return renderer;
    }

    private preProcessMarkdown(markdown: string): string {
        return markdown.split('\n').map(line => {
            if (line.trim().startsWith('```')) {
                return line.trimStart();
            }
            return line;
        }).join('\n');
    }

    getMediumHtml(markdown: string): string {
        const processedMarkdown = this.preProcessMarkdown(markdown);
        // Generate HTML for the PREVIEW using the renderer
        return marked(processedMarkdown, { renderer: this.getRenderer(true), headerIds: false });
    }

    async copyRenderedContent() {
        if (!this.markdownContent) {
            new Notice('No content to copy.');
            return;
        }

        try {
            const processedMarkdown = this.preProcessMarkdown(this.markdownContent);
            const finalHtmlForClipboard = marked(processedMarkdown, { renderer: this.getRenderer(false), headerIds: false });

            // Create a Blob with the HTML content
            const blob = new Blob([finalHtmlForClipboard], { type: 'text/html' });
            // Create a ClipboardItem with the Blob
            const clipboardItem = new ClipboardItem({ 'text/html': blob });

            // Write the ClipboardItem to the clipboard
            await navigator.clipboard.write([clipboardItem]);

            new Notice('Medium-compatible content copied to clipboard!');

        } catch (err) {
            new Notice('Error copying rich text to clipboard: ' + err);
            console.error(err);
        }
    }

    update() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            this.markdownContent = view.editor.getValue();
        }

        const container = this.containerEl.children[1];

        if (!this.markdownContent) {
            if (!container.hasChildNodes()) {
                container.createEl("div", { text: "Open a Markdown file to see the Medium preview.", cls: "medium-preview-placeholder" });
            }
            return;
        }
        
		container.empty();

        const header = container.createEl("div", { 
            cls: "medium-preview-header", 
            attr: { 'style': 'display: flex; justify-content: space-between; align-items: center; padding: 10px;' } 
        });
        header.createEl("h4", { text: "Medium Preview", attr: { 'style': 'margin: 0;' } });
        const copyButton = header.createEl("button", { text: "Copy to Medium", cls: "mod-cta" });
        copyButton.onClickEvent(async () => {
            await this.copyRenderedContent();
        });

        const finalHtml = this.getMediumHtml(this.markdownContent);

        const previewEl = container.createEl("div", { 
            cls: "medium-preview",
            attr: { 'style': 'padding: 0 10px 10px 10px; user-select: text; -webkit-user-select: text;' }
        });
        previewEl.innerHTML = finalHtml;
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
