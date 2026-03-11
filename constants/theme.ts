// constants\theme.ts
// هذا هو ملف التصميم المركزي لتطبيق "مساعد الذاكرة"


export const COLORS = {
  // 🔹 الألوان الأساسية
  primary: '#4A90E2',   // أزرق هادئ (للأزرار الرئيسية والعناصر التفاعلية)
  secondary: '#50C878', // أخضر مريح (للنجاح والإشعارات الإيجابية)


  // 🔹 ألوان النصوص
  textDark: '#333333',  // رمادي داكن (أريح للعين من الأسود الحاد)
  textLight: '#FFFFFF', // أبيض نقي
  textMuted: '#888888', // رمادي باهت (للنصوص الثانوية والوصف)


  // 🔹 ألوان الخلفية
  backgroundLight: '#F8F8F0', // كريمي (خلفية دافئة ومريحة)
  backgroundDark: '#1c2d41',  // أزرق داكن (لشاشات الدخول أو الوضع الليلي)


  // 🔹 ألوان إضافية
  card: '#FFFFFF',       // لون البطاقات (أبيض نقي ليميزها عن الخلفية الكريمية)
  border: '#E0E0E0',      // لون الحواف والفواصل (رمادي فاتح)
  error: '#E97171',       // أحمر ناعم (للتنبيهات ورسائل الخطأ)

  // 🔹 ألوان الوضع الليلي (Dark Mode)
  dark: {
    primary: '#64B5F6',
    secondary: '#81C784',
    textDark: '#E0E0E0',
    textLight: '#121212',
    textMuted: '#A0A0A0',
    backgroundLight: '#121212',
    backgroundDark: '#000000',
    card: '#1E1E1E',
    border: '#333333',
    error: '#EF9A9A',
  },
};


export const SIZES = {
  // 🔹 الأحجام الأساسية والتباعد
  base: 8,
  padding: 20, // المسافة القياسية حول الشاشات والعناصر


  // 🔹 أحجام انحناء الحواف (لجعلها ودودة)
  radius: 15,


  // 🔹 أحجام الخطوط (واضحة وكبيرة)
  h1: 32,
  h2: 24,
  h3: 20,
  body: 18,     // حجم الخط الأساسي للنصوص
  caption: 16,  // للنصوص الأصغر
};


export const FONTS = {
  // 🔹 أوزان الخطوط
  // 'as const' هي خدعة في TypeScript لتثبيت النوع كنص حرفي
  bold: '700' as const,
  medium: '500' as const,
  regular: '400' as const,
};


// 🔹 تجميع كل شيء في كائن واحد لسهولة الاستيراد (اختياري)
const appTheme = { COLORS, SIZES, FONTS };
export default appTheme;