import type { StringValue } from "ms";
import ms from "ms";
import z from "zod";

export type Ingredient = string;
export type CookType = string;

const MsStringSchema: z.ZodType<StringValue> = z
	.string()
	.refine(
		(value) => {
			try {
				return typeof ms(value as StringValue) === "number";
			} catch {
				return false;
			}
		},
		{ message: "Invalid time format" },
	)
	.transform((value) => value as StringValue);

export const RecipeSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	ingredients: z.array(z.string().min(1)).min(1).max(5),
	cookType: z.string().min(1),
	timeToComplete: MsStringSchema,
	pointsCompleted: z.number().min(0),
	pointsExpired: z.number().max(0),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const OrderStatusSchema = z.enum(["pending", "completed", "expired"]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderSchema = z.object({
	id: z.string().min(1),
	recipe: RecipeSchema,
	createdAt: z.number(),
	expiresAt: z.number(),
	status: OrderStatusSchema,
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderSpawnSchema = z.tuple([MsStringSchema, z.string().min(1)]);

export type OrderSpawn = z.infer<typeof OrderSpawnSchema>;

export const ConfigSchema = z
	.object({
		recipes: z.array(RecipeSchema).min(1),
		sequence: z.array(OrderSpawnSchema).min(1),
	})
	.superRefine((config, ctx) => {
		const recipeIds = new Set<string>();
		config.recipes.forEach((recipe, index) => {
			if (recipeIds.has(recipe.id)) {
				ctx.addIssue({
					code: "custom",
					path: ["recipes", index],
					message: `Receita com id duplicado: "${recipe.id}"`,
				});
			}
			recipeIds.add(recipe.id);
		});
		config.sequence.forEach((item, index) => {
			const recipeId = item[1];
			if (!recipeIds.has(recipeId)) {
				ctx.addIssue({
					code: "custom",
					path: ["sequence", index],
					message: `Receita com id "${recipeId}" não existe`,
				});
			}
		});
	});

export type Config = z.infer<typeof ConfigSchema>;
