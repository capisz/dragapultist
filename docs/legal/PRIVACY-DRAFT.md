# Dragapultist Beta Privacy Notice

**DRAFT — NOT IN FORCE — DO NOT PUBLISH WITH PLACEHOLDERS.**

Prepared September 28, 2026. Draft version `beta-privacy-draft-1`.

This draft describes the reviewed source behavior and marks decisions that remain open. It is not a completed compliance assessment. Provider settings, retention, account-request procedures, operator identity, and applicable regional disclosures must be confirmed before publication.

## 1. Who is responsible

**Christopher Capizzuto**, operating Dragapultist from **New York, United States**, is responsible for the practices described here. Privacy and support contact: **[PUBLIC CONTACT EMAIL]**. **[ADD OTHER REQUIRED OPERATOR / REPRESENTATIVE CONTACT DETAILS.]**

Effective date: **[EFFECTIVE DATE]**. Notice version: **[FINAL VERSION]**. This notice covers the Dragapultist website and desktop companion; Pokémon TCG Live is a separate service.

## 2. Information handled by the beta

| Information | How it reaches us and why we use it |
| --- | --- |
| Account and profile | You provide an email, password, username, and optional profile/banner images. Firebase handles email/password authentication and verification. Dragapultist stores the account identifier, email, username, verification/profile information, and account timestamps to operate your account. The application profile does not store your password. |
| Match history | Logs you import contain player and opponent handles, gameplay events, cards, and results. We store the submitted raw log and parsed match details, plus notes, tags, favorites, and deck details you add, to provide review, history, and statistics. |
| Desktop preferences and pending imports | The app stores your capture preference, Pokémon TCG Live username, account association, notification/startup preferences, and pending logs with import/retry metadata on your computer. This supports capture, recovery, and upload to the correct account. |
| Browser storage | Guest match history, locally saved decks, and certain preferences are stored in the browser or desktop app's web storage. Guest game records are not automatically synced to an account. Visiting the app still involves requests to hosting and other services described below. |
| Connection and security information | Hosting and authentication providers process information needed to deliver requests and protect the service, such as IP addresses, browser/request information, and authentication events. **[CONFIRM THE OPERATOR'S DIAGNOSTIC LOG CONTENT, ACCESS, AND RETENTION.]** |
| Support | If you contact us, we receive the message, contact information, and attachments you choose to send. We use them to handle your request. **[CHOOSE THE SUPPORT INBOX PROVIDER AND RETENTION PROCESS.]** |

Your match and player-history views are scoped to your account in the current app. Service providers and authorized administrators may still need access to operate or support the service. Do not treat an opponent's handle as anonymous information or upload unrelated personal details.

## 3. Optional clipboard capture

Capture is off by default. When you enable it after signing in and providing your Pokémon TCG Live username, the desktop app periodically reads clipboard text locally to check whether it resembles a supported game log. This check necessarily reads copied text before determining whether it is a log.

- Text that is not recognized as a game log is not saved in the import queue or uploaded by the capture feature. An in-memory fingerprint helps avoid processing the same clipboard content repeatedly.
- Recognized logs are saved in an encrypted queue on your computer, associated with your account, and submitted to Dragapultist for storage in your account. Logs may include both players' handles. Recognition is pattern based and can make mistakes.
- Already-present clipboard content is treated as a starting point when capture begins; use **Copy log** after enabling capture to import a completed match.
- Capture can continue while the window is closed or the app is in the background. If capture was enabled, that preference can be restored on a later launch. Offline logs can remain queued for later upload.
- **Pause capture** stops new clipboard capture. Logs already queued may still upload. **Quit Dragapultist** stops the app. Confirmed sign-out disables capture; pending logs remain associated with the original account.
- This feature does not inspect Pokémon TCG Live process memory or collect its hidden game state. It depends on logs you copy.

**Editor note:** Add a clear discard-pending-logs control and finalize its notice before release. The reviewed beta does not have that control. Do not describe pausing as deleting the queue or withdrawing an upload already completed.

## 4. Providers and external content

We use services to authenticate accounts, host the app, store records, and deliver content:

- **Google Firebase Authentication:** account authentication and verification. Its [privacy documentation](https://firebase.google.com/support/privacy) describes authentication information, security processing, and provider deletion practices.
- **MongoDB Atlas:** storage for account profiles and saved match information. **[CONFIRM THE DATABASE REGION, CONTRACT TERMS, BACKUP SETTINGS, AND RETENTION.]**
- **Vercel:** delivery of the website and its server endpoints. Request and operational information may be processed to provide hosting and security. **[CONFIRM RELEVANT LOG SETTINGS AND RETENTION.]**
- **GitHub-hosted PokeAPI sprite assets:** certain images load from an external host. Loading them sends a request to that host, including connection information such as your IP address.
- **[SUPPORT PROVIDER]:** **[ADD AFTER THE PUBLIC INBOX IS CONFIGURED.]**

**Analytics — publication decision pending:** The source includes Vercel Web Analytics. Live project enablement and configuration were not checked. If enabled, the final notice must describe the actual page-view and device/traffic information collected, its purpose, retention, and available choices. Vercel describes a request-derived visitor identifier and aggregate traffic data in its [Web Analytics documentation](https://vercel.com/docs/analytics/privacy-policy). Do not describe the app as analytics-free or assume a cookie-free analytics tool requires no privacy assessment.

This beta is completely free and has no donations, advertisements, subscriptions, or payment collection. This does not mean the app is analytics-free; see the separate analytics disclosure above.

**[CONFIRM ANY OTHER DISCLOSURES, INCLUDING LEGALLY REQUIRED DISCLOSURES, SERVICE-PROVIDER TERMS, AND ACTUAL OPERATOR ACCESS PRACTICES.]**

## 5. Cookies, local storage, and settings

The app uses cookies for sign-in sessions and request protection, and local storage for guest records and preferences. Disabling or clearing that storage may sign you out or remove local records. Browser and desktop-app storage are separate.

The encrypted desktop queue is separate from browser storage. Clearing browser data, signing out, replacing the app, or uninstalling it does not necessarily remove the queue or delete cloud records. **[PROVIDE SUPPORTED LOCAL-DATA REMOVAL INSTRUCTIONS AND CONTROLS.]**

## 6. Retention and deletion

**The retention schedule is unfinished. Do not publish this section as a completed policy.** The reviewed behavior is:

| Data | Current behavior / decision needed |
| --- | --- |
| Cloud matches | Remain saved until deleted; no automatic expiry was found. A successful match deletion removes the match from active game storage and associated import/prize-map records. Confirm backup/log handling separately. |
| Account/profile | No self-service full account deletion flow was found. Deleting individual matches or signing out does not remove the Firebase identity or MongoDB profile. Establish a verified closure process and retention rules. |
| Pending desktop logs | A successfully acknowledged upload removes the queue entry. Failed, offline, or review entries can remain without an automatic expiry. Define expiry and user-directed removal. A later copied log can be imported again. |
| Guest/local records | Persist in the relevant local storage until deleted or that storage is cleared. Cloud-account deletion cannot by itself erase every offline copy on other devices. |
| Hosting/authentication logs, analytics, support, and backups | Provider configuration and operator retention have not been confirmed. Set and document periods or clear criteria, including any limited legal retention. |

Once the request process is ready, contact **[PUBLIC PRIVACY EMAIL]** for access, correction, export, or deletion requests. We may need to verify that a request relates to you. **[DOCUMENT THE AVAILABLE RIGHTS, VERIFICATION METHOD, RESPONSE DEADLINES, AND COMPLAINT CHANNELS REQUIRED IN THE APPLICABLE JURISDICTIONS.]** Requests can also concern information about an opponent in an imported log; handle them without exposing another account's records.

## 7. Security and international processing

The desktop queue uses operating-system-backed encryption, and the production app uses HTTPS and authenticated, account-scoped requests. No system can guarantee perfect security. These measures do not mean that all information stays on your computer or that cloud records are end-to-end encrypted.

Service providers may process information outside your location. **[CONFIRM ACTUAL REGIONS, INTERNATIONAL TRANSFER TERMS/SAFEGUARDS, AND ANY REQUIRED REGIONAL DISCLOSURES. DO NOT PROMISE STORAGE IN A PARTICULAR COUNTRY WITHOUT CHECKING.]**

## 8. Audience and regional information

The planned private beta is for invited adults aged 18 or older. **[CONFIRM HOW THAT POLICY IS IMPLEMENTED AND WHETHER IT COVERS THE WEBSITE, DESKTOP BETA, OR BOTH.]** Contact **[PUBLIC PRIVACY EMAIL]** with concerns about a child's information.

**[LEGAL REVIEW: evaluate intended and actual audiences, including the Pokémon-themed presentation. Specify any required children's-data handling procedure. Determine applicable lawful bases, rights, sale/sharing or advertising disclosures, representatives, and regulator contacts from the actual operator and tester locations.]**

## 9. Changes

The final notice will display its effective date and version. Material changes will be explained through **[DECIDE AND IMPLEMENT THE NOTICE CHANNEL]**, with any additional consent obtained before a new use where required. Updating this notice alone does not authorize a new optional collection feature.
