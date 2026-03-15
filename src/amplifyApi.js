import { post } from "aws-amplify/api";
import { signUp, confirmSignUp, resendSignUpCode } from "aws-amplify/auth";

const API_NAME = "paropkarAI"; // matches aws-exports.js

// Calculate apply-by date via Lambda
export async function calculateDeadline({ certType, state, scholarshipDeadline }) {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/deadline/calculate",
      options: { body: { startDate: scholarshipDeadline, daysToAdd: 0, certType, state, scholarshipDeadline } },
    }).response;
    await res.body.json();
    return localCalculate(certType, state, scholarshipDeadline); // use local until backend logic is tuned
  } catch (err) {
    console.error("calculateDeadline error:", err);
    return localCalculate(certType, state, scholarshipDeadline);
  }
}

// Save reminder to DynamoDB via Lambda
export async function saveReminder({ userId, certType, state, scholarshipDeadline, applyByDate }) {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/reminders",
      options: { body: { userId, title: `${certType} renewal`, deadline: applyByDate, notes: `State: ${state}, Scholarship deadline: ${scholarshipDeadline}` } },
    }).response;
    return await res.body.json();
  } catch (err) {
    console.error("saveReminder error:", err);
    const reminders = JSON.parse(localStorage.getItem("paropkar_reminders") || "[]");
    reminders.push({ certType, state, scholarshipDeadline, applyByDate, pending: true });
    localStorage.setItem("paropkar_reminders", JSON.stringify(reminders));
    return { success: true, offline: true };
  }
}

// Send photo to Textract via Lambda
export async function scanCertificate(base64Image) {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/scan",
      options: { body: { imageBase64: base64Image } },
    }).response;
    return await res.body.json();
  } catch (err) {
    console.error("scanCertificate error:", err);
    throw err;
  }
}

// Polly text-to-speech via Lambda
export async function speakText(text, language = "hi-IN") {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/speak",
      options: { body: { text, voiceId: language === "en-IN" ? "Kajal" : "Aditi", languageCode: language } },
    }).response;
    const data = await res.body.json();
    const audioBytes = Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0));
    const blob = new Blob([audioBytes], { type: "audio/mpeg" });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
    return audio;
  } catch (err) {
    console.error("speakText error:", err);
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      window.speechSynthesis.speak(utterance);
    }
  }
}

// Offline fallback deadline calculator
const PROCESSING_TIMES = {
  Karnataka:       { income_certificate: 15, caste_certificate: 10, domicile_certificate: 12 },
  "Uttar Pradesh": { income_certificate: 25, caste_certificate: 20, domicile_certificate: 22 },
  Maharashtra:     { income_certificate: 18, caste_certificate: 15, domicile_certificate: 16 },
  "Tamil Nadu":    { income_certificate: 14, caste_certificate: 12, domicile_certificate: 13 },
  Bihar:           { income_certificate: 28, caste_certificate: 22, domicile_certificate: 25 },
  Rajasthan:       { income_certificate: 20, caste_certificate: 17, domicile_certificate: 18 },
  "West Bengal":   { income_certificate: 20, caste_certificate: 16, domicile_certificate: 18 },
  Gujarat:         { income_certificate: 16, caste_certificate: 13, domicile_certificate: 14 },
};

function localCalculate(certType, state, scholarshipDeadline) {
  const procDays = (PROCESSING_TIMES[state] || {})[certType] || 20;
  const deadline = new Date(scholarshipDeadline);
  const applyBy = new Date(deadline);
  applyBy.setDate(applyBy.getDate() - procDays - 3);
  return {
    applyByDate: applyBy.toISOString().split("T")[0],
    processingDays: procDays,
    daysLeft: Math.ceil((applyBy - new Date()) / (1000 * 60 * 60 * 24)),
    offline: true,
  };
}

// Groq AI reasoning — generates renewal instructions and conversational responses
export async function askGroq(message, language = "hi-IN") {
  try {
    const res = await post({
      apiName: API_NAME,
      path: "/groq",
      options: { body: { message, language } },
    }).response;
    return await res.body.json();
  } catch (err) {
    console.error("askGroq error:", err);
    // Offline fallback
    return {
      text: "आपका certificate जल्द expire होने वाला है। Tahsildar office जाएं।",
      opts: ["Income Certificate", "Caste Certificate", "Domicile Certificate"]
    };
  }
}

function sanitizeAadhaar(aadhaarNumber) {
  return String(aadhaarNumber || "").replace(/\D/g, "");
}

function buildUsernameFromAadhaar(aadhaarNumber) {
  return `aadhaar_${sanitizeAadhaar(aadhaarNumber)}`;
}

export function isValidAadhaar(aadhaarNumber) {
  return /^\d{12}$/.test(sanitizeAadhaar(aadhaarNumber));
}

export function isValidPhoneE164(phoneNumber) {
  return /^\+[1-9]\d{7,14}$/.test(String(phoneNumber || "").trim());
}

export async function sendAadhaarOtp({ aadhaarNumber, phoneNumber }) {
  const normalizedAadhaar = sanitizeAadhaar(aadhaarNumber);
  const normalizedPhone = String(phoneNumber || "").trim();

  if (!isValidAadhaar(normalizedAadhaar)) {
    throw new Error("Aadhaar must be exactly 12 digits.");
  }

  if (!isValidPhoneE164(normalizedPhone)) {
    throw new Error("Phone must be in E.164 format, e.g. +919876543210.");
  }

  const username = buildUsernameFromAadhaar(normalizedAadhaar);
  const tempPassword = `Aadhaar#${normalizedAadhaar.slice(-4)}@2026`;

  try {
    const out = await signUp({
      username,
      password: tempPassword,
      options: {
        userAttributes: {
          phone_number: normalizedPhone,
          preferred_username: normalizedAadhaar,
        },
      },
    });

    return {
      username,
      destination: out?.nextStep?.codeDeliveryDetails?.destination || normalizedPhone,
      message: "OTP sent successfully.",
    };
  } catch (err) {
    if (err?.name === "UsernameExistsException") {
      await resendSignUpCode({ username });
      return {
        username,
        destination: normalizedPhone,
        message: "OTP resent successfully.",
      };
    }
    throw err;
  }
}

export async function verifyAadhaarOtp({ aadhaarNumber, otpCode }) {
  const normalizedAadhaar = sanitizeAadhaar(aadhaarNumber);
  const normalizedOtp = String(otpCode || "").trim();
  const username = buildUsernameFromAadhaar(normalizedAadhaar);

  if (!isValidAadhaar(normalizedAadhaar)) {
    throw new Error("Aadhaar must be exactly 12 digits.");
  }

  if (!/^\d{4,8}$/.test(normalizedOtp)) {
    throw new Error("Enter a valid OTP code.");
  }

  const result = await confirmSignUp({ username, confirmationCode: normalizedOtp });
  return {
    username,
    isVerified: result?.isSignUpComplete === true,
    nextStep: result?.nextStep || null,
  };
}
