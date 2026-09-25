# September 24 UI redesign release

The user approved the localhost redesign and hover correction, then explicitly requested production deployment.

The approved presentation and Quick add changes were reconciled onto canonical commit 981536d. Production dependency versions, Firebase authentication, strict pagination validation, revisioned deletes and dependent-record cleanup remain from the canonical repository. No archive-only auth facades or dependency downgrades were copied.

Validation: optimized production build passed (non-blocking image/hook lint warnings); TypeScript passed; 34 backend tests and 25 unit tests passed. Local preview behavior was checked on desktop, tablet and mobile. The server import fingerprint adds owner-scoped atomic duplicate protection for future imports without migrating legacy records. Live signed-in imports and index creation are not covered by mocked backend tests.

Production target: https://dragapultist.vercel.app, through the existing GitHub/Vercel main-branch integration.
