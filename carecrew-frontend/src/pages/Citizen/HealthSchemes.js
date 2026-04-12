import React, { useState } from "react";

// ── Scheme data ────────────────────────────────────────────────────────────────
const SCHEMES = [
  {
    id: "pmjay",
    name: "PM Jan Arogya Yojana (PM-JAY)",
    shortName: "PM-JAY",
    type: "national",
    benefit: "₹5 lakh",
    benefitLabel: "annual health cover per family",
    covers: "Secondary & tertiary hospitalisation — 1,393+ procedures covered",
    howToApply:
      "Visit nearest Ayushman Bharat empanelled hospital or Common Service Centre with Aadhaar card",
    center: "Gandhi Hospital, KEM Hospital, Nair Hospital",
    eligibility: (a) => a.income === "bpl" || a.income === "low",
  },
  {
    id: "jsy",
    name: "Janani Suraksha Yojana (JSY)",
    shortName: "JSY",
    type: "national",
    benefit: "₹1,000 – ₹1,400",
    benefitLabel: "cash incentive for institutional delivery",
    covers: "Pregnant women — especially BPL & SC/ST families",
    howToApply:
      "Register at nearest government health centre or ANM during pregnancy",
    center: "Urban Health Centre, Dharavi / Andheri",
    eligibility: (a) =>
      a.gender === "female" &&
      a.pregnant === "yes" &&
      (a.income === "bpl" || a.income === "low"),
  },
  {
    id: "pmmvy",
    name: "Pradhan Mantri Matru Vandana Yojana",
    shortName: "PMMVY",
    type: "national",
    benefit: "₹5,000",
    benefitLabel: "maternity benefit for first live birth",
    covers: "Pregnant & lactating women for their first child",
    howToApply:
      "Submit Form 1A at Anganwadi Centre or health facility within 150 days of LMP",
    center: "ICDS Anganwadi Centres across wards",
    eligibility: (a) => a.gender === "female" && a.pregnant === "yes",
  },
  {
    id: "rbsk",
    name: "Rashtriya Bal Swasthya Karyakram (RBSK)",
    shortName: "RBSK",
    type: "national",
    benefit: "Free",
    benefitLabel: "screening & treatment for children 0–18 yrs",
    covers: "4D conditions: defects, deficiencies, diseases, developmental delays",
    howToApply:
      "Mobile health teams screen at schools & Anganwadis — no registration needed",
    center: "District Early Intervention Centre (DEIC), KEM Hospital",
    eligibility: (a) => a.children !== "0",
  },
  {
    id: "ncd",
    name: "National Programme for NCD Control",
    shortName: "NCD Programme",
    type: "national",
    benefit: "Free",
    benefitLabel: "screening, medicines & follow-up for NCDs",
    covers:
      "Diabetes, hypertension, cancer (incl. cervical for women), COPD — adults 30+",
    howToApply:
      "Walk in to any government health & wellness centre for free screening",
    center: "Health & Wellness Centre, ward-level PHCs",
    eligibility: (a) => parseInt(a.age) >= 30,
  },
  {
    id: "oap",
    name: "Indira Gandhi National Old Age Pension",
    shortName: "Old Age Pension",
    type: "national",
    benefit: "₹200 – ₹500/month",
    benefitLabel: "monthly pension for senior citizens",
    covers: "BPL individuals — women 58+, men 60+",
    howToApply:
      "Apply via ward office or Common Service Centre with age proof & BPL ration card",
    center: "Ward Office — Social Welfare Department",
    eligibility: (a) => {
      const age = parseInt(a.age);
      const threshold = a.gender === "female" ? 58 : 60;
      return age >= threshold && a.income === "bpl";
    },
  },
  {
    id: "mjpjay",
    name: "Mahatma Jyotiba Phule Jan Arogya Yojana",
    shortName: "MJP-JAY",
    type: "state",
    benefit: "₹1.5 lakh",
    benefitLabel: "annual cover (₹2.5L for kidney transplant cases)",
    covers: "971 surgeries & therapies at govt & empanelled private hospitals",
    howToApply:
      "Show Yellow / Orange ration card at any empanelled hospital front desk",
    center: "JJ Hospital, Lokmanya Tilak Municipal General Hospital",
    eligibility: (a) =>
      a.state === "mh" && (a.income === "bpl" || a.income === "low"),
  },
];

