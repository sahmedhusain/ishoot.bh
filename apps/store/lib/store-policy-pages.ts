export interface StorePolicySection {
  heading: string;
  body: string;
}

export type StorePolicyKind =
  | "terms"
  | "privacy"
  | "return-policy"
  | "warranty"
  | "devo-warranty"
  | "vat-tax"
  | "faq"
  | "payment-methods";

export interface StorePolicyDoc {
  key?: StorePolicyKind;
  badge: string;
  title: string;
  subtitle: string;
  sections: StorePolicySection[];
}

export function getStorePolicyDoc(
  kind: StorePolicyKind,
  locale: string,
  opts: {
    crNumber?: string;
    vatNumber?: string;
    returnWindowDays?: number;
    termsText?: string;
    rulesText?: string;
    companyName?: string;
  } = {},
): StorePolicyDoc {
  const build = (): StorePolicyDoc => {
  const ar = locale === "ar";
  const cr = opts.crNumber?.trim() || "";
  const retDays = opts.returnWindowDays || 14;
  const storeName = opts.companyName || (ar ? "المتجر" : "Store");

  switch (kind) {
    case "terms":
      return {
        badge: cr ? (ar ? `سجل تجاري ${cr}` : `CR No. ${cr}`) : ar ? "الشروط التجارية" : "Terms of Sale",
        title: ar ? "الشروط والأحكام" : "Terms & Conditions",
        subtitle: ar
          ? `شروط الاستخدام والمبيعات الإلكترونية لمتجر ${storeName}.`
          : `Terms of sale, orders, loyalty points, and storefront usage for ${storeName}.`,
        sections: [
          {
            heading: ar ? "الطلبات والتسعير" : "Orders & Pricing",
            body:
              opts.termsText ||
              (ar
                ? "تخضع جميع الطلبات لتوفر المخزون وتأكيد الدفع. يتم عرض الأسعار وضريبة القيمة المضافة بوضوح بعملة المتجر المعتمدة قبل إتمام الطلب."
                : "All orders are subject to stock availability and payment verification. Product pricing and applicable taxes are displayed clearly in the store's configured currency prior to checkout confirmation."),
          },
          {
            heading: ar ? "محفظة المتجر ونقاط الولاء" : "Store Wallet & Loyalty Program",
            body: ar
              ? "تُضاف نقاط الولاء إلى حسابات العملاء المسجلين ويمكن تحويلها إلى رصيد محفظة المتجر أو استخدامها كخصم في الطلبات القادمة."
              : "Registered customers earn loyalty points on qualifying orders and can convert points into Store Wallet credit or redeem them directly at checkout.",
          },
        ],
      };

    case "privacy":
      return {
        badge: ar ? "الخصوصية والكوكيز" : "Privacy & Cookies",
        title: ar ? "سياسة الخصوصية والكوكيز" : "Privacy & Cookie Policy",
        subtitle: ar
          ? "كيف نحمي بياناتك الشخصية ونستخدم ملفات تعريف الارتباط."
          : "How we safeguard customer data, payment security, and cookie preferences.",
        sections: [
          {
            heading: ar ? "تشفير SSL وأمان البيانات" : "SSL Encryption & Data Security",
            body:
              opts.rulesText ||
              (ar
                ? "تتم معالجة جميع جلسات التصفح والمدفوعات عبر اتصال مشفر TLS/SSL. لا نقوم بتخزين أرقام البطاقات البنكية الكاملة على خوادم المتجر."
                : "All browsing, account sessions, and payment handoffs operate over TLS/SSL encryption. Full payment card numbers are handled exclusively by PCI-compliant gateways."),
          },
          {
            heading: ar ? "ملفات تعريف الارتباط (الكوكيز)" : "Cookie Categories & Consent",
            body: ar
              ? "تعمل الكوكيز الأساسية تلقائيا لحفظ السلة وتسجيل الدخول وأمان الجلسة، بينما تخضع كوكيز التحليلات والتسويق لموافقتك ويمكنك تعديلها في أي وقت عبر زر إعدادات الكوكيز أسفل الصفحة."
              : "Essential cookies remain active for cart, login sessions, and CSRF protection. Analytics and Marketing cookies require your consent and can be updated anytime via Cookie Settings in the footer.",
          },
        ],
      };

    case "return-policy":
      return {
        badge: ar ? `خلال ${retDays} يوما` : `${retDays}-Day Return Window`,
        title: ar ? "سياسة الإرجاع والاسترداد" : "Return & Refund Policy",
        subtitle: ar
          ? "إجراءات سهلة لإرجاع المنتجات أو استرداد المبلغ إلى المحفظة أو وسيلة الدفع الأصلية."
          : "Transparent product return eligibility and refund destination choices.",
        sections: [
          {
            heading: ar ? "شروط الإرجاع" : "Return Eligibility",
            body: ar
              ? `يمكنك تقديم طلب إرجاع خلال ${retDays} يوما من الاستلام عبر صفحة الطلبات في حسابك للمنتجات غير المستخدمة أو في حال وجود عيب مصنعي.`
              : `Unused sealed products or verified defective items are eligible for return within ${retDays} days of delivery directly through your Account Returns portal.`,
          },
          {
            heading: ar ? "خيارات الاسترداد" : "Refund Destinations",
            body: ar
              ? "اختر استرداد المبلغ فورا إلى محفظة المتجر، أو إعادته إلى وسيلة الدفع الأصلية، أو استبدال المنتج."
              : "Choose between instant Store Wallet credit, refund to your original payment method, or product replacement.",
          },
        ],
      };

    case "warranty":
      return {
        badge: ar ? "ضمان معتمد" : "Standard Product Warranty",
        title: ar ? "سياسة الضمان والصيانة" : "Warranty Policy",
        subtitle: ar
          ? "تغطية الضمان الرسمية للمنتجات والمعدات والخدمات."
          : "Official manufacturer and store warranty terms for all eligible products and deliverables.",
        sections: [
          {
            heading: ar ? "نطاق الضمان" : "Coverage Scope",
            body: ar
              ? "تشمل جميع المنتجات المؤهلة ضمان المصنع أو المتجر ضد العيوب المصنعية مع الفاتورة الإلكترونية أو رقم الطلب."
              : "All qualifying items carry official manufacturer or store warranty against verified manufacturing defects with your order invoice.",
          },
          {
            heading: ar ? "الاستثناءات" : "Exclusions",
            body: ar
              ? "لا يغطي الضمان سوء الاستخدام أو الكسر أو التلف الناتج عن السوائل أو التعديلات غير المصرح بها."
              : "Physical damage, liquid spills, improper voltage, or unauthorized modifications are excluded from warranty coverage.",
          },
        ],
      };

    case "devo-warranty":
      return {
        badge: ar ? "الضمان الممتد" : "Extended Protection Plan",
        title: ar ? "سياسة الضمان الممتد والخدمة" : "Extended Product Protection & Service",
        subtitle: ar
          ? "تغطية حماية ممتدة واستبدال سريع للمنتجات والباقات المؤهلة."
          : "Extended protection, prioritized inspection, and fast replacement coverage on eligible items and packages.",
        sections: [
          {
            heading: ar ? "فترة التغطية الممتدة" : "Extended Coverage Window",
            body: ar
              ? "تتمتع الباقات والمنتجات المختارة بتغطية خدمة ممتدة تشمل الفحص السريع واستبدال القطع المعيبة."
              : "Qualifying products and curated packages include multi-tier protection covering verified faults and priority servicing.",
          },
          {
            heading: ar ? "خطوات المطالبة السريعة" : "Express Claim Workflow",
            body: ar
              ? "قدّم طلب خدمة أو استبدال مباشرة من صفحة الطلبات أو المرتجعات في حسابك مع رقم الطلب."
              : "Submit a warranty or return request directly from your Account Orders or Returns page with your order reference.",
          },
        ],
      };

    case "vat-tax":
      return {
        badge: opts.vatNumber ? (ar ? `الرقم الضريبي ${opts.vatNumber}` : `VAT ${opts.vatNumber}`) : ar ? "الضريبة والعملة" : "VAT & Currency",
        title: ar ? "الضرائب وعملة المتجر" : "VAT & Store Currency Information",
        subtitle: ar
          ? "الشفافية الضريبية وتفاصيل التسعير بعملة المتجر الرسمية."
          : "Tax calculation, billing transparency, and official store currency details.",
        sections: [
          {
            heading: ar ? "ضريبة القيمة المضافة" : "Value Added Tax (VAT)",
            body: ar
              ? "يتم عرض قيمة الضريبة بوضوح في ملخص السلة وعند إتمام الدفع وفي الفواتير الضريبية لجميع الطلبات المؤكدة."
              : "Applicable VAT is itemized transparently in Cart Totals, Checkout, and downloadable tax invoices for all confirmed orders.",
          },
          {
            heading: ar ? "عملة المتجر وموقع الشركة" : "Official Store Currency & Location",
            body: ar
              ? "يتم عرض كافة الأسعار والفواتير بعملة الشركة المعتمدة مع خدمة التوصيل والاستلام من مقر الشركة المعتمد."
              : "All catalog pricing, invoices, and settlements operate in the company's configured currency, fulfilled from our registered company location.",
          },
        ],
      };

    case "faq":
      return {
        badge: ar ? "الأسئلة الشائعة" : "Help Center & FAQ",
        title: ar ? "الأسئلة المتكررة" : "Frequently Asked Questions",
        subtitle: ar
          ? "إجابات سريعة حول الطلبات والدفع والشحن ونقاط الولاء."
          : "Quick answers on delivery, wallet credits, loyalty points, and warranty support.",
        sections: [
          {
            heading: ar ? "هل يمكنني الشراء كضيف بدون حساب؟" : "Can I checkout as a guest?",
            body: ar
              ? "نعم، يدعم المتجر الشراء كضيف مع تتبع الطلب عبر الرابط المباشر، كما يمنحك التسجيل كسب نقاط ولاء ورصيد محفظة."
              : "Yes, guest checkout is supported with instant tracking links. Registered accounts also earn Loyalty Points, Store Wallet credit, and reward entries.",
          },
          {
            heading: ar ? "كيف تعمل نقاط الولاء؟" : "How do Loyalty Points work?",
            body: ar
              ? "تكسب نقاطا تلقائيا عند كل عملية شراء، ويمكنك تحويلها إلى رصيد محفظة أو استخدامها كخصم فوري في صفحة الدفع."
              : "You earn points on every order and can convert them to Store Wallet credit inside your Account Wallet or apply them directly during Checkout.",
          },
        ],
      };

    case "payment-methods":
      return {
        badge: ar ? "مدفوعات آمنة" : "Accepted Payments",
        title: ar ? "طرق الدفع المقبولة" : "Accepted Payment Methods",
        subtitle: ar
          ? "ادفع بأمان عبر البطاقات أو المحافظ الرقمية أو محفظة المتجر أو الدفع عند الاستلام."
          : "Pay securely via cards, regional gateways, installments, Store Wallet, Bank Transfer, or Cash on Delivery.",
        sections: [
          {
            heading: ar ? "البطاقات وبوابات الدفع الإلكتروني" : "Online Cards & Digital Wallets",
            body: ar
              ? "نقبل البطاقات المصرفية والمحافظ الرقمية وبوابات التقسيط المفعلة عبر اتصال مشفر بالكامل."
              : "We accept major cards, local payment gateways, digital wallets, and enabled installment providers over encrypted checkout.",
          },
          {
            heading: ar ? "محفظة المتجر والدفع عند الاستلام" : "Store Wallet, Bank Transfer & COD",
            body: ar
              ? "استخدم رصيد محفظة المتجر لتغطية الطلب جزئيا أو كليا، أو اختر التحويل البنكي أو الدفع عند الاستلام أو الاستلام من الفرع."
              : "Apply your Store Wallet credit toward partial or full payment, or complete orders via Bank Transfer, Cash on Delivery, or Branch Pickup.",
          },
        ],
      };
    }
  };
  return { key: kind, ...build() };
}
