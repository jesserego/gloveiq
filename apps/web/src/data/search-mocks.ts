export type SearchResult = {
  id: string;
  record_type: "variant" | "glove" | "artifact";
  title: string;
  subtitle: string;
  thumbnail?: string;
  chips: string[];
};

export type VariantProfileRecord = {
  id: string;
  title: string;
  subtitle: string;
  brand: string;
  model: string;
  pattern: string;
  hand: string;
  size: string;
  web: string;
  throwSide: string;
  year?: number;
};

export type GloveProfileRecord = {
  id: string;
  title: string;
  subtitle: string;
  brand: string;
  line: string;
  pattern: string;
  size: string;
  condition: string;
  year?: number;
};

export const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    id: "var_wilson_1786_2024",
    record_type: "variant",
    title: "Wilson A2000 1786 2024",
    subtitle: "Variant profile",
    chips: ["Wilson", "1786", "RHT", "11.5", "I-Web", "2024"],
  },
  {
    id: "glove_ss_11652109",
    record_type: "glove",
    title: "Rawlings HOH PROCM33-23",
    subtitle: "User-submitted glove",
    chips: ["Rawlings", "PROCM33-23", "RHT", "33.0", "CM", "Used"],
  },
  {
    id: "var_rawlings_pro200_2023",
    record_type: "variant",
    title: "Rawlings Pro Preferred PRO200 2023",
    subtitle: "Variant profile",
    chips: ["Rawlings", "PRO200", "RHT", "11.5", "H-Web", "2023"],
  },
];

