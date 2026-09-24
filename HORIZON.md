# Snailer — Project Horizon

## Vision

Make sharing a handwritten letter online feel like receiving physical mail: anticipation, a sealed envelope, and the delight of unfolding a personal message.

## First occasion: my sister’s birthday

The immediate purpose of this project is to send my sister a handwritten birthday letter for September 26, 2026. Have the core sharing and opening experience ready and tested before that date. Prioritize this personal birthday experience over future customization features.

When she opens the letter, show a “Happy Birthday!” message and a short celebratory confetti burst as the paper unfolds. Let the confetti clear promptly so it does not obscure the handwriting or delay reading. Respect reduced-motion preferences by showing the birthday message without moving confetti.

## Complete first-version experience

1. A sender selects one to five JPEGs, matching a small stack of sheets that could fit in an envelope. Each JPEG represents one separate physical sheet, not the front or back of another sheet. A single-sheet letter is valid.
2. They preview and arrange the sheets in reading order, optionally add sender and recipient names, and choose immediate delivery or a delay of 1, 3, or 7 days.
3. The sender’s browser encrypts the letter before uploading. After all encrypted sheets upload successfully, it creates one unguessable link containing the decryption key in its URL fragment that they can send to a friend.
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
- Encrypt letter content end to end: only the sender’s and recipient’s browsers handle readable content and decryption keys. Server operators must not be able to read letters from stored data.
- Treat the complete link as a bearer secret: forwarding it grants access, including the ability to decrypt the letter.

## Implementation direction

Use React, Vite, and TypeScript for the frontend, plain CSS for styling and unfolding animations, a Cloudflare Worker API, D1 for minimal delivery metadata and encrypted manifest references, and private R2 storage for encrypted files. Decrypt and render the actual JPEG images in the recipient’s browser; PDF.js and PDF support are not needed for this version. The intended deployment is Cloudflare Workers with frontend assets, rather than the earlier Sites starter.

Use ESLint from the Vite React TypeScript template, including its TypeScript and React Hooks rules. Prettier is optional and can be introduced later.

Generate share tokens using 32 cryptographically random bytes and store token hashes with the letter metadata. Keep R2 objects private and check the token and delivery time before serving any sheet. Use upload rate limits and protected image endpoints. Exclude letters from search indexing and keep their contents out of link previews.

Validate JPEG content and image dimensions in the sender’s browser before encryption and validate decrypted files again before rendering in the recipient’s browser. The server can enforce encrypted payload sizes, attachment counts, and rate limits, but cannot inspect encrypted content or independently verify its media type or dimensions. Handle partial upload failures and create a share link only when every required encrypted attachment is stored successfully. Use the envelope and upload limits below; choose browser-enforced pixel-dimension limits during the upload milestone. The earlier PDF limits no longer define the upload contract.

Letters remain available after delivery without automatic expiration.

Include a simple birthday celebration option when creating a letter, stored with its metadata. Enable it for my sister’s letter; ordinary letters retain the standard opening. Trigger confetti once per opening sequence, not on reader interactions or rerenders. Skipping the animation also skips confetti while retaining the birthday greeting; replaying the opening can replay the celebration.

September 26 is the target occasion, not an automatic midnight unlock requirement. Keep the existing delivery choices; confirm the intended time and recipient timezone before adding exact-date scheduling.

## Envelope limits and anti-spam controls

Keep each letter small enough to feel like a physical envelope, and prevent anonymous callers from consuming unbounded storage by repeatedly creating letters. Enforce limits on the server before public uploads are enabled; frontend validation alone is not an abuse control.

Initial configurable product defaults, rather than claims about physical envelope capacity:

- **Sheets:** One to five encrypted sheet objects per letter, at most 8 MiB each and 20 MiB combined.
- **Audio:** At most one music track and one voice message, each at most 10 MiB. Audio slots must not increase the sheet allowance.
- **Manifest and total:** At most 64 KiB for the encrypted manifest and 41 MiB for the entire encrypted letter. All server byte limits include encryption overhead; show these limits before upload.
- **Frequency:** At most three new upload sessions per hour and ten per day per server-issued anonymous sender identifier and per trusted source IP. Allow at most two active sessions per identifier and IP. Cookie resets must not bypass IP limits; IP limits can affect people sharing a network and are not proof of identity.
- **Byte budgets:** At most 100 MiB of accepted upload bytes per day per sender identifier and IP. Initially cap uploads across the service at 1 GiB per day and 10 GiB of stored plus reserved bytes. These are adjustable operational ceilings; when reached, pause new uploads while preserving access to existing letters.

