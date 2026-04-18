// Kidney Stone AI Clinical Decision Support Service
// This is a simulated AI service for demonstration purposes

export interface AIAnalysis {
  likelihood: "Low" | "Moderate" | "High" | "Very High";
  likelihoodScore: number; // 0-100
  stoneTypes: StoneTypeProbability[];
  recommendedTests: string[];
  urgencyLevel: "Routine" | "Semi-urgent" | "Urgent" | "Emergency";
  urgencyRationale: string;
  clinicalFindings: string[];
  treatmentConsiderations: string[];
  differentialDiagnoses: string[];
  summary: string;
}

interface StoneTypeProbability {
  type: string;
  probability: string;
  description: string;
}

const KIDNEY_STONE_KEYWORDS = {
  pain: ["flank pain", "loin pain", "colicky pain", "groin pain", "radiating pain", "severe pain", "back pain", "side pain", "sharp pain", "stabbing pain"],
  urinary: ["hematuria", "blood in urine", "cloudy urine", "dark urine", "red urine", "burning urination", "dysuria", "frequency", "urgency", "oliguria"],
  systemic: ["nausea", "vomiting", "fever", "chills", "diaphoresis", "sweating", "malaise"],
  imaging: ["ct scan", "ultrasound", "x-ray", "kub", "stone", "calculus", "calcification", "hydronephrosis", "obstruction"],
  labs: ["calcium", "uric acid", "oxalate", "creatinine", "elevated", "crystals", "ph", "pyuria"],
  risk: ["dehydration", "gout", "hyperparathyroidism", "inflammatory bowel", "family history", "prior stones", "recurrent"],
};

function scoreSymptoms(text: string): number {
  const lowerText = text.toLowerCase();
  let score = 0;

  Object.entries(KIDNEY_STONE_KEYWORDS).forEach(([category, keywords]) => {
    const categoryWeight = category === "pain" ? 25 : category === "urinary" ? 20 : category === "imaging" ? 30 : 10;
    let categoryMatched = false;
    keywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        if (!categoryMatched) {
          score += categoryWeight;
          categoryMatched = true;
        }
      }
    });
  });

  return Math.min(score, 100);
}

function determineLikelihood(score: number): AIAnalysis["likelihood"] {
  if (score >= 80) return "Very High";
  if (score >= 55) return "High";
  if (score >= 30) return "Moderate";
  return "Low";
}

function determineUrgency(text: string, score: number): { level: AIAnalysis["urgencyLevel"]; rationale: string } {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("fever") ||
    lowerText.includes("sepsis") ||
    lowerText.includes("complete obstruction") ||
    lowerText.includes("bilateral") ||
    lowerText.includes("solitary kidney") ||
    lowerText.includes("anuric") ||
    lowerText.includes("anuria")
  ) {
    return {
      level: "Emergency",
      rationale: "Signs of infection with obstruction, bilateral obstruction, or compromised renal function — immediate urological intervention required.",
    };
  }

  if (
    lowerText.includes("severe") ||
    lowerText.includes("vomiting") ||
    lowerText.includes("hydronephrosis") ||
    lowerText.includes("obstruction") ||
    score >= 75
  ) {
    return {
      level: "Urgent",
      rationale: "Significant symptoms or imaging evidence of obstruction — same-day urology assessment recommended.",
    };
  }

  if (score >= 45) {
    return {
      level: "Semi-urgent",
      rationale: "Moderate symptom burden consistent with kidney stone — urology review within 24–48 hours advisable.",
    };
  }

  return {
    level: "Routine",
    rationale: "Symptoms do not suggest imminent complication — outpatient workup appropriate.",
  };
}

function determineStoneTypes(text: string): StoneTypeProbability[] {
  const lowerText = text.toLowerCase();
  const types: StoneTypeProbability[] = [];

  // Calcium Oxalate (most common ~80%)
  const calciumScore =
    (lowerText.includes("calcium") ? 20 : 0) +
    (lowerText.includes("oxalate") ? 20 : 0) +
    (lowerText.includes("spinach") || lowerText.includes("nuts") || lowerText.includes("chocolate") ? 10 : 0) +
    (lowerText.includes("hyperparathyroid") ? 15 : 0) +
    (!lowerText.includes("uric acid") && !lowerText.includes("gout") ? 30 : 0);

  types.push({
    type: "Calcium Oxalate",
    probability: calciumScore > 50 ? "High (50–70%)" : "Moderate (30–50%)",
    description: "Most common stone type. Associated with hypercalciuria, hyperoxaluria, and hypocitraturia.",
  });

  // Uric Acid
  if (lowerText.includes("uric acid") || lowerText.includes("gout") || lowerText.includes("radiolucent") || lowerText.includes("acidic urine") || lowerText.includes("low ph")) {
    types.push({
      type: "Uric Acid",
      probability: "High (40–60%)",
      description: "Radiolucent on plain X-ray. Associated with gout, low urine pH, and metabolic syndrome.",
    });
  } else {
    types.push({
      type: "Uric Acid",
      probability: "Low (5–10%)",
      description: "Radiolucent stones associated with hyperuricosuria and persistently acidic urine.",
    });
  }

  // Struvite
  if (lowerText.includes("infection") || lowerText.includes("uti") || lowerText.includes("urease") || lowerText.includes("alkaline urine") || lowerText.includes("staghorn")) {
    types.push({
      type: "Struvite (Infection Stone)",
      probability: "Moderate (20–35%)",
      description: "Caused by urease-producing organisms. Staghorn morphology. Requires antibiotic treatment alongside stone removal.",
    });
  }

  // Calcium Phosphate
  if (lowerText.includes("alkaline") || lowerText.includes("phosphate") || lowerText.includes("high ph") || lowerText.includes("rta")) {
    types.push({
      type: "Calcium Phosphate (Apatite)",
      probability: "Moderate (15–25%)",
      description: "Associated with alkaline urine, primary hyperparathyroidism, and distal renal tubular acidosis.",
    });
  }

  // Cystine
  if (lowerText.includes("cystine") || lowerText.includes("cystinuria") || lowerText.includes("young") || lowerText.includes("recurrent since childhood")) {
    types.push({
      type: "Cystine",
      probability: "Low (1–5%)",
      description: "Rare hereditary disorder. Recurrent stones from childhood. Ground-glass appearance on CT.",
    });
  }

  return types;
}

