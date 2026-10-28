# SaralPDF

Simple PDF and image tools that run entirely in the browser. Files are processed on the user's device and are never uploaded to a server.

## Tools

| Tool | What it does |
|---|---|
| Image to PDF | Combine JPG/PNG/WebP images into one PDF (A4, Letter, Legal or image size; auto orientation; margins) |
| PDF to Image | Export PDF pages as JPG or PNG at 72/150/300 DPI, with page ranges like `1-3, 5` |
| Merge PDF | Join several PDFs in a chosen order |
| Compress PDF | Shrink scanned or image-heavy PDFs (three levels, optional black and white) |
| Compress Image | Reduce by quality, or to an exact size limit such as 20 KB / 50 KB / 100 KB for exam forms |
| Resize Image | Resize by pixels (with aspect-ratio lock) or by percentage |
| Crop Image | Drag-to-crop with free, square, passport (3.5 × 4.5 cm), signature and other ratios; rotate and flip |
| Exam Photo & Signature | One-step presets for IBPS, SSC, NEET and UPSC: crop, exact pixel size, and KB range (pads tiny files up to the minimum) |
| Convert Image | iPhone HEIC to JPG, and JPG ↔ PNG ↔ WebP |
| Enhance Quality | Photos: auto contrast, colour boost and sharpening. Documents and PDFs: removes shadows, whitens paper, darkens text, with colour, grayscale or black-and-white output |
| Remove Background | AI cut-out to transparent PNG, or onto white / a custom colour as JPG |

Shared features: searchable tool directory, continue-with-this-file chaining between tools, English / Hindi switch, a separate page for every tool, iPhone HEIC support in all image tools, drag-and-drop, file picker, paste with Ctrl+V, batch processing, thumbnails, drag-to-reorder (plus arrow buttons for phones), file type and 50 MB size checks, progress bar, before/after sizes, ZIP download, mobile layout, light and dark themes.

## Architecture

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for diagrams of the system, page model, processing pipelines, key algorithms, the Hindi language switch and deployment.

## Project structure

- `index.html` plus one folder per tool (`compress-image/`, `merge-pdf/`, …): each page has its own title, description, how-to and FAQ for Google.
- `assets/app.js`, `assets/app.css`: the app shared by every tool page.
- `assets/i18n-core.js`, `assets/hi.js`: the language switch and Hindi translations (English text is the key).
- `assets/ui.js`: tools menu, home search and feedback dialog.
- `guides/`, `about/`, `privacy/`, `terms/`, `contact/`: content pages using `assets/site.css`.
- `sitemap.xml`, `robots.txt`, icons and `site.webmanifest`.

## Run it locally

The site is plain HTML, CSS and JavaScript with no build step. Open a terminal in this folder and start a local server:

```bash
python -m http.server 8000
```

Then open http://localhost:8000 in Chrome or Edge.

A local server is recommended instead of double-clicking the file, because the background remover downloads its AI model and some browsers restrict that on `file://` pages.

## Deploy free on GitHub Pages

1. Create a new repository, for example `saralpdf`, and upload `index.html` and `README.md`.
2. Go to **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.
3. After a minute the site is live at `https://<your-username>.github.io/saralpdf/`.

## How it works

- **pdf-lib** builds and merges PDFs.
- **PDF.js** renders PDF pages to canvas for thumbnails, PDF to Image, and Compress PDF.
- **Canvas API** re-encodes images for compression and resizing. A binary search on JPEG quality, with step-down scaling, hits exact KB targets. Re-encoding also strips EXIF and GPS metadata.
- **Enhance** uses pure pixel processing with no AI: percentile-based contrast stretching, saturation, a Laplacian sharpen kernel, and for documents a background estimate (downscale, max-filter, upscale) that the page is divided by to remove shadows, then Otsu thresholding for black and white.
- **heic2any** decodes iPhone HEIC photos in browsers that can't open them natively (loaded only when needed).
- **Exam presets** binary-search JPEG quality at the exact pixel size, and add JPEG comment padding when a file is below the form's minimum KB.
- **JSZip** packages several results into one download.
- **@imgly/background-removal** runs an ONNX segmentation model (IS-Net) in the browser with WebAssembly. The model (about 40 MB, or about 80 MB for the higher-quality model) downloads once and is cached by the browser.

## Known limits

- Compress PDF saves each page as an image, so text is no longer selectable. Text-preserving compression needs a server tool such as Ghostscript.
- Exam presets were checked in October 2026; users should always confirm against the latest official notification.
- Password-protected PDFs are detected and skipped with a message.

## Roadmap

- Split, rotate and delete PDF pages; crop; format converter (JPG ↔ PNG ↔ WebP)
- Exam photo and signature presets (SSC, UPSC, IBPS, NEET, JEE, UGC NET)
- Backend for Word ↔ PDF (LibreOffice) and Ghostscript compression
- OCR, tool chaining, Web Workers, PWA offline support
