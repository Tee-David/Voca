# Compatibility

Voca targets modern web browsers, installable PWA environments and Android through Capacitor. Exact supported versions will be frozen for the first public release only after candidate testing.

## Web

The reader depends on modern browser capabilities used by Next.js, Web Workers, WebAssembly/ONNX execution, IndexedDB and media playback. Contributors should avoid introducing browser-specific APIs without a fallback or explicit compatibility decision.

## PWA

Offline behavior depends on browser storage and service-worker support. Installed PWA behavior should be tested separately from an ordinary browser tab because lifecycle and storage behavior can differ.

## Android

Android packages the web application with Capacitor and adds native storage/filesystem/network capabilities. Public builds must remain reproducible without the maintainer's signing material. Device memory and WebView behavior should be considered when changing TTS, document rendering or caches.

## Documents

Supported formats are PDF, EPUB, DOCX and TXT, but real-world files vary substantially. "Supported" means Voca has an ingestion path for the format, not that every malformed, encrypted, DRM-protected or unusually structured file is guaranteed to render perfectly.

Scanned PDFs can require OCR and therefore have different performance and accuracy characteristics from text PDFs.

## Release matrix

Before the first public release, record the browsers/versions and Android versions actually tested against the release candidate. Do not claim a broad compatibility range solely because the framework supports it in theory.