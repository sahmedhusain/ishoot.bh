// Sample content per business activity: what "Start with sample content" adds (marked isSample, removable in one
// click) and what "Show an example" previews without saving anything. Runtime-free; fictional, brand-neutral.
import type { BusinessActivity } from "../website-presets";

type Pair = [en: string, ar: string];
export interface ActivitySample {
  banner: { title: Pair; subtitle: Pair };
  /** Catalogue items: title, subtitle, price (null when the activity shows no prices). */
  items: { title: Pair; subtitle: Pair; price: number | null }[];
  services: { name: Pair; description: Pair }[];
  stats: { value: string; label: Pair }[];
}

const item = (
  en: string,
  ar: string,
  subEn: string,
  subAr: string,
  price: number | null = null,
) => ({ title: [en, ar] as Pair, subtitle: [subEn, subAr] as Pair, price });
const service = (en: string, ar: string, descEn: string, descAr: string) => ({
  name: [en, ar] as Pair,
  description: [descEn, descAr] as Pair,
});
const stat = (value: string, en: string, ar: string) => ({
  value,
  label: [en, ar] as Pair,
});
const banner = (en: string, ar: string, subEn: string, subAr: string) => ({
  title: [en, ar] as Pair,
  subtitle: [subEn, subAr] as Pair,
});

const YEARS = stat("10+", "Years of experience", "سنوات من الخبرة");
const CLIENTS = stat("500+", "Happy clients", "عميل سعيد");

