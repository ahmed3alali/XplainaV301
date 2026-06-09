# Research Paper Word Generator

This folder generates **`Claripath_Research_Paper_APA.docx`** at the project root.

## Quick start

```bash
cd scripts
npm install          # first time only
npm run generate     # creates ../Claripath_Research_Paper_APA.docx
```

Or:

```bash
cd scripts
node generate_research_paper.js
```

## What you get

The script **does not** require you to copy paragraphs manually. It builds a complete Word document containing:

- Title page, Abstract, Table of Contents
- Sections 1–9 (Introduction through Conclusion)
- References (27 entries)
- List of Figures / List of Tables
- Appendices A (hyperparameters), B (API endpoints), C (notebook order)
- **8 formatted tables** with your project metrics

Open the `.docx` in **Microsoft Word**, **Google Docs** (upload), or **Pages**.

## Insert your figures

The paper references figures by number. Export PNGs from `figures/` and `HybridModel/figures/` (run `PROJECT_SUMMARY.ipynb` if missing), then in Word: **Insert → Pictures** at each `[Insert filename.png]` placeholder in the List of Figures section.

## Customize before generating

Edit `generate_research_paper.js`:

| Placeholder | Location |
|-------------|----------|
| `[Student Name(s)]` | Title page |
| `[University Name]` | Title page & header |
| `[Course Code]` | Title page |
| `[Course Supervisor Name]` | Title page |
| `[Date]` | Title page |

## Re-generate after edits

Change any paragraph or table in `generate_research_paper.js`, then run `npm run generate` again. The `.docx` is overwritten.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Cannot find module 'docx'` | Run `npm install` inside `scripts/` |
| `node: command not found` | Install Node.js from https://nodejs.org |
| TOC empty in Word | Right-click Table of Contents → **Update Field** |
