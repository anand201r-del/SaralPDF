"""Generate target-size landing pages (e.g. /compress-pdf-to-300kb/) from the main tool pages.

Run from the repo root after changing compress-pdf/ or compress-image/:
    python3 tools/gen_size_pages.py
Each page is the normal tool with the target size preset (window.SARAL_PAGE.kb).
"""
import json, re, html

SITE = "https://saralpdf.in"
PDF_SIZES = [100, 200, 300, 500, 1024, 2048]
IMG_SIZES = [10, 20, 50, 100, 200]


def label(kb):
    return f"{kb // 1024} MB" if kb >= 1024 else f"{kb} KB"


def slug(kb):
    return f"{kb // 1024}mb" if kb >= 1024 else f"{kb}kb"


def links(prefix, sizes, current=None):
    out = []
    for kb in sizes:
        cls = "chip on" if kb == current else "chip"
        out.append(f'<a class="{cls}" href="/{prefix}-to-{slug(kb)}/" data-noi18n>{label(kb)}</a>')
    return '<div class="size-links"><span class="help">Popular sizes:</span>' + "".join(out) + "</div>"


TOOLS = {
    "pdfcompress": {
        "base": "compress-pdf", "name": "Compress PDF", "sizes": PDF_SIZES,
        "title": "Compress PDF to {s} Online – Free, No Upload | SaralPDF",
        "desc": "Reduce PDF size to under {s} for online forms and email. SaralPDF finds the best quality that fits. Free, private, works on mobile.",
        "h1": "Compress PDF to {s}",
        "steps": ["Add your PDF.", "The size is already set to {s}. Change it if your form asks for a different limit.",
                  "For scanned text, tick black and white for even smaller files.", "Tap Compress PDFs, check the new size, and save."],
        "faq": [("How do I reduce a PDF to {s}?", "Add the PDF and tap Compress PDFs. SaralPDF tries different resolutions and qualities and keeps the sharpest version that is still under {s}."),
                ("Will my text still be selectable?", "No. Compressed pages are saved as images. This is ideal for scans and form uploads."),
                ("Is my PDF uploaded?", "No. Everything runs in your browser, so the file never leaves your device.")],
        "guide": ('/guides/reduce-pdf-size/', 'How to reduce PDF size for upload'),
    },
    "compress": {
        "base": "compress-image", "name": "Compress Image", "sizes": IMG_SIZES,
        "title": "Compress Image to {s} Online – JPG Photo Under {s} | SaralPDF",
        "desc": "Reduce photo or signature size to under {s} for exam and job forms. Best quality that fits, no upload, free.",
        "h1": "Compress image to {s}",
        "steps": ["Add your photos.", "The size is already set to {s}. Change it if your form asks for a different limit.",
                  "Pick JPG as the format for forms.", "Tap Compress images and save."],
        "faq": [("How do I compress a photo to {s}?", "Add the photo and tap Compress images. SaralPDF finds the best quality that fits under {s}, and makes the image smaller only if it has to."),
                ("My form also has a minimum size. What do I do?", "Tick “Make smaller files bigger to reach this size”, or use Exam Photo & Signature to set a KB range and exact pixels."),
                ("Is my photo uploaded?", "No. Everything runs in your browser, so the photo never leaves your device.")],
        "guide": ('/guides/compress-photo-to-20kb-50kb/', 'How to compress a photo to 20 KB or 50 KB for online forms'),
    },
}


def make(tool, kb):
    cfg = TOOLS[tool]
    s = label(kb)
    path = f"{cfg['base']}-to-{slug(kb)}"
    url = f"{SITE}/{path}/"
    src = open(f"{cfg['base']}/index.html", encoding="utf-8").read()
    f = lambda x: x.replace("{s}", s)
    title, desc = f(cfg["title"]), f(cfg["desc"])
    e = lambda x: html.escape(x, quote=True)

    src = re.sub(r"<title>.*?</title>", f"<title>{e(title)}</title>", src, count=1)
    src = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{e(desc)}">', src, count=1)
    src = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{e(title)}">', src, count=1)
    src = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{e(desc)}">', src, count=1)
    src = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', src, count=1)
    src = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">', src, count=1)

    faq = [(f(q), f(a)) for q, a in cfg["faq"]]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebApplication", "name": f"{f(cfg['h1'])} – SaralPDF", "url": url, "applicationCategory": "UtilitiesApplication",
         "operatingSystem": "Any", "offers": {"@type": "Offer", "price": "0", "priceCurrency": "INR"}, "description": desc},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": cfg["name"], "item": f"{SITE}/{cfg['base']}/"},
            {"@type": "ListItem", "position": 3, "name": s, "item": url}]}]}
    src = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">' + json.dumps(ld) + "</script>", src, count=1)

    src = re.sub(r'<nav class="crumbs" aria-label="Breadcrumb">.*?</nav>',
                 f'<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/{cfg["base"]}/">{cfg["name"]}</a><span>/</span><span data-noi18n>{s}</span></nav>', src, count=1)
    src = re.sub(r"<h1>.*?</h1>", f"<h1>{e(f(cfg['h1']))}</h1>", src, count=1)
    src = src.replace(f'window.SARAL_PAGE={{tool:"{tool}"}};', f'window.SARAL_PAGE={{tool:"{tool}",kb:{kb}}};')

    steps = "".join(f"<li>{e(f(x))}</li>" for x in cfg["steps"])
    qa = "".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in faq)
    info = (f'<section class="tool-info" data-tool-content="{tool}">\n'
            f'    <div><h2>How to use it</h2><ol>{steps}</ol>{links(cfg["base"], cfg["sizes"], kb)}'
            f'<p class="guide-link">Step-by-step guide: <a href="{cfg["guide"][0]}" data-noi18n>{cfg["guide"][1]}</a></p></div>\n'
            f'    <div><h2>Questions</h2>{qa}</div>\n  </section>')
    src = re.sub(r'<section class="tool-info" data-tool-content="%s">.*?</section>' % tool, lambda m: info, src, count=1, flags=re.S)

    import os
    os.makedirs(path, exist_ok=True)
    open(f"{path}/index.html", "w", encoding="utf-8").write(src)
    return path


