# DuckDuckBang: GNOME Shell Quick Web Search with !Bangs

<img src="bang.png" alt="DuckDuckBang Logo" width="200"/>

DuckDuckBang is a GNOME Shell extension that combines Quick Web Search and !Bangs into one icon in the overview menu. It supports:

* [**!Bangs**](https://github.com/suvanbanerjee/gnome-bangs): allows you to quickly search using !bangs from your GNOME search. Also allows you to set custom bangs (e.g., `!w GNOME` for Wikipedia, `!yt cats` for YouTube).
* [**Quick Web Search**](https://gitlab.com/chet-buddy/quick-web-search): Quickly browse the web through Gnome Shell. Simply press the Super key, enter your search and select "Web Search". Your search will appear in your default browser and selected search engine.

---

## Usage

* Press the **Super** (Windows) key to open the GNOME overview search.
* To use a bang search, type `!` followed by the bang command and your query. For example:

  * `!w GNOME`: search Wikipedia
  * `!yt cute cats`: search YouTube
* For a regular web search, just type your query (without a bang) and select **Web Search** from the results.
* Select the result or press Enter to open the browser with your search.

---

## Installation

1. Clone or download this repository to your GNOME Shell extensions folder:

```bash
git clone https://github.com/merijnvervoorn/DuckDuckBang.git ~/.local/share/gnome-shell/extensions/duckduckbang@merijn
```

2. Restart GNOME Shell (press `Alt+F2`, type `r`, and press Enter) or log out and log back in.

3. Enable the extension via **GNOME Extensions** app or [extensions.gnome.org](https://extensions.gnome.org/).

---

## Configuration

* Open the extension settings to choose your preferred search engine.
* To add or modify bang commands, edit the `bangs.json` file located at:

```
~/.config/bangs.json
```

* To add more search engines, edit the `search-engines.json` file inside the extension folder:

```
~/.local/share/gnome-shell/extensions/duckduckbang@merijn/search-engines.json
```

---

## Screenshots

![bangs-search](https://github.com/user-attachments/assets/c5a33fa2-2efc-41c2-b152-9ef8f052de72)

*Search using bangs from the GNOME Shell search.*

![web-search](https://github.com/user-attachments/assets/a9456623-3a24-4223-8103-14e6d63cc001)

*Regular web search result launching your browser.*

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

