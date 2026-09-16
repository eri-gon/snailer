# Snailer — Project Horizon

## Vision

Make sharing a handwritten letter online feel like receiving physical mail: anticipation, a sealed envelope, and the delight of unfolding a personal message.

## First occasion: my sister’s birthday

The immediate purpose of this project is to send my sister a handwritten birthday letter for September 26, 2026. Have the core sharing and opening experience ready and tested before that date. Prioritize this personal birthday experience over future customization features.

When she opens the letter, show a “Happy Birthday!” message and a short celebratory confetti burst as the paper unfolds. Let the confetti clear promptly so it does not obscure the handwriting or delay reading. Respect reduced-motion preferences by showing the birthday message without moving confetti.

## Complete first-version experience

1. A sender selects one or more JPEGs. Each JPEG represents one separate physical sheet, not the front or back of another sheet. A single-sheet letter is valid.
2. They preview and arrange the sheets in reading order, optionally add sender and recipient names, and choose immediate delivery or a delay of 1, 3, or 7 days.
3. After all sheets upload successfully, the website creates one unguessable link for the entire letter that they can send to a friend.
4. Before arrival, the friend sees an “in transit” screen with the expected delivery time.
5. After arrival, tapping the envelope opens its flap and slides out the letter. Each sheet has its own unfolding animation; sheets are not paired into front/back pages or shown with page-flip behavior.
6. The animation reveals the actual handwriting, then transitions into a zoomable, multipage reader.
7. For a birthday letter, the opening includes a “Happy Birthday!” message and confetti before settling into the reader.

Neither sender nor recipient needs an account.

## Product principles

- The letter and opening experience are the centerpiece.
- Use warm paper stationery: cream tones, subtle texture, classic stamps, and soft shadows.
- Preserve the uploaded handwriting rather than transcribing or recreating it.
- Make reading comfortable on phones and computers.
- Offer skip and replay controls, keyboard access, and reduced-motion support.
- Enforce delivery delays on the server; every sheet image must remain inaccessible before arrival.
- Anyone with the unique link can read the letter after delivery.
- Treat the link as a bearer secret: forwarding it grants access. This is not end-to-end encryption.

## Implementation direction

Use React, Vite, and TypeScript for the frontend, plain CSS for styling and unfolding animations, a Cloudflare Worker API, D1 for letter metadata and ordered sheet references, and private R2 storage for JPEGs. Render the actual images directly; PDF.js and PDF support are not needed for this version. The intended deployment is Cloudflare Workers with frontend assets, rather than the earlier Sites starter.

Use ESLint from the Vite React TypeScript template, including its TypeScript and React Hooks rules. Prettier is optional and can be introduced later.

Generate share tokens using 32 cryptographically random bytes and store token hashes with the letter metadata. Keep R2 objects private and check the token and delivery time before serving any sheet. Use upload rate limits and protected image endpoints. Exclude letters from search indexing and keep their contents out of link previews.

Validate JPEG content and image dimensions, handle partial upload failures, and create a share link only when every sheet is stored successfully. The earlier 10 MB / 20-page PDF limits no longer define the upload contract: choose explicit per-image, total-letter, pixel-dimension, and sheet-count limits during the upload milestone. The minimum sheet count is one.

Letters remain available after delivery without automatic expiration.

Include a simple birthday celebration option when creating a letter, stored with its metadata. Enable it for my sister’s letter; ordinary letters retain the standard opening. Trigger confetti once per opening sequence, not on reader interactions or rerenders. Skipping the animation also skips confetti while retaining the birthday greeting; replaying the opening can replay the celebration.

September 26 is the target occasion, not an automatic midnight unlock requirement. Keep the existing delivery choices; confirm the intended time and recipient timezone before adding exact-date scheduling.

## Incremental milestones

1. **Local selection and preview:** In a clean Vite frontend under `web/`, select one or more JPEGs and preview each as a separate sheet in selection order, entirely in the browser. No backend is needed for this first slice.
2. **Sheet ordering and reading:** Support reordering the selected sheets and comfortable, zoomable reading of all sheets in order.
3. **Persistent sharing:** Validate uploads, store JPEGs privately in R2 and letter metadata in D1, and generate one unguessable link that works across devices without accounts. Handle failed or incomplete uploads clearly.
4. **Opening experience:** Build the envelope, extraction, per-sheet unfolding, birthday greeting and confetti, and reader transition using the uploaded JPEGs.
5. **Delayed delivery:** Add sender-selected delays, the transit screen, and server-enforced availability for every sheet.
6. **Release readiness:** Verify mobile behavior, accessibility, error recovery, image access controls, and deployment. Rehearse the complete birthday-letter journey on another device before September 26, 2026.

Each milestone should produce a demonstrable result before advancing.

## First-version acceptance criteria

- A letter containing one or more real JPEGs can be shared through one link and read on another device without signing in.
- Sheet order matches the sender's chosen reading order.
- Each JPEG represents a separate sheet with its own unfolding animation displaying the uploaded handwriting; there is no front/back pairing.
- Birthday letters show “Happy Birthday!” and a brief confetti burst upon opening; ordinary letters do not.
- Confetti clears promptly, does not block reading controls, and does not retrigger during zooming or page navigation. Reduced-motion and skip controls suppress it.
- All pages remain readable and zoomable after opening.
- Delayed letters cannot be retrieved early, including through direct requests for any sheet image.
- Invalid uploads and unavailable links produce understandable errors.
- The complete journey works on mobile and desktop, including reduced-motion settings.

## Future horizon

Customizable stamps, envelopes, paper styles, and opening details can deepen the physical-mail experience after the core journey works well.

Accounts, saved collections, notifications, and payments are outside the first version and require separate product decisions.

PDF support can be reconsidered later; JPEG sheets are the current format.

## How to use this document

Treat this as the project’s long-term destination, not a request to implement everything at once. In each iteration, inspect the current implementation, choose the next bounded milestone, agree on its acceptance criteria, and complete that slice. Update this document when product decisions change.

This is a guided learning project. The user is comfortable with JavaScript, React, and server development and wants to implement the code line by line themselves. Explain architecture and tradeoffs, provide small coding steps, and review their work before moving on. Do not implement application code or run setup on their behalf unless explicitly asked. Explicit requests for repository maintenance, such as updating this document, can be carried out directly.

The earlier generated `app/` scaffold was deleted at the user's request. The fresh frontend is intended to live in `web/`; Vite setup instructions have been provided, but successful setup has not yet been confirmed.
