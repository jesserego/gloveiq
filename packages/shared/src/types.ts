import type { BrandKey, ObjectType, VerificationStatus } from "./enums";

export type BrandConfig = {
  brand_key: BrandKey;
  display_name: string;
  country_hint?: string;
  supports_variant_ai: boolean;
};

export type PhotoKind = "HERO"|"PALM"|"BACK"|"HEEL"|"LINER"|"WRIST_PATCH"|"STAMPS";

export type Artifact = {
  id: string;
  object_type: ObjectType;

  brand_key?: BrandKey | null;
  family?: string | null;
  model_code?: string | null;

  made_in?: string | null;
  position?: string | null;
  size_in?: number | null;

  verification_status?: VerificationStatus | null;

  condition_score?: number | null;

  valuation_estimate?: number | null;
  valuation_low?: number | null;
  valuation_high?: number | null;
  listing_url?: string | null;
  source?: string | null;

  photos?: Array<{ id: string; url: string; kind: PhotoKind }>;
};
