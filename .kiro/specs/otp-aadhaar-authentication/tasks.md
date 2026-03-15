# Implementation Plan: OTP + Aadhaar Authentication

## Overview

Add a multi-step auth gate (phone OTP → Aadhaar) backed by Amazon Cognito to the Paropkar AI React app, fix three pre-existing bugs, and wire everything together so `Amplify.configure` is called exactly once at startup.

## Tasks

- [x] 1. Add Cognito fields to `src/aws-exports.js` and configure Amplify once in `src/index.js`
  - Add `aws_cognito_region`, `aws_user_pools_id`, and `aws_user_pools_web_client_id` placeholder fields to the existing `awsmobile` object in `src/aws-exports.js`
  - Import `Amplify` and `awsconfig` in `src/index.js` and call `Amplify.configure(awsconfig)` before `root.render`
  - Remove the `import { Amplify }` and `Amplify.configure(awsconfig)` lines from `src/amplifyApi.js`
  - _Requirements: 5.2, 5.3_

- [x] 2. Fix three pre-existing bugs in `src/amplifyApi.js` and `src/App.js`
  - [x] 2.1 Fix `speakText` voice IDs in `src/amplifyApi.js`
    - Change the `voiceId` ternary so `"en-IN"` maps to `"Kajal"` and `"hi-IN"` maps to `"Aditi"`
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 2.2 Fix broken emoji in `src/App.js` header
    - Replace the broken `��` character in the logo `div` with the literal `🤝` emoji
    - _Requirements: 7.1, 7.2_
  - [x] 2.3 Remove `localCalc` from `src/App.js`
    - Delete the `localCalc` function definition and its `PROCESSING_TIMES` constant (already defined in `amplifyApi.js`)
    - Update the `catch` block in `TrackerTab` to call `calculateDeadline` directly (it already falls back internally), removing the `localCalc` call site
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 3. Create `src/aadhaarValidator.js` with Verhoeff checksum and masking
  - [x] 3.1 Implement `validateAadhaar(number)` and `maskAadhaar(number)`
    - Implement the Verhoeff multiplication table `d`, permutation table `p`, and inverse table `inv`
    - `validateAadhaar` returns `{ valid: boolean, error?: string }` — rejects non-12-digit inputs and any number whose Verhoeff checksum is non-zero
    - `maskAadhaar` returns `"XXXX XXXX " + last4` for any 12-digit string
    - Export both functions
    - _Requirements: 3.3, 3.4, 3.5_
  - [ ]* 3.2 Write property test for `validateAadhaar` — Property 3
    - **Property 3: Verhoeff checksum correctness**
    - **Validates: Requirements 3.3, 3.4**
    - Use `fc.stringMatching(/^[0-9]{12}$/)` and compare `validateAadhaar(n).valid` against an independent `verhoeffCheck` reference implementation
  - [ ]* 3.3 Write property test for `maskAadhaar` — Property 4
    - **Property 4: masking exposes only last 4 digits**
    - **Validates: Requirements 3.5**
    - Use `fc.stringMatching(/^[0-9]{12}$/)` and assert output matches `/^XXXX XXXX [0-9]{4}$/` and last 4 chars equal `n.slice(-4)`

- [ ] 4. Checkpoint — Ensure aadhaarValidator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create `src/AuthPage.js` — multi-step auth component
  - [x] 5.1 Implement phone entry step (`authState === 'unauthenticated'`)
    - Render a phone input pre-filled with `+91`, validate against `^\+91[0-9]{10}$` before calling Cognito
    - Call `signIn({ username: phoneNumber, password: phoneNumber })` from `aws-amplify/auth`; on success set `authState` to `'otp_sent'`
    - Show inline error on invalid format (no Cognito call) and on Cognito failure; show loading indicator and disable button while in-flight
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 5.2 Implement OTP entry step (`authState === 'otp_sent'`)
    - Render a numeric-only 6-digit input; call `confirmSignIn({ challengeResponse: otp })` on submit
    - On success set `authState` to `'otp_verified'`; on failure show error and allow re-entry
    - Implement 30-second resend timer; when active, call `signIn` again for the same phone number and reset the timer
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  - [x] 5.3 Implement Aadhaar entry step (`authState === 'otp_verified'`)
    - Render a numeric-only 12-digit input; on submit call `validateAadhaar` from `aadhaarValidator.js`
    - On validation failure show inline error (no network call); on success call `updateUserAttributes` with `{ 'custom:aadhaar_masked': maskAadhaar(aadhaar) }` then set `authState` to `'authenticated'`
    - Render a "Skip Aadhaar" button that sets `authState` to `'authenticated'` without storing data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  - [x] 5.4 Apply visual styling consistent with existing app
    - Use `#0b1120` background, `Playfair Display` serif heading, max-width 480px, and 200ms fade-in CSS transition between steps
    - Display Paropkar AI logo and app name in the header
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. Update `src/App.js` — add auth gate and session persistence
  - Import `getCurrentUser` and `signOut` from `aws-amplify/auth`; add `authState` / `setAuthState` and `phoneNumber` / `setPhoneNumber` state
  - On mount, call `getCurrentUser()` in a `useEffect`; if it resolves set `authState` to `'authenticated'`, otherwise set to `'unauthenticated'`
  - Render `<AuthPage authState={authState} setAuthState={setAuthState} phoneNumber={phoneNumber} setPhoneNumber={setPhoneNumber} />` when `authState !== 'authenticated'`
  - Add a sign-out button to the header that calls `signOut()` then sets `authState` to `'unauthenticated'`
  - If Cognito config fields are missing from `aws-exports.js`, `AuthPage` should display a config error and block the sign-in flow
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4_

- [ ] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Write validation utility tests and remaining property tests
  - [ ] 8.1 Write unit tests for `aadhaarValidator.js`
    - Known-valid Aadhaar numbers pass; known-invalid (wrong checksum, wrong length, non-numeric) fail; masking output format is correct
    - _Requirements: 3.3, 3.4, 3.5_
  - [ ]* 8.2 Write property test for phone validation — Property 1
    - **Property 1: phone validation accepts only +91 + 10 digits**
    - **Validates: Requirements 1.2, 1.3**
    - Extract `validatePhone(s)` helper from `AuthPage.js`; use `fc.string()` and compare result against `/^\+91[0-9]{10}$/` regex
  - [ ]* 8.3 Write property test for OTP validation — Property 2
    - **Property 2: OTP accepts only 6-digit numeric strings**
    - **Validates: Requirements 2.2**
    - Extract `validateOtp(s)` helper; use `fc.string()` and compare against `/^[0-9]{6}$/`
  - [ ]* 8.4 Write property test for `speakText` voice mapping — Property 5
    - **Property 5: correct Polly voice per language code**
    - **Validates: Requirements 8.1, 8.2, 8.3**
    - Mock the `post` call to capture the request body; use `fc.constantFrom(['en-IN','Kajal'],['hi-IN','Aditi'])` and assert `body.voiceId` and `body.languageCode`

- [ ] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- fast-check is the property-based testing library (compatible with react-scripts / Jest)
- Each property test references a numbered property from the design document
- `Amplify.configure` must be called exactly once (in `index.js`) — do not re-add it to `amplifyApi.js`
- `aws_user_pools_id` and `aws_user_pools_web_client_id` are placeholders; replace with real Cognito values before deploying
