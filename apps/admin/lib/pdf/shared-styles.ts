import { Font } from "@react-pdf/renderer";
import path from "path";

// Every generated document uses Thmanyah only (registered once per server process).
try {
  const fontDir = path.resolve(process.cwd(), "public/fonts");
  Font.register({
    family: "Thmanyah Sans",
    fonts: [
      { src: path.join(fontDir, "ThmanyahSans-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(fontDir, "ThmanyahSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  // Arabic and English words are never hyphenated.
  Font.registerHyphenationCallback((word) => [word]);
} catch (e) {
  console.warn("Could not register the Thmanyah Sans font for PDF", e);
}
