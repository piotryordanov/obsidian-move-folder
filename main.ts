import * as path from 'path';
import * as fs from 'fs'
import { TFile, App, FuzzySuggestModal, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { relative } from 'path';

interface MyPluginSettings {
	deleteSource: boolean;
	localOnly: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	deleteSource: true,
	localOnly: true
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// this.addRibbonIcon('dice', 'Sample Plugin', () => {
		// 	new Notice('This is a notice!');
		// });

		// this.addStatusBarItem().setText('Status Bar Text');

		this.addCommand({
			id: 'move-folder-modal',
			name: 'Move Folder',
			// callback: () => {
			// 	console.log('Simple Callback');
			// },
			checkCallback: (checking: boolean) => {
				let leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking) {
						new Fuzzzz(this.app, this.settings).open();
					}
					return true;
				}
				return false;
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerCodeMirror((cm: CodeMirror.Editor) => {
			console.log('codemirror', cm);
		});

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class Fuzzzz extends FuzzySuggestModal<string>{
	files: string[];
	deleteSource: boolean;
	localOnly: boolean;
    constructor(app: App, settings: object) {
        super(app);
		this.app = app;
		this.deleteSource = settings.deleteSource;
		this.localOnly = settings.localOnly;
        this.init();
    }
	init() {
		function onlyUnique(value: string, index: number, self) {
			return self.indexOf(value) === index;
		}
		const paths = this.app.vault.getMarkdownFiles().map((file) => file.parent.path)
		var unique = paths.filter(onlyUnique);
		this.files = unique
	}

	getItems(): string[] {
		return this.files
	}

	getItemText(item: string): string {
		return item;
	}

	onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			return;
		}
		const relativePath = activeFile.parent.path;
		const shortPath = relativePath.split("/")[relativePath.split('/').length - 1];
		const sourcePath = path.join(this.app.vault.adapter.basePath, relativePath);
		const desinationPath = path.join(this.app.vault.adapter.basePath, item, relativePath);
		const shortDesinationPath = path.join(this.app.vault.adapter.basePath, item, shortPath);

		if (this.localOnly) {
			this.copyDirectory(sourcePath, shortDesinationPath)
		} else {
			this.copyDirectory(sourcePath, desinationPath)
		}
	}
	copyDirectory(source: string, destination: string) {
		if (!fs.existsSync(destination)) {
			fs.mkdirSync(destination, { recursive: true });
		}
		fs.mkdirSync(destination, { recursive: true });

		fs.readdirSync(source, { withFileTypes: true }).forEach((entry) => {
			let sourcePath = path.join(source, entry.name);
			let destinationPath = path.join(destination, entry.name);

			entry.isDirectory()
				? this.copyDirectory(sourcePath, destinationPath)
				: fs.copyFileSync(sourcePath, destinationPath);
		});
		if (this.deleteSource) {
			fs.rmdirSync(source, { recursive: true });
		}
	}
}
class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Move folder plugin.'});

		new Setting(containerEl)
			.setName('Delete source folder')
			.setDesc('Delete source folder')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.deleteSource).onChange((value) => {
					this.plugin.settings.deleteSource = value;
				}),
			);
		new Setting(containerEl)
			.setName('Local only')
			.setDesc('Set True if you do not want to move the parent in case of multiple nested location')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.localOnly).onChange((value) => {
					this.plugin.settings.deleteSource = value;
				}),
			);
	}
}
