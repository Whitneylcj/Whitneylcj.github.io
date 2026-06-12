import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const news = defineCollection({
  loader: glob({ base: "./src/content/news", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    externalUrl: z.string().url().optional(),
    featured: z.boolean().default(false)
  })
});

export const collections = { news };
