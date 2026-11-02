# Integrations: setup and verification

The in-app **Settings → Integrations → Setup and verification** instructions are mirrored below in English and Arabic. Callback and webhook copy buttons use this installation’s configured public domains. Set `WEB_URL` or the company website domain and `ADMIN_APP_URL` or the admin domain before registering production URLs. Credential values are encrypted; stored secrets are returned only as presence flags and short hints.

Connection checks do not create charges, shipments or email. The separate WhatsApp test action sends real text. OAuth sign-in checks validate format and provider availability; finish an actual customer sign-in to prove authentication. Merchant approval, app review, quotas, production workers and sandbox acceptance remain account/deployment work.

Implemented address patterns (use the in-app copy buttons for actual origins):

| Connection                      | Address                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Google / Apple customer sign-in | `{website}/api/account/google/callback`, `{website}/api/account/apple/callback`                |
| Payment gateways                | `{website}/api/store/payment/webhook/{provider}`                                               |
| Payment browser return          | `{website}/api/store/payment/return` — the app adds attempt parameters; never use as a webhook |
| Resend delivery events          | `{admin}/api/webhooks/resend`                                                                  |
| Social / WhatsApp / couriers    | No inbound callback currently implemented                                                      |

## Status and acceptance boundaries

Social adapters store attributable provider/account snapshots and nullable counters. Missing readings remain unavailable; measured zero remains zero. Lifetime post counters and UTC publication filters are labeled accordingly. Owner-only reach, impressions, profile views and OAuth renewal are incomplete and are not replaced with fabricated values. LinkedIn currently imports followers only. Google/Outlook calendar links are read-only ICS subscriptions, not two-way OAuth synchronization.

Automatic courier booking supports one measured parcel; DHL also requires its measured dimensions. Multi-parcel consignments can be booked in the carrier portal and their confirmed tracking number recorded here. A persisted claim prevents automatic duplicate purchases. Uncertain outcomes pause dispatch changes until reconciliation; an aged attempt can only be retried after an operator types the shipment reference and confirms the carrier has no existing booking. Tracking is preserved before optional label storage; a label-storage failure must not trigger another booking. Markers protect new booking attempts; reconcile outstanding historical carrier requests before starting another automatic booking. SMSA’s issued account contract/label flow needs verification. PayTabs test mode is controlled by the merchant profile and cannot be inferred from its server key. HyperPay rejects amounts needing a third decimal rather than changing the charged/refunded amount.

Other requested providers and capabilities (GA4 reporting, additional social/scheduling platforms, SMS/WhatsApp gateways, Oman wallets, accounting/banking/AI/document/design services, hardware and two-way calendars) are inventoried with explicit missing/partial status in the project requirements. They are not represented as working connections here.

Payment settlement requires the provider’s captured reference and the exact requested amount/currency. Unverified or conflicting captures stay in review, do not credit the order and block another checkout. Staff can use **Recheck payment** after correcting the connection; customers see a review notice without another pay button. Provider reference uniqueness prevents one capture crediting two attempts. Receipt posting and webhook deduplication share the same transaction, so a failed receipt can be retried safely. Checkout.com status reads are bound to the stored hosted page.

## Facebook & Instagram (`meta`)