// ── Official links ─────────────────────────────────────────────────────────────
const OFFICIAL_LINKS = {
  pmjay: "https://pmjay.gov.in",
  jsy: "https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309",
  pmmvy: "https://pmmvy.wcd.gov.in",
  rbsk: "https://rbsk.gov.in",
  ncd: "https://main.mohfw.gov.in/major-programmes/non-communicable-diseases",
  oap: "https://nsap.nic.in",
  mjpjay: "https://www.jeevandayee.gov.in",
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 13,
        padding: "6px 14px",
        borderRadius: 20,
        border: selected ? "1.5px solid #3B5BDB" : "1px solid #d0d5dd",
        background: selected ? "#EEF2FF" : "#fff",
        color: selected ? "#3B5BDB" : "#667085",
        fontWeight: selected ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function TypeBadge({ type }) {
  const isNational = type === "national";
  return (
    <span
      style={{
        fontSize: 11,
        padding: "3px 10px",
        borderRadius: 20,
        background: isNational ? "#EEF2FF" : "#FFF4E5",
        color: isNational ? "#3B5BDB" : "#D97706",
        fontWeight: 600,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {isNational ? "Central" : "Maharashtra"}
    </span>
  );
}

function SchemeCard({ scheme }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #E4E7EC",
        padding: "20px 24px",
        marginBottom: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#101828", marginBottom: 2 }}>
            {scheme.name}
          </div>
          <div style={{ fontSize: 12, color: "#98A2B3" }}>{scheme.shortName}</div>
        </div>
        <TypeBadge type={scheme.type} />
      </div>

      {/* Benefit */}
      <div style={{ fontSize: 26, fontWeight: 800, color: "#3B5BDB", lineHeight: 1.1 }}>
        {scheme.benefit}
      </div>
      <div style={{ fontSize: 12, color: "#667085", marginTop: 2, marginBottom: 14 }}>
        {scheme.benefitLabel}
      </div>

      {/* Info grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "#98A2B3", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Who it covers
          </div>
          <div style={{ fontSize: 13, color: "#344054" }}>{scheme.covers}</div>
        </div>
        {expanded && (
          <div>
            <div style={{ fontSize: 11, color: "#98A2B3", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              How to apply
            </div>
            <div style={{ fontSize: 13, color: "#344054" }}>{scheme.howToApply}</div>
          </div>
        )}
      </div>

      {/* Nearest centre */}
      {expanded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#F0FDF4",
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 14 }}>📍</span>
          <div>
            <span style={{ fontSize: 11, color: "#15803D", fontWeight: 600 }}>
              Nearest SMC Centre:{" "}
            </span>
            <span style={{ fontSize: 12, color: "#166534" }}>{scheme.center}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          borderTop: "1px solid #F2F4F7",
          paddingTop: 14,
          marginTop: 4,
        }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: 13,
            padding: "7px 18px",
            borderRadius: 8,
            border: "1.5px solid #3B5BDB",
            background: expanded ? "#3B5BDB" : "#fff",
            color: expanded ? "#fff" : "#3B5BDB",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {expanded ? "Show less" : "View details"}
        </button>
        <a
          href={OFFICIAL_LINKS[scheme.id]}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 13,
            padding: "7px 18px",
            borderRadius: 8,
            border: "1px solid #E4E7EC",
            background: "#fff",
            color: "#667085",
            fontWeight: 500,
            cursor: "pointer",
            textDecoration: "none",
            transition: "all 0.15s",
          }}
        >
          Official site ↗
        </a>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HealthSchemes() {
  const [answers, setAnswers] = useState({
    age: "",
    gender: "",
    income: "",
    pregnant: "",
    children: "",
    state: "",
  });
  const [results, setResults] = useState(null);
  const [checked, setChecked] = useState(false);

  const showPregnant = answers.gender === "female" || answers.gender === "other";

  const totalQuestions = showPregnant ? 6 : 5;
  const filledCount = [
    answers.age,
    answers.gender,
    answers.income,
    showPregnant ? answers.pregnant : "skip",
    answers.children,
    answers.state,
  ].filter(Boolean).length;
  const progress = Math.round((filledCount / totalQuestions) * 100);
  const canCheck = filledCount >= totalQuestions;

  function setAnswer(key, val) {
    const next = { ...answers, [key]: val };
    if (key === "gender" && val === "male") next.pregnant = "no";
    setAnswers(next);
    setChecked(false);
    setResults(null);
  }

  function checkEligibility() {
    const matched = SCHEMES.filter((s) => s.eligibility(answers));
    setResults(matched);
    setChecked(true);
  }

  function reset() {
    setAnswers({ age: "", gender: "", income: "", pregnant: "", children: "", state: "" });
    setResults(null);
    setChecked(false);
  }

  const questions = [
    {
      num: 1,
      label: "What is your age?",
      content: (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="number"
            min={0}
            max={120}
            placeholder="e.g. 35"
            value={answers.age}
            onChange={(e) => setAnswer("age", e.target.value)}
            style={{
              fontSize: 14,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #d0d5dd",
              width: 110,
              color: "#101828",
              outline: "none",
            }}
          />
          <span style={{ fontSize: 13, color: "#98A2B3" }}>years</span>
        </div>
      ),
    },
    {
      num: 2,
      label: "Gender",
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { val: "male", label: "Male" },
            { val: "female", label: "Female" },
            { val: "other", label: "Other" },
          ].map((o) => (
            <Chip
              key={o.val}
              label={o.label}
              selected={answers.gender === o.val}
              onClick={() => setAnswer("gender", o.val)}
            />
          ))}
        </div>
      ),
    },
    {
      num: 3,
      label: "Annual household income",
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { val: "bpl", label: "Below poverty line (BPL)" },
            { val: "low", label: "₹1–5 lakh/year" },
            { val: "mid", label: "₹5–10 lakh/year" },
            { val: "high", label: "Above ₹10 lakh" },
          ].map((o) => (
            <Chip
              key={o.val}
              label={o.label}
              selected={answers.income === o.val}
              onClick={() => setAnswer("income", o.val)}
            />
          ))}
        </div>
      ),
    },
    ...(showPregnant
      ? [
          {
            num: 4,
            label: "Are you currently pregnant?",
            content: (
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { val: "yes", label: "Yes" },
                  { val: "no", label: "No" },
                ].map((o) => (
                  <Chip
                    key={o.val}
                    label={o.label}
                    selected={answers.pregnant === o.val}
                    onClick={() => setAnswer("pregnant", o.val)}
                  />
                ))}
              </div>
            ),
          },
        ]
      : []),
    {
      num: showPregnant ? 5 : 4,
      label: "Number of children (aged 0–18)",
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { val: "0", label: "None" },
            { val: "1", label: "1 child" },
            { val: "2", label: "2 children" },
            { val: "3+", label: "3 or more" },
          ].map((o) => (
            <Chip
              key={o.val}
              label={o.label}
              selected={answers.children === o.val}
              onClick={() => setAnswer("children", o.val)}
            />
          ))}
        </div>
      ),
    },
    {
      num: showPregnant ? 6 : 5,
      label: "State of residence",
      content: (
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { val: "mh", label: "Maharashtra" },
            { val: "other", label: "Other state" },
          ].map((o) => (
            <Chip
              key={o.val}
              label={o.label}
              selected={answers.state === o.val}
              onClick={() => setAnswer("state", o.val)}
            />
          ))}
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#101828", margin: 0 }}>
          Health Schemes
        </h1>
        <p style={{ fontSize: 14, color: "#667085", marginTop: 4 }}>
          Check which national & Maharashtra government schemes you're eligible for
        </p>
      </div>

      {/* Checker card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #E4E7EC",
          padding: "24px 28px",
          marginBottom: 28,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* Card header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🩺</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#101828" }}>
              Eligibility Checker
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 10px",
                borderRadius: 20,
                background: "#EEF2FF",
                color: "#3B5BDB",
                fontWeight: 600,
              }}
            >
              {totalQuestions} questions
            </span>
          </div>
          {checked && (
            <button
              onClick={reset}
              style={{
                fontSize: 12,
                color: "#667085",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 4,
            background: "#F2F4F7",
            borderRadius: 4,
            marginBottom: 24,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #4C6EF5, #3B5BDB)",
              borderRadius: 4,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Questions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {questions.map((q) => (
            <div key={q.num}>
              <div
                style={{
                  fontSize: 13,
                  color: "#344054",
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                {q.num}. {q.label}
              </div>
              {q.content}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={checkEligibility}
          disabled={!canCheck}
          style={{
            marginTop: 24,
            padding: "10px 28px",
            borderRadius: 10,
            border: "none",
            background: canCheck
              ? "linear-gradient(135deg, #4C6EF5 0%, #3B5BDB 100%)"
              : "#F2F4F7",
            color: canCheck ? "#fff" : "#98A2B3",
            fontSize: 14,
            fontWeight: 700,
            cursor: canCheck ? "pointer" : "not-allowed",
            transition: "all 0.2s",
            boxShadow: canCheck ? "0 2px 8px rgba(59,91,219,0.25)" : "none",
          }}
        >
          Check my eligibility →
        </button>
      </div>

      {/* Results */}
      {checked && results !== null && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: "#101828" }}>
              Schemes you qualify for
            </span>
            <span
              style={{
                fontSize: 12,
                padding: "3px 12px",
                borderRadius: 20,
                background: results.length > 0 ? "#DCFCE7" : "#FEE2E2",
                color: results.length > 0 ? "#15803D" : "#DC2626",
                fontWeight: 600,
              }}
            >
              {results.length} {results.length === 1 ? "scheme" : "schemes"}
            </span>
          </div>

          {results.length === 0 ? (
            <div
              style={{
                background: "#FFF7ED",
                borderRadius: 16,
                border: "1px solid #FED7AA",
                padding: "28px 24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#92400E", marginBottom: 6 }}>
                No schemes matched your profile
              </div>
              <div style={{ fontSize: 13, color: "#B45309" }}>
                Visit your nearest SMC centre for personalised guidance on available benefits.
              </div>
            </div>
          ) : (
            results.map((s) => <SchemeCard key={s.id} scheme={s} />)
          )}
        </div>
      )}
    </div>
  );
}