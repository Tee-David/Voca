# Third-Party Licensing Audit

This file tracks licensing evidence that must be verified before Voca's source license is finalized.

## Why this is separate

A permissive license on Voca's own source does not automatically grant rights to redistribute model weights, fonts, icons, sample documents or other bundled assets. Those materials can have independent terms.

## Audit table

| Component | Role | Bundled/redistributed? | License evidence | Release status |
| --- | --- | --- | --- | --- |
| `kokoro-js` | Local TTS runtime | npm dependency | Verify upstream repository/package license and notices | Pending |
| Exact Kokoro model/weights used by Voca | Speech model | May be downloaded/cached separately | Verify exact model repository, model card and weight license | Blocking |
| `pdfjs-dist` | PDF parsing/rendering | npm dependency | Verify package/upstream license | Pending |
| `epubjs` | EPUB support | npm dependency | Verify package/upstream license | Pending |
| `mammoth` | DOCX extraction | npm dependency | Verify package/upstream license | Pending |
| `tesseract.js` | OCR | npm dependency | Verify package/upstream license | Pending |
| `pdf-lib` | PDF generation/annotation | npm dependency | Verify package/upstream license | Pending |
| Fonts | UI/document rendering | Inspect repository assets | Verify each redistributed font | Blocking if bundled |
| Icons | Product/UI assets | Inspect source and generated mobile assets | Verify source and redistribution terms | Blocking if non-original |
| Sample/test documents | Tests/examples | Inspect repository fixtures | Original, licensed, synthetic or public domain only | Blocking |
| Android artwork | App icon/splash | Bundled | Confirm original ownership or compatible license | Pending |

## Audit procedure

For every redistributed component, record the exact upstream project/model, version or revision, license identifier, copyright/notice requirements and whether the material is merely fetched at runtime or copied into Voca's repository/distribution.

Do not rely on a similarly named model or package. The evidence must correspond to the exact artifact used by the release candidate.

## Application license decision

Select Voca's application source license only after this audit shows that the proposed distribution is compatible with all material shipped in the public candidate. Where model terms differ from application source terms, document them separately and make that distinction obvious to users.