export const ACTIVITY_SAMPLES: Record<BusinessActivity, ActivitySample> = {
  media: {
    banner: banner(
      "Stories that move people",
      "قصص تحرّك الناس",
      "Brand films, campaigns and content, from idea to screen.",
      "أفلام العلامات والحملات والمحتوى، من الفكرة إلى الشاشة.",
    ),
    items: [
      item(
        "Harbour Lights",
        "أضواء الميناء",
        "Brand film",
        "فيلم علامة تجارية",
      ),
      item("Desert Run", "سباق الصحراء", "Sports campaign", "حملة رياضية"),
      item("City at Dawn", "المدينة عند الفجر", "Tourism film", "فيلم سياحي"),
      item(
        "Taste of Home",
        "طعم البيت",
        "Social series",
        "سلسلة للتواصل الاجتماعي",
      ),
    ],
    services: [
      service(
        "Brand films",
        "أفلام العلامات",
        "Story-led films that show what your brand stands for.",
        "أفلام قائمة على القصة تُظهر قيم علامتك.",
      ),
      service(
        "Social content",
        "محتوى التواصل",
        "Short videos made for each platform.",
        "مقاطع قصيرة مصممة لكل منصة.",
      ),
      service(
        "Photography",
        "التصوير الفوتوغرافي",
        "Product, people and place photography.",
        "تصوير المنتجات والأشخاص والأماكن.",
      ),
    ],
    stats: [YEARS, stat("300+", "Projects delivered", "مشروع منجز"), CLIENTS],
  },
  agency: {
    banner: banner(
      "Ideas that grow brands",
      "أفكار تنمّي العلامات",
      "Strategy, design and campaigns that people remember.",
      "استراتيجية وتصميم وحملات لا تُنسى.",
    ),
    items: [
      item("Fresh Start", "بداية جديدة", "Rebrand", "إعادة بناء الهوية"),
      item("Summer Sale", "تخفيضات الصيف", "Retail campaign", "حملة تجزئة"),
      item("Open Doors", "أبواب مفتوحة", "Launch campaign", "حملة إطلاق"),
      item("Green City", "مدينة خضراء", "Public awareness", "توعية عامة"),
    ],
    services: [
      service(
        "Brand strategy",
        "استراتيجية العلامة",
        "Positioning, naming and identity.",
        "التموضع والتسمية والهوية.",
      ),
      service(
        "Campaigns",
        "الحملات",
        "Creative campaigns across channels.",
        "حملات إبداعية عبر القنوات.",
      ),
      service(
        "Digital marketing",
        "التسويق الرقمي",
        "Social, search and performance.",
        "التواصل والبحث والأداء.",
      ),
    ],
    stats: [YEARS, stat("150+", "Campaigns", "حملة"), CLIENTS],
  },
  products: {
    banner: banner(
      "Quality you can feel",
      "جودة تشعر بها",
      "Products chosen with care and delivered to you.",
      "منتجات مختارة بعناية تصل إليك.",
    ),
    items: [
      item(
        "Classic Chair",
        "الكرسي الكلاسيكي",
        "Solid wood, three colours",
        "خشب صلب، ثلاثة ألوان",
        45,
      ),
      item("Desk Lamp", "مصباح مكتب", "Warm LED light", "ضوء LED دافئ", 18),
      item(
        "Storage Box",
        "صندوق تخزين",
        "Set of three",
        "مجموعة من ثلاث قطع",
        12,
      ),
      item("Wall Clock", "ساعة حائط", "Silent movement", "حركة صامتة", 9),
    ],
    services: [
      service(
        "Delivery",
        "التوصيل",
        "Fast delivery to your door.",
        "توصيل سريع إلى بابك.",
      ),
      service(
        "Corporate orders",
        "طلبات الشركات",
        "Bulk orders with special pricing.",
        "طلبات بالجملة بأسعار خاصة.",
      ),
      service(
        "After-sales",
        "خدمة ما بعد البيع",
        "Warranty and easy returns.",
        "ضمان واسترجاع سهل.",
      ),
    ],
    stats: [
      stat("2,000+", "Orders delivered", "طلب تم توصيله"),
      stat("150", "Products", "منتج"),
      CLIENTS,
    ],
  },
  food: {
    banner: banner(
      "Made fresh, served with care",
      "يُحضّر طازجًا ويُقدّم بعناية",
      "Breakfast, lunch and dinner, every day.",
      "فطور وغداء وعشاء، كل يوم.",
    ),
    items: [
      item(
        "Morning Platter",
        "طبق الصباح",
        "Eggs, cheese, bread and tea",
        "بيض وجبن وخبز وشاي",
        3.5,
      ),
      item(
        "Grilled Chicken",
        "دجاج مشوي",
        "With rice and salad",
        "مع الأرز والسلطة",
        4.2,
      ),
      item(
        "Garden Salad",
        "سلطة الحديقة",
        "Fresh greens, lemon dressing",
        "خضار طازجة وصلصة الليمون",
        2.4,
      ),
      item(
        "Date Cake",
        "كعكة التمر",
        "Homemade, served warm",
        "منزلية تُقدّم ساخنة",
        1.8,
      ),
    ],
    services: [
      service(
        "Dine in",
        "تناول في المطعم",
        "A warm place for family and friends.",
        "مكان دافئ للعائلة والأصدقاء.",
      ),
      service(
        "Delivery",
        "التوصيل",
        "Hot meals delivered to you.",
        "وجبات ساخنة تصل إليك.",
      ),
      service(
        "Catering",
        "خدمة المناسبات",
        "Menus for events and offices.",
        "قوائم للمناسبات والمكاتب.",
      ),
    ],
    stats: [
      stat("40+", "Dishes", "طبق"),
      stat("4.8", "Average rating", "متوسط التقييم"),
      YEARS,
    ],
  },
  services: {
    banner: banner(
      "Advice that moves you forward",
      "مشورة تدفعك إلى الأمام",
      "Practical expertise for growing organisations.",
      "خبرة عملية للمؤسسات النامية.",
    ),
    items: [
      item("Process Review", "مراجعة الإجراءات", "Operations", "العمليات"),
      item("Growth Plan", "خطة النمو", "Strategy", "الاستراتيجية"),
      item("Team Training", "تدريب الفريق", "People", "الموارد البشرية"),
      item("Cost Savings", "خفض التكاليف", "Finance", "المالية"),
    ],
    services: [
      service(
        "Consulting",
        "الاستشارات",
        "Clear advice on your toughest questions.",
        "مشورة واضحة لأصعب أسئلتك.",
      ),
      service(
        "Training",
        "التدريب",
        "Workshops tailored to your team.",
        "ورش عمل مصممة لفريقك.",
      ),
      service(
        "Support",
        "الدعم",
        "Ongoing help when you need it.",
        "مساعدة مستمرة عند الحاجة.",
      ),
    ],
    stats: [YEARS, stat("200+", "Engagements", "مهمة"), CLIENTS],
  },
  real_estate: {
    banner: banner(
      "Find your next place",
      "اعثر على مكانك التالي",
      "Homes and offices for sale and rent.",
      "منازل ومكاتب للبيع والإيجار.",
    ),
    items: [
      item(
        "Sea View Apartment",
        "شقة بإطلالة بحرية",
        "2 bedrooms, 120 m²",
        "غرفتا نوم، 120 م²",
        95000,
      ),
      item(
        "Family Villa",
        "فيلا عائلية",
        "4 bedrooms, garden",
        "4 غرف نوم مع حديقة",
        240000,
      ),
      item(
        "City Office",
        "مكتب في المدينة",
        "80 m², furnished",
        "80 م² مفروش",
        1200,
      ),
      item(
        "Studio Flat",
        "استوديو",
        "Close to the metro",
        "قريب من المترو",
        450,
      ),
    ],
    services: [
      service(
        "Sales",
        "البيع",
        "Find the right buyer at the right price.",
        "اعثر على المشتري المناسب بالسعر المناسب.",
      ),
      service(
        "Leasing",
        "التأجير",
        "Tenants found and managed for you.",
        "نجد المستأجرين وندير العلاقة نيابة عنك.",
      ),
      service(
        "Valuation",
        "التقييم",
        "Accurate, independent valuations.",
        "تقييمات دقيقة ومستقلة.",
      ),
    ],
    stats: [stat("350+", "Properties", "عقار"), YEARS, CLIENTS],
  },
  construction: {
    banner: banner(
      "Built right, on time",
      "نبني بإتقان وفي الموعد",
      "Construction and fit-out you can rely on.",
      "إنشاءات وتشطيبات يمكنك الاعتماد عليها.",
    ),
    items: [
      item(
        "Riverside Offices",
        "مكاتب ضفاف النهر",
        "Commercial building",
        "مبنى تجاري",
      ),
      item(
        "Garden Homes",
        "منازل الحديقة",
        "Residential compound",
        "مجمع سكني",
      ),
      item("Central School", "المدرسة المركزية", "Public building", "مبنى عام"),
      item("Logistics Hub", "المركز اللوجستي", "Warehouse", "مستودع"),
    ],
    services: [
      service(
        "Construction",
        "الإنشاءات",
        "From foundations to handover.",
        "من الأساسات حتى التسليم.",
      ),
      service(
        "Fit-out",
        "التشطيبات",
        "Interiors finished to a high standard.",
        "تشطيبات داخلية بمستوى عالٍ.",
      ),
      service(
        "Maintenance",
        "الصيانة",
        "Keeping buildings in top shape.",
        "نحافظ على المباني في أفضل حال.",
      ),
    ],
    stats: [
      stat("120+", "Projects", "مشروع"),
      YEARS,
      stat("0", "Lost-time incidents", "حوادث مُضيِّعة للوقت"),
    ],
  },
  education: {
    banner: banner(
      "Learn something new",
      "تعلّم شيئًا جديدًا",
      "Courses and programmes for every stage.",
      "دورات وبرامج لكل مرحلة.",
    ),
    items: [
      item(
        "English Essentials",
        "أساسيات الإنجليزية",
        "8 weeks, evenings",
        "8 أسابيع، مسائي",
        120,
      ),
      item(
        "Project Management",
        "إدارة المشاريع",
        "Certificate course",
        "دورة بشهادة",
        300,
      ),
      item(
        "Coding for Kids",
        "البرمجة للأطفال",
        "Ages 9 to 14",
        "من 9 إلى 14 سنة",
        90,
      ),
      item(
        "Public Speaking",
        "الخطابة",
        "Weekend workshop",
        "ورشة نهاية الأسبوع",
        60,
      ),
    ],
    services: [
      service(
        "Courses",
        "الدورات",
        "Practical courses with expert trainers.",
        "دورات عملية مع مدربين خبراء.",
      ),
      service(
        "Corporate training",
        "تدريب الشركات",
        "Programmes built for your team.",
        "برامج مبنية لفريقك.",
      ),
      service(
        "Certificates",
        "الشهادات",
        "Recognised certificates on completion.",
        "شهادات معتمدة عند الإتمام.",
      ),
    ],
    stats: [
      stat("5,000+", "Learners", "متعلم"),
      stat("60", "Courses", "دورة"),
      YEARS,
    ],
  },
  healthcare: {
    banner: banner(
      "Care close to home",
      "رعاية قريبة منك",
      "Experienced doctors and modern clinics.",
      "أطباء ذوو خبرة وعيادات حديثة.",
    ),
    items: [
      item("General Check-up", "فحص عام", "30 minutes", "30 دقيقة", 20),
      item(
        "Dental Cleaning",
        "تنظيف الأسنان",
        "With polishing",
        "مع التلميع",
        25,
      ),
      item("Physiotherapy", "العلاج الطبيعي", "Per session", "لكل جلسة", 18),
      item("Eye Test", "فحص النظر", "Full examination", "فحص كامل", 15),
    ],
    services: [
      service(
        "Family medicine",
        "طب الأسرة",
        "Care for every age.",
        "رعاية لكل الأعمار.",
      ),
      service(
        "Dental care",
        "طب الأسنان",
        "Healthy smiles for life.",
        "ابتسامات صحية مدى الحياة.",
      ),
      service(
        "Physiotherapy",
        "العلاج الطبيعي",
        "Recovery and mobility.",
        "التعافي واستعادة الحركة.",
      ),
    ],
    stats: [
      stat("15", "Specialists", "اختصاصي"),
      YEARS,
      stat("20,000+", "Patients", "مريض"),
    ],
  },
  events: {
    banner: banner(
      "Moments worth remembering",
      "لحظات تستحق أن تُذكر",
      "Weddings, conferences and celebrations.",
      "أعراس ومؤتمرات واحتفالات.",
    ),
    items: [
      item("Annual Gala", "الحفل السنوي", "Corporate event", "فعالية شركات"),
      item(
        "Garden Wedding",
        "زفاف الحديقة",
        "Private celebration",
        "احتفال خاص",
      ),
      item("Tech Summit", "قمة التقنية", "Conference", "مؤتمر"),
      item("National Day", "اليوم الوطني", "Public event", "فعالية عامة"),
    ],
    services: [
      service(
        "Event planning",
        "تخطيط الفعاليات",
        "Every detail planned for you.",
        "كل التفاصيل مخططة لك.",
      ),
      service(
        "Venues and décor",
        "المواقع والديكور",
        "Spaces dressed for the occasion.",
        "أماكن مجهزة للمناسبة.",
      ),
      service(
        "Production",
        "التجهيزات التقنية",
        "Stage, sound and light.",
        "المسرح والصوت والإضاءة.",
      ),
    ],
    stats: [stat("400+", "Events", "فعالية"), YEARS, CLIENTS],
  },
  online_store: {
    banner: banner(
      "New arrivals every week",
      "منتجات جديدة كل أسبوع",
      "Shop online, delivered fast.",
      "تسوّق عبر الإنترنت مع توصيل سريع.",
    ),
    items: [
      item(
        "Everyday Tote",
        "حقيبة يومية",
        "Canvas, two colours",
        "قماش، لونان",
        14,
      ),
      item(
        "Travel Mug",
        "كوب سفر",
        "Keeps drinks hot",
        "يحافظ على حرارة المشروب",
        7,
      ),
      item("Phone Stand", "حامل هاتف", "Aluminium", "ألمنيوم", 6),
      item("Gift Card", "بطاقة هدية", "Any amount", "أي مبلغ", 10),
    ],
    services: [
      service(
        "Fast delivery",
        "توصيل سريع",
        "Same-day delivery in the city.",
        "توصيل في اليوم نفسه داخل المدينة.",
      ),
      service(
        "Easy returns",
        "استرجاع سهل",
        "Return within 14 days.",
        "استرجاع خلال 14 يومًا.",
      ),
      service(
        "Secure payment",
        "دفع آمن",
        "Cards, wallets and cash on delivery.",
        "البطاقات والمحافظ والدفع عند الاستلام.",
      ),
    ],
    stats: [
      stat("10,000+", "Orders", "طلب"),
      stat("4.9", "Customer rating", "تقييم العملاء"),
      stat("24h", "Delivery", "توصيل"),
    ],
  },
  beauty: {
    banner: banner(
      "Time for you",
      "وقت لنفسك",
      "Hair, skin and nails by experts.",
      "الشعر والبشرة والأظافر على يد خبراء.",
    ),
    items: [
      item(
        "Signature Facial",
        "عناية الوجه المميزة",
        "60 minutes",
        "60 دقيقة",
        25,
      ),
      item("Cut and Style", "قص وتصفيف", "With wash", "مع الغسيل", 15),
      item("Manicure", "مانيكير", "Classic", "كلاسيكي", 8),
      item("Relaxing Massage", "مساج الاسترخاء", "45 minutes", "45 دقيقة", 22),
    ],
    services: [
      service(
        "Hair",
        "الشعر",
        "Cuts, colour and treatments.",
        "قص وصبغ وعلاجات.",
      ),
      service(
        "Skin",
        "البشرة",
        "Facials and skin care.",
        "عناية بالوجه والبشرة.",
      ),
      service(
        "Nails",
        "الأظافر",
        "Manicure and pedicure.",
        "مانيكير وباديكير.",
      ),
    ],
    stats: [
      stat("12", "Specialists", "اختصاصية"),
      stat("4.9", "Client rating", "تقييم العملاء"),
      YEARS,
    ],
  },
  fitness: {
    banner: banner(
      "Stronger every day",
      "أقوى كل يوم",
      "Classes, coaching and a community that keeps you going.",
      "حصص وتدريب ومجتمع يحفزك.",
    ),
    items: [
      item(
        "Monthly Membership",
        "عضوية شهرية",
        "Unlimited access",
        "دخول غير محدود",
        30,
      ),
      item("Personal Training", "تدريب شخصي", "8 sessions", "8 جلسات", 120),
      item("Yoga Classes", "حصص اليوغا", "Twice a week", "مرتان أسبوعيًا", 25),
      item("Annual Plan", "الخطة السنوية", "Best value", "أفضل قيمة", 300),
    ],
    services: [
      service(
        "Group classes",
        "الحصص الجماعية",
        "Strength, cardio and mobility.",
        "قوة وتحمّل ومرونة.",
      ),
      service(
        "Personal training",
        "التدريب الشخصي",
        "A plan built around you.",
        "خطة مبنية حولك.",
      ),
      service(
        "Nutrition",
        "التغذية",
        "Advice for your goals.",
        "نصائح لأهدافك.",
      ),
    ],
    stats: [
      stat("50+", "Weekly classes", "حصة أسبوعيًا"),
      stat("1,200", "Members", "عضو"),
      stat("6", "Coaches", "مدربين"),
    ],
  },
  automotive: {
    banner: banner(
      "Drive away happy",
      "انطلق بسعادة",
      "New and used cars, servicing and parts.",
      "سيارات جديدة ومستعملة وصيانة وقطع غيار.",
    ),
    items: [
      item(
        "Family SUV",
        "سيارة عائلية",
        "2024, 7 seats",
        "2024، 7 مقاعد",
        14500,
      ),
      item(
        "City Hatchback",
        "سيارة مدينة",
        "2023, automatic",
        "2023، أوتوماتيك",
        6900,
      ),
      item("Pickup Truck", "شاحنة صغيرة", "2022, 4x4", "2022، دفع رباعي", 9800),
      item("Full Service", "صيانة كاملة", "All makes", "جميع الطرازات", 45),
    ],
    services: [
      service(
        "Sales",
        "المبيعات",
        "New and certified used cars.",
        "سيارات جديدة ومستعملة معتمدة.",
      ),
      service(
        "Servicing",
        "الصيانة",
        "Skilled technicians, genuine parts.",
        "فنيون مهرة وقطع أصلية.",
      ),
      service("Finance", "التمويل", "Flexible payment plans.", "خطط دفع مرنة."),
    ],
    stats: [stat("1,500+", "Cars sold", "سيارة مباعة"), YEARS, CLIENTS],
  },
  logistics: {
    banner: banner(
      "Delivered on time",
      "في الموعد دائمًا",
      "Freight, courier and warehousing across the region.",
      "شحن وتوصيل وتخزين في أنحاء المنطقة.",
    ),
    items: [
      item(
        "Same-Day Courier",
        "توصيل في اليوم نفسه",
        "Within the city",
        "داخل المدينة",
      ),
      item("Air Freight", "الشحن الجوي", "Door to door", "من الباب إلى الباب"),
      item(
        "Warehousing",
        "التخزين",
        "Pick, pack and store",
        "انتقاء وتغليف وتخزين",
      ),
      item(
        "Fleet Rental",
        "تأجير الأسطول",
        "Trucks with drivers",
        "شاحنات مع سائقين",
      ),
    ],
    services: [
      service(
        "Courier",
        "التوصيل",
        "Fast parcel delivery.",
        "توصيل سريع للطرود.",
      ),
      service("Freight", "الشحن", "Air, sea and land.", "جوًا وبحرًا وبرًا."),
      service(
        "Warehousing",
        "التخزين",
        "Secure storage and fulfilment.",
        "تخزين آمن وتنفيذ الطلبات.",
      ),
    ],
    stats: [
      stat("1M+", "Parcels a year", "طرد سنويًا"),
      stat("98%", "On time", "في الموعد"),
      stat("60", "Vehicles", "مركبة"),
    ],
  },
  travel: {
    banner: banner(
      "Your next adventure",
      "مغامرتك القادمة",
      "Trips planned around you.",
      "رحلات مخططة حولك.",
    ),
    items: [
      item("Mountain Escape", "هروب إلى الجبال", "5 days", "5 أيام", 450),
      item("City Break", "عطلة المدينة", "3 nights", "3 ليالٍ", 280),
      item(
        "Island Holiday",
        "عطلة الجزيرة",
        "7 days, all inclusive",
        "7 أيام شاملة",
        890,
      ),
      item("Desert Safari", "سفاري الصحراء", "Half day", "نصف يوم", 35),
    ],
    services: [
      service(
        "Holidays",
        "العطلات",
        "Packages for families and couples.",
        "باقات للعائلات والأزواج.",
      ),
      service(
        "Visas and flights",
        "التأشيرات والطيران",
        "Paperwork handled for you.",
        "نتولى الإجراءات عنك.",
      ),
      service(
        "Group tours",
        "الجولات الجماعية",
        "Guided tours with friends.",
        "جولات مع مرشد ومع الأصدقاء.",
      ),
    ],
    stats: [
      stat("80+", "Destinations", "وجهة"),
      stat("15,000", "Travellers", "مسافر"),
      YEARS,
    ],
  },
  hotel: {
    banner: banner(
      "Stay in comfort",
      "إقامة مريحة",
      "Rooms, suites and service that feel like home.",
      "غرف وأجنحة وخدمة تشعرك بأنك في بيتك.",
    ),
    items: [
      item(
        "Deluxe Room",
        "غرفة ديلوكس",
        "King bed, city view",
        "سرير كبير، إطلالة على المدينة",
        55,
      ),
      item("Family Suite", "جناح عائلي", "Two bedrooms", "غرفتا نوم", 110),
      item(
        "Executive Room",
        "غرفة تنفيذية",
        "Lounge access",
        "دخول الصالة",
        75,
      ),
      item("Sea View Suite", "جناح بإطلالة بحرية", "Balcony", "شرفة", 140),
    ],
    services: [
      service(
        "Dining",
        "المطاعم",
        "All-day dining and room service.",
        "مطعم طوال اليوم وخدمة الغرف.",
      ),
      service(
        "Spa and pool",
        "السبا والمسبح",
        "Relax and unwind.",
        "استرخِ وتجدد.",
      ),
      service(
        "Meetings",
        "الاجتماعات",
        "Rooms for meetings and events.",
        "قاعات للاجتماعات والفعاليات.",
      ),
    ],
    stats: [
      stat("120", "Rooms", "غرفة"),
      stat("4.7", "Guest rating", "تقييم الضيوف"),
      YEARS,
    ],
  },
  law_firm: {
    banner: banner(
      "Clear advice when it matters",
      "مشورة واضحة حين تهم",
      "Corporate, commercial and family law.",
      "قانون الشركات والتجارة والأسرة.",
    ),
    items: [
      item(
        "Corporate Law",
        "قانون الشركات",
        "Formation and governance",
        "التأسيس والحوكمة",
      ),
      item("Contracts", "العقود", "Drafting and review", "الصياغة والمراجعة"),
      item(
        "Employment",
        "العمل",
        "Employers and employees",
        "أصحاب العمل والموظفون",
      ),
      item(
        "Disputes",
        "النزاعات",
        "Litigation and arbitration",
        "التقاضي والتحكيم",
      ),
    ],
    services: [
      service(
        "Advisory",
        "الاستشارات",
        "Practical legal advice.",
        "مشورة قانونية عملية.",
      ),
      service(
        "Litigation",
        "التقاضي",
        "Representation in court.",
        "التمثيل أمام المحاكم.",
      ),
      service(
        "Notary services",
        "خدمات التوثيق",
        "Documents certified quickly.",
        "توثيق المستندات بسرعة.",
      ),
    ],
    stats: [
      YEARS,
      stat("1,000+", "Cases", "قضية"),
      stat("8", "Lawyers", "محامين"),
    ],
  },
  nonprofit: {
    banner: banner(
      "Together we make a difference",
      "معًا نصنع الفرق",
      "Programmes that support families and communities.",
      "برامج تدعم الأسر والمجتمعات.",
    ),
    items: [
      item(
        "Back to School",
        "العودة إلى المدرسة",
        "Supplies for students",
        "مستلزمات للطلاب",
      ),
      item("Food Baskets", "السلال الغذائية", "Monthly support", "دعم شهري"),
      item(
        "Skills for Work",
        "مهارات للعمل",
        "Training for youth",
        "تدريب للشباب",
      ),
      item("Clean Beaches", "شواطئ نظيفة", "Volunteer days", "أيام تطوعية"),
    ],
    services: [
      service(
        "Donate",
        "تبرّع",
        "Every contribution helps.",
        "كل مساهمة تساعد.",
      ),
      service(
        "Volunteer",
        "تطوّع",
        "Give your time and skills.",
        "قدّم وقتك ومهاراتك.",
      ),
      service(
        "Partner",
        "كن شريكًا",
        "Work with us on programmes.",
        "اعمل معنا في البرامج.",
      ),
    ],
    stats: [
      stat("25,000", "People reached", "مستفيد"),
      stat("400", "Volunteers", "متطوع"),
      YEARS,
    ],
  },
  pharmacy: {
    banner: banner(
      "Your health, close to home",
      "صحتك قريبة منك",
      "Medicines, care products and advice.",
      "أدوية ومنتجات عناية ومشورة.",
    ),
    items: [
      item("Vitamin D3", "فيتامين د3", "60 capsules", "60 كبسولة", 4.5),
      item("Hand Cream", "كريم اليدين", "Fragrance free", "بدون عطر", 3.2),
      item("Baby Wipes", "مناديل الأطفال", "Pack of 3", "عبوة من 3", 2.8),
      item(
        "Sunscreen SPF 50",
        "واقي الشمس 50",
        "For face and body",
        "للوجه والجسم",
        6.9,
      ),
    ],
    services: [
      service(
        "Prescriptions",
        "الوصفات",
        "Ready when you arrive.",
        "جاهزة عند وصولك.",
      ),
      service(
        "Home delivery",
        "التوصيل للمنزل",
        "Medicines delivered to you.",
        "توصيل الأدوية إليك.",
      ),
      service(
        "Health checks",
        "الفحوصات",
        "Blood pressure and sugar checks.",
        "فحص الضغط والسكر.",
      ),
    ],
    stats: [
      stat("3,000+", "Products", "منتج"),
      stat("7", "Pharmacists", "صيادلة"),
      stat("24/7", "Open", "مفتوح"),
    ],
  },
  manufacturing: {
    banner: banner(
      "Made to last",
      "مصنوع ليدوم",
      "Precision manufacturing to your specification.",
      "تصنيع دقيق حسب مواصفاتك.",
    ),
    items: [
      item("Steel Frames", "هياكل فولاذية", "Custom sizes", "مقاسات حسب الطلب"),
      item(
        "Aluminium Profiles",
        "مقاطع الألمنيوم",
        "Anodised finish",
        "تشطيب مؤكسد",
      ),
      item("Packaging", "التغليف", "Printed cartons", "كراتين مطبوعة"),
      item("Precision Parts", "قطع دقيقة", "CNC machined", "مشغولة آليًا"),
    ],
    services: [
      service(
        "Manufacturing",
        "التصنيع",
        "Short and long production runs.",
        "دفعات إنتاج قصيرة وطويلة.",
      ),
      service(
        "Design support",
        "دعم التصميم",
        "From drawing to prototype.",
        "من الرسم إلى النموذج الأولي.",
      ),
      service(
        "Quality control",
        "مراقبة الجودة",
        "Tested before delivery.",
        "مختبر قبل التسليم.",
      ),
    ],
    stats: [
      stat("20,000 m²", "Factory floor", "مساحة المصنع"),
      YEARS,
      stat("30+", "Countries supplied", "دولة نوردها"),
    ],
  },
  it_software: {
    banner: banner(
      "Technology that works for you",
      "تقنية تعمل لأجلك",
      "Software, cloud and support for growing businesses.",
      "برمجيات وسحابة ودعم للأعمال النامية.",
    ),
    items: [
      item("Booking Platform", "منصة الحجوزات", "Web and mobile", "ويب وجوال"),
      item(
        "Inventory System",
        "نظام المخزون",
        "For retailers",
        "لتجار التجزئة",
      ),
      item("Cloud Migration", "الانتقال إلى السحابة", "For a bank", "لبنك"),
      item("Customer Portal", "بوابة العملاء", "Self-service", "خدمة ذاتية"),
    ],
    services: [
      service(
        "Software development",
        "تطوير البرمجيات",
        "Web and mobile applications.",
        "تطبيقات الويب والجوال.",
      ),
      service(
        "Cloud",
        "الحوسبة السحابية",
        "Set-up, migration and support.",
        "الإعداد والانتقال والدعم.",
      ),
      service(
        "IT support",
        "الدعم الفني",
        "Help desk and maintenance.",
        "مكتب مساعدة وصيانة.",
      ),
    ],
    stats: [
      stat("120+", "Projects", "مشروع"),
      stat("99.9%", "Uptime", "وقت التشغيل"),
      CLIENTS,
    ],
  },
  other: {
    banner: banner(
      "Welcome",
      "أهلًا بك",
      "Here is what we do and how we can help.",
      "هذا ما نقدمه وكيف يمكننا مساعدتك.",
    ),
    items: [
      item("First Project", "المشروع الأول", "A short description", "وصف قصير"),
      item(
        "Second Project",
        "المشروع الثاني",
        "A short description",
        "وصف قصير",
      ),
      item(
        "Third Project",
        "المشروع الثالث",
        "A short description",
        "وصف قصير",
      ),
      item(
        "Fourth Project",
        "المشروع الرابع",
        "A short description",
        "وصف قصير",
      ),
    ],
    services: [
      service(
        "Our main service",
        "خدمتنا الرئيسية",
        "What it is and who it is for.",
        "ما هي ولمن تُقدّم.",
      ),
      service(
        "Another service",
        "خدمة أخرى",
        "How it helps your customers.",
        "كيف تساعد عملاءك.",
      ),
      service(
        "Support",
        "الدعم",
        "Help when you need it.",
        "مساعدة عند الحاجة.",
      ),
    ],
    stats: [YEARS, CLIENTS, stat("24h", "Response time", "زمن الاستجابة")],
  },
};

