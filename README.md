# NOVA · Personal AI OS

نسخة أولية قابلة للتشغيل من مساعد شخصي Agent بواجهة محادثة عربية حديثة. صُممت كنواة قابلة للتوسع وليست مجرد Prompt + API.

## يتضمن

- واجهة محادثة RTL داكنة مع مساحات عمل وحالة اتصال وسجل تنفيذ.
- Agent Runtime من جهة الخادم مع حد أقصى لدورات الأدوات.
- طبقة `LLMProvider` عملية: مزود مُدار افتراضيًا أو NVIDIA NIM متوافق مع OpenAI عبر متغيرات البيئة.
- Tool Registry بعقود واضحة ومستويات خطورة.
- ذاكرة طويلة المدى في جدول `memories` مع استرجاع سياقي بسيط.
- Auth المدمج في قالب WebDev عبر Manus OAuth.
- Queue/Worker دائم نسبيًا مع leases وretry وidempotency وActivity Timeline وApproval Engine.
- Google Calendar وGoogle Drive وGoogle Sheets عبر OAuth؛ القراءة آمنة افتراضيًا وعمليات Calendar الكتابية تتطلب موافقة.
- صفحة `/settings` لإدخال Google Client ID وClient Secret وتخزينهما مشفّرين.
- اختبارات عقود الوكيل والتكاملات وترحيلات Drizzle لقاعدة البيانات.

## تشغيل وفحص

```bash
pnpm dev
pnpm check
pnpm test
pnpm build
```

لتحويل طبقة النموذج إلى NVIDIA، أكمل `NVIDIA_API_KEY` و`NVIDIA_BASE_URL` و`NVIDIA_MODEL` في بيئة الخادم. لإعداد Google، افتح `/settings` وأدخل بيانات OAuth، ثم سجّل Redirect URI الظاهر في Google Cloud Console.

## حدود النسخة الحالية

GitHub وMCP وRAG المتقدم ورفع الملفات غير منفذة بعد. Google Drive يعمل حاليًا بصلاحية قراءة واسعة مناسبة لنسخة شخصية تجريبية؛ قبل نشر عام يُفضّل استخدام Google Picker و`drive.file` لتقليل الصلاحيات ومتطلبات التحقق.

راجع [docs/architecture.md](docs/architecture.md) لخارطة الطريق والعقود.
