# Beta onboarding and settings copy

**Internal draft — proposed copy and behavior, not implemented.** Prepared September 28, 2026.

Publish only after the operator identity, contact address, final agreements, audience approach, and required privacy controls are resolved. Preserve the compact settings dialog and the existing account-menu entry.

## 1. Beta agreement

**Welcome to the Dragapultist beta**

This free beta is for invited testers aged 18 or older. Features may change, and imports or statistics may contain errors. Keep a copy of game logs you want to retain.

Provided by **Christopher Capizzuto**. Support: **[PUBLIC SUPPORT EMAIL]**.

Read the **Beta Terms and Software License** and **Privacy Notice** before continuing.

Unchecked checkbox: **I agree to the Beta Terms and Software License.**

Primary action: **Agree and continue**

Secondary action: **Decline and exit**

Implementation notes:

- Link to actual, versioned documents and include an offline copy in the desktop package. Opening a document must not check the box or accept the agreement.
- Keep acceptance disabled until the user checks the box. Declining must stop the desktop app, including background capture. It must not silently delete existing records.
- Decide and implement invitation/age eligibility before collecting account information. This text and checkbox are not a complete age-assurance design or children's privacy assessment.
- Show the terms at account creation and handle existing-account acceptance explicitly. Record account, document version, and server timestamp; keep the record outside game documents. Store any necessary offline acknowledgement without inventing a server acceptance.
- Keep Privacy Notice availability separate from consent for optional data collection. Do not label the checkbox “I consent to all data processing.”

## 2. Optional clipboard setup

**Import copied game logs**

When capture is on, Dragapultist checks clipboard text on this computer to identify Pokémon TCG Live game logs. Recognized logs, including player and opponent names, are stored in an encrypted local queue and uploaded to your Dragapultist account. Other copied text is not saved or uploaded by this feature.

After each match, press **Copy log** in Pokémon TCG Live. Closing this window keeps capture running. **Pause capture** stops new capture, but queued logs may still upload. **Quit Dragapultist** stops the app.

Field: **Pokémon TCG Live username**

Help: Use the exact name shown in your game logs so we can identify your side.

Primary action: **Save username & enable capture**

Secondary action: **Not now**

Footer: Manage capture anytime in **Account → Desktop settings**. Read the **Privacy Notice**.

Implementation notes:

- Capture starts off. The explicit enable action permits clipboard access; merely opening setup, accepting Terms, saving an agreement record, or choosing “Not now” must not read the clipboard.
- Enforce the choice in native code before startup, polling, or tray actions. Scope it to the account and device. Respect the existing disabled state after sign-out/account changes.
- Show this notice before resuming capture for an existing installation when introducing the agreement flow; separately handle pending uploads while the user decides. Do not discard the queue silently.
- Keep launch-at-login and notifications as separate settings. Explain that launch-at-login plus enabled capture allows background operation after sign-in to the computer.
- Do not call this permission “full computer access.” Do not imply that the app reads only game-log text: it must inspect copied text to recognize a log.

## 3. Persistent settings wording

Capture enabled: **Capture on — copy a completed game log to import it.**

Capture disabled: **Capture paused — no new clipboard text is captured. Previously queued logs may still sync.**

Background reminder: **Closing the window keeps Dragapultist running. Choose Quit Dragapultist to stop it.**

Local removal feature to implement:

- Action: **Discard queued logs**
- Confirmation: **Remove [COUNT] unsynced logs from this computer? They will not be uploaded. Matches already saved to your account will stay there.**
- Buttons: **Discard queued logs** / **Cancel**
- Only use that promise after implementing safe cancellation/removal for in-flight uploads; report any log already uploaded accurately.

## 4. Download-page essentials

Present the approved operator identity, version, platform/architecture, system requirements, support link, Terms, Privacy Notice, third-party notices, and installation/removal instructions together. Label the release as a beta and explain that the desktop app uses the hosted Dragapultist service.

Only display “signed,” “notarized,” or equivalent trust claims for an artifact whose actual signature/notarization has been verified. The current Mac beta does not qualify. Include the window-close/background behavior and optional clipboard capture before installation, then repeat the concise choice at first run.

## 5. Completely free beta

Use the plain statement: **Free beta. No donations, ads, subscriptions, or purchases.** Keep the privacy disclosure accurate: free access does not mean that account storage, hosting, or analytics processing stops.
