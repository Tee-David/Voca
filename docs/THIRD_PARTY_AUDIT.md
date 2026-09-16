# Third-Party Licensing Audit

This file tracks licensing evidence that must be verified before Voca's source license is finalized.

## Verified TTS chain

The release-preparation branch uses `kokoro-js` **1.2.1** and the worker loads the runtime model identifier `onnx-community/Kokoro-82M-v1.0-ONNX` with q8/WASM execution.

Public upstream evidence checked during the audit:

- `kokoro-js` identifies its source distribution as Apache-2.0.
- the ONNX Kokoro model used by the browser runtime identifies the Kokoro base model and is distributed under Apache-2.0 terms.
- the upstream `hexgrad/Kokoro-82M` model card explicitly declares Apache-2.0 and describes the weights as Apache licensed.

Voca does not commit Kokoro model weights into this repository. The browser runtime fetches and caches the model separately. Keep the model identifier explicit and re-check the exact revision at each release candidate.

## Dependency and asset audit

| Component | Role | Distribution | License status |
| --- | --- | --- | --- |
| `kokoro-js` 1.2.1 | Local TTS runtime | npm dependency | Apache-2.0 verified |
| `onnx-community/Kokoro-82M-v1.0-ONNX` | Browser TTS model | Runtime fetch/cache | Apache-2.0 evidence verified; pin/re-check at RC |
| `hexgrad/Kokoro-82M` | Base speech model/weights | Upstream model | Apache-2.0 verified |
| `pdfjs-dist` | PDF parsing/rendering | npm dependency | Upstream/package license must remain represented in dependency notices |
| `epubjs` | EPUB support | npm dependency | Upstream/package license must remain represented in dependency notices |
| `mammoth` | DOCX extraction | npm dependency | Upstream/package license must remain represented in dependency notices |
| `tesseract.js` | OCR | npm dependency | Upstream/package license must remain represented in dependency notices |
| `pdf-lib` | PDF generation/annotation | npm dependency | Upstream/package license must remain represented in dependency notices |
| Bricolage Grotesque / Outfit | UI fonts | Loaded using `next/font`; not copied into source | Verify generated distribution notice requirements at RC |
| Voca logo and Android artwork | Product artwork | Bundled source/generated assets | Treat as Voca project assets; do not import unexplained third-party artwork |
| Default framework SVGs | Unused starter assets | Source tree | Remove from clean candidate unless referenced |
| Unexplained raster assets | Public assets | Source tree | Removed during release preparation |
| Sample/test documents | Tests/examples | Repository fixtures | Only original, synthetic, permissively licensed or public-domain material is allowed |

## Release rule

For every redistributed component, record the exact upstream project/model, version or revision, license identifier, copyright/notice requirements and whether the material is fetched at runtime or copied into Voca's repository/distribution.

Do not infer licensing from a similarly named package. Evidence must correspond to the artifact used by the release candidate. Dependency lockfiles are part of this evidence and must be committed.

## Application license decision

The exact TTS path no longer blocks an application source-license decision: the JavaScript runtime and upstream Kokoro model path have Apache-2.0 evidence, and Voca does not redistribute the model weights in this source repository.

A permissive application license is appropriate for Voca's own source provided the final candidate contains only project-owned source/assets plus dependencies used under their own compatible terms. The final release candidate must still receive an automated dependency-license inventory and a manual bundled-asset review before publication.