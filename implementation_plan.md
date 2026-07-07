# Filename Maker - Implementation Plan

A browser-based utility tool to design custom file naming templates, dynamically render forms based on those templates, and batch-rename local files entirely in-browser.

---

## User Review Required

> [!IMPORTANT]
> **State Sharing & Browser Support**: 
> Templates are persisted in `localStorage` and shared via compressed URL hashes (using `lzma-js` or simple base64 JSON). Because there is no backend database, large dropdown menus or schemas may result in very long URLs. We will enforce a sensible configuration size limit (e.g., 2KB) to ensure compatibility with all browsers.

> [!NOTE]
> **File Download Method**:
> For batch file renaming, files will be renamed in-memory and downloaded individually in sequence, or zipped in-browser using a client-side zip library (e.g., [JSZip](https://stuk.github.io/jszip/)). Sequential downloads are dependency-free but might prompt multiple-download permissions in the browser. Zipping provides a single download but introduces a lightweight dependency. We plan to support **sequential downloads** by default, with a fallback to download a ZIP if JSZip is loaded.

---

## Agreed Design Details

### 1. Bundled Default Templates
We will pre-load three default templates in [TemplateStore.js](file:///Users/ryan/Sites/filenameMaker/js/modules/TemplateStore.js) so they are immediately available to the user upon initial load:
- **Media Asset Naming**: `[Date Created]_[Project Code]_[Description]_[Counter]` (e.g. `20260707_PRJ101_PromoShot_01.png`)
- **Academic Papers**: `[Author]_[Year]_[Paper Title]` (e.g. `Smith_2024_NeuralNetworks.pdf`)
- **Invoices / Receipts**: `[Date]_[Vendor]_[Invoice Number]` (e.g. `2026-07-07_Google_INV-98765.pdf`)

The user can choose these from a dropdown menu/picker in the Builder view, reset to default, or customize them further.

### 2. macOS-Style Counter Management
For the incrementing counter field:
- A template config will define the counter field's structural details (e.g., number of digits/padding like `01`, `001`, `0001`).
- In the **Preview & Rename** panel, if a template contains a counter field, we will render a form input: **"Start counter at: [ 1 ]"**.
- This allows the user to dynamically adjust the starting value of the sequence before running a batch rename.
- When renaming multiple files in the drag-and-drop batch list, the counter will increment sequentially starting from this value for each file (e.g. File 1: `01`, File 2: `02`, etc.).

---


## Proposed Changes

### Configuration Schema Definition

We will define a naming template configuration as a JSON structure:
```json
{
  "name": "Project Deliverables",
  "separator": "_",
  "case": "snake", 
  "fields": [
    { "id": "f1", "type": "select", "label": "Department", "options": ["ENG", "DESIGN", "PM", "MKT"] },
    { "id": "f2", "type": "text", "label": "Project Code", "placeholder": "PRJ101" },
    { "id": "f3", "type": "date", "label": "Date Created", "format": "YYYYMMDD" },
    { "id": "f4", "type": "counter", "label": "Version", "digits": 2, "start": 1 }
  ]
}
```

---

### Core Structure

We will implement the code across modular JavaScript files under `js/modules/` and aggregate them in the main script.

#### [NEW] [TemplateStore.js](file:///Users/ryan/Sites/filenameMaker/js/modules/TemplateStore.js)
Handles saving/loading configurations to/from `localStorage`, serializing configurations into compressed URL hash patterns, and exporting/importing JSON configuration files.

#### [NEW] [TemplateBuilder.js](file:///Users/ryan/Sites/filenameMaker/js/modules/TemplateBuilder.js)
Manages the UI editor for building templates (adding/removing fields, editing options, choosing separators, ordering fields via drag-and-drop or order arrows).

#### [NEW] [NamerForm.js](file:///Users/ryan/Sites/filenameMaker/js/modules/NamerForm.js)
Dynamically renders input form elements based on the active template schema, handles live validations, and displays a real-time copyable filename preview.

#### [NEW] [FileRenamer.js](file:///Users/ryan/Sites/filenameMaker/js/modules/FileRenamer.js)
Handles the drag-and-drop zone, maps local files to their newly formatted names, and triggers local downloads.

#### [MODIFY] [style.css](file:///Users/ryan/Sites/filenameMaker/css/style.css)
Add form layouts, panel UI components, dynamic builder list styles, and drag-and-drop visual states.

#### [MODIFY] [app.js](file:///Users/ryan/Sites/filenameMaker/js/app.js)
Orchestrates events, initializes modules, and boots the application.

---

## Verification Plan

### Manual Verification
- **Template Persistence**: Build a template, reload the page, and verify the template configuration persists.
- **URL Synchronization**: Share a compiled template link (with hash parameters) in a separate tab or incognito browser and verify the builder loads the shared configuration.
- **Form Generation**: Modify template fields (add/edit dropdowns, toggle date formats) and verify the active form adjusts in real-time.
- **File Renaming**: Drag three files into the rename drop-zone, fill out the form fields, and click "Rename & Download". Verify files download with correct concatenated names.
- **Responsive Checks**: Test the layout on a mobile screen size to confirm the grid collapses gracefully.
