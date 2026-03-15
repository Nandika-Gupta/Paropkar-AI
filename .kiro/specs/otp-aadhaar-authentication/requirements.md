# Requirements Document

## Introduction

This feature adds an authentication layer to the Paropkar AI React application. Users must verify their identity via a phone number OTP (one-time password) sent via SMS, and optionally verify their Aadhaar card number, before accessing the main application. Authentication is backed by Amazon Cognito (phone number as username, SMS MFA). The feature also fixes three known bugs in the existing codebase: a broken emoji in the app header, incorrect voice IDs in the TTS function, and a duplicated local calculator function.

## Glossary

- **Auth_Page**: The authentication screen rendered before the main app, handling phone entry, OTP verification, and Aadhaar verification.
- **Cognito**: Amazon Cognito User Pool configured with phone number sign-in and SMS-based OTP delivery.
- **OTP**: One-time password — a 6-digit numeric code sent via SMS to the user's registered phone number.
- **Aadhaar**: A 12-digit unique identification number issued by UIDAI to Indian residents.
- **Aadhaar_Validator**: The client-side module responsible for validating the format and Verhoeff checksum of an Aadhaar number.
- **Auth_State**: The current authentication status of the session — one of: `unauthenticated`, `otp_sent`, `otp_verified`, `authenticated`.
- **Session**: A Cognito-issued authenticated session persisted in browser storage via AWS Amplify.
- **App**: The main Paropkar AI React application (Tracker, Scanner, Voice, Dashboard tabs).
- **SMS_Provider**: Amazon SNS, used by Cognito to deliver OTP messages.
- **Voice_Service**: The `speakText` function in `amplifyApi.js` that calls Amazon Polly via Lambda.

---

## Requirements

### Requirement 1: Phone Number Entry

**User Story:** As a user, I want to enter my Indian mobile number to receive an OTP, so that I can begin the sign-in process.

#### Acceptance Criteria

1. THE Auth_Page SHALL display a phone number input field pre-filled with the `+91` country code prefix.
2. WHEN a user submits a phone number, THE Auth_Page SHALL validate that the number matches the pattern `+91` followed by exactly 10 digits.
3. IF the submitted phone number does not match the required pattern, THEN THE Auth_Page SHALL display an inline error message without submitting to Cognito.
4. WHEN a valid phone number is submitted, THE Auth_Page SHALL call the Cognito sign-in flow and transition Auth_State to `otp_sent`.
5. WHILE the Cognito request is in-flight, THE Auth_Page SHALL display a loading indicator and disable the submit button.
6. IF the Cognito sign-in call fails, THEN THE Auth_Page SHALL display the error message returned by Cognito and remain on the phone entry screen.

---

### Requirement 2: OTP Verification

**User Story:** As a user, I want to enter the OTP I received via SMS, so that I can prove ownership of my phone number.

#### Acceptance Criteria

1. WHEN Auth_State is `otp_sent`, THE Auth_Page SHALL display a 6-digit OTP input field.
2. THE Auth_Page SHALL restrict the OTP input field to numeric characters only, with a maximum length of 6.
3. WHEN a user submits a 6-digit OTP, THE Auth_Page SHALL confirm the sign-in challenge with Cognito.
4. WHILE the Cognito confirmation request is in-flight, THE Auth_Page SHALL display a loading indicator and disable the submit button.
5. IF the submitted OTP is incorrect or expired, THEN THE Auth_Page SHALL display an error message and allow the user to re-enter the OTP.
6. WHEN Cognito confirms the OTP successfully, THE Auth_Page SHALL transition Auth_State to `otp_verified`.
7. THE Auth_Page SHALL display a "Resend OTP" option that becomes active 30 seconds after the initial OTP was sent.
8. WHEN the user activates "Resend OTP", THE Auth_Page SHALL initiate a new Cognito sign-in request for the same phone number and reset the 30-second timer.

---

### Requirement 3: Aadhaar Number Verification

**User Story:** As a user, I want to verify my Aadhaar number, so that the app can confirm my identity as an Indian resident.

#### Acceptance Criteria

1. WHEN Auth_State is `otp_verified`, THE Auth_Page SHALL display an Aadhaar number input field.
2. THE Auth_Page SHALL restrict the Aadhaar input to numeric characters only, with a maximum length of 12.
3. WHEN a user submits an Aadhaar number, THE Aadhaar_Validator SHALL verify that the number is exactly 12 digits and passes the Verhoeff checksum algorithm.
4. IF the Aadhaar number fails format or checksum validation, THEN THE Auth_Page SHALL display an inline error message without making any network request.
5. WHEN the Aadhaar number passes client-side validation, THE Auth_Page SHALL store a masked representation (first 8 digits replaced with `XXXX XXXX`) in the Cognito user attributes via Amplify.
6. WHEN Aadhaar verification completes successfully, THE Auth_Page SHALL transition Auth_State to `authenticated` and render the App.
7. THE Auth_Page SHALL provide a "Skip Aadhaar" option that transitions Auth_State to `authenticated` without storing Aadhaar data.

