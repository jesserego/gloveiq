export type Locale = "en" | "ja";
export const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    "app.title": "GloveIQ",
    "tab.search": "Search",
    "tab.artifact": "Artifact",
    "tab.appraisal": "Appraisal",
    "tab.account": "Account",
    "tab.pricing": "Pricing",
    "search.placeholder": "Paste listing link, model, or Artifact ID",
    "search.results": "Results",
    "artifact.detail": "Artifact Detail",
    "common.value": "Value",
    "common.photos": "Photos",
    "common.available_now": "Available Right Now",
    "pricing.title": "Plans",
    "pricing.subtitle": "Choose a plan that fits how deep you go.",
    "pricing.cta": "Start free",
    "upload.title": "Upload photos",
    "upload.subtitle": "Add evidence to improve ID and tighten valuation.",
  },
  ja: {
    "app.title": "GloveIQ",
    "tab.search": "検索",
    "tab.artifact": "アーティファクト",
    "tab.appraisal": "査定",
    "tab.account": "アカウント",
    "tab.pricing": "料金",
    "search.placeholder": "リンク、モデル、または Artifact ID を入力",
    "search.results": "結果",
    "artifact.detail": "詳細",
    "common.value": "価値",
    "common.photos": "写真",
    "common.available_now": "購入候補",
    "pricing.title": "プラン",
    "pricing.subtitle": "使い方に合ったプランを選択。",
    "pricing.cta": "無料で開始",
    "upload.title": "写真を追加",
    "upload.subtitle": "証拠を追加して識別精度と査定幅を改善。",
  },
};
export function t(locale: Locale, key: string): string {
  return STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
}
