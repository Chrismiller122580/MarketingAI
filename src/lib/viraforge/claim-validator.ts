import type { ProductFactsForm } from "@/lib/schemas/product-facts-schema";

export type ClaimValidationResult = {
  valid: boolean;
  violations: string[];
};

const NUMBER_PATTERN = /\d+(?:\.\d+)?\s*(?:g|mg|ml|oz|%|grams?|milligrams?)/gi;

function extractNumbers(text: string): string[] {
  return (text.match(NUMBER_PATTERN) ?? []).map((n) => n.toLowerCase().replace(/\s+/g, ""));
}

export function validateQuoteAgainstFacts(
  quote: string,
  facts: ProductFactsForm,
): ClaimValidationResult {
  const violations: string[] = [];
  const allowedText = [
    facts.name,
    facts.price,
    ...facts.features,
    facts.location ?? "",
    facts.hours ?? "",
    ...(facts.ingredients ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const quoteNumbers = extractNumbers(quote);
  const allowedNumbers = extractNumbers(allowedText);

  for (const num of quoteNumbers) {
    if (!allowedNumbers.includes(num)) {
      violations.push(`Numeric claim "${num}" is not in verified product facts`);
    }
  }

  const forbiddenPatterns = [
    /cures?/i,
    /guarantee/i,
    /fda approved/i,
    /clinically proven/i,
    /100% natural/i,
    /no side effects/i,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(quote)) {
      violations.push(`Phrase matches restricted pattern: ${pattern.source}`);
    }
  }

  if (quote.length > 0 && facts.features.length > 0) {
    const mentionsProduct =
      quote.toLowerCase().includes(facts.name.toLowerCase()) ||
      facts.features.some((f) =>
        quote.toLowerCase().includes(f.toLowerCase().slice(0, 12)),
      );
    if (!mentionsProduct && quoteNumbers.length > 0) {
      violations.push("Quote cites numbers but does not reference verified product or features");
    }
  }

  return { valid: violations.length === 0, violations };
}

export function formatFactsForPrompt(facts: ProductFactsForm): string {
  return [
    `Product: ${facts.name}. Price: ${facts.price}.`,
    `Verified features (ONLY these may be mentioned): ${facts.features.join("; ")}.`,
    facts.location ? `Location: ${facts.location}.` : "",
    facts.hours ? `Hours: ${facts.hours}.` : "",
    facts.ingredients?.length
      ? `Ingredients: ${facts.ingredients.join(", ")}.`
      : "",
    "Never add health claims, benefits, or specs beyond this list.",
  ]
    .filter(Boolean)
    .join(" ");
}