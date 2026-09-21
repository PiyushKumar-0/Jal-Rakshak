import { CitizenReport, IssueCategory, ReportRiskScore, WardInfo, WaterAsset } from '../types';

/**
 * JalRakshak AI Rule Engine & NLP Classifier
 * Supports Hindi, Hinglish, and English text/voice signals
 */

interface ClassificationResult {
  category: IssueCategory;
  severityCues: {
    colorChange: boolean;
    smellPresent: boolean;
    foulTaste: boolean;
    childrenAffected: boolean;
    chronicDays: number;
  };
  inferredAffectedHouseholds: number;
}

export function classifyTextAndExtractEntities(text: string): ClassificationResult {
  const lower = text.toLowerCase();

  // Keyword flags for Hindi & English
  const colorKeywords = ['colour', 'color', 'peela', 'laal', 'kala', 'ganda', 'turbid', 'dirty', 'lal', 'pila', 'brown', 'रंग', 'पीला', 'मैला', 'गंदा'];
  const smellKeywords = ['smell', 'odor', 'odour', 'badbu', 'badboo', 'stink', 'दुर्गंध', 'बदबू', 'सड़ा'];
  const tasteKeywords = ['taste', 'kadwa', 'namkeen', 'खारा', 'कड़वा', 'स्वाद'];
  const childKeywords = ['child', 'children', 'bacche', 'school', 'anganwadi', 'बच्चे', 'स्कूल', 'आंगनवाड़ी'];
  const sicknessKeywords = ['diarrhea', 'vomiting', 'dast', 'ulti', 'bukhar', 'fever', 'bimar', 'ill', 'sick', 'दस्त', 'उल्टी', 'बुखार', 'बीमार'];
  const leakageKeywords = ['leak', 'pipe', 'burst', 'gushing', 'futa', 'toota', 'bah raha', 'रिसाव', 'टूटा', 'पाइप', 'बह'];
  const supplyKeywords = ['no water', 'supply', 'dry', 'kam pani', 'tanki khali', 'sukha', 'आपूर्ति', 'पानी नहीं', 'सूखा'];
  const handpumpKeywords = ['handpump', 'handle', 'pump', 'boring', 'nal', 'हैंडपंप', 'नल', 'बोरिंग'];

  const colorChange = colorKeywords.some(kw => lower.includes(kw));
  const smellPresent = smellKeywords.some(kw => lower.includes(kw));
  const foulTaste = tasteKeywords.some(kw => lower.includes(kw));
  const childrenAffected = childKeywords.some(kw => lower.includes(kw));
  const sicknessReported = sicknessKeywords.some(kw => lower.includes(kw));
  const leakageReported = leakageKeywords.some(kw => lower.includes(kw));
  const supplyReported = supplyKeywords.some(kw => lower.includes(kw));
  const handpumpReported = handpumpKeywords.some(kw => lower.includes(kw));

  // Determine category
  let category: IssueCategory = 'smell_colour';
  if (sicknessReported) {
    category = 'illness_cluster';
  } else if (leakageReported) {
    category = 'leakage';
  } else if (handpumpReported) {
    category = 'handpump_failure';
  } else if (supplyReported) {
    category = 'low_supply';
  } else if (colorChange || smellPresent || foulTaste) {
    category = 'smell_colour';
  }

  // Duration extraction
  let chronicDays = 1;
  if (lower.includes('3 din') || lower.includes('3 days') || lower.includes('तीन दिन')) chronicDays = 3;
  if (lower.includes('hafta') || lower.includes('week') || lower.includes('सप्ताह')) chronicDays = 7;

  let inferredAffectedHouseholds = 5;
  if (lower.includes('pura mohalla') || lower.includes('pure ward') || lower.includes('entire ward')) inferredAffectedHouseholds = 60;
  else if (lower.includes('gali') || lower.includes('street') || lower.includes('several houses')) inferredAffectedHouseholds = 20;

  return {
    category,
    severityCues: {
      colorChange,
      smellPresent,
      foulTaste,
      childrenAffected,
      chronicDays,
    },
    inferredAffectedHouseholds,
  };
}

