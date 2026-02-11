export const BRAND_ENUM = [
  "RAWLINGS","WILSON","MIZUNO","EASTON","MARUCCI","FRANKLIN","LOUISVILLE_SLUGGER","NIKE",
  "FORTY_FOUR","SSK","ADIDAS","JAX","NAKONA","YARDLEY","HATAKEYAMA","ZETT","STUDIO_RYU",
  "HI_GOLD","ATOMS","IP_SELECT","DONAIYA","FIVE_BASEBALL","XANAX_BASEBALL","KUBOTA_SLUGGER",
] as const;
export type BrandKey = (typeof BRAND_ENUM)[number];

export const VERIFICATION_STATUS = ["Unverified","Community Verified","Maker Verified","Provenance Verified"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[number];

export const OBJECT_TYPE = ["CATALOGED_MODEL","ARTIFACT"] as const;
export type ObjectType = (typeof OBJECT_TYPE)[number];
