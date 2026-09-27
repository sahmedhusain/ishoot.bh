const fs = require("fs");
const path = require("path");

const enPath = path.join(__dirname, "../packages/locales/src/en.json");
const arPath = path.join(__dirname, "../packages/locales/src/ar.json");

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const ar = JSON.parse(fs.readFileSync(arPath, "utf8"));

// Clean up redundant Ar suffix keys in en.json so en.json is 100% English
en.services.aerial.titleAr = "Heavy-Lift & FPV Aerial Capture (Arabic Title)";
en.services.aerial.descAr = "Licensed Bahrain civil aviation drone operations capturing monumental landscapes and dynamic chases.";
en.services.aerial.specsAr = ["Heavy-Lift RED Drone", "Custom FPV Pro Rigs", "Dual-Operator Control"];

en.services.color.titleAr = "DaVinci Resolve HDR Color Grading (Arabic Title)";
en.services.color.descAr = "Dedicated post-production color suite equipped with reference OLED mastering displays.";
en.services.color.specsAr = ["DaVinci Studio Cloud", "Sony BVM Reference Monitor", "ACES & Dolby Vision"];

en.services.sectionLabelAr = "Production Capabilities";
en.services.headlineAr = "Limitless Cinema Craft";
en.services.subtitleAr = "Complete end-to-end visual execution from script to 8K cinematography and color mastering.";

// Clean up redundant En suffix keys in ar.json so ar.json is 100% Arabic
ar.services.aerial.titleEn = "تصوير جوي سينمائي وFPV احترافي (عنوان إنجليزي)";
ar.services.aerial.descEn = "عمليات تصوير جوي مرخصة من شؤون الطيران المدني لتوثيق المشاريع المعمارية والصناعية ومطاردات السيارات الحماسية.";
ar.services.aerial.specs = ["طائرات درون تحمل ريد", "طائرات FPV سريعة", "تحكم ثنائي بالملاحة والكاميرا"];

ar.services.color.titleEn = "تصحيح ألوان سينمائي في استوديو دافينشي (عنوان إنجليزي)";
ar.services.color.descEn = "استوديو تصحيح ألوان متقدم مزود بشاشات ماسترينغ سينمائية لمعايرة الألوان السينمائية وتصدير ماستر 4K/HDR.";
ar.services.color.specs = ["سحابة دافينشي ستوديو", "شاشة مرجعية سوني", "معايرة دولبي فيجن وACES"];

ar.services.sectionLabelEn = "القدرات والخدمات الإنتاجية";
ar.services.headlineEn = "قدرات سينمائية بلا حدود";
ar.services.subtitleEn = "نوفر منظومة إنتاج سينمائي متكاملة من الفكرة والسيناريو، إلى التصوير بكاميرات 8K، وتصحيح الألوان في الاستوديو.";

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n");
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2) + "\n");

console.log("Successfully sanitized suffix keys in en.json and ar.json!");