/**
 * Mathematical scoring function defined in Section 5.3 of Project Plan:
 * Priority = (0.35 * Risk + 0.25 * Severity + 0.20 * Persistence + 0.20 * Reach) * (1 + 0.30 * Vulnerability), capped at 100
 * Risk = 0.6 * max(quality, supply, infra) + 0.4 * mean(quality, supply, infra)
 */
export function calculateRiskAndPriority(params: {
  category: IssueCategory;
  text: string;
  healthFlag: boolean;
  affectedHouseholds: number;
  ward: WardInfo;
  asset?: WaterAsset;
  recentRainfallMm: number;
  corroboratingReportsCount: number;
  reporterTrustScore: number;
  daysOpen?: number;
}): ReportRiskScore {
  const {
    category,
    healthFlag,
    affectedHouseholds,
    ward,
    asset,
    recentRainfallMm,
    corroboratingReportsCount,
    reporterTrustScore,
    daysOpen = 1,
  } = params;

  const classification = classifyTextAndExtractEntities(params.text);

  // 1. Water Quality Risk (0 - 100)
  let qualityRisk = 20;
  if (category === 'smell_colour') qualityRisk = 65;
  if (category === 'illness_cluster') qualityRisk = 92;
  if (classification.severityCues.colorChange) qualityRisk += 15;
  if (classification.severityCues.smellPresent) qualityRisk += 15;
  if (healthFlag) qualityRisk = Math.max(qualityRisk, 88);
  // Rainfall infiltration impact on low-lying wards
  if (recentRainfallMm > 30 && ward.elevation === 'low_lying') {
    qualityRisk += Math.min(25, recentRainfallMm * 0.3);
  }
  qualityRisk = Math.min(100, Math.max(0, qualityRisk));

  // 2. Supply Risk (0 - 100)
  let supplyRisk = 15;
  if (category === 'low_supply') supplyRisk = 75;
  if (category === 'handpump_failure') supplyRisk = 60;
  if (affectedHouseholds > 30) supplyRisk += 20;
  supplyRisk = Math.min(100, Math.max(0, supplyRisk));

  // 3. Infrastructure Risk (0 - 100)
  let infraRisk = 15;
  if (category === 'leakage') infraRisk = 75;
  if (category === 'handpump_failure') infraRisk = 80;
  if (asset && asset.failureCount > 2) infraRisk += 15;
  infraRisk = Math.min(100, Math.max(0, infraRisk));

  // Combined Risk
  const maxRisk = Math.max(qualityRisk, supplyRisk, infraRisk);
  const meanRisk = (qualityRisk + supplyRisk + infraRisk) / 3;
  const combinedRisk = Math.round(0.6 * maxRisk + 0.4 * meanRisk);

  // 4. Severity (0 - 100)
  let severity = 35;
  if (category === 'illness_cluster' || healthFlag) severity = 95;
  else if (classification.severityCues.childrenAffected) severity = 85;
  else if (classification.severityCues.colorChange && classification.severityCues.smellPresent) severity = 78;
  else if (category === 'leakage') severity = 55;
  else if (category === 'handpump_failure') severity = 60;

  // 5. Persistence (0 - 100)
  // days open and recurrence
  const recurrenceFactor = (asset?.failureCount || 0) * 12;
  const daysFactor = Math.min(daysOpen * 15, 60);
  const persistence = Math.min(100, Math.round(daysFactor + recurrenceFactor + (corroboratingReportsCount * 8)));

  // 6. Reach (0 - 100)
  // affected households divided by ward households normalized
  const reachFraction = Math.min(1, affectedHouseholds / Math.max(50, ward.households));
  const reach = Math.round(reachFraction * 100);

  // 7. Vulnerability (0 to 1)
  // proximity to schools, anganwadis, health centres, plus reported illness
  let vulnerability = ward.vulnerabilityScore; // base ward vulnerability 0.2 - 0.7
  if (healthFlag) vulnerability = Math.min(1, vulnerability + 0.25);
  if (classification.severityCues.childrenAffected) vulnerability = Math.min(1, vulnerability + 0.2);

  // Priority formula calculation
  const weightedSum = (0.35 * combinedRisk) + (0.25 * severity) + (0.20 * persistence) + (0.20 * reach);
  const priorityScore = Math.round(Math.min(100, weightedSum * (1 + 0.30 * vulnerability)));

  // Confidence calculation (combines corroboration, reporter trust, recency)
  let confidence = 0.50;
  if (corroboratingReportsCount >= 2) confidence += 0.22;
  if (corroboratingReportsCount >= 5) confidence += 0.15;
  if (reporterTrustScore > 0.8) confidence += 0.10;
  if (classification.severityCues.colorChange || classification.severityCues.smellPresent) confidence += 0.08;
  if (healthFlag) confidence += 0.05;
  confidence = Math.min(0.96, Math.max(0.32, Number(confidence.toFixed(2))));

  const fastTrack = confidence >= 0.70 && priorityScore >= 65;
  const needsVerificationFirst = confidence < 0.45 || (priorityScore < 50 && !healthFlag);

  // Explainable reasons (Plain English and Hindi sentences)
  const reasonsEn: string[] = [];
  const reasonsHi: string[] = [];

  if (healthFlag) {
    reasonsEn.push(`Health symptoms (diarrhoea/fever) reported in household.`);
    reasonsHi.push(`घर में उल्टी/दस्त/बुखार के लक्षण दर्ज किए गए हैं।`);
  }
  if (corroboratingReportsCount > 1) {
    reasonsEn.push(`Corroborated by ${corroboratingReportsCount} independent nearby reports in ${ward.name}.`);
    reasonsHi.push(`${ward.nameHi} में ${corroboratingReportsCount} अन्य ग्रामीणों द्वारा भी ऐसी ही शिकायत दर्ज।`);
  }
  if (recentRainfallMm > 25 && ward.elevation === 'low_lying') {
    reasonsEn.push(`Recent heavy rain (${recentRainfallMm}mm) elevates groundwater contamination risk in low-lying ward.`);
    reasonsHi.push(`हालिया तेज बारिश (${recentRainfallMm}मिमी) से निचले इलाके में भूजल संदूषण का उच्च जोखिम।`);
  }
  if (ward.hasAnganwadi || ward.hasSchool) {
    reasonsEn.push(`High vulnerability zone: Ward contains active primary school / anganwadi.`);
    reasonsHi.push(`संवेदनशील क्षेत्र: वार्ड में प्राथमिक विद्यालय और आंगनवाड़ी केंद्र स्थित है।`);
  }
  if (asset && asset.failureCount >= 2) {
    reasonsEn.push(`Repeated asset failure: ${asset.name} has failed ${asset.failureCount} times in last 6 months.`);
    reasonsHi.push(`बार-बार खराबी: ${asset.nameHi} पिछले 6 महीनों में ${asset.failureCount} बार खराब हो चुका है।`);
  }
  if (classification.severityCues.colorChange || classification.severityCues.smellPresent) {
    reasonsEn.push(`Organoleptic flags detected: noticeable discolouration or foul odour in potable stream.`);
    reasonsHi.push(`पानी में दुर्गंध अथवा मटमैलेपन का स्पष्ट प्रमाण।`);
  }

  // Recommended Action
  let actionRecommendation = 'Dispatch water quality testing kit & inspect water point.';
  let actionRecommendationHi = 'जल गुणवत्ता परीक्षण किट भेजें और स्रोत का निरीक्षण करें।';

  if (priorityScore >= 80) {
    actionRecommendation = 'EMERGENCY: Halt water usage immediately, dispatch mobile testing team, issue ward boil advisory.';
    actionRecommendationHi = 'आपातकाल: तुरंत पानी का उपयोग रोकें, मोबाइल टेस्टिंग टीम भेजें, वार्ड में उबालकर पीने की एडवाइजरी जारी करें।';
  } else if (category === 'leakage') {
    actionRecommendation = 'Dispatch pipe repair crew with replacement gasket & clamp.';
    actionRecommendationHi = 'पाइपलाइन मरम्मत दल को आवश्यक उपकरणों के साथ तुरंत भेजें।';
  } else if (category === 'handpump_failure') {
    actionRecommendation = 'Assign village mechanic for piston rod & washer replacement.';
    actionRecommendationHi = 'ग्राम मिस्त्री को पिस्टन रॉड और वॉशर बदलने के लिए तैनात करें।';
  }

  return {
    qualityRisk,
    supplyRisk,
    infraRisk,
    combinedRisk,
    severity,
    persistence,
    reach,
    vulnerability: Number(vulnerability.toFixed(2)),
    priorityScore,
    confidence,
    actionRecommendation,
    actionRecommendationHi,
    reasonsEn,
    reasonsHi,
    fastTrack,
    needsVerificationFirst,
  };
}

