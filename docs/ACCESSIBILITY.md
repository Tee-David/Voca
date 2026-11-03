# Accessibility

Accessibility is central to a reading and listening product. It should be reviewed alongside playback and document correctness rather than treated only as visual polish.

## Interaction

Core reading controls should be keyboard reachable on the web, have understandable focus states and expose meaningful accessible names. Touch targets on mobile should be practical to operate without precision tapping.

## Reader state

Playback state, loading, errors and progress should not rely on color alone. Synchronized highlighting and sentence focus should preserve readable contrast and should not make non-active text impossible to perceive.

## Motion

Automatic scrolling and animated transitions should respect reduced-motion preferences where practical and avoid unnecessary movement that competes with reading.

## Speech

Text-to-speech controls should remain operable without requiring visual tracking. Voice selection, rate and playback state should have text labels that assistive technology can understand.

## Documents

Source documents vary widely in semantic quality. Voca should preserve useful structure where extraction permits it and avoid claiming that OCR or visual PDF structure automatically becomes fully accessible content.

## Testing

Accessibility changes should include keyboard testing and appropriate automated checks as the test suite grows. Major reader UI changes should be manually reviewed with screen-reader semantics in mind.