function extractClinicalFindings(text: string): string[] {
  const lowerText = text.toLowerCase();
  const findings: string[] = [];

  if (lowerText.includes("flank pain") || lowerText.includes("loin pain") || lowerText.includes("side pain")) {
    findings.push("Flank/loin pain — classic presentation of renal colic");
  }
  if (lowerText.includes("hematuria") || lowerText.includes("blood in urine") || lowerText.includes("red urine")) {
    findings.push("Hematuria — present in ~85% of renal colic cases");
  }
  if (lowerText.includes("nausea") || lowerText.includes("vomiting")) {
    findings.push("Nausea/vomiting — common autonomic response to severe pain");
  }
  if (lowerText.includes("fever")) {
    findings.push("⚠️ Fever — raises concern for infected obstructed kidney (urological emergency)");
  }
  if (lowerText.includes("hydronephrosis")) {
    findings.push("Hydronephrosis on imaging — indicates urinary tract obstruction");
  }
  if (lowerText.includes("stone") || lowerText.includes("calculus")) {
    findings.push("Calculus identified on imaging");
  }
  if (lowerText.includes("cloudy urine") || lowerText.includes("pyuria")) {
    findings.push("Pyuria/cloudy urine — rule out concurrent UTI");
  }
  if (lowerText.includes("radiating") || lowerText.includes("groin")) {
    findings.push("Pain radiating to groin — typical of ureteric stone migration");
  }
  if (lowerText.includes("cvat") || lowerText.includes("costovertebral angle") || lowerText.includes("cva tenderness")) {
    findings.push("Costovertebral angle tenderness on examination");
  }
  if (lowerText.includes("dysuria") || lowerText.includes("burning")) {
    findings.push("Dysuria — stone at vesicoureteric junction or concurrent infection");
  }

  if (findings.length === 0) {
    findings.push("Insufficient specific clinical descriptors provided — consider expanding symptom description");
  }

  return findings;
}

function generateRecommendedTests(text: string, score: number): string[] {
  const lowerText = text.toLowerCase();
  const tests: string[] = [];

  // Core investigations
  tests.push("Non-contrast CT KUB (gold standard — 95–98% sensitivity for stones)");
  tests.push("Urinalysis with microscopy (haematuria, crystals, pH, infection screen)");
  tests.push("Urine culture and sensitivity (if infection suspected)");
  tests.push("Serum creatinine, eGFR, electrolytes (renal function baseline)");
  tests.push("Serum calcium, phosphate, uric acid (metabolic workup)");
  tests.push("FBC / CBC (leucocytosis if infected obstruction suspected)");

  if (!lowerText.includes("ct") && !lowerText.includes("imaging")) {
    tests.push("Renal ultrasound (if CT unavailable or radiation concern — especially in pregnancy)");
  }

  if (score >= 55 || lowerText.includes("recurrent") || lowerText.includes("prior stones")) {
    tests.push("24-hour urine collection (oxalate, citrate, calcium, uric acid) — for metabolic evaluation");
    tests.push("PTH (parathyroid hormone) — if serum calcium elevated");
  }

  if (lowerText.includes("gout") || lowerText.includes("uric acid")) {
    tests.push("Serum uric acid level");
    tests.push("Urine uric acid excretion");
  }

  return tests;
}

