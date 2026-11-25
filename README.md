# NebulaOS

NebulaOS is a desktop operating system that runs in the browser. It is a static site: open `index.html`, or serve the repository root. GitHub Pages hosts it from the site root at [kansop.github.io/nebula-os](https://kansop.github.io/nebula-os/). Paths are relative so the `/nebula-os/` subpath works.

```bash
npm test
```

The test command runs headless checks for the virtual disk, the shell, the calculator, and the game rules. No build step is required.

Files, notes, drawings, and settings stay in this browser profile (IndexedDB and localStorage). There is no server behind the apps. Each user has a separate disk. Sheets, Writer, Slides, Board, Mail, Contacts, Markdown, Documents, Archive, Clipboard, and the App Store are part of the desktop.
