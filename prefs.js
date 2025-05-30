import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CombinedPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        window.add(page);

        // --- Search Engine Selector ---
        const searchGroup = new Adw.PreferencesGroup({
            title: _('Search Engine'),
            description: _('Choose your default search engine.'),
        });
        page.add(searchGroup);

        const searchEngineFile = this.dir.get_child('search-engines.json');
        const [, contents] = searchEngineFile.load_contents(null);
        const decoder = new TextDecoder();
        const json = JSON.parse(decoder.decode(contents));
        const searchEngineNames = json.map(d => d.name);

        const list = new Gtk.StringList();
        searchEngineNames.forEach(d => list.append(d));

        const dropdown = new Adw.ComboRow({
            title: _('Search engine'),
            model: list,
            selected: settings.get_enum('search-engine'),
        });

        settings.bind('search-engine', dropdown, 'selected', Gio.SettingsBindFlags.DEFAULT);
        searchGroup.add(dropdown);

        // --- Custom Bangs Management ---
        const bangsGroup = new Adw.PreferencesGroup({
            title: _('Custom Bangs'),
            description: _('Add or modify custom bangs. Ensure URLs include "{query}".'),
        });
        page.add(bangsGroup);

        let bangs = this._loadBangsFromFile();
        const addBangRow = (bang, index) => {
            const keyEntry = new Gtk.Entry({
                placeholder_text: _('Bang Key (e.g., g)'),
                hexpand: true,
            });

            const urlEntry = new Gtk.Entry({
                placeholder_text: _('URL (e.g., https://google.com/search?q={query})'),
                hexpand: true,
            });

            keyEntry.text = bang?.key || '';
            urlEntry.text = bang?.url || '';

            keyEntry.connect('changed', () => this._onBangChanged(bangs, index, keyEntry, urlEntry));
            urlEntry.connect('changed', () => this._onBangChanged(bangs, index, keyEntry, urlEntry));

            const deleteButton = new Gtk.Button({ label: _('Delete') });
            deleteButton.connect('clicked', () => {
                bangs.splice(index, 1);
                this._saveBangsToFile(bangs);
                bangsGroup.remove(row);
            });

            const row = new Adw.ActionRow();
            row.add_prefix(keyEntry);
            row.add_suffix(urlEntry);
            row.add_suffix(deleteButton);

            bangsGroup.add(row);
        };

        bangs.forEach((bang, index) => addBangRow(bang, index));

        const addButton = new Gtk.Button({ label: _('Add Bang') });
        addButton.connect('clicked', () => {
            const newBang = { key: '', url: '' };
            bangs.push(newBang);
            addBangRow(newBang, bangs.length - 1);
        });

        const addBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            margin_top: 20,
            margin_bottom: 20,
            halign: Gtk.Align.CENTER,
        });
        addBox.append(addButton);

        const addGroup = new Adw.PreferencesGroup();
        addGroup.add(addBox);
        const restartLabel = new Gtk.Label({
            label: _('To apply changes, restart GNOME Shell.'),
            halign: Gtk.Align.CENTER,
            margin_top: 10,
        });
        addGroup.add(restartLabel);
        page.add(addGroup);

        // Retain settings
        window._settings = settings;
    }

    _onBangChanged(bangs, index, keyEntry, urlEntry) {
        bangs[index] = {
            key: keyEntry.text,
            url: urlEntry.text,
        };
        this._validateAndSave(bangs);
    }

    _saveBangsToFile(bangs) {
        const validatedBangs = bangs.filter(
            (bang) =>
                bang.key &&
                bang.url.includes('{query}') &&
                bang.url.startsWith('http')
        );

        const file = Gio.File.new_for_path(`${GLib.get_user_config_dir()}/bangs.json`);
        file.replace_contents(JSON.stringify(validatedBangs, null, 2), null, false, Gio.FileCreateFlags.NONE, null);
        console.log(_('Custom bangs saved.'));
    }

    _validateAndSave(bangs) {
        this._saveBangsToFile(bangs);
    }

    _loadBangsFromFile() {
        const file = Gio.File.new_for_path(`${GLib.get_user_config_dir()}/bangs.json`);
        if (file.query_exists(null)) {
            const [, contents] = file.load_contents(null);
            return JSON.parse(new TextDecoder().decode(contents));
        } else {
            file.create(Gio.FileCreateFlags.NONE, null);
            return [];
        }
    }
}
