import { z } from "zod";

export const productFactsSchema = z.object({
  name: z.string().min(1).max(120),
  price: z.string().min(1).max(40),
  features: z.array(z.string().min(1).max(120)).min(1).max(12),
  location: z.string().max(120).optional(),
  hours: z.string().max(120).optional(),
  ingredients: z.array(z.string().min(1).max(80)).max(20).optional(),
});

export type ProductFactsForm = z.infer<typeof productFactsSchema>;

export const defaultProductFactsValues: ProductFactsForm = {
  name: "Clean Protein Powder",
  price: "$49.99",
  features: [
    "24g protein per serving",
    "Zero fillers",
    "Mixes smoothly in water or milk",
  ],
  location: "Bogotá, Colombia",
  hours: "Mon–Sat 8am–8pm",
  ingredients: ["Whey isolate", "Natural vanilla", "Stevia"],
};