Reserve attachment slots and storage capacity atomically when authorizing uploads so concurrent requests cannot exceed quotas. Use short-lived, server-issued upload capabilities bound to one draft and its allowed slots; expire unfinished sessions after one hour. Enforce actual received byte counts, not just declared sizes or `Content-Length`, and abort oversized streams. Repeated requests, retries, and slot replacements must not create extra objects or evade byte budgets. Count upload starts and received bytes even when a sender abandons the draft. Rate-limit malformed and denied requests too.

Finalize a letter only when its authorized attachments are complete; published letters are immutable for this version. Clean up abandoned objects and incomplete multipart uploads within 24 hours, releasing storage reservations only once accounted-for data is removed. Use shared, atomic quota state across server instances. If quota checks are unavailable, reject new uploads safely rather than accepting unlimited data.

Show clear messages such as “An envelope holds up to five sheets,” with a retry time for temporary limits. Add a human-verification challenge when suspicious activity requires it, but retain quotas independently of any challenge. Use short-lived, keyed hashes for IP-based quota records instead of permanent raw-IP histories. Monitor aggregate upload volume and rejected requests without recording letter contents, keys, or full share links.

Encryption means the server can count opaque attachment slots and bytes, but cannot prove that an encrypted object really contains a JPEG, a single sheet, or audio. Validate those content rules again after decryption in the recipient’s browser. These controls bound resource consumption; anonymous access cannot guarantee one person cannot use multiple devices or IP addresses. There is no unsolicited inbox delivery in this version: senders share links themselves. If inboxes or notifications are added later, require recipient consent and blocking controls.

## End-to-end encryption and privacy

The privacy goal is that server operators cannot view uploaded letters by inspecting storage, the database, backups, or request logs. Encrypt content in the sender’s browser before any upload and decrypt it only in the recipient’s browser. Encryption at rest with a server-held key does not satisfy this requirement. Apply this protection to the current JPEG sheets, audio attachments, and any future PDF uploads.

- Use the browser Web Crypto API with authenticated encryption (AES-256-GCM), a fresh random key per letter, and a unique nonce for every encrypted object under that key. Authenticate object identity and format version to detect tampering or attachment substitution.
- Keep the decryption key in the share link’s URL fragment (`#...`), never in its path, query parameters, API requests, server storage, or logs. URL fragments are not included in ordinary HTTP requests; application code must preserve that separation. Generate the server access token independently of the encryption key.
- Encrypt the letter manifest too, including names, original filenames, sheet order, birthday settings, and attachment descriptions. Store only necessary operational metadata in plaintext, such as arrival time, token hash, opaque object identifiers, and encrypted byte sizes. Before arrival, show a generic transit screen without fetching the encrypted manifest.
- Do not send readable files, thumbnails, keys, or full share links to analytics, error reporting, or third-party scripts. Do not persist decrypted content in browser storage or service-worker caches. Release temporary object URLs when no longer needed.
- Retain server-side delivery checks for every encrypted attachment and the manifest. Waiting is enforced by the application withholding ciphertext, not by a cryptographic time lock; an operator bypassing that gate could release ciphertext early but would still need the key to read it.
- Missing or incorrect keys and modified ciphertext must produce a clear error without displaying unauthenticated content. There is no server-side key recovery; losing the complete link can mean losing access.

This protects stored content from server access, but does not hide operational metadata such as upload time, file sizes, or request IP addresses. Anyone given the complete link can decrypt the letter. A compromised device or modified website code could steal keys or plaintext; do not claim protection against an operator actively replacing the browser application. Keep dependencies and scripts minimal and use a restrictive content security policy.

## Audio experience

Add optional audio to make the birthday letter feel more personal. The initial direction is an uploaded background music track and an uploaded recorded voice message, such as a birthday greeting or reading of the letter. Letters without audio must retain the complete opening and reading experience.

- Let the sender preview, replace, or remove each audio attachment before creating the share link.
- Offer the recipient an explicit “Open with sound” choice alongside a silent opening. Start background music only after that choice; if playback is blocked, show a play control and continue opening the letter.
- Keep play/pause, mute, and volume controls available while reading. Voice messages start only when the recipient presses play; pause background music while a voice message plays so speech remains clear.
- Play tracks once by default. Sheet navigation, zooming, and animation replay must not unexpectedly restart audio. Skipping the visual animation preserves the recipient’s sound choice.
- Encrypt audio in the sender’s browser and store ciphertext privately in R2 with references in the encrypted manifest. Decrypt locally for playback. Apply the same share-token and server-side delivery checks as sheet images; audio must not be retrievable before arrival.
- Use the server-enforced audio byte limits above; choose supported formats, browser-enforced duration limits, and validation rules during the audio milestone. Failed audio loading or playback must never block access to the letter.

