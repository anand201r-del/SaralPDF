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
| Enhance Quality | Photos: auto contrast, colour boost and sharpening. Documents and PDFs: removes shadows, whitens paper, darkens text, with colour, grayscale or black-and-white output |
| Remove Background | AI cut-out to transparent PNG, or onto white / a custom colour as JPG |

Shared features: drag-and-drop, file picker, paste with Ctrl+V, batch processing, thumbnails, drag-to-reorder (plus arrow buttons for phones), file type and 50 MB size checks, progress bar, before/after sizes, ZIP download, mobile layout, light and dark themes.

## Run it locally

The site is a single `index.html` file. Open a terminal in this folder and start a local server:

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
- **JSZip** packages several results into one download.
- **@imgly/background-removal** runs an ONNX segmentation model (IS-Net) in the browser with WebAssembly. The model (about 40 MB, or about 80 MB for the higher-quality model) downloads once and is cached by the browser.

## Known limits

- Compress PDF saves each page as an image, so text is no longer selectable. Text-preserving compression needs a server tool such as Ghostscript.
- iPhone HEIC photos are not supported yet. Export them as JPG first.
- Password-protected PDFs are detected and skipped with a message.

## Roadmap

- Split, rotate and delete PDF pages; crop; format converter (JPG ↔ PNG ↔ WebP)
- Exam photo and signature presets (SSC, UPSC, IBPS, NEET, JEE, UGC NET)
- Backend for Word ↔ PDF (LibreOffice) and Ghostscript compression
- OCR, tool chaining, Web Workers, PWA offline support
