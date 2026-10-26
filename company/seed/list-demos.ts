import { DEMO_PRESETS, demoPreset } from "./demo-presets";
import { STYLE_PRESETS } from "../../packages/database/src/constants/theme";

console.table(
  DEMO_PRESETS.map((id) => {
    const preset = demoPreset(id);
    return {
      preset: id,
      style: preset.style,
      catalogue: preset.website.collection?.slug,
      modules: preset.modules.filter((m) => m.isEnabled).length,
    };
  }),
);
console.log(
  "Choose: pnpm db:reset --demo <preset>\nStyle override: --style <style>\nStyles: " +
    STYLE_PRESETS.map((s) => s.id).join(", "),
);