Prioritize a simple uploaded birthday music track for the September 26 experience, then add voice-message support. In-browser recording and envelope/paper sound effects are future enhancements. Reduced-motion settings control visual effects independently of the recipient’s audio choice.

## Incremental milestones

1. **Local selection and preview:** In a clean Vite frontend under `web/`, select one or more JPEGs and preview each as a separate sheet in selection order, entirely in the browser. No backend is needed for this first slice.
2. **Sheet ordering and reading:** Support reordering the selected sheets and comfortable, zoomable reading of all sheets in order.
3. **Encrypted persistent sharing:** Validate files locally, encrypt sheets and the manifest before upload, store ciphertext privately in R2 and minimal delivery metadata in D1, and generate one unguessable link with a fragment-held key that works across devices without accounts. Decrypt locally for reading and handle failed or incomplete uploads clearly. Encryption is required before real personal letters are uploaded.
4. **Opening experience:** Build the envelope, extraction, per-sheet unfolding, birthday greeting and confetti, and reader transition using the uploaded JPEGs.
5. **Delayed delivery:** Add sender-selected delays, the transit screen, and server-enforced availability for every sheet.
6. **Optional audio:** Add sender-uploaded background music with preview and recipient playback controls, then an optional recorded voice-message attachment. Verify silent opening and delivery protection for audio.
7. **Release readiness:** Verify mobile behavior, accessibility, error recovery, image and audio access controls, and deployment. Rehearse the complete birthday-letter journey on another device before September 26, 2026.

Each milestone should produce a demonstrable result before advancing.

The encrypted persistent-sharing milestone includes server-enforced envelope limits, upload quotas, and abandoned-upload cleanup before enabling public uploads.

## First-version acceptance criteria

- A letter containing one or more real JPEGs can be shared through one link and read on another device without signing in.
- Sheet order matches the sender's chosen reading order.
- Each JPEG represents a separate sheet with its own unfolding animation displaying the uploaded handwriting; there is no front/back pairing.
- Birthday letters show “Happy Birthday!” and a brief confetti burst upon opening; ordinary letters do not.
- Confetti clears promptly, does not block reading controls, and does not retrigger during zooming or page navigation. Reduced-motion and skip controls suppress it.
- All pages remain readable and zoomable after opening.
- Delayed letters cannot be retrieved early, including through direct requests for any sheet image.
- Audio remains optional and starts only after an explicit recipient action. Silent opening works, and playback controls remain accessible while reading.
- Voice messages and background music do not overlap; navigation and animation replay do not unexpectedly restart audio.
- Direct audio requests cannot bypass the delivery delay, and audio failures do not prevent reading the letter.
- Invalid uploads and unavailable links produce understandable errors.
- One to five sheets within the byte budgets upload successfully; a sixth sheet, extra audio slots, oversized objects, and oversized manifests are rejected even through direct API calls.
- Parallel requests, retries, missing or false size headers, cookie resets, and abandoned uploads cannot bypass the applicable slot, IP, byte, or global storage limits. Temporary denials include a retry time where known.
- Expired drafts are cleaned up within 24 hours, quota accounting remains correct, and reaching upload limits does not prevent reading existing letters.
- Network requests, server logs, D1 records, and R2 objects contain no plaintext letter content, personal manifest fields, or decryption keys. Inspect these using a known test letter before release.
- The complete link decrypts correctly on another device; missing or incorrect keys and tampered ciphertext fail safely.
- All attachments, including audio and future PDFs, use the same client-side encryption boundary. Server access alone cannot decrypt stored letters.
- The complete journey works on mobile and desktop, including reduced-motion settings.

## Future horizon

Customizable stamps, envelopes, paper styles, and opening details can deepen the physical-mail experience after the core journey works well.

Accounts, saved collections, notifications, and payments are outside the first version and require separate product decisions.

PDF support can be reconsidered later; JPEG sheets are the current format.

## How to use this document

Treat this as the project’s long-term destination, not a request to implement everything at once. In each iteration, inspect the current implementation, choose the next bounded milestone, agree on its acceptance criteria, and complete that slice. Update this document when product decisions change.

This is a guided learning project. The user is comfortable with JavaScript, React, and server development and wants to implement the code line by line themselves. Explain architecture and tradeoffs, provide small coding steps, and review their work before moving on. Do not implement application code or run setup on their behalf unless explicitly asked. Explicit requests for repository maintenance, such as updating this document, can be carried out directly.

The earlier generated `app/` scaffold was deleted at the user's request. The fresh frontend is intended to live in `web/`; Vite setup instructions have been provided, but successful setup has not yet been confirmed.
