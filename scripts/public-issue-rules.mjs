// WHY  What makes a public issue look internal (the criteria of krizaka-internal's README) is a list of words per category.
//      It lives here as data, apart from the scan that reads the issues, so a person can read and extend it.
// WHAT RULES: per category (security, fraud, pricing, infra, legal, founder) the signals that flag a TITLE, the signals that
//      count in a BODY and the number `min` of body hits needed. LABEL_HINTS: the labels that point to a category.
//      A signal is a term of scripts/signal-match.mjs, or a named RegExp when a term cannot say it.
// HOW  Imported by scripts/scan-public-issues.mjs; nothing to run. Tests: tests/scan-public-issues.test.mjs, tests/signal-match.test.mjs.
// OWNER krizaka/.github (lane platform; criteria: the security lane), ADR-026 phase D.

/** `vulnerab` not right after a count (« 0 vulnerabilities » is a zero, not a finding). */
export const VULNERABILITY_NOT_COUNTED = /(?<!\d )vulnerab/;
/** A Sonar summary title with at least one vulnerability: « static analysis findings (22 bugs, 59 vulnerabilities) ». */
export const SONAR_WITH_VULNERABILITIES = /static analysis findings \(\d+ bugs?, [1-9]\d* vulnerab/;
/** « 29 $ », « $29 ». */
export const DOLLAR_AMOUNT = /\d ?\$|\$ ?\d/;
/** An IPv4 address. */
export const IPV4_ADDRESS = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
/** `nyc1`, `nyc3`: a DigitalOcean region. */
export const NYC_REGION = /\bnyc\d\b/;
/** `ssh` followed by a space or a line break: a shell command. */
export const SSH_COMMAND = /\bssh\s/;

export const RULES = {
  security: {
    title: [
      "bug(security)",
      "^security|",
      VULNERABILITY_NOT_COUNTED,
      "|cve|",
      "|leak",
      "exposed",
      "unauthenticated",
      "not verified server",
      "faille",
      "|secret|",
      "|secrets|",
      "bypass",
      SONAR_WITH_VULNERABILITIES,
    ],
    body: ["vulnerab", "exploit", "bypass", "unauthenticated", "not verified", "|idor|", "|ssrf|", "|xss|", "|csrf|", "to rotate", "was exposed"],
    min: 3,
  },
  fraud: {
    title: [
      "fraud",
      "tamper",
      "forensic",
      "screening",
      "tampered corpus",
      "|recall|",
      "false?positive",
      "faux?positif",
      "risk engine",
      "antiabuse",
      "anti?abuse",
      "authenticity signal",
    ],
    body: ["|recall|", "false?positive", "faux?positif", "|overlay", "pasted image", "jpeg edit", "evasion", "tampered corpus"],
    min: 2,
  },
  pricing: {
    title: [
      ...["|pric", "|prix|", "tarif", "|offer|", "|offers|", "|offre", "$", "|cost|", "|costs|", "coût", "budget", "competit"],
      ...["concurren", "comparison", "margin", "marge", "sponsor", "commercial", "strategy", "stratég", "finops", "revenue", "service levels"],
    ],
    body: [DOLLAR_AMOUNT, "competitor", "concurrent", "|margin", "|marge|", "|mrr|", "usd a month", "/month"],
    min: 3,
  },
  infra: {
    title: [
      "|dns|",
      "bucket",
      "digitalocean",
      "droplet",
      "account key",
      "account api key",
      "connection budget",
      "trusted sources",
      "object?storage",
      "porkbun",
      "|vpc|",
      "firewall",
      "pgbouncer",
    ],
    body: [IPV4_ADDRESS, "droplet", "doctl", "|tor1|", NYC_REGION, "storage zone", "kubeconfig", SSH_COMMAND, "secret name", "_api_key|"],
    min: 3,
  },
  legal: {
    title: ["|legal|", "lawyer", "avocat", "law25", "law 25", "loi25", "loi 25", "|efvp|", "privacy impact", "|isms|", "|pims|", "claim (held)", "counsel", "civil code"],
    body: ["lawyer", "avocat", "legal risk", "risque juridique", "risque légal", "liabilit", "privacy impact", "|efvp|"],
    min: 2,
  },
  founder: {
    title: ["oussama", "founder", "fondateur", "|neq|", "|bank|", "banque", "insurance", "assurance", "invoice", "sign the contract", "approve the"],
    body: ["bank account", "compte bancaire", "|neq|", "insurance", "contract with", "signed contract", "payout account"],
    min: 2,
  },
};

export const LABEL_HINTS = {
  "area:security": "security",
  "area:legal": "legal",
  "area:compliance": "legal",
  "oussama-action": "founder",
  "owner:oussama": "founder",
};
