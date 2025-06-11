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
        this.bangsData = extension.bangsData;
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
        // Improved bang pattern matching to handle both with and without space
        const match = input.match(/^!(\S+)(?:\s+(.+))?$/);
        if (match) {
            const [_, bangKey, query = ''] = match;
            let url = `https://duckduckgo.com/?t=h_&q=!${bangKey}${query ? '+' + encodeURIComponent(query) : ''}`;
            const bang = this.bangsData.find(b => b.key === bangKey);
            if (bang) {
                url = bang.url.replace('{query}', encodeURIComponent(query || ''));
            }
            try {
                Gio.AppInfo.launch_default_for_uri(url, null);
            } catch (error) {
                console.error('Failed to launch bang URL:', error);
            }
        }
    }

    async getInitialResultSet(terms, cancellable) {
        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(() => reject(new Error('Search Cancelled')));
            
            const input = terms.join(' ');
            // Check if input starts with ! and has at least one character after it
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
            
            console.log(`BangsProvider getResultMetas called for results:`, results);
            
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
            
            console.log(`BangsProvider returning ${resultMetas.length} result metas`);
            
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
        this.searchEngineIcons = extension.searchEngineIcons;
        this.searchEngineUrls = extension.searchEngineUrls;
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
        const settings = this._extension.getSettings();
        const searchEngine = settings.get_int('search-engine');
        const input = terms.join(' ').trim();

        const urlRegex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/;
        let url = input;
        
        if (!urlRegex.test(url)) {
            // It's a search query, not a URL
            url = `${this.searchEngineUrls[searchEngine]}${encodeURIComponent(input)}`;
        } else if (!/^https?:\/\//.test(url)) {
            // It's a URL but missing protocol
            url = `https://${url}`;
        }

        // Use launch_default_for_uri
        try {
            Gio.AppInfo.launch_default_for_uri(url, null);
        } catch (error) {
            console.error('Failed to launch URL:', error);
        }
    }

    async getInitialResultSet(terms, cancellable) {
        return new Promise((resolve, reject) => {
            const cancelledId = cancellable.connect(() => reject(new Error('Search Cancelled')));
            
            const input = terms.join(' ').trim();
            console.log(`WebSearchProvider getInitialResultSet called with: "${input}"`);
            
            // Don't show Web Search suggestion if input is empty or is a bang (!something)
            const results = (input === '' || input.startsWith('!')) ? [] : ['web-search'];
            console.log(`WebSearchProvider returning results:`, results);
            
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
            
            const settings = this._extension.getSettings();
            const searchEngine = settings.get_int('search-engine');
            const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);
            
            console.log(`WebSearchProvider getResultMetas called for results:`, results);
            console.log(`Using search engine index: ${searchEngine}`);
            
            // Use a fallback icon if the specific one isn't available
            let webIcon;
            try {
                const iconPath = `${this._extension.path}/${this.searchEngineIcons[searchEngine] || 'duckduckgo.png'}`;
                webIcon = Gio.icon_new_for_string(iconPath);
            } catch (error) {
                console.warn('Failed to load search engine icon, using fallback:', error);
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
            
            console.log(`WebSearchProvider returning ${resultMetas.length} result metas`);
            
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
        this._settings = null;
    }

    _setSearchEngines() {
        const file = this.dir.get_child('search-engines.json');
        try {
            const [, contents] = file.load_contents(null);
            const json = JSON.parse(new TextDecoder().decode(contents));
            this.searchEngineUrls = json.map(d => d.url);
            this.searchEngineIcons = json.map(d => d.icon);
            console.log('Loaded search engines:', this.searchEngineUrls);
        } catch (error) {
            console.error('Failed to load search engines:', error);
            // Set default values
            this.searchEngineUrls = ['https://duckduckgo.com/?q='];
            this.searchEngineIcons = ['duckduckgo.png'];
            console.log('Using default search engines:', this.searchEngineUrls);
        }
    }

    _loadBangs() {
        const bangsFile = Gio.File.new_for_path(`${GLib.get_user_config_dir()}/bangs.json`);
        try {
            const [, contents] = bangsFile.load_contents(null);
            this.bangsData = JSON.parse(new TextDecoder().decode(contents));
        } catch (error) {
            console.debug('No bangs file found or failed to parse:', error);
            this.bangsData = [];
        }
    }

    enable() {
        console.log('DuckDuckBang extension enabling...');
        
        this._setSearchEngines();
        this._loadBangs();

        const webProvider = new WebSearchProvider(this);
        const bangsProvider = new BangsProvider(this);

        this._providers.push(webProvider, bangsProvider);

        for (const provider of this._providers) {
            console.log(`Adding provider: ${provider.id}`);
            Main.overview.searchController.addProvider(provider);
        }
        
        console.log('DuckDuckBang extension enabled');
    }

    disable() {
        console.log('DuckDuckBang extension disabling...');
        
        for (const provider of this._providers) {
            console.log(`Removing provider: ${provider.id}`);
            Main.overview.searchController.removeProvider(provider);
        }

        this._providers = [];
        this.searchEngineUrls = [];
        this.searchEngineIcons = [];
        this.bangsData = [];
        this._settings = null;
        
        console.log('DuckDuckBang extension disabled');
    }
}