---

### Requirement 4: Session Persistence

**User Story:** As a user, I want my authenticated session to persist across page reloads, so that I do not have to sign in every time I open the app.

#### Acceptance Criteria

1. WHEN Auth_State is `authenticated`, THE Session SHALL be persisted in browser storage by AWS Amplify.
2. WHEN the App loads, THE Auth_Page SHALL check for an existing valid Session before rendering the phone entry screen.
3. IF a valid Session exists on load, THEN THE Auth_Page SHALL transition directly to `authenticated` and render the App without prompting the user.
4. THE App SHALL display a sign-out control accessible from the main header.
5. WHEN the user activates sign-out, THE Auth_Page SHALL call the Cognito sign-out API, clear the Session, and transition Auth_State to `unauthenticated`.

---

### Requirement 5: Cognito and Amplify Configuration

**User Story:** As a developer, I want Cognito configured correctly in the Amplify setup, so that authentication works alongside the existing REST API.

#### Acceptance Criteria

1. THE Auth_Page SHALL configure a Cognito User Pool with phone number as the primary sign-in attribute and SMS OTP as the MFA method.
2. THE `aws-exports.js` file SHALL include `aws_user_pools_id`, `aws_user_pools_web_client_id`, and `aws_cognito_region` fields alongside the existing `aws_cloud_logic_custom` configuration.
3. THE App SHALL call `Amplify.configure` with the updated `aws-exports.js` once at startup, preserving the existing REST API configuration.
4. IF `aws-exports.js` is missing required Cognito fields, THEN THE Auth_Page SHALL display a configuration error message and prevent the sign-in flow from starting.

---

### Requirement 6: Authentication UI Design

**User Story:** As a user, I want the authentication page to match the visual style of the existing app, so that the experience feels consistent.

#### Acceptance Criteria

1. THE Auth_Page SHALL use the same dark background (`#0b1120`), color palette, and font family (`Playfair Display` serif for headings) as the existing App.
2. THE Auth_Page SHALL display the Paropkar AI logo and app name in the header, consistent with the existing App header.
3. THE Auth_Page SHALL be responsive and fit within a 480px maximum width, matching the existing App layout.
4. WHEN Auth_State transitions between steps, THE Auth_Page SHALL animate the transition using a fade-in effect of 200ms duration.

---

### Requirement 7: Fix — Broken Emoji in App Header

**User Story:** As a developer, I want the broken emoji character in the App header fixed, so that the logo renders correctly.

#### Acceptance Criteria

1. THE App header logo `div` SHALL render a valid, visible emoji character (🤝) in place of the current broken character sequence.
2. WHEN the App is rendered in any modern browser, THE App header logo SHALL display the emoji without showing replacement characters (`???` or `□`).

---

### Requirement 8: Fix — Incorrect Voice IDs in speakText

**User Story:** As a developer, I want the `speakText` function to use the correct Amazon Polly voice for each language, so that text-to-speech output matches the selected language.

#### Acceptance Criteria

1. WHEN `speakText` is called with `language` set to `"en-IN"`, THE Voice_Service SHALL use the Polly voice ID `"Kajal"` (Indian English).
2. WHEN `speakText` is called with `language` set to `"hi-IN"`, THE Voice_Service SHALL use the Polly voice ID `"Aditi"` (Hindi).
3. THE Voice_Service SHALL pass the selected `voiceId` and `languageCode` as distinct fields in the Lambda request body.

---

### Requirement 9: Fix — Remove Duplicate localCalc Function

**User Story:** As a developer, I want the duplicate deadline calculation logic removed, so that there is a single source of truth for offline deadline calculation.

#### Acceptance Criteria

1. THE App SHALL contain exactly one implementation of the offline deadline calculation logic.
2. THE `localCalc` function in `App.js` SHALL be removed, and all call sites in `App.js` SHALL be updated to use the `calculateDeadline` export from `amplifyApi.js`.
3. WHEN `calculateDeadline` is called and the Cognito or Lambda request fails, THE `amplifyApi.js` module SHALL fall back to the `localCalculate` function already defined within it.