# Hindi for the landing-page text, written into a marked block of assets/hi.js
HI = {
    "Compress PDF to {s}": "PDF को {s} में छोटा करें",
    "Compress image to {s}": "इमेज को {s} में छोटा करें",
    "The size is already set to {s}. Change it if your form asks for a different limit.": "साइज़ पहले से {s} पर सेट है। अगर फ़ॉर्म में अलग सीमा है तो इसे बदलें।",
    "How do I reduce a PDF to {s}?": "PDF को {s} का कैसे करें?",
    "Add the PDF and tap Compress PDFs. SaralPDF tries different resolutions and qualities and keeps the sharpest version that is still under {s}.": "PDF जोड़ें और “PDF छोटा करें” दबाएँ। SaralPDF अलग-अलग रिज़ॉल्यूशन और क्वालिटी आज़माकर वह सबसे साफ़ रूप रखता है जो {s} से कम हो।",
    "How do I compress a photo to {s}?": "फ़ोटो को {s} का कैसे करें?",
    "Add the photo and tap Compress images. SaralPDF finds the best quality that fits under {s}, and makes the image smaller only if it has to.": "फ़ोटो जोड़ें और “इमेज छोटी करें” दबाएँ। SaralPDF {s} के अंदर सबसे अच्छी क्वालिटी ढूँढता है, और ज़रूरत होने पर ही इमेज का आकार घटाता है।",
}
HI_FIXED = {
    "Is my PDF uploaded?": "क्या मेरी PDF अपलोड होती है?",
    "No. Everything runs in your browser, so the file never leaves your device.": "नहीं। सब कुछ आपके ब्राउज़र में चलता है, इसलिए फ़ाइल आपके डिवाइस से बाहर नहीं जाती।",
    "Is my photo uploaded?": "क्या मेरी फ़ोटो अपलोड होती है?",
    "No. Everything runs in your browser, so the photo never leaves your device.": "नहीं। सब कुछ आपके ब्राउज़र में चलता है, इसलिए फ़ोटो आपके डिवाइस से बाहर नहीं जाती।",
    "My form also has a minimum size. What do I do?": "मेरे फ़ॉर्म में न्यूनतम साइज़ भी है। क्या करूँ?",
    "Tick “Make smaller files bigger to reach this size”, or use Exam Photo & Signature to set a KB range and exact pixels.": "“छोटी फ़ाइलों का साइज़ बढ़ाकर इस साइज़ के पास लाएँ” पर टिक करें, या KB सीमा और सही पिक्सेल के लिए “परीक्षा फ़ोटो और हस्ताक्षर” टूल इस्तेमाल करें।",
    "Enter the size you need, like 300 KB or 1 MB, or tap one of the sizes. You can also choose a compression level instead.": "ज़रूरी साइज़ डालें, जैसे 300 KB या 1 MB, या किसी साइज़ पर टैप करें। चाहें तो कम्प्रेशन लेवल भी चुन सकते हैं।",
}


def write_hi():
    entries = dict(HI_FIXED)
    for cfg in TOOLS.values():
        texts = [cfg["h1"]] + cfg["steps"] + [x for qa in cfg["faq"] for x in qa]
        for kb in cfg["sizes"]:
            for en in texts:
                if en in HI:
                    entries[en.replace("{s}", label(kb))] = HI[en].replace("{s}", label(kb))
    start, end = "/* size pages: generated by tools/gen_size_pages.py */\n", "/* end size pages */\n"
    block = start + "".join(json.dumps(k, ensure_ascii=False) + ":" + json.dumps(v, ensure_ascii=False) + ",\n" for k, v in entries.items()) + end
    p = "assets/hi.js"
    src = open(p, encoding="utf-8").read()
    if start in src:
        src = src[:src.index(start)] + block + src[src.index(end) + len(end):]
    else:
        i = src.rindex("};")
        src = src[:i] + block + src[i:]
    open(p, "w", encoding="utf-8").write(src)


if __name__ == "__main__":
    for tool, cfg in TOOLS.items():
        for kb in cfg["sizes"]:
            print(make(tool, kb))
    write_hi()
