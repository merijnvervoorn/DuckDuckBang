/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

class BangsProvider {
    constructor(extension) {
        this._extension = extension;
    }

    get id() {
        return this._extension.uuid + '-bangs';
    }

    get appInfo() {
        return null;
    }

    get canLaunchSearch() {
        return false;
    }

    activateResult(result, terms) {
        const input = terms.join(' ');
        const match = input.match(/^!(\S+)(?:\s+(.+))?$/);
        if (match) {
            const [_, bangKey, query = ''] = match;
            let url = `https://duckduckgo.com/?t=h_&q=!${bangKey}${query ? '+' + encodeURIComponent(query) : ''}`;
            
            const bang = this._extension.bangsData.find(b => b.key === bangKey);
            if (bang) {
                url = bang.url.replace('{query}', encodeURIComponent(query || ''));
            }
            try {
                Gio.AppInfo.launch_default_for_uri(url, null);
            } catch (error) {
                console.error(`DuckDuckBang: Failed to launch URL ${url}: ${error.message}`);
            }
        }
    }

    async getInitialResultSet(terms, cancellable) {
        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(() => reject(new Error('Search Cancelled')));
            
            const input = terms.join(' ');
            const hasBang = input.startsWith('!') && input.length > 1;
            const results = hasBang ? ['bang-search'] : [];
            
            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled()) {
                resolve(results);
            }
        });
    }

    async getSubsearchResultSet(results, terms, cancellable) {
        return this.getInitialResultSet(terms, cancellable);
    }

    filterResults(results, maxResults) {
        return results.slice(0, maxResults);
    }

    async getResultMetas(results, cancellable) {
        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(() => reject(new Error('Operation Cancelled')));
            
            const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);
            const bangIcon = Gio.icon_new_for_string(`${this._extension.path}/bang.png`);
            
            const resultMetas = results.map(() => ({
                id: 'bang-search',
                name: 'Bangs Search',
                description: 'Use a bang (!bang) to search specific services',
                createIcon: size => new St.Icon({
                    gicon: bangIcon,
                    width: size * scaleFactor,
                    height: size * scaleFactor,
                }),
            }));
            
            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled()) {
                resolve(resultMetas);
            }
        });
    }

    createResultObject(meta) {
        return null;
    }

    launchSearch(terms) {
        // Not implemented
    }
}

class WebSearchProvider {
    constructor(extension) {
        this._extension = extension;
    }

    get id() {
        return this._extension.uuid + '-websearch';
    }

    get appInfo() {
        return null;
    }

    get canLaunchSearch() {
        return false;
    }

    activateResult(result, terms) {
        const settings = this._extension.settings;
        if (!settings) {
            console.error('DuckDuckBang: Settings object is not initialized.');
            return;
        }

        const searchEngine = settings.get_int('search-engine');
        const input = terms.join(' ').trim();

        const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/;
        let url = input;
        
        if (!urlRegex.test(url)) {
            const baseUrl = this._extension.searchEngineUrls[searchEngine] || 'https://duckduckgo.com/?q=';
            url = `${baseUrl}${encodeURIComponent(input)}`;
        } else if (!/^https?:\/\//.test(url)) {
            url = `https://${url}`;
        }

        try {
            Gio.AppInfo.launch_default_for_uri(url, null);
        } catch (error) {
            console.error(`DuckDuckBang: Failed to launch URL ${url}: ${error.message}`);
        }
    }

    async getInitialResultSet(terms, cancellable) {
        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(() => reject(new Error('Search Cancelled')));
            
            const input = terms.join(' ').trim();
            const results = (input === '' || input.startsWith('!')) ? [] : ['web-search'];

            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled()) {
                resolve(results);
            }
        });
    }

    async getSubsearchResultSet(results, terms, cancellable) {
        return this.getInitialResultSet(terms, cancellable);
    }

    filterResults(results, maxResults) {
        return results.slice(0, maxResults);
    }

    async getResultMetas(results, cancellable) {
        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(() => reject(new Error('Operation Cancelled')));
            
            const settings = this._extension.settings;
            const searchEngine = settings ? settings.get_int('search-engine') : 0;
            const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);
            
            let webIcon;
            try {
                const iconName = this._extension.searchEngineIcons[searchEngine] || 'duckduckgo.png';
                const iconPath = `${this._extension.path}/${iconName}`;
                webIcon = Gio.icon_new_for_string(iconPath);
            } catch (error) {
                webIcon = Gio.ThemedIcon.new('web-browser-symbolic');
            }

            const resultMetas = results.map(id => ({
                id,
                name: 'Web Search',
                description: 'Search the web',
                createIcon: size => new St.Icon({
                    gicon: webIcon,
                    width: size * scaleFactor,
                    height: size * scaleFactor,
                }),
            }));
            
            cancellable.disconnect(cancelledId);
            if (!cancellable.is_cancelled()) {
                resolve(resultMetas);
            }
        });
    }

    createResultObject(meta) {
        return null;
    }

    launchSearch(terms) {
        // Not implemented
    }
}

export default class DuckDuckBang extends Extension {
    constructor(meta) {
        super(meta);
        this._providers = [];
        this.searchEngineUrls = [];
        this.searchEngineIcons = [];
        this.bangsData = [];
        this.settings = null;
    }

    async _setSearchEngines() {
        const file = this.dir.get_child('search-engines.json');
        try {
            const contents = await new Promise((resolve, reject) => {
                file.load_contents_async(null, (file, result) => {
                    try {
                        const [, contentsFinish] = file.load_contents_finish(result);
                        resolve(contentsFinish);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            const json = JSON.parse(new TextDecoder().decode(contents));
            this.searchEngineUrls = json.map(d => d.url);
            this.searchEngineIcons = json.map(d => d.icon);
        } catch (error) {
            console.warn(`DuckDuckBang: Failed to load search-engines.json, using defaults. Error: ${error.message}`);
            this.searchEngineUrls = ['https://duckduckgo.com/?q='];
            this.searchEngineIcons = ['duckduckgo.png'];
        }
    }

    async _loadBangs() {
        const bangsFile = Gio.File.new_for_path(`${GLib.get_user_config_dir()}/bangs.json`);
        try {
            const contents = await new Promise((resolve, reject) => {
                bangsFile.load_contents_async(null, (file, result) => {
                    try {
                        const [, contentsFinish] = bangsFile.load_contents_finish(result);
                        resolve(contentsFinish);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            this.bangsData = JSON.parse(new TextDecoder().decode(contents));
        } catch (error) {
            console.info(`DuckDuckBang: Custom bangs file not found or unreadable at ~/.config/bangs.json. Using empty array.`);
            this.bangsData = [];
        }
    }

    enable() {
        this.settings = this.getSettings();
        
        this._setSearchEngines();
        this._loadBangs();

        const webProvider = new WebSearchProvider(this);
        const bangsProvider = new BangsProvider(this);

        this._providers.push(webProvider, bangsProvider);

        for (const provider of this._providers) {
            Main.overview.searchController.addProvider(provider);
        }
    }

    disable() {
        for (const provider of this._providers) {
            Main.overview.searchController.removeProvider(provider);
        }

        this._providers = [];
        this.searchEngineUrls = [];
        this.searchEngineIcons = [];
        this.bangsData = [];
        this.settings = null;
    }
}