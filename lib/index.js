// src/index.js
import Schema from "@deepseek-ai/schemastery";
var name = "dsh-latex-macros";
var Config = Schema.object({
  enabled: Schema.boolean().default(true).volatile(),
  macrosJson: Schema.string().default("{}").volatile()
});
function apply(ctx) {
  ctx.inject(["settings"], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
}
export {
  Config,
  apply,
  name
};