[Official setup documentation](https://developers.facebook.com/docs/pages-api/getting-started)

### English

**Before you start**

A Meta developer app, a Facebook Page you administer, and an Instagram professional account linked to that Page when Instagram is needed.

**Permissions**

Page access for the account being read. Request pages_show_list and pages_read_engagement; Instagram access also needs the applicable Instagram basic/insights permissions. Business access and app review depend on your Meta login product.

**Test and live environments**

Use accounts assigned to app roles while the app is in development. Public customer accounts require the relevant approved access.

**Setup steps**

1. Obtain a Page access token through your Meta app and copy the Page ID.
2. Add the linked Instagram account ID if needed, save and enable this connection.
3. Run Test connection, then Sync now. Renew the token when reconnect is requested.

**What the test checks**

Test connection reads the Page identity. A successful sync is required to verify each configured account and its available metrics.

**Common errors**

Error 190: renew the token. Permission errors: check Page role, token permissions and app access. Respect the retry time on rate limits.

**Current limits**

Current sync reads public account/post counters. Owner-only reach, impressions and profile views are unavailable. Automatic token renewal and a social OAuth callback are not implemented.

### العربية

**قبل البدء**

تطبيق مطور لدى Meta وصفحة فيسبوك تديرها، وحساب إنستغرام احترافي مرتبط بالصفحة عند الحاجة إليه.

**الصلاحيات**

صلاحية قراءة الصفحة المقصودة. اطلب pages_show_list وpages_read_engagement وصلاحيات إنستغرام الأساسية والإحصائية المناسبة لمنتج تسجيل الدخول. قد تلزم مراجعة التطبيق وصلاحيات الأعمال.

**بيئتا الاختبار والتشغيل الفعلي**

استخدم حسابات أدوار التطبيق في وضع التطوير. تتطلب حسابات العملاء العامة الموافقات المناسبة.

**خطوات الإعداد**

1. استخرج رمز وصول للصفحة ومعرّفها من تطبيق Meta.
2. أضف معرّف حساب إنستغرام المرتبط عند الحاجة، ثم احفظ وفعّل الاتصال.
3. اختبر الاتصال ثم زامن الآن. جدّد الرمز عند طلب إعادة الاتصال.

**ما الذي يفحصه الاختبار**

يقرأ الاختبار هوية الصفحة. يلزم نجاح المزامنة للتحقق من كل حساب ومقاييسه المتاحة.

**الأخطاء الشائعة**

الخطأ 190: جدّد الرمز. أخطاء الصلاحيات: راجع دور الصفحة وصلاحيات الرمز وموافقات التطبيق. انتظر موعد إعادة المحاولة عند بلوغ الحد.

**الحدود الحالية**

تُجلب حاليًا عدادات الحساب والمنشورات العامة. الوصول ومرات الظهور وزيارات الملف الخاصة بالمالك غير متاحة. التجديد التلقائي ومسار OAuth اجتماعي غير مطبقين.

## WhatsApp Business (`whatsapp`)

[Official setup documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

### English

**Before you start**

A WhatsApp Business account, a Cloud API phone number and a Meta business app.

**Permissions**

whatsapp_business_management for phone details and whatsapp_business_messaging for sending. Assign the phone number to the token owner.

**Test and live environments**

Use the Meta test phone and permitted recipients first. Live requires the registered business phone and appropriate business approval.

**Setup steps**

1. Copy the phone number ID, optional business account ID and an authorized access token.
2. Save, enable and run Test connection.
3. Send a test only to an agreed recipient using the full international number.

**What the test checks**

Test connection reads phone identity and sends nothing. Send a test message is a separate action that sends real text.

**Common errors**

Permission denied: check the phone assignment and token. Outside the customer-service window use an approved template through your messaging system.

**Current limits**

This app currently sends plain test text. Inbound messages, delivery-status webhooks, approved templates and document sending are not implemented here.

### العربية

**قبل البدء**

حساب واتساب للأعمال ورقم Cloud API وتطبيق أعمال لدى Meta.

**الصلاحيات**

whatsapp_business_management لبيانات الرقم وwhatsapp_business_messaging للإرسال. اربط الرقم بمالك الرمز.

**بيئتا الاختبار والتشغيل الفعلي**

ابدأ برقم Meta التجريبي والمستلمين المسموحين. يتطلب التشغيل الفعلي رقم الأعمال المسجل وموافقاته.

**خطوات الإعداد**

1. انسخ معرّف الرقم ومعرّف حساب الأعمال الاختياري ورمز الوصول المصرّح.
2. احفظ وفعّل ثم اختبر الاتصال.
3. أرسل تجربة فقط إلى مستلم متفق معه وبالرقم الدولي الكامل.

**ما الذي يفحصه الاختبار**

يقرأ اختبار الاتصال هوية الرقم ولا يرسل رسالة. إرسال رسالة تجريبية إجراء منفصل يرسل نصًا فعليًا.

**الأخطاء الشائعة**

رفض الصلاحية: راجع ربط الرقم والرمز. خارج نافذة خدمة العميل استخدم قالبًا معتمدًا عبر نظام المراسلة لديك.

**الحدود الحالية**

التطبيق يرسل حاليًا نص التجربة فقط. استقبال الرسائل وإشعارات التسليم والقوالب المعتمدة وإرسال المستندات غير مطبقة هنا.

## YouTube (`youtube`)

[Official setup documentation](https://developers.google.com/youtube/v3/getting-started)

### English

**Before you start**

A Google Cloud project with YouTube Data API v3 enabled, the public channel ID, and YouTube Analytics API enabled for owner activity.

**Permissions**

The public channel test uses a restricted Data API key. Private owner reports require the channel owner’s OAuth consent for youtube.readonly and yt-analytics.readonly. For automatic refresh, supply the OAuth client ID, client secret and offline refresh token together.

**Test and live environments**

These APIs have no separate sandbox. Start with an owned test channel and a Google OAuth test user; public apps can require verification. Monitor the project quota.

**Setup steps**

1. Create a restricted Data API key and find the channel ID beginning with UC.
2. For owner activity, authorize the channel owner through Google’s documented OAuth flow with both read scopes and offline access. A provider-issued owner access token works until it expires; the complete client ID/secret/refresh-token bundle refreshes during sync.
3. Save the channel ID and key, optionally add the owner credentials, enable and run Test connection. This connector accepts issued tokens; it does not provide a YouTube OAuth callback route.
4. Run Sync now. Check the separate owner-activity panel, its reported date range, timezone and last update. Owner consent must belong to the configured channel.

**What the test checks**

Test connection reads one public channel. Sync verifies private owner access when supplied. Hidden subscriber totals remain unavailable; public subscriber totals can be rounded by YouTube. Actual zeroes are kept; empty or invalid reports are not replaced with zeroes.

**Common errors**

Invalid key: check Data API enablement and key restrictions. Owner 401/invalid_grant: check credentials or reconnect; 403 insufficientPermissions: enable Analytics API, grant both scopes and verify channel ownership. Google quotaExceeded can be HTTP 403; wait for the shown backoff and check project quota. Provider errors are redacted before display.

**Current limits**

Owner reports collect views, likes, comments, shares and subscribers gained/lost for 7/30/90/365-day windows ending at the latest reported day. Dates use Pacific time and may lag. Daily observations and period snapshots are retained. Reach, channel impressions, profile views and watch time are not collected by this connector; ad/card impressions are not substitutes. Published-date post filters still use UTC and lifetime counters.

### العربية

**قبل البدء**

مشروع Google Cloud مفعّل عليه YouTube Data API v3 ومعرّف القناة العامة، مع تفعيل YouTube Analytics API لنشاط المالك.

**الصلاحيات**

يستخدم اختبار القناة العامة مفتاح Data API مقيّدًا. تتطلب تقارير المالك الخاصة موافقة مالك القناة عبر OAuth لنطاقَي youtube.readonly وyt-analytics.readonly. للتحديث التلقائي، أدخل معرّف عميل OAuth وسرّه ورمز التحديث للوصول دون اتصال معًا.

**بيئتا الاختبار والتشغيل الفعلي**

لا توجد بيئة اختبار منفصلة لهذه الواجهات. ابدأ بقناة اختبار تملكها ومستخدم اختبار في Google OAuth؛ وقد تحتاج التطبيقات العامة إلى التحقّق. راقب حصة المشروع.

**خطوات الإعداد**

1. أنشئ مفتاح Data API مقيّدًا وابحث عن معرّف القناة الذي يبدأ بـ UC.
2. لنشاط المالك، فوّض مالك القناة باتّباع تدفّق OAuth الموثّق من Google مع نطاقَي القراءة والوصول دون اتصال. يعمل رمز الوصول الصادر من المزوّد حتى انتهاء صلاحيته؛ وتتيح بيانات معرّف العميل وسرّه ورمز التحديث معًا التجديد أثناء المزامنة.
3. احفظ معرّف القناة والمفتاح، وأضف بيانات المالك اختياريًا ثم فعّل واختبر الاتصال. يقبل هذا الموصّل الرموز الصادرة مسبقًا ولا يوفّر مسار ردّ OAuth لـ YouTube.
4. اختر المزامنة الآن وراجع لوحة نشاط المالك المنفصلة وفترة بياناتها وتوقيتها وآخر تحديث. يجب أن تكون الموافقة لمالك القناة المحدّدة.

**ما الذي يتحقّق منه الاختبار**

يقرأ اختبار الاتصال قناة عامة واحدة. وتتحقّق المزامنة من وصول المالك الخاص عند إدخاله. يبقى عدد المشتركين المخفي غير متاح وقد يقرّب YouTube العدد العام. تُحفظ القيم الصفرية الفعلية ولا تُستبدل التقارير الفارغة أو غير الصالحة بأصفار.

**أخطاء شائعة**

المفتاح غير صالح: تحقّق من تفعيل Data API وقيود المفتاح. خطأ المالك 401 أو invalid_grant: راجع البيانات أو أعد الربط؛ وخطأ 403 insufficientPermissions: فعّل Analytics API وامنح النطاقَين وتحقّق من ملكية القناة. قد يأتي quotaExceeded من Google برمز HTTP 403؛ انتظر المهلة المعروضة وراجع حصة المشروع. تُحجب الأسرار من أخطاء المزوّد قبل عرضها.

**الحدود الحالية**

تجمع تقارير المالك المشاهدات والإعجابات والتعليقات والمشاركات والمشتركين الجدد والمفقودين لفترات 7/30/90/365 يومًا تنتهي بآخر يوم مُبلّغ عنه. تتبع التواريخ توقيت المحيط الهادئ وقد تتأخر. تُحفظ القراءات اليومية ولقطات الفترات. لا يجمع هذا الموصّل الوصول ومرّات ظهور القناة وزيارات الملف ووقت المشاهدة؛ ولا تُستخدم مرّات ظهور الإعلانات أو البطاقات بدلًا منها. تبقى مرشّحات تاريخ المنشورات بتوقيت UTC والعدّادات تراكمية.

## TikTok (`tiktok`)

[Official setup documentation](https://developers.tiktok.com/doc/display-api-overview)

### English

**Before you start**

A TikTok developer app approved for Display API and an account that authorized it.

**Permissions**

user.info.basic, user.info.stats and video.list for identity, counters and videos respectively.

**Test and live environments**

Follow the TikTok app review and test-account rules. The account token must belong to the intended profile.

**Setup steps**

1. Complete TikTok authorization outside this app and obtain the user access token.
2. Save the token, enable and run Test connection.
3. Run Sync now; replace expired tokens when the connection requests reconnection.

**What the test checks**

Test connection reads account identity. Statistics and video permissions are exercised during sync.

**Common errors**

401/invalid token: renew authorization. Missing scope: request the required approved scope. 429: wait for the displayed retry window.

**Current limits**

Token refresh and an in-app TikTok OAuth callback are not implemented. Missing counters stay unavailable; a token alone does not grant every metric.

### العربية

**قبل البدء**

تطبيق TikTok معتمد لاستخدام Display API وحساب صرّح له بالوصول.

**الصلاحيات**

user.info.basic وuser.info.stats وvideo.list للهوية والعدادات والمقاطع على الترتيب.

**بيئتا الاختبار والتشغيل الفعلي**

اتبع قواعد مراجعة التطبيق وحسابات الاختبار. يجب أن يخص الرمز الملف المطلوب.

**خطوات الإعداد**

1. أكمل تصريح TikTok خارج التطبيق واحصل على رمز وصول المستخدم.
2. احفظ الرمز وفعّل واختبر الاتصال.
3. زامن الآن واستبدل الرموز المنتهية عند طلب إعادة الاتصال.

**ما الذي يفحصه الاختبار**

يقرأ الاختبار هوية الحساب. تُختبر صلاحيات الإحصاءات والمقاطع أثناء المزامنة.

**الأخطاء الشائعة**

401 أو رمز غير صالح: جدّد التصريح. صلاحية ناقصة: اطلب الصلاحية المعتمدة. 429: انتظر الموعد المعروض.

**الحدود الحالية**

تجديد الرمز ومسار OAuth داخل التطبيق غير مطبقين. تبقى العدادات الناقصة غير متاحة؛ وجود رمز لا يمنح كل المقاييس.

## X (Twitter) (`x`)

[Official setup documentation](https://developer.x.com/en/docs/x-api/getting-started/about-x-api)

### English

**Before you start**

An X developer project with API access that permits user lookup and user timeline reads.

**Permissions**

An authorized app bearer token and the intended username. Endpoint availability and limits depend on the subscribed access tier.

**Test and live environments**

The same API serves test and live reads. Use an owned public profile first; reads consume the project allowance.

**Setup steps**

1. Copy the project bearer token and enter the username without @.
2. Save, enable and run Test connection.
3. Sync posts and available public metrics using Sync now.

**What the test checks**

Test connection looks up the username and reports the returned account identity.

**Common errors**

403: confirm endpoint entitlement and account visibility. 401: replace the token. 429: wait for the provider reset time.

**Current limits**

Public counters only; private impressions and account owner insights are unavailable. Large timelines can hit the displayed page limit.

### العربية

**قبل البدء**

مشروع مطور X باشتراك يسمح بقراءة المستخدم ومنشوراته.

**الصلاحيات**

رمز Bearer للتطبيق واسم المستخدم المطلوب. تختلف إتاحة المسارات وحدودها حسب الاشتراك.

**بيئتا الاختبار والتشغيل الفعلي**

تستخدم القراءة الواجهة نفسها للاختبار والتشغيل الفعلي. ابدأ بملف عام تملكه؛ القراءة تستهلك حصة المشروع.

**خطوات الإعداد**

1. انسخ رمز المشروع وأدخل اسم المستخدم دون @.
2. احفظ وفعّل واختبر الاتصال.
3. زامن المنشورات والمقاييس العامة المتاحة عبر زامن الآن.

**ما الذي يفحصه الاختبار**

يبحث الاختبار عن اسم المستخدم ويعرض هوية الحساب المسترجعة.

**الأخطاء الشائعة**

403: راجع إتاحة المسار وظهور الحساب. 401: استبدل الرمز. 429: انتظر موعد إعادة المحاولة لدى المنصة.

**الحدود الحالية**

عدادات عامة فقط؛ إحصاءات المالك ومرات الظهور الخاصة غير متاحة. قد تصل الحسابات الكبيرة إلى حد الصفحات المعروض.

## LinkedIn (`linkedin`)

[Official setup documentation](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations)

### English

**Before you start**

A LinkedIn developer app with the relevant Community Management product access and an organization administrator.

**Permissions**

Approved organization access for the networkSizes organization-follower endpoint. Confirm the current permissions for your granted product; older scopes alone may be insufficient.

**Test and live environments**

Use an organization the authorizing administrator manages. Organization access may require LinkedIn product approval.

**Setup steps**

1. Obtain the organization ID and a user access token authorized for that organization.
2. Save, enable and run Test connection.
3. Run Sync now to store the available follower total.

**What the test checks**

The check reads organization identity; sync reads organization follower network size. Requests pin LinkedIn version 202609.

**Common errors**

403: check organization administration, approved product and token scopes. 401: obtain a current token. Version errors require an adapter review.

**Current limits**

The current adapter imports follower totals only. Post performance, impressions, reach, automatic renewal and an in-app authorization callback are not implemented.

### العربية

**قبل البدء**

تطبيق LinkedIn حاصل على وصول Community Management المناسب ومسؤول عن المؤسسة.

**الصلاحيات**

وصول معتمد للمؤسسة ومسار networkSizes لعدد المتابعين. راجع صلاحيات المنتج الممنوح؛ قد لا تكفي الصلاحيات القديمة.

**بيئتا الاختبار والتشغيل الفعلي**

استخدم مؤسسة يديرها صاحب التصريح. قد يحتاج الوصول إلى موافقة منتج من LinkedIn.

**خطوات الإعداد**

1. احصل على معرّف المؤسسة ورمز مستخدم مخوّل لها.
2. احفظ وفعّل واختبر الاتصال.
3. زامن الآن لحفظ عدد المتابعين المتاح.

**ما الذي يفحصه الاختبار**

يفحص الاختبار هوية المؤسسة، وتقرأ المزامنة حجم شبكة متابعيها. تستخدم الطلبات إصدار LinkedIn 202609.

**الأخطاء الشائعة**

403: راجع إدارة المؤسسة والمنتج المعتمد وصلاحيات الرمز. 401: جدّد الرمز. خطأ الإصدار يتطلب مراجعة الموصّل.

**الحدود الحالية**

الموصّل الحالي يجلب المتابعين فقط. أداء المنشورات والظهور والوصول وتجديد الرمز ومسار التصريح داخل التطبيق غير مطبقة.

## Resend e-mail (`resend`)

[Official setup documentation](https://resend.com/docs/dashboard/domains/introduction)

### English

**Before you start**

A Resend account, verified sending domain and sender address on that domain.

**Permissions**

The delivery key needs email sending access. The current domain-verification check additionally needs domain-read access; a sending-only key cannot pass that check.

**Test and live environments**

Use an owned test recipient before enabling live jobs. A connection test does not send an email.

**Setup steps**

1. Verify the domain DNS in Resend, then save the API key and sender email here.
2. Optionally register the admin webhook address below and save its signing secret for delivery events.
3. Enable and test. The notify service sends every e-mail with these credentials; send a test from IT dashboard → Notifications, then verify the signed webhook.

**What the test checks**

Test connection lists domains and verifies the sender domain. Actual delivery, idempotency and signed webhooks are separate checks.

**Common errors**

403 with a sending-only key can mean the domain check is unauthorized, even if delivery works. Unverified domain: complete DNS verification. Signature errors: copy the webhook signing secret.

**Current limits**

Only the saved integration sends e-mail; environment keys are no longer read. Disconnecting makes queued e-mail fail until it is reconnected and sent again from Notifications. The connection test does not prove delivery: send a test message for that.

### العربية

**قبل البدء**

حساب Resend ونطاق إرسال موثّق وعنوان مرسل على ذلك النطاق.

**الصلاحيات**

يلزم مفتاح بصلاحية الإرسال. يتطلب فحص النطاق الحالي صلاحية قراءته أيضًا؛ لا يجتاز مفتاح الإرسال فقط هذا الفحص.

**بيئتا الاختبار والتشغيل الفعلي**

استخدم مستلمًا تجريبيًا تملكه قبل تشغيل مهام التشغيل الفعلي. اختبار الاتصال لا يرسل بريدًا.

**خطوات الإعداد**

1. وثّق DNS للنطاق لدى Resend ثم احفظ المفتاح وعنوان المرسل هنا.
2. سجّل اختياريًا عنوان إشعارات الإدارة أدناه واحفظ سر التوقيع لأحداث التسليم.
3. فعّل واختبر. ترسل خدمة الإشعارات كل بريد بهذه البيانات؛ أرسل رسالة تجريبية من لوحة تقنية المعلومات ← الإشعارات، ثم تحقّق من الإشعار الموقّع.

**ما الذي يفحصه الاختبار**

يسرد الاختبار النطاقات ويتحقق من نطاق المرسل. التسليم ومنع التكرار والإشعارات الموقّعة اختبارات منفصلة.

**الأخطاء الشائعة**

قد يعني 403 مع مفتاح الإرسال فقط غياب صلاحية فحص النطاق رغم صلاحية الإرسال. أكمل DNS للنطاق غير الموثق، وراجع سر التوقيع لأخطاء الإشعارات.

**الحدود الحالية**

التكامل المحفوظ وحده يرسل البريد؛ لم تعد مفاتيح البيئة تُقرأ. قطع الاتصال يجعل الرسائل المنتظرة تفشل حتى يُعاد الاتصال وتُرسل مجدداً من صفحة الإشعارات. اختبار الاتصال لا يثبت التسليم: أرسل رسالة تجريبية لذلك.

## Sign in with Google (`google_signin`)

[Official setup documentation](https://developers.google.com/identity/protocols/oauth2/web-server)

### English

**Before you start**

A Google Cloud OAuth web application, consent configuration and the website public domain.

**Permissions**

openid, email and profile. Add test users while the consent app is in testing.

**Test and live environments**

Use a web OAuth client. Register the exact callback below for each environment; live needs a public HTTPS website.

**Setup steps**

1. Create the web client and register the displayed callback as an authorized redirect URI.
2. Copy client ID and client secret here, save and enable.
3. Run Test connection, then complete a real customer sign-in on the website in a private browser window.

**What the test checks**

The connection check validates credential format and provider availability. Only a completed sign-in proves the secret, consent and redirect configuration.

**Common errors**

redirect_uri_mismatch: compare scheme, host and complete path. invalid_client: verify the web client secret. access_denied: check consent status/test users.

**Current limits**

This connects customer website sign-in. It does not grant YouTube owner analytics, calendar access or an administrator login.

### العربية

**قبل البدء**

تطبيق OAuth للويب لدى Google Cloud وإعداد الموافقة والنطاق العام للموقع.

**الصلاحيات**

openid وemail وprofile. أضف المستخدمين التجريبيين عندما يكون تطبيق الموافقة قيد الاختبار.

**بيئتا الاختبار والتشغيل الفعلي**

استخدم عميل ويب وسجّل عنوان العودة المطابق لكل بيئة. يلزم موقع HTTPS عام للتشغيل فعلي.

**خطوات الإعداد**

1. أنشئ عميل ويب وسجّل عنوان العودة المعروض ضمن عناوين إعادة التوجيه المسموحة.
2. احفظ معرّف العميل وسره هنا وفعّل الاتصال.
3. اختبر الاتصال ثم أكمل تسجيل دخول عميل فعلي من الموقع في نافذة خاصة.

**ما الذي يفحصه الاختبار**

يفحص الاتصال صيغة البيانات وتوفر المنصة. وحده تسجيل الدخول المكتمل يثبت السر والموافقة وعنوان العودة.

**الأخطاء الشائعة**

redirect_uri_mismatch: طابق البروتوكول والمضيف والمسار كاملًا. invalid_client: راجع سر عميل الويب. access_denied: راجع الموافقة والمستخدمين التجريبيين.

**الحدود الحالية**

هذا لتسجيل دخول عملاء الموقع. لا يمنح تحليلات مالك يوتيوب أو وصول التقويم أو دخول الإدارة.

## Sign in with Apple (`apple_signin`)

[Official setup documentation](https://developer.apple.com/documentation/sign_in_with_apple/configuring_your_environment_for_sign_in_with_apple)

### English

**Before you start**

An Apple Developer team, a primary App ID enabled for Sign in with Apple, and an associated Services ID for this website.

**Permissions**

Enable Sign in with Apple for the primary app and its key. Configure the website domains and exact return URL on the Services ID.

**Test and live environments**

Use the website Services ID, not an app bundle ID. Apple web return URLs require the registered public HTTPS domain.

**Setup steps**

1. Register the website domain and displayed callback on the Services ID.
2. Enter Services ID, Team ID and Key ID; select the downloaded .p8 private key file, then save and enable.
3. Run Test connection, then complete an actual website sign-in to verify the team/domain association.

**What the test checks**

The check validates key signing/identifier format and provider availability. A real browser sign-in is required to verify Apple account configuration.

**Common errors**

invalid_client: check all IDs and that the key belongs to the team/app. Invalid redirect: compare the registered HTTPS return URL. Relay email requires registered sending sources.

**Current limits**

The private key is encrypted and never returned in full after saving. Apple app/team approval and private relay email setup remain external account tasks.

### العربية

**قبل البدء**

فريق Apple Developer ومعرّف تطبيق أساسي مفعّل عليه Sign in with Apple ومعرّف خدمات مرتبط بالموقع.

**الصلاحيات**

فعّل تسجيل الدخول على التطبيق الأساسي ومفتاحه، واضبط نطاقات الموقع وعنوان العودة المطابق على معرّف الخدمات.

**بيئتا الاختبار والتشغيل الفعلي**

استخدم معرّف خدمات الموقع لا معرّف حزمة التطبيق. تتطلب عناوين العودة نطاق HTTPS العام المسجل.

**خطوات الإعداد**

1. سجّل نطاق الموقع وعنوان العودة المعروض على معرّف الخدمات.
2. أدخل معرّف الخدمات والفريق والمفتاح واختر ملف المفتاح الخاص .p8، ثم احفظ وفعّل.
3. اختبر الاتصال ثم أكمل دخولًا فعليًا من الموقع للتحقق من ربط الفريق والنطاق.

**ما الذي يفحصه الاختبار**

يفحص الاختبار توقيع المفتاح وصيغة المعرّفات وتوفر المنصة. يلزم دخول فعلي للتحقق من إعداد حساب Apple.

**الأخطاء الشائعة**

invalid_client: طابق المعرّفات وانتماء المفتاح للفريق والتطبيق. راجع عنوان HTTPS لأخطاء العودة. بريد الترحيل يحتاج مصادر إرسال مسجلة.

**الحدود الحالية**

يُشفّر المفتاح ولا يعاد عرضه كاملًا بعد الحفظ. موافقات Apple والفريق وإعداد بريد الترحيل مهام خارجية على الحساب.

## Stripe (`stripe`)

[Official setup documentation](https://docs.stripe.com/checkout/quickstart)

### English

**Before you start**

A Stripe account with the intended currency and payment methods enabled.

**Permissions**

A server secret key and a signing secret for the website webhook endpoint. Restricted keys need checkout, payment reads and refund permissions.

**Test and live environments**

Use sk_test_ keys and test webhooks first. Live keys create real charges; wallet availability depends on the merchant account and domain.

**Setup steps**

1. Create the webhook below for checkout.session.completed, checkout.session.async_payment_succeeded and checkout.session.async_payment_failed.
2. Save the server key and that endpoint signing secret, enable and test.
3. Choose Stripe in Store settings, then complete a test checkout, webhook replay and refund before going live.

**What the test checks**

Test connection reads account access without charging. Checkout, wallet presentation, event verification and refund acceptance need sandbox transactions. Orders with an unverified captured reference, amount or currency stay in review. Use Recheck payment after fixing the connection; do not charge again.

**Common errors**

401: verify the server key/environment. Signature error: use the endpoint secret from the matching mode. Disabled payment methods need account activation.

**Current limits**

Card details stay on Stripe hosted checkout. A healthy credential check does not prove Apple Pay, Google Pay or every settlement currency is enabled.

### العربية

**قبل البدء**

حساب Stripe مع تفعيل العملة وطرق الدفع المطلوبة.

**الصلاحيات**

مفتاح خادم سري وسر توقيع لإشعارات الموقع. تحتاج المفاتيح المقيّدة صلاحيات إتمام الدفع والقراءة والاسترداد.

**بيئتا الاختبار والتشغيل الفعلي**

ابدأ بمفاتيح sk_test_ وإشعارات الاختبار. المفاتيح الحية تخصم فعليًا؛ توفر المحافظ يعتمد على حساب التاجر ونطاقه.

**خطوات الإعداد**

1. أنشئ عنوان الإشعارات أدناه لأحداث checkout.session.completed وcheckout.session.async_payment_succeeded وcheckout.session.async_payment_failed.
2. احفظ مفتاح الخادم وسر توقيع ذلك العنوان وفعّل واختبر.
3. اختر Stripe في إعدادات المتجر ثم اختبر الدفع وإعادة إرسال الإشعار والاسترداد قبل التشغيل الفعلي.

**ما الذي يفحصه الاختبار**

يقرأ الاختبار وصول الحساب دون خصم. الدفع والمحافظ والتوقيع والاسترداد تتطلب معاملات تجريبية. تبقى الدفعات ذات مرجع أو مبلغ أو عملة غير متحقق منها قيد المراجعة. استخدم إعادة فحص الدفع بعد تصحيح الاتصال ولا تخصم مجددًا.

**الأخطاء الشائعة**

401: راجع مفتاح الخادم وبيئته. خطأ التوقيع: استخدم سر العنوان في الوضع المطابق. طرق الدفع غير المتاحة تحتاج تفعيل الحساب.

**الحدود الحالية**

تبقى بيانات البطاقة في صفحة Stripe المستضافة. نجاح فحص المفتاح لا يثبت تفعيل Apple Pay أو Google Pay أو كل عملات التسوية.

## Tap Payments (`tap`)

[Official setup documentation](https://developers.tap.company/docs/charges)

### English

**Before you start**

A Tap merchant account with the required cards/wallets and currencies approved.

**Permissions**

The server secret key for the correct merchant environment. Never use a publishable key here.

**Test and live environments**

sk_test_ identifies test credentials. Live credentials can charge real customers; available local methods depend on the approved account.

**Setup steps**

1. Save the merchant secret key, enable and run Test connection.
2. Select Tap in Store settings; the app supplies the notification URL for each charge.
3. Complete a sandbox checkout, signed notification and refund for each enabled method.

**What the test checks**

The connection check is a non-charging account request. Tap notifications are verified using the secret key. Orders with an unverified captured reference, amount or currency stay in review. Use Recheck payment after fixing the connection; do not charge again.

**Common errors**

Unauthorized: confirm the secret key. Missing methods/currency: request merchant activation. Signature mismatch: use the key matching the charge.

**Current limits**

BenefitPay, mada, KNET and wallets appear only when Tap enables them for the merchant. Browser return alone does not prove settlement.

### العربية

**قبل البدء**

حساب تاجر Tap مع اعتماد البطاقات والمحافظ والعملات المطلوبة.

**الصلاحيات**

مفتاح الخادم السري لبيئة التاجر الصحيحة. لا تستخدم المفتاح القابل للنشر هنا.

**بيئتا الاختبار والتشغيل الفعلي**

تُعرف مفاتيح الاختبار ببادئة sk_test_. المفاتيح الحية تخصم فعليًا؛ تختلف الطرق المحلية حسب اعتماد الحساب.

**خطوات الإعداد**

1. احفظ مفتاح التاجر وفعّل واختبر الاتصال.
2. اختر Tap في إعدادات المتجر؛ يرفق التطبيق عنوان الإشعار مع كل عملية.
3. اختبر الدفع والإشعار الموقّع والاسترداد لكل طريقة مفعلة في البيئة التجريبية.

**ما الذي يفحصه الاختبار**

يفحص الاتصال الحساب دون إنشاء خصم. تتحقق الإشعارات باستخدام المفتاح السري. تبقى الدفعات ذات مرجع أو مبلغ أو عملة غير متحقق منها قيد المراجعة. استخدم إعادة فحص الدفع بعد تصحيح الاتصال ولا تخصم مجددًا.

**الأخطاء الشائعة**

رفض التصريح: راجع المفتاح السري. طرق أو عملات ناقصة: اطلب تفعيل التاجر. خطأ التوقيع: طابق مفتاح العملية.

**الحدود الحالية**

لا تظهر BenefitPay وmada وKNET والمحافظ إلا بتفعيلها لدى Tap. عودة المتصفح وحدها لا تثبت التسوية.

## PayPal (`paypal`)

[Official setup documentation](https://developer.paypal.com/docs/checkout/standard/integrate/)

### English

**Before you start**

A PayPal REST app, sandbox business account and supported settlement currency.

**Permissions**

Client ID/secret for the selected environment and webhook ID for that app/environment.

**Test and live environments**

Enter sandbox for test accounts, live for live. PayPal does not support every store currency; verify its current currency list before enabling.

**Setup steps**

1. Create a webhook at the URL below for CHECKOUT.ORDER.APPROVED and PAYMENT.CAPTURE completed/denied events.
2. Save the matching client credentials, environment and webhook ID, then test.
3. Select PayPal in Store settings and verify sandbox approval, capture, webhook replay and refund.

**What the test checks**

Test connection obtains an application access token. Payment settlement is recorded only after capture confirmation. Orders with an unverified captured reference, amount or currency stay in review. Use Recheck payment after fixing the connection; do not charge again.

**Common errors**

invalid_client: match app keys and environment. Webhook verification failure: check webhook ID. Unsupported currency requires another gateway or store currency.

**Current limits**

Supported currencies, cards and wallets depend on merchant region and gateway configuration.

### العربية

**قبل البدء**

تطبيق PayPal REST وحساب أعمال تجريبي وعملة تسوية مدعومة.

**الصلاحيات**

معرّف العميل وسره ومعرّف إشعارات للتطبيق والبيئة نفسيهما.

**بيئتا الاختبار والتشغيل الفعلي**

أدخل sandbox للاختبار وlive للتشغيل فعلي. ليست كل عملات المتجر مدعومة؛ راجع قائمة العملات الحالية قبل التفعيل.

**خطوات الإعداد**

1. أنشئ إشعارًا بالعنوان أدناه لأحداث CHECKOUT.ORDER.APPROVED وأحداث اكتمال أو رفض PAYMENT.CAPTURE.
2. احفظ بيانات العميل والبيئة ومعرّف الإشعار المطابقة ثم اختبر.
3. اختر PayPal في المتجر واختبر الموافقة والتحصيل وإعادة الإشعار والاسترداد تجريبيًا.

**ما الذي يفحصه الاختبار**

يستخرج الاختبار رمز وصول للتطبيق. لا تُسجّل التسوية إلا بعد تأكيد التحصيل. تبقى الدفعات ذات مرجع أو مبلغ أو عملة غير متحقق منها قيد المراجعة. استخدم إعادة فحص الدفع بعد تصحيح الاتصال ولا تخصم مجددًا.

**الأخطاء الشائعة**

invalid_client: طابق مفاتيح التطبيق والبيئة. فشل التحقق من الإشعار: راجع معرّفه. العملة غير المدعومة تتطلب بوابة أو عملة أخرى.

**الحدود الحالية**

تتغير العملات والبطاقات والمحافظ المتاحة حسب إعدادات بوابة الدفع وحساب التاجر.

## Checkout.com (`checkout_com`)

[Official setup documentation](https://www.checkout.com/docs/payments/accept-payments/accept-a-payment-on-a-hosted-page)

### English

**Before you start**

A Checkout.com account, processing channel and the account API hostname from its dashboard.

**Permissions**

A server secret key authorized for hosted payments, reads and refunds, plus the webhook signing secret.

**Test and live environments**

Use sandbox or live and its matching keys/channel. If the API host is account123.api.sandbox.checkout.com, API prefix is account123 only.

**Setup steps**

1. Configure the webhook below for payment_captured, payment_declined, payment_expired and payment_capture_declined.
2. Save environment, API prefix if assigned, key, channel, billing country and signing secret.
3. Test, select this gateway in Store settings, then verify sandbox checkout, notifications and refunds.

**What the test checks**

Test connection performs a read-only payment query. Billing country is an ISO two-letter code such as BH. Orders with an unverified captured reference, amount or currency stay in review. Use Recheck payment after fixing the connection; do not charge again.

**Common errors**

401/403: check key permissions and processing channel. Host errors: copy only the account prefix. Signature mismatch: check the matching endpoint secret.

**Current limits**

An omitted API prefix retains the legacy host for existing accounts. Merchant-specific wallet and payment-method activation still needs sandbox acceptance.

### العربية

**قبل البدء**

حساب Checkout.com وقناة معالجة واسم مضيف API الخاص بالحساب من لوحة التحكم.

**الصلاحيات**

مفتاح خادم لصفحات الدفع والقراءة والاسترداد، مع سر توقيع الإشعارات.

**بيئتا الاختبار والتشغيل الفعلي**

استخدم sandbox أوlive ومفاتيح وقناة مطابقة. إذا كان المضيف account123.api.sandbox.checkout.com فالبادئة هي account123 فقط.

**خطوات الإعداد**

1. اضبط عنوان الإشعار أدناه لأحداث payment_captured وpayment_declined وpayment_expired وpayment_capture_declined.
2. احفظ البيئة وبادئة الحساب عند وجودها والمفتاح والقناة وبلد الفوترة وسر التوقيع.
3. اختبر واختر البوابة في المتجر ثم تحقق من الدفع والإشعارات والاسترداد تجريبيًا.

**ما الذي يفحصه الاختبار**

ينفّذ الاختبار استعلام دفع للقراءة فقط. بلد الفوترة رمز ISO من حرفين مثل BH. تبقى الدفعات ذات مرجع أو مبلغ أو عملة غير متحقق منها قيد المراجعة. استخدم إعادة فحص الدفع بعد تصحيح الاتصال ولا تخصم مجددًا.

**الأخطاء الشائعة**

401 أو403: راجع صلاحيات المفتاح وقناة المعالجة. خطأ المضيف: انسخ بادئة الحساب فقط. خطأ التوقيع: طابق سر العنوان.

**الحدود الحالية**

ترك البادئة فارغة يبقي المضيف القديم للحسابات الحالية. تفعيل المحافظ وطرق الدفع لدى التاجر يحتاج قبولًا تجريبيًا.

## PayTabs (`paytabs`)

[Official setup documentation](https://support.paytabs.com/en/support/solutions/articles/60000711358-what-is-paytabs-hosted-payment-page-)

### English

**Before you start**

A PayTabs merchant profile and its regional endpoint/server key.

**Permissions**

The profile ID and server key issued for the same regional merchant profile.

**Test and live environments**

The merchant profile controls test/live behavior. The app cannot infer a test profile from its key; verify the profile mode in PayTabs before charging.

**Setup steps**

1. Choose the regional code: SAU, ARE, EGY, OMN, JOR, IRQ, KWT, MAR, QAT or GLOBAL as appropriate for the issued endpoint.
2. Save region, profile ID and server key, enable and test.
3. Select PayTabs in Store settings. The app adds the callback per payment; verify a test-profile checkout and refund.

**What the test checks**

Test connection runs a transaction query without creating a charge. A no-record/provider error is reported as an error rather than a successful credential test. Orders with an unverified captured reference, amount or currency stay in review. Use Recheck payment after fixing the connection; do not charge again.

**Common errors**

Unauthorized: verify regional host, profile and server key together. Signature mismatch: use the profile server key. No-record query results need account-backed verification.

**Current limits**

Confirm test mode with PayTabs directly. Browser return signatures and raw callback signatures are distinct; callback verification is handled by the adapter.

### العربية

**قبل البدء**

ملف تاجر PayTabs وعنوانه الإقليمي ومفتاح الخادم.

**الصلاحيات**

معرّف الملف ومفتاح الخادم الصادران لملف التاجر الإقليمي نفسه.

**بيئتا الاختبار والتشغيل الفعلي**

ملف التاجر هو الذي يحدد وضع الاختبار أوالتشغيل الفعلي. لا يستنتج التطبيق وضع الملف من المفتاح؛ تحقّق منه لدى PayTabs قبل الخصم.

**خطوات الإعداد**

1. اختر رمز المنطقة المطابق للعنوان الممنوح: SAU أوARE أوEGY أوOMN أوJOR أوIRQ أوKWT أوMAR أوQAT أوGLOBAL.
2. احفظ المنطقة ومعرّف الملف والمفتاح وفعّل واختبر.
3. اختر PayTabs في المتجر؛ يرفق التطبيق عنوان الإشعار بكل دفع. تحقق من الدفع والاسترداد بملف تجريبي.

**ما الذي يفحصه الاختبار**

ينفذ الاختبار استعلام معاملة دون خصم. يُعرض عدم وجود سجل أوخطأ المزود كخطأ ولا يعد إثباتًا لسلامة البيانات. تبقى الدفعات ذات مرجع أو مبلغ أو عملة غير متحقق منها قيد المراجعة. استخدم إعادة فحص الدفع بعد تصحيح الاتصال ولا تخصم مجددًا.

**الأخطاء الشائعة**

رفض التصريح: طابق المضيف والمنطقة والملف والمفتاح. خطأ التوقيع: راجع مفتاح الملف. عدم وجود سجل يتطلب تحققًا بحساب فعلي.

**الحدود الحالية**

تحقق مباشرة من وضع الاختبار لدى PayTabs. توقيع عودة المتصفح مختلف عن توقيع جسم الإشعار، ويتولى الموصّل التحقق منه.

## Moyasar (`moyasar`)

[Official setup documentation](https://docs.moyasar.com/api/invoices/01-create-invoice)

### English

**Before you start**

A Moyasar account with hosted invoices and the intended currency/method enabled.

**Permissions**

A server secret key and the webhook secret token configured in the dashboard.

**Test and live environments**

sk_test_ identifies test keys. Verify the merchant-supported currency and invoice minimum before selecting this gateway.

**Setup steps**

1. Register the webhook below for payment success/failure events and save its secret token.
2. Save the server key, enable and run Test connection.
3. Select Moyasar in Store settings, then verify a test invoice, payment event and refund.

**What the test checks**

Test connection reads invoice access. The invoice success URL is a browser return; invoice callback_url is not pointed at that browser handler. Orders with an unverified captured reference, amount or currency stay in review. Use Recheck payment after fixing the connection; do not charge again.

**Common errors**

401: verify the secret key. Secret-token mismatch: check the webhook setting. Small amounts/currency restrictions require an accepted amount or another gateway.

**Current limits**

Invoice creation and payment notifications are separate contracts. The app relies on the configured verified payment webhook for settlement notifications.

### العربية

**قبل البدء**

حساب Moyasar مع فواتير مستضافة وعملة وطريقة دفع مفعّلة.

**الصلاحيات**

مفتاح خادم سري ورمز سر الإشعارات المضبوط في لوحة التحكم.

**بيئتا الاختبار والتشغيل الفعلي**

تحدد بادئة sk_test_ مفاتيح الاختبار. تحقق من العملة المدعومة والحد الأدنى للفاتورة قبل اختيار البوابة.

**خطوات الإعداد**

1. سجل عنوان الإشعارات أدناه لأحداث نجاح وفشل الدفع واحفظ رمزه السري.
2. احفظ مفتاح الخادم وفعّل واختبر الاتصال.
3. اختر Moyasar في المتجر ثم اختبر فاتورة وإشعار دفع واسترداد تجريبيًا.

**ما الذي يفحصه الاختبار**

يقرأ الاختبار وصول الفواتير. عنوان نجاح الفاتورة لعودة المتصفح، ولا يُستخدم ذلك المسار لاستقبال callback_url الخاص بإشعارات الفاتورة. تبقى الدفعات ذات مرجع أو مبلغ أو عملة غير متحقق منها قيد المراجعة. استخدم إعادة فحص الدفع بعد تصحيح الاتصال ولا تخصم مجددًا.

**الأخطاء الشائعة**

401: راجع المفتاح. عدم تطابق الرمز السري: راجع إعداد الإشعارات. قيود المبلغ أوالعملة تتطلب مبلغًا مقبولًا أوبوابة أخرى.

**الحدود الحالية**

إنشاء الفاتورة وإشعارات الدفع عقدان منفصلان. يعتمد تسجيل التسوية على إشعار الدفع المضبوط والمتحقق منه.

## HyperPay (`hyperpay`)

[Official setup documentation](https://hyperpay.docs.oppwa.com/integrations/widget)

### English

**Before you start**

A HyperPay entity, bearer token, approved brands and webhook encryption key.

**Permissions**

Entity access for checkout, payment status and refunds; the 64-character hexadecimal webhook key issued for this entity.

**Test and live environments**

Use test with test entity credentials, then live with the approved live entity. Approved wallet/brand configuration is account-specific.

**Setup steps**

1. Register the website webhook below in HyperPay and obtain its encryption key.
2. Save environment, entity, token, space-separated brands and webhook key, then test.
3. Select HyperPay in Store settings and verify hosted widget, encrypted notification and refund in test mode.

**What the test checks**

The test performs a non-charging entity request. Status errors stay unavailable and do not cancel unresolved remote payments. Orders with an unverified captured reference, amount or currency stay in review. Use Recheck payment after fixing the connection; do not charge again.

**Common errors**

Unauthorized: match entity/token/environment. Decryption errors: check the 32-byte hex key. Excess amount precision: choose another payment method.

**Current limits**

The current COPYandPAY contract accepts two decimal places. Amounts exceeding accepted precision are rejected before checkout/refund, rather than rounded. Widget/wallet availability needs merchant acceptance.

### العربية

**قبل البدء**

كيان HyperPay ورمز Bearer وعلامات دفع معتمدة ومفتاح تشفير الإشعارات.

**الصلاحيات**

وصول الكيان لإنشاء الدفع وقراءة حالته والاسترداد، ومفتاح إشعارات سداسي عشري من 64 محرفًا.

**بيئتا الاختبار والتشغيل الفعلي**

استخدم test مع بيانات الكيان التجريبي، وlive مع الكيان الفعلي المعتمد. تفعيل العلامات والمحافظ خاص بالحساب.

**خطوات الإعداد**

1. سجل عنوان إشعارات الموقع أدناه لدى HyperPay واحصل على مفتاح تشفيره.
2. احفظ البيئة والكيان والرمز والعلامات المفصولة بمسافات ومفتاح الإشعارات ثم اختبر.
3. اختر HyperPay في المتجر واختبر أداة الدفع والإشعار المشفر والاسترداد تجريبيًا.

**ما الذي يفحصه الاختبار**

ينفّذ الاختبار طلب كيان دون خصم. لا تؤدي أخطاء قراءة الحالة إلى إلغاء دفعات بعيدة غير محسومة. تبقى الدفعات ذات مرجع أو مبلغ أو عملة غير متحقق منها قيد المراجعة. استخدم إعادة فحص الدفع بعد تصحيح الاتصال ولا تخصم مجددًا.

**الأخطاء الشائعة**

رفض التصريح: طابق الكيان والرمز والبيئة. خطأ فك التشفير: راجع المفتاح السداسي من 32 بايتًا. دقة المبلغ الزائدة تتطلب طريقة دفع أخرى.

**الحدود الحالية**

يقبل عقد COPYandPAY الحالي منزلتين عشريتين. تُرفض المبالغ ذات الدقة العشرية غير المدعومة قبل الدفع أو الاسترداد دون تقريب. الأداة والمحافظ تحتاج قبول التاجر.

## Aramex (`aramex`)

[Official setup documentation](https://www.aramex.com/us/en/developers-solution-center/aramex-apis)

### English

**Before you start**

An Aramex API-enabled shipping account with sender details and test/live credentials.

**Permissions**

API username/password, account number/PIN, account entity and account country for the same account.

**Test and live environments**

Use test credentials with test and approved live credentials with live. A tracking check does not buy a label.

**Setup steps**

1. Obtain account credentials from Aramex and confirm the account entity/country.
2. Save all fields, enable and run Test connection.
3. Verify a controlled booking, returned tracking/label and tracking updates with Aramex before using live shipments.

**What the test checks**

The connection check sends a non-booking tracking query. Account and internal service errors are reported as failures.

**Common errors**

ERR01: credentials. ERR02: account. ERR03: blocked account. ERR00: provider/internal failure; retry after resolving the service issue. If a booking outcome is uncertain, reconcile the shipment reference with the original carrier before recording tracking or approving a retry.

**Current limits**

Automatic booking supports one measured parcel. For several parcels, book in the carrier portal and record its tracking number here. Account/product acceptance still needs Aramex verification. Tracking is polled; no inbound courier callback is implemented.

### العربية

**قبل البدء**

حساب شحن Aramex مفعّل للواجهة البرمجية وبيانات مرسل وبيانات اختبار وتشغيل فعلي.

**الصلاحيات**

اسم المستخدم وكلمة المرور ورقم الحساب ورمزه والجهة وبلد الحساب نفسه.

**بيئتا الاختبار والتشغيل الفعلي**

استخدم بيانات اختبار مع test وبيانات تشغيل فعلي معتمدة مع live. فحص التتبع لا يشتري ملصق شحن.

**خطوات الإعداد**

1. اطلب بيانات الحساب من Aramex وتحقق من جهة الحساب وبلده.
2. احفظ كل الحقول وفعّل واختبر الاتصال.
3. تحقق مع Aramex من حجز مضبوط ورقم تتبع وملصق وتحديثات تتبع قبل الشحن الفعلي.

**ما الذي يفحصه الاختبار**

يرسل الفحص استعلام تتبع دون حجز. تعرض أخطاء الحساب والخدمة كفشل.

**الأخطاء الشائعة**

ERR01: بيانات الدخول. ERR02: الحساب. ERR03: حساب محظور. ERR00: عطل داخلي؛ أعد المحاولة بعد معالجة الخدمة. عند عدم تأكد نتيجة الحجز تحقق من مرجع الشحنة مع الشركة الأصلية قبل تسجيل التتبع أوالموافقة على إعادة المحاولة.

**الحدود الحالية**

يدعم الحجز التلقائي طردًا واحدًا بوزن مقاس. لعدة طرود احجز عبر بوابة الشركة وسجل رقم التتبع هنا. يلزم تحقق Aramex من قبول الحساب والمنتج. التتبع دوري ولا يوجد عنوان إشعار وارد.

## DHL Express (`dhl_express`)

[Official setup documentation](https://developer.dhl.com/api-reference/dhl-express-mydhl-api)

### English

**Before you start**

A DHL Express account, MyDHL API application and approved sender/product details.

**Permissions**

The API key/secret used for Basic authentication and the shipping account number.

**Test and live environments**

Use test for the MyDHL test endpoint and live only after DHL live approval. Both key and secret are masked after saving.

**Setup steps**

1. Obtain the MyDHL key/secret and shipping account number.
2. Save the matching environment and credentials, enable and test.
3. Before live use, validate a measured parcel, address, product, label and tracking flow against your DHL contract.

**What the test checks**

Test connection calls a non-booking endpoint. It does not establish label purchase or product/country eligibility.

**Common errors**

401: check key/secret and endpoint. Account/product errors: confirm the DHL account entitlement and shipping lane. If a booking outcome is uncertain, reconcile the shipment reference with the original carrier before recording tracking or approving a retry.

**Current limits**

Automatic booking requires the measured weight, length, width and height of one parcel. For several parcels, use the DHL portal and record its tracking number. Account/product acceptance needs DHL verification. Tracking is polled; no inbound DHL webhook is implemented.

### العربية

**قبل البدء**

حساب DHL Express وتطبيق MyDHL API وبيانات مرسل ومنتج معتمدين.

**الصلاحيات**

مفتاح API وسره للمصادقة الأساسية ورقم حساب الشحن.

**بيئتا الاختبار والتشغيل الفعلي**

استخدم test لعنوان MyDHL التجريبي وlive بعد موافقة DHL للتشغيل فعلي. يُخفى المفتاح وسره بعد الحفظ.

**خطوات الإعداد**

1. احصل على مفتاح MyDHL وسره ورقم حساب الشحن.
2. احفظ البيئة والبيانات المطابقة وفعّل واختبر.
3. قبل التشغيل الفعلي تحقق من طرد مقاس فعليًا وعنوان ومنتج وملصق وتتبع وفق عقد DHL.

**ما الذي يفحصه الاختبار**

يستخدم الاختبار مسارًا دون حجز. لا يثبت شراء الملصق أوأهلية المنتج والبلد.

**الأخطاء الشائعة**

401: راجع المفتاح والسر والعنوان. أخطاء الحساب أوالمنتج: تحقق من صلاحيات الحساب ومسار الشحن. عند عدم تأكد نتيجة الحجز تحقق من مرجع الشحنة مع الشركة الأصلية قبل تسجيل التتبع أوالموافقة على إعادة المحاولة.

**الحدود الحالية**

يتطلب الحجز التلقائي وزن طرد واحد وطوله وعرضه وارتفاعه المقاسة فعليًا. لعدة طرود استخدم بوابة DHL وسجل رقم التتبع. يلزم تحقق DHL من قبول الحساب والمنتج. التتبع دوري ولا يوجد إشعار وارد.

## SMSA Express (`smsa`)

[Official setup documentation](https://www.smsaexpress.com/)

### English

**Before you start**

An SMSA API-enabled merchant account and the API contract/credentials issued by SMSA.

**Permissions**

The account API key authorized for the implemented eCommerce endpoints.

**Test and live environments**

Confirm the test/live endpoint and key with SMSA. Do not assume a live key is safe for test shipments.

**Setup steps**

1. Obtain the API key and confirm the eCommerce contract/version with SMSA.
2. Save the agreed environment and key, enable and test.
3. Verify controlled booking, tracking response and label behavior with SMSA before live use.

**What the test checks**

The test sends a non-booking tracking query and validates its response. Network errors and unsupported response shapes fail.

**Common errors**

Unauthorized: check the key and environment. No-record errors do not prove authentication; confirm the account using an agreed test tracking number. If a booking outcome is uncertain, reconcile the shipment reference with the original carrier before recording tracking or approving a retry.

**Current limits**

Automatic booking requires the measured weight of one parcel. For several parcels, use the carrier portal and record its tracking number. The issued SMSA contract and label flow still need account-backed acceptance. Tracking is polled; no inbound webhook is implemented.

### العربية

**قبل البدء**

حساب تاجر SMSA مفعّل للواجهة وعقد API وبياناته الصادرة من SMSA.

**الصلاحيات**

مفتاح حساب مخوّل لمسارات التجارة الإلكترونية المستخدمة.

**بيئتا الاختبار والتشغيل الفعلي**

أكد عنوان الاختبار والتشغيل الفعلي والمفتاح مع SMSA. لا تفترض أن مفتاح التشغيل الفعلي آمن للشحن التجريبي.

**خطوات الإعداد**

1. احصل على المفتاح وأكد عقد التجارة الإلكترونية وإصداره مع SMSA.
2. احفظ البيئة المتفق عليها والمفتاح وفعّل واختبر.
3. تحقق مع SMSA من حجز مضبوط واستجابة التتبع وسلوك الملصق قبل التشغيل الفعلي.

**ما الذي يفحصه الاختبار**

يرسل الاختبار استعلام تتبع دون حجز ويتحقق من بنية الاستجابة. تفشل أخطاء الشبكة والبنى غير المدعومة.

**الأخطاء الشائعة**

رفض التصريح: راجع المفتاح والبيئة. عدم وجود سجل لا يثبت المصادقة؛ تحقق برقم تتبع تجريبي متفق عليه. عند عدم تأكد نتيجة الحجز تحقق من مرجع الشحنة مع الشركة الأصلية قبل تسجيل التتبع أوالموافقة على إعادة المحاولة.

**الحدود الحالية**

يتطلب الحجز التلقائي وزن طرد واحد مقاسًا. لعدة طرود استخدم بوابة الشركة وسجل رقم التتبع. عقد SMSA وتدفق الملصق يحتاجان قبولًا بحساب فعلي. التتبع دوري ولا يوجد إشعار وارد.
