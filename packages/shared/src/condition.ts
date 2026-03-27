export const GLOVE_CONDITION_WEIGHTS = {
  structure: 0.30,
  leather: 0.25,
  palm: 0.20,
  laces: 0.15,
  cosmetics: 0.10,
} as const;

export type GloveConditionFactor = keyof typeof GLOVE_CONDITION_WEIGHTS;

export type GloveConditionInput = Record<GloveConditionFactor, number>;

export type GloveConditionLabel =
  | "Brand New / Factory Mint"
  | "Like New"
  | "Excellent"
  | "Well Maintained Gamer"
  | "Solid Used"
  | "Heavily Used"
  | "Very Worn"
  | "Poor / Needs Repair"
  | "Very Poor / Display Only"
  | "Destroyed";

export const GLOVE_CONDITION_LABELS: Array<{ min: number; label: GloveConditionLabel }> = [
  { min: 9.5, label: "Brand New / Factory Mint" },
  { min: 8.5, label: "Like New" },
  { min: 7.5, label: "Excellent" },
  { min: 6.5, label: "Well Maintained Gamer" },
  { min: 5.5, label: "Solid Used" },
  { min: 4.5, label: "Heavily Used" },
  { min: 3.5, label: "Very Worn" },
  { min: 2.5, label: "Poor / Needs Repair" },
  { min: 1.5, label: "Very Poor / Display Only" },
  { min: 1.0, label: "Destroyed" },
];

function round(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function clampFactorScore(value: number) {
  return Math.max(1, Math.min(10, value));
}

export function gloveConditionLabelFromScore(conditionScore: number): GloveConditionLabel {
  const clamped = Math.max(1, Math.min(10, conditionScore));
  return GLOVE_CONDITION_LABELS.find((entry) => clamped >= entry.min)?.label || "Destroyed";
}

export function scoreGloveCondition(scores: GloveConditionInput) {
  const normalizedScores = {
    structure: clampFactorScore(Number(scores.structure)),
    leather: clampFactorScore(Number(scores.leather)),
    palm: clampFactorScore(Number(scores.palm)),
    laces: clampFactorScore(Number(scores.laces)),
    cosmetics: clampFactorScore(Number(scores.cosmetics)),
  };

  const weightedPoints = {
    structure: round(normalizedScores.structure * GLOVE_CONDITION_WEIGHTS.structure * 10, 2),
    leather: round(normalizedScores.leather * GLOVE_CONDITION_WEIGHTS.leather * 10, 2),
    palm: round(normalizedScores.palm * GLOVE_CONDITION_WEIGHTS.palm * 10, 2),
    laces: round(normalizedScores.laces * GLOVE_CONDITION_WEIGHTS.laces * 10, 2),
    cosmetics: round(normalizedScores.cosmetics * GLOVE_CONDITION_WEIGHTS.cosmetics * 10, 2),
  };

  const rawScore = round(
    weightedPoints.structure
      + weightedPoints.leather
      + weightedPoints.palm
      + weightedPoints.laces
      + weightedPoints.cosmetics,
    2,
  );
  const conditionScore = round(Math.max(1, Math.min(10, rawScore / 10)), 1);

  return {
    rawScore,
    conditionScore,
    label: gloveConditionLabelFromScore(conditionScore),
    weights: GLOVE_CONDITION_WEIGHTS,
    weightedPoints,
    normalizedScores,
  };
}