function generateTreatmentConsiderations(text: string, score: number, urgency: AIAnalysis["urgencyLevel"]): string[] {
  const considerations: string[] = [];

  if (urgency === "Emergency" || urgency === "Urgent") {
    considerations.push("Emergency urology consultation — urgent decompression may be required (stent/nephrostomy)");
    considerations.push("IV access and fluid resuscitation");
    considerations.push("IV analgesia (NSAIDs contraindicated in renal impairment — consider opioids)");
  } else {
    considerations.push("IV/oral hydration — target urine output >2L/day");
    considerations.push("Analgesia: NSAIDs (ketorolac, diclofenac) first-line if no contraindications");
    considerations.push("Alpha-1 blocker (Tamsulosin 0.4mg) — medical expulsive therapy for stones ≤10mm");
  }

  considerations.push("Anti-emetics if nausea/vomiting present");
  considerations.push("Stone straining — collect stone for composition analysis");
  considerations.push("Urology referral for stones >10mm or failed medical expulsive therapy");
  considerations.push("Dietary advice: increased fluid intake, low sodium, moderate protein, limit high-oxalate foods");
  considerations.push("Follow-up CT/ultrasound to confirm stone passage");

  return considerations;
}

function generateDifferentialDiagnoses(text: string): string[] {
  const lowerText = text.toLowerCase();
  const differentials = [
    "Acute pyelonephritis",
    "Renal infarction",
    "Appendicitis (right-sided pain)",
    "Ovarian cyst / ectopic pregnancy (female patients)",
    "Musculoskeletal back pain",
    "Aortic aneurysm (must exclude in older patients)",
  ];

  if (lowerText.includes("left")) {
    differentials.push("Diverticulitis");
  }

  return differentials;
}

export async function analyzeKidneyStoneSymptoms(userMessage: string): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

  const score = scoreSymptoms(userMessage);
  const likelihood = determineLikelihood(score);
  const { level: urgencyLevel, rationale: urgencyRationale } = determineUrgency(userMessage, score);
  const stoneTypes = determineStoneTypes(userMessage);
  const clinicalFindings = extractClinicalFindings(userMessage);
  const recommendedTests = generateRecommendedTests(userMessage, score);
  const treatmentConsiderations = generateTreatmentConsiderations(userMessage, score, urgencyLevel);
  const differentialDiagnoses = generateDifferentialDiagnoses(userMessage);

  const urgencyEmoji =
    urgencyLevel === "Emergency"
      ? "🚨"
      : urgencyLevel === "Urgent"
        ? "⚠️"
        : urgencyLevel === "Semi-urgent"
          ? "🟡"
          : "🟢";

  const likelihoodEmoji =
    likelihood === "Very High" ? "🔴" : likelihood === "High" ? "🟠" : likelihood === "Moderate" ? "🟡" : "🟢";

  const response = `## Kidney Stone Clinical Assessment

${likelihoodEmoji} **Likelihood of Nephrolithiasis:** ${likelihood} (Clinical Score: ${score}/100)

${urgencyEmoji} **Urgency Level:** ${urgencyLevel}
> ${urgencyRationale}

---

### 📋 Clinical Findings Identified
${clinicalFindings.map((f) => `- ${f}`).join("\n")}

---

### 🪨 Probable Stone Composition
${stoneTypes
  .map(
    (st) => `**${st.type}**
   - Probability: ${st.probability}
   - ${st.description}`
  )
  .join("\n\n")}

---

### 🔬 Recommended Investigations
${recommendedTests.map((t, i) => `${i + 1}. ${t}`).join("\n")}

---

### 💊 Treatment Considerations
${treatmentConsiderations.map((t, i) => `${i + 1}. ${t}`).join("\n")}

---

### 🔄 Differential Diagnoses to Consider
${differentialDiagnoses.map((d) => `- ${d}`).join("\n")}

---

> **⚕️ Clinical Decision Support Disclaimer:** This analysis is generated by an algorithmic tool and is intended to assist — not replace — clinical judgement. It should not be used as a definitive diagnosis. Always correlate with full clinical assessment, patient history, and validated investigations. Treatment decisions remain the sole responsibility of the treating clinician.`;

  return response;
}

export function generateWelcomeMessage(): string {
  return `## Kidney Stone Clinical Decision Support

Welcome. I'm an AI-powered clinical decision support tool designed to help assess kidney stone (nephrolithiasis) presentations.

**How to use this tool:**
Describe your patient's symptoms and clinical findings in natural language. Include relevant details such as:

- **Pain:** Location, character, severity (1–10), radiation pattern
- **Urinary symptoms:** Haematuria, dysuria, frequency, urine colour/clarity
- **Systemic symptoms:** Fever, nausea, vomiting, rigors
- **Imaging findings:** CT, ultrasound, X-ray results if available
- **Lab results:** Urinalysis, creatinine, calcium, uric acid levels
- **Risk factors:** Prior stones, gout, dehydration, family history, dietary habits

**Example prompt:**
*"54-year-old male with sudden onset severe right flank pain 9/10 radiating to groin, gross haematuria, nausea and vomiting. CT KUB shows 5mm stone in right ureter with mild hydronephrosis. Creatinine normal."*

I will provide:
- Likelihood assessment of nephrolithiasis
- Probable stone type analysis
- Recommended investigations
- Urgency level and treatment considerations

> **⚕️ Disclaimer:** This is a clinical decision-support tool, not a diagnostic instrument. All findings must be validated by a qualified clinician.`;
}
