# Third-Party Licensing Audit

This file tracks licensing evidence that must be verified before Voca's source license is finalized.

## Verified TTS chain

The release-preparation branch uses `kokoro-js` **1.2.1** and the worker loads the exact runtime model identifier `onnx-community/Kokoro-82M-v1.0-ONNX` with q8/WASM execution.

Public upstream evidence checked during the audit:

- npm identifies `kokoro-js` 1.2.1 as **Apache-2.0** and points to the Hexgrad Kokoro repository.
- the exact ONNX model repository `onnx-community/Kokoro-82M-v1.0-ONNX` declares **Apache-2.0** and identifies `hexgrad/Kokoro-82M` as its base model.
- the upstream `hexgrad/Kokoro-82M` model card declares **Apache-2.0** for the model/weights.

Voca does not currently commit these model weights into the repository; the browser runtime fetches/caches the model through the upstream model identifier. Preserve required Apache notices when distribution mechanics require them and re-check the exact model revision used by the release candidate.

## Audit table

| Component | Role | Bundled/redistributed? | License evidence | Release status |
| --- | --- | --- | --- | --- |
| `kokoro-js` 1.2.1 | Local TTS runtime | npm dependency | npm package metadata: Apache-2.0 | Verified |
| `onnx-community/Kokoro-82M-v1.0-ONNX` | Exact browser TTS model used by worker | Runtime fetch/cache, not committed weights | Exact model repository: Apache-2.0; base model `hexgrad/Kokoro-82M` | Verified, re-check revision at RC |
| `hexgrad/Kokoro-82M` | Base speech model/weights | Upstream model | Model card: Apache-2.0 | Verified |
| `pdfjs-dist` | PDF parsing/rendering | npm dependency | Verify package/upstream license | Pending |
| `epubjs` | EPUB support | npm dependency | Verify package/upstream license | Pending |
| `mammoth` | DOCX extraction | npm dependency | Verify package/upstream license | Pending |
| `tesseract.js` | OCR | npm dependency | Verify package/upstream license | Pending |
| `pdf-lib` | PDF generation/annotation | npm dependency | Verify package/upstream license | Pending |
| Fonts | UI/document rendering | Google fonts loaded through `next/font` | Bricolage Grotesque and Outfit exact font licensing/notice requirements still to verify | Pending |
| Product logo/icons | Product/UI assets | Bundled | Repository contains Voca authoring SVGs and generated PNGs; provenance/ownership confirmation still required | Blocking if ownership cannot be confirmed |
| Framework starter SVGs | Unused/default public assets | Bundled in source | `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` should be removed from the clean candidate unless actually needed | Remove from candidate |
| `image.png`, `image copy.png` | Public raster assets | Bundled | Purpose/provenance not established by source inspection | Blocking until removed or provenance confirmed |
| Sample/test documents | Tests/examples | Inspect repository fixtures | Original, licensed, synthetic or public domain only | Blocking if any are included |
| Android artwork | App icon/splash | Generated from `frontend/assets/_*.svg` authoring sources | Ownership/provenance confirmation still required | Pending |

## Audit procedure

For every redistributed component, record the exact upstream project/model, version or revision, license identifier, copyright/notice requirements and whether the material is merely fetched at runtime or copied into Voca's repository/distribution.

Do not rely on a similarly named model or package. The evidence must correspond to the exact artifact used by the release candidate.

## Application license decision

The TTS chain no longer blocks selection by itself because the exact runtime and model path used by Voca has Apache-2.0 evidence. Application licensing remains blocked on the rest of the dependency/asset audit, especially bundled artwork and unexplained raster assets.

Where model terms differ from application source terms, document them separately and make that distinction obvious to users.