/** Questions every sample website shows. */
export const SAMPLE_FAQS: { question: Pair; answer: Pair }[] = [
  {
    question: ["How do I get in touch?", "كيف أتواصل معكم؟"],
    answer: [
      "Use the contact page, call us or send a WhatsApp message; we reply within a working day.",
      "استخدم صفحة التواصل أو اتصل بنا أو أرسل رسالة واتساب؛ نرد خلال يوم عمل.",
    ],
  },
  {
    question: ["Where are you located?", "أين موقعكم؟"],
    answer: [
      "Our address and opening hours are on the contact page.",
      "عنواننا وساعات العمل في صفحة التواصل.",
    ],
  },
  {
    question: ["How can I pay?", "كيف أدفع؟"],
    answer: [
      "By card, bank transfer or cash; we confirm the options with your order.",
      "بالبطاقة أو التحويل البنكي أو نقدًا؛ نؤكد الخيارات مع طلبك.",
    ],
  },
];

/** The article every sample website starts with. */
export const SAMPLE_ARTICLE = {
  slug: "welcome-to-our-new-website",
  title: ["Welcome to our new website", "أهلًا بكم في موقعنا الجديد"] as Pair,
  excerpt: [
    "Find out what is new and how to reach us.",
    "اكتشف الجديد وطرق التواصل معنا.",
  ] as Pair,
  body: [
    "We are glad you are here. This website shows what we do, the work we are proud of and how to reach us. Replace this sample article with your own news.",
    "سعداء بزيارتكم. يعرض هذا الموقع ما نقدمه والأعمال التي نفخر بها وطرق التواصل معنا. استبدل هذا المقال التجريبي بأخبارك.",
  ] as Pair,
};

/** The generated sample pictures (served by the website as SVG in the company's colours). */
export const sampleImage = (kind: "banner" | "item", index: number) =>
  `/api/samples/${kind}-${(index % 6) + 1}.svg`;
