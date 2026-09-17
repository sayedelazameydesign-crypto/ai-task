# خدمات Google المجانية في NOVA

## ما تم تنفيذه

تستخدم NOVA OAuth واحدًا من Google للوصول إلى Calendar وDrive وSheets. تُخزّن Client ID وClient Secret مشفّرة في الخادم، بينما تُخزّن Access Token وRefresh Token مشفّرة لكل مستخدم. لا تُرسل الأسرار إلى الواجهة بعد الحفظ.

الخدمات الحالية للقراءة هي:

- **Google Calendar:** قائمة المواعيد، البحث، وفحص Free/Busy. إنشاء وتعديل وحذف الموعد موجودة خلف Approval Engine وتتطلب موافقة مرتبطة بالمهمة.
- **Google Drive:** البحث النصي وقراءة الملفات النصية وGoogle Docs وCSV والتصدير النصي للملفات المدعومة، بحد أقصى 2 MB للنص الواحد.
- **Google Sheets:** قراءة نطاق خلايا محدد بصيغة القيم المنسقة، لا تعديل البيانات.

## إعداد Google Cloud

فعّل Calendar API وDrive API وSheets API في مشروع Google Cloud، ثم أنشئ OAuth Client من نوع Web application. أضف Redirect URI الظاهر في صفحة `/settings`:

```text
https://YOUR_ORIGIN/api/google/callback
```

بعد إدخال Client ID وClient Secret في `/settings`، استخدم زر **ربط حساب Google** للموافقة على الصلاحيات.

## الصلاحيات الحالية

```text
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/spreadsheets.readonly
```

صلاحيتا Drive وSheets الواسعتان للقراءة مناسبتان لنسخة شخصية تجريبية، لكن Google تصنف `drive.readonly` كنطاق Restricted و`spreadsheets.readonly` كنطاق Sensitive. عند نشر NOVA كتطبيق عام، الأفضل الانتقال إلى Google Picker مع `drive.file` وتقليل الوصول إلى الملفات التي يختارها المستخدم فقط، ثم استكمال متطلبات OAuth verification عند الحاجة.

## الحدود والتكلفة

الاستخدام القياسي لهذه APIs لا يفرض رسومًا مباشرة، لكنه يخضع لحصص Google. Sheets مثلًا يحدد القراءة بـ300 طلب/دقيقة للمشروع و60 طلب/دقيقة للمستخدم/المشروع؛ لذلك يجب استخدام التخزين المؤقت وexponential backoff عند التوسع.

## خارطة التطوير

1. إضافة Google Picker بدل البحث الشامل في Drive.
2. إضافة فهرسة RAG اختيارية للملفات التي يختارها المستخدم فقط.
3. إضافة كتابة Sheets خلف موافقة task-scoped.
4. إضافة Gmail للقراءة أولًا، ثم إرسال البريد خلف Approval Engine.
5. إضافة Google Docs للتحديث خلف موافقة منفصلة.