/**
 * Instant Offline Safety Advice
 * Embedded on-device rules pack that executes immediately even in Airplane mode
 */
export function getOfflineInstantSafetyAdvice(category: IssueCategory, healthFlag: boolean, language: 'hi' | 'en') {
  if (language === 'hi') {
    if (healthFlag || category === 'illness_cluster') {
      return {
        title: '⚠️ अति-आवश्यक स्वास्थ्य चेतावनी',
        advice: 'इस स्रोत का पानी बिल्कुल न पिएं। पीने के पानी को कम से कम 10 मिनट तक खौलाएं या क्लोरीन की गोली (हैलोजेन) डालें। ओआरएस (ORS) घोल पिएं और नजदीकी उप-स्वास्थ्य केंद्र से संपर्क करें।',
        badge: 'तुरंत उबालें (Boil Advisory)',
      };
    }
    if (category === 'smell_colour') {
      return {
        title: '⚠️ तात्कालिक जल सुरक्षा निर्देश',
        advice: 'पानी में दुर्गंध या रंग बदलाव संदूषण का संकेत है। जब तक पंचायत जांच पूरी नहीं करती, इसे पीने या खाना बनाने में इस्तेमाल न करें। कपड़े धोने या सफाई हेतु इस्तेमाल कर सकते हैं।',
        badge: 'पीने से बचें',
      };
    }
    if (category === 'leakage') {
      return {
        title: 'ℹ️ रिसाव सुरक्षा निर्देश',
        advice: 'रिसाव के पास गड्ढे का गंदा पानी पाइप में प्रवेश कर सकता है। पाइप के पास जमा पानी को साफ रखें। शिकायत ऑफलाइन कतार में दर्ज हो गई है।',
        badge: 'जल संरक्षण अलर्ट',
      };
    }
    return {
      title: 'ℹ️ ऑफलाइन शिकायत सुरक्षित',
      advice: 'आपकी शिकायत फोन में सुरक्षित है। इंटरनेट मिलते ही पंचायत सर्वर पर अपने आप सिंक हो जाएगी।',
      badge: 'सुरक्षित ड्राफ्ट',
    };
  }

  // English
  if (healthFlag || category === 'illness_cluster') {
    return {
      title: '⚠️ Critical Health Notice',
      advice: 'Do NOT consume this water directly. Boil drinking water vigorously for at least 10 minutes or use chlorine water purification tablets. Administer ORS for dehydration and consult the nearest Health Sub-Centre immediately.',
      badge: 'Boil Advisory Active',
    };
  }
  if (category === 'smell_colour') {
    return {
      title: '⚠️ Precautionary Safety Guidance',
      advice: 'Odour or discolouration indicates biological or sediment ingress. Avoid drinking or cooking until panchayat testing is verified. Safe for non-potable secondary use.',
      badge: 'Do Not Drink Direct',
    };
  }
  if (category === 'leakage') {
    return {
      title: 'ℹ️ Leakage Safety Notice',
      advice: 'Back-siphonage can introduce contamination into low-pressure lines. Keep the area around the leak clear of stagnant mud. Report queued for field mechanic.',
      badge: 'Leak Alert Queued',
    };
  }
  return {
    title: 'ℹ️ Offline Draft Saved',
    advice: 'Your report is safely stored in local memory. It will automatically transmit to the Panchayat cockpit when network reconnects.',
    badge: 'Draft Saved Locally',
  };
}
