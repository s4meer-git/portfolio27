import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  // CMS entries provide the runtime content; keep the schema for shared component types.
  loader: async () => [],
  schema: () =>
    z.object({
      pubDatetime: z.date(),
      series: z.string().optional(),
      image: z.string().optional(),
      title: z.string(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      category: z.string(),
      description: z.string(),
    }),
});

const projects = defineCollection({
  loader: async () => [],
  schema: () =>
    z.object({
      name: z.string(),
      technologies: z.array(z.string()),
      description: z.string(),
      image: z.string().optional(),
      sourceCode: z.string().optional(),
      preview: z.string().optional(),
      type: z.union([z.literal("core"), z.literal("side")]),
    }),
});

export const collections = { blog, projects };
