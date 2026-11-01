import Schema from '@deepseek-ai/schemastery';
export const name = 'dsh-latex-macros';
export const Config = Schema.object({
  enabled: Schema.boolean().default(true).volatile(),
  macrosJson: Schema.string().default('{}').volatile(),
});
export function apply(ctx) {
  ctx.inject(['settings'], child => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
}
