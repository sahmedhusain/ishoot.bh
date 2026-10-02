const fs = require('fs');

function patchLocale(path, newAboutObj) {
  let json = JSON.parse(fs.readFileSync(path, 'utf8'));
  json.about = { ...json.about, ...newAboutObj };
  fs.writeFileSync(path, JSON.stringify(json, null, 2));
}

const enAbout = {
  "badge": "About ishoot",
  "title": "ARCHITECTS OF VISUAL IMPACT",
  "subtitle": "Founded in the Kingdom of Bahrain, ishoot is a premier creative media production house uniting cinematic storytelling with engineering precision.",
  "storyTitle": "OUR ETHOS",
  "storyP1": "We believe that true visual impact is created at the intersection of technical discipline and unconstrained creative curiosity. Every production is crafted with absolute reverence for composition, dynamic range, and authentic emotion.",
  "ceoTitle": "Founder & Creative Director",
  "ceoName": "Sayed Ahmed Husain",
  "ceoQuote": "We don't merely capture light; we shape the way memories, emotions, and brands resonate through time.",
  "recTag": "REC · 8K VV",
  "gccTag": "100% GCC",
  "redTag": "RED V-Raptor XL",
  "coloristTag": "DaVinci Certified",
  "location": "Manama, Kingdom of Bahrain",
  "pillars": {
    "badge": "Pillars of Craft",
    "title": "Engineering Precision & Visual Artistry",
    "p1": {
      "number": "01",
      "title": "Cinematic Optics & Framing",
      "desc": "8K VistaVision multi-format capture using RED V-Raptor XL systems paired with ARRI Master Primes for pristine optical rendering.",
      "tag": "8K VistaVision"
    },
    "p2": {
      "number": "02",
      "title": "DaVinci Resolve HDR Grading",
      "desc": "Dedicated post-production suite with Sony BVM reference monitoring to design bespoke film-emulation color palettes.",
      "tag": "DCI-P3 Colorist"
    },
    "p3": {
      "number": "03",
      "title": "Narrative Direction & Motion",
      "desc": "Crafting visual treatments, scripts, and rhythmic editing pacing that turn corporate briefs into memorable cinema.",
      "tag": "Narrative Craft"
    },
    "p4": {
      "number": "04",
      "title": "Licensed Heavy-Lift & FPV Drones",
      "desc": "Full Civil Aviation Authority (BCAA) licensed aerial drone operations capturing monumental landscapes and high-speed chases.",
      "tag": "BCAA Licensed"
    }
  },
  "stats": {
    "badge": "Studio Telemetry & Track Record",
    "verified": "Verified Production Data",
    "tvcs": "High-End TVCs",
    "leadership": "Cinema Leadership",
    "trophies": "Regional Trophies",
    "enterprises": "GCC Enterprises"
  },
  "gear": {
    "calibrated": "Calibrated"
  }
};

const arAbout = {
  "badge": "عن آي شوت",
  "title": "مهندسو التأثير البصري والسينمائي",
  "subtitle": "تأسست في مملكة البحرين، دار آي شوت للإنتاج هي وجهتك الأولى التي تجمع بين السرد القصصي السينمائي والدقة الهندسية الفائقة.",
  "storyTitle": "فلسفتنا الإنتاجية",
  "storyP1": "نؤمن بأن التأثير البصري الحقيقي ينبع من تقاطع الانضباط التقني والفضول الإبداعي اللامحدود. يتم تصنيع كل إنتاج باحترام مطلق للتكوين والمجال الديناميكي والمشاعر الحقيقية.",
  "ceoTitle": "المؤسس والمدير الإبداعي",
  "ceoName": "سيد أحمد حسين",
  "ceoQuote": "نحن لا نلتقط الضوء فحسب، بل نصوغ الذكريات والمشاعر لترسخ في الأذهان عبر الزمن.",
  "recTag": "تسجيل · 8K VV",
  "gccTag": "١٠٠٪ خليجي",
  "redTag": "كاميرا ريد في-رابتور",
  "coloristTag": "معتمد دافينشي",
  "location": "المنامة، مملكة البحرين",
  "pillars": {
    "badge": "أركان الحرفة السينمائية",
    "title": "الدقة الفنية والابتكار الإبداعي",
    "p1": {
      "number": "٠١",
      "title": "البصريات والعدسات السينمائية",
      "desc": "تصوير بدقة 8K VistaVision على كاميرات RED V-Raptor XL وعدسات ARRI Master Primes لتقديم حدة بصرية وعمق سينمائي مذهل.",
      "tag": "8K VistaVision"
    },
    "p2": {
      "number": "٠٢",
      "title": "معايرة وتصحيح الألوان المتقدم",
      "desc": "استوديو دافينشي المخصص مع شاشات معتمدة BVM لمعالجة الألوان وابتكار مظهر بصري خاص بكل علامة تجارية.",
      "tag": "معايرة DCI-P3"
    },
    "p3": {
      "number": "٠٣",
      "title": "السرد القصصي والتوجيه الإبداعي",
      "desc": "صياغة معالجات إبداعية وسيناريوهات بصرية متماسكة تخدم أهداف العلامات التجارية وتخاطب المشاعر مباشرة.",
      "tag": "صناعة السرد"
    },
    "p4": {
      "number": "٠٤",
      "title": "التصوير الجوي والبيئات المعقدة",
      "desc": "طيران جوي سينمائي مرخص من شؤون الطيران المدني بمملكة البحرين لتصوير المعالم والسرعات العالية بحرفية عالية.",
      "tag": "مرخص رسمياً"
    }
  },
  "stats": {
    "badge": "قياسات وإنجازات الاستوديو",
    "verified": "بيانات إنتاج موثقة",
    "tvcs": "إعلانات تلفزيونية فاخرة",
    "leadership": "ريادة سينمائية",
    "trophies": "جوائز إقليمية",
    "enterprises": "كبرى شركات الخليج"
  },
  "gear": {
    "calibrated": "معاير بدقة"
  }
};

patchLocale('packages/locales/src/en.json', enAbout);
patchLocale('packages/locales/src/ar.json', arAbout);
console.log("Updated about locale strings");
