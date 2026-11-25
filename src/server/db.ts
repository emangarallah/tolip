import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Category,
  Product,
  Order,
  StoreSettings,
  AdminStats,
  OrderStatus,
} from '../types/store.ts';

dotenv.config();

// In-app database file location
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'store_database.json');

interface DatabaseSchema {
  version: number;
  adminUser: {
    id: string;
    email: string;
    passwordHash: string;
    salt: string;
    name: string;
  };
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  orders: Order[];
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!configured || configured.length < 32 || configured === 'change-this-to-a-secure-random-secret-key') {
      throw new Error('Production requires AUTH_SECRET with at least 32 characters.');
    }
    return configured;
  }
  return configured || 'local-development-only-tulip-auth-secret';
}

export function generateToken(payload: { email: string; id: string; sessionVersion?: string }): string {
  const secret = getAuthSecret();
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 3600 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): { email: string; id: string; sessionVersion?: string } | null {
  try {
    const [data, signature, extra] = token.split('.');
    if (!data || !signature || extra) return null;
    const secret = getAuthSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSig);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!decoded.exp || decoded.exp < Date.now() || !decoded.email || !decoded.id) return null;
    return { email: String(decoded.email), id: String(decoded.id), sessionVersion: typeof decoded.sessionVersion === 'string' ? decoded.sessionVersion : undefined };
  } catch {
    return null;
  }
}

// Initial seed data based on the exact user specification
function createDefaultDatabase(): DatabaseSchema {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const initialPassword = process.env.ADMIN_PASSWORD || 'tulip_admin_secure_2026';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@tulip.ye';

  const defaultSettings: StoreSettings = {
    storeName: 'توليب – Tolipe Natural Care',
    storeTagline: 'عناية طبيعية فاخرة للبشرة والجسم والشعر',
    storeDescription: 'علامة تجارية يمنية رائدة متخصصة في مستحضرات العناية الطبيعية المبتكرة من خيرات الطبيعة، صُنعت بعناية فائقة لتبرز جمالك الطبيعي بأمان وفعالية.',
    logoUrl: '',
    whatsappPhone: '771968642',
    whatsappOfficialLink: 'https://wa.me/message/QDUISDBNS6NEC1',
    facebookUrl: 'https://facebook.com/tulipnaturalcare',
    instagramUrl: 'https://instagram.com/tulip_natural_care',
    heroHeadline: 'جمالك يبدأ من عناية طبيعية',
    heroSubtext: 'اكتشفي منتجات توليب المختارة بعناية لتمنح بشرتك وجسمك وشعرك عناية مميزة كل يوم.',
    heroImage: '/src/assets/images/hero_tulip_botanical_1795590417391.jpg',
    deliveryFeeGeneralNote: 'تحدد رسوم التوصيل عبر واتساب حسب المدينة والمنطقة',
    cities: [
      { city: 'صنعاء', fee: 2000, estimatedDays: 'خلال 24-48 ساعة' },
      { city: 'عدن', fee: 3500, estimatedDays: 'خلال 2-3 أيام' },
      { city: 'تعز', fee: 3000, estimatedDays: 'خلال 2-3 أيام' },
      { city: 'إب', fee: 2500, estimatedDays: 'خلال 24-48 ساعة' },
      { city: 'حضرموت (المكلا)', fee: 4000, estimatedDays: 'خلال 3-4 أيام' },
      { city: 'الحديدة', fee: 3000, estimatedDays: 'خلال 2-3 أيام' },
      { city: 'ذمار', fee: 2500, estimatedDays: 'خلال 24-48 ساعة' },
      { city: 'باقي المحافظات', fee: null, estimatedDays: 'تحدد عبر واتساب' },
    ],
    deliveryPolicy: 'يتم توصيل الطلبات في جميع محافظات الجمهورية اليمنية. بعد تسجيل طلبك، يتواصل معك فريق متجر توليب عبر واتساب لتأكيد العنوان والتكلفة الدقيقة للتوصيل وموعد التسليم. الدفع يتم عند الاستلام يداً بيد.',
    returnPolicy: 'نحرص على رضا عملائنا التام. في حال وجود أي ملاحظة أو تلف أثناء النقل، يرجى التواصل معنا عبر واتساب خلال 48 ساعة من الاستلام مع تصوير المنتج لمعالجة الأمر فوراً بما يرضيكم.',
    privacyPolicy: 'نلتزم التزاماً تاماً بحماية خصوصية عملائنا. تُستخدم البيانات الشخصية وأرقام الهواتف والعناوين فقط لتنسيق توصيل الطلبات والتواصل المباشر معكم ولا يتم مشاركتها إطلاقاً مع أي أطراف أخرى.',
    aboutUsText: 'توليب هي علامة تجارية يمنية ولدت من شغف عميق بالعناية الطبيعية وأسرار الجمال الأصيل. ننتقي أفضل المكونات والزيوت والأعشاب الطبيعية لنقدم لكِ مستحضرات فاخرة وآمنة تمنح بشرتك وجسمك وشعرك التغذية والإشراقة التي تستحقينها.',
  };

  const defaultCategories: Category[] = [
    {
      id: 'cat-skin',
      name: 'تفتيح ومعالجة مشاكل البشرة',
      slug: 'skin-care-and-brightening',
      description: 'كريمات وصابونيات وسكراب طبيعي لتفتيح ونضارة البشرة ومعالجة التصبغات بلطف وأمان.',
      image: '/src/assets/images/product_skincare_cream_1795590418002.jpg',
      sortOrder: 1,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-moroccan',
      name: 'المجموعة المغربية',
      slug: 'moroccan-collection',
      description: 'أسرار الحمام المغربي الأصيل من تبريمة وصابون بلدي ومقشرات النيلة الزرقاء لنقاء ونعومة فائقة.',
      image: '/src/assets/images/product_moroccan_collection_1795590419516.jpg',
      sortOrder: 2,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-hair',
      name: 'العناية بالشعر',
      slug: 'hair-care',
      description: 'شامبو السدر الطبيعي وزيوت وأعشاب نقية لتطويل وتكثيف وتقوية بصيلات الشعر من الجذور.',
      image: '/src/assets/images/product_hair_oil_serum_1795590420472.jpg',
      sortOrder: 3,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-lashes-nails',
      name: 'العناية بالرموش والأظافر',
      slug: 'lashes-and-nails',
      description: 'سيرومات مركزة وموردات طبيعية لتقوية الأظافر وإطالة الرموش وتوريد الشفاه بمظهر حيوي جذاب.',
      image: '/src/assets/images/hero_tulip_botanical_1795590417391.jpg',
      sortOrder: 4,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-underarm',
      name: 'العناية بالإبط والأقدام',
      slug: 'underarm-and-feet',
      description: 'مزيلات عرق طبيعية وزيوت تقليل نمو الشعر ومرطبات توريد الأقدام لنعومة وانتعاش دائمين.',
      image: '/src/assets/images/product_skincare_cream_1795590418002.jpg',
      sortOrder: 5,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-body-slimming',
      name: 'التسمين والتنحيف',
      slug: 'body-shaping-slimming',
      description: 'خلطات طبيعية وأعشاب نقية مخصصة لدعم التوازن البدني والرشاقة بمكونات طبيعية وآمنة.',
      image: '/src/assets/images/product_hair_oil_serum_1795590420472.jpg',
      sortOrder: 6,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cat-perfumes',
      name: 'العطور والروائح والبخور',
      slug: 'perfumes-and-bakhour',
      description: 'عطور راقية وبخور يمني فاخر وبودرة ورائحة معطرة تدوم طويلاً وتمنحك أثراً عبقاً لا يُنسى.',
      image: '/src/assets/images/product_perfume_incense_1795590419608.jpg',
      sortOrder: 7,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  // All 25 exact products listed in the specification with their variants
  const defaultProducts: Product[] = [
    // القسم الأول: تفتيح ومعالجة مشاكل البشرة
    {
      id: 'prod-whitening-cream',
      name: 'كريم تبييض توليب',
      slug: 'tulip-whitening-cream',
      categoryId: 'cat-skin',
      description: 'تركيبة عشبية طبيعية مركزة لتفتيح لون البشرة وتوحيد لونها والتخلص من التصبغات والبقع الداكنة بلطف وأمان دون أي مواد تقشير كيميائية.',
      features: ['مكونات طبيعية 100%', 'تفتيح تدريجي آمن', 'يناسب الوجه والرقبة والمناطق الحساسة', 'خالٍ من الكورتيزون'],
      usageInstructions: 'يُوضع على بشرة نظيفة وجافة مساءً بحركات دائرية خفيفة حتى يمتصه الجلد تماماً. يُفضل استخدامه بانتظام للحصول على أفضل النتائج.',
      images: ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
      variants: [
        { id: 'v-wc-large', name: 'حجم كبير', price: 6500, originalPrice: 7500, stock: 25 },
        { id: 'v-wc-medium', name: 'حجم وسط', price: 4800, originalPrice: 5500, stock: 30 },
        { id: 'v-wc-small', name: 'حجم صغير', price: 3200, originalPrice: null, stock: 40 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-tulip-soap',
      name: 'صابونية توليب الطبيعية',
      slug: 'tulip-natural-soap',
      categoryId: 'cat-skin',
      description: 'صابونية غنية بالزيوت والأعشاب الطبيعية تنظف البشرة بعمق وتزيل الشوائب وتمنح الجلد ملمساً ناعماً كالحرير مع رائحة منعشة.',
      features: ['تنظيف لطيف وفعال', 'مزيج زيوت نقية ومرطبة', 'تساعد على إشراقة وتفتيح البشرة'],
      usageInstructions: 'تُدلك على الجسم المبلل بحركات دائرية وتُترك لمدة 3-5 دقائق ثم تُشطف جيداً بالماء الفاتر.',
      images: ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
      variants: [
        { id: 'v-ts-small', name: 'حجم صغير', price: 2800, originalPrice: null, stock: 35 },
        { id: 'v-ts-large', name: 'حجم كبير', price: 4500, originalPrice: 5000, stock: 20 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-body-moisturizer',
      name: 'مرطب الجسم الفاخر',
      slug: 'body-moisturizer',
      categoryId: 'cat-skin',
      description: 'لوشن ترطيب عميق للجسم غني بزبدة الشيا وزيت اللوز الطبيعي يحمي الجلد من الجفاف والتشققات ويمنحه نعومة تدوم طوال اليوم.',
      features: ['ترطيب عميق 24 ساعة', 'سريع الامتصاص وغير لزج', 'رائحة عطرية هادئة وجذابة'],
      usageInstructions: 'يُوزع بسخاء على كامل الجسم بعد الاستحمام أو كلما دعت الحاجة لترطيب مكثف.',
      images: ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
      variants: [
        { id: 'v-bm-standard', name: 'حجم قياسي', price: 4200, originalPrice: null, stock: 25 },
      ],
      isFeatured: false,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-hibiscus-scrub',
      name: 'سكراب الكركدي والعكر الفاسي',
      slug: 'hibiscus-akar-fassi-scrub',
      categoryId: 'cat-skin',
      description: 'مقشر طبيعي استثنائي يجمع بين خلاصة الكركدي الغنية بمضادات الأكسدة ومسحوق العكر الفاسي الأصيل لإزالة خلايا الجلد الميتة وتوريد البشرة طبيعياً.',
      features: ['تقشير لطيف وتوريد طبيعي', 'تجديد فوري لخلايا البشرة', 'نعومة مخملية ولمعان صحي'],
      usageInstructions: 'يُفرد على البشرة المبللة ويدلك برقة بحركات دائرية لمدة دقيقتين ثم يُشطف جيداً بالماء الفاتر.',
      images: ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
      variants: [
        { id: 'v-hs-standard', name: 'حجم قياسي', price: 3800, originalPrice: 4400, stock: 18 },
      ],
      isFeatured: true,
      isBestSeller: false,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },

    // القسم الثاني: المجموعة المغربية
    {
      id: 'prod-moroccan-tabrima',
      name: 'التبريمة المغربية بالأعشاب',
      slug: 'moroccan-tabrima',
      categoryId: 'cat-moroccan',
      description: 'خلطة التبريمة المغربية التقليدية بالأعشاب الطبيعية العطرية المنقية. تعمل على توحيد لون الجسم وإزالة التصبغات وإعادة النضارة للجلد.',
      features: ['مزيج أعشاب مغربية أصيلة', 'تنقية وتبييض الجسم', 'تفتح المسام وتزيل السموم'],
      usageInstructions: 'تُخلط ملعقتان من التبريمة مع ماء الورد أو الصابون المغربي وتُفرد على الجسم أثناء الحمام الساخن لمدة 15 دقيقة ثم تُشطف.',
      images: ['/src/assets/images/product_moroccan_collection_1795590419516.jpg'],
      variants: [
        { id: 'v-mt-standard', name: 'حجم قياسي', price: 3500, originalPrice: null, stock: 30 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-moroccan-soap',
      name: 'الصابون المغربي البلدي',
      slug: 'moroccan-black-soap',
      categoryId: 'cat-moroccan',
      description: 'صابون أسود بلدي مغربي طبيعي غني بزيت الزيتون البكر وفيتامين E، يهيئ البشرة للتقشير العميق بالليفة المغربية ويزيل الخلايا الميتة بكفاءة.',
      features: ['غني بزيت الزيتون وفيتامين E', 'ترطيب وتنعيم فوري', 'أساس الحمام المغربي الملكي'],
      usageInstructions: 'يُدهن على كامل الجسم بعد تعرضه للبخار أو الماء الدافئ لبضع دقائق، ثم يُشطف ويُفرك بالليفة المغربية.',
      images: ['/src/assets/images/product_moroccan_collection_1795590419516.jpg'],
      variants: [
        { id: 'v-ms-standard', name: 'حجم قياسي', price: 3000, originalPrice: 3500, stock: 25 },
      ],
      isFeatured: false,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-blue-nila-scrub',
      name: 'مقشر النيلة الزرقاء الصحراوية',
      slug: 'blue-nila-scrub',
      categoryId: 'cat-moroccan',
      description: 'مقشر فاخر بخلاصة النيلة المغربية الزرقاء الصحراوية المشهورة بخصائصها الفائقة في تفتيح الركب والأكواع وتوحيد لون البشرة.',
      features: ['نيلة زرقاء مغربية طبيعية 100%', 'تفتيح الركب والأكواع والمناطق الداكنة', 'ملمس ناعم ورائحة هادئة'],
      usageInstructions: 'يُدلك على المناطق المستهدفة بحركات دائرية لمدة 3 دقائق ثم يُغسل جيداً بالماء.',
      images: ['/src/assets/images/product_moroccan_collection_1795590419516.jpg'],
      variants: [
        { id: 'v-bns-standard', name: 'حجم قياسي', price: 4000, originalPrice: 4800, stock: 20 },
      ],
      isFeatured: true,
      isBestSeller: false,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },

    // القسم الثالث: العناية بالشعر
    {
      id: 'prod-sidr-shampoo',
      name: 'شامبو السدر الطبيعي',
      slug: 'natural-sidr-shampoo',
      categoryId: 'cat-hair',
      description: 'شامبو نباتي خالص مستخلص من أوراق السدر اليمني النقي، ينظف الفروة بلطف ويعالج القشرة ويقوي بصيلات الشعر ويمنحه حيوية ولمعاناً فائقاً.',
      features: ['خالٍ من السلفات والبارابين والسيليكون', 'يقلل تساقط الشعر ويقوي الجذور', 'مناسب للشعر العادي والدهني والمعالج'],
      usageInstructions: 'يُوضع على الشعر المبلل وتُدلك الفروة بأطراف الأصابع بلطف ثم يُشطف جيداً بالماء.',
      images: ['/src/assets/images/product_hair_oil_serum_1795590420472.jpg'],
      variants: [
        { id: 'v-ss-standard', name: 'حجم قياسي (300 مل)', price: 3800, originalPrice: null, stock: 35 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-hair-growth-oil',
      name: 'زيت تطويل الشعر المعجزة',
      slug: 'hair-growth-oil',
      categoryId: 'cat-hair',
      description: 'توليفة زيوت طبيعية معصورة على البارد تشمل زيت الخروع والسمسم واللوز والأرغان مدعمة بخلاصات عشبية لتسريع نمو الشعر وإطالته وتغذيته.',
      features: ['يحفز بصيلات الشعر الخاملة', 'يغذي أطراف الشعر ويمنع التقصف', 'نتائج ملحوظة مع الاستمرار'],
      usageInstructions: 'توضع قطرات على فروة الرأس وتُدلك لمدة 5 دقائق، يُترك لمدة ساعتين إلى ثلاث ساعات ثم يُغسل بالشامبو.',
      images: ['/src/assets/images/product_hair_oil_serum_1795590420472.jpg'],
      variants: [
        { id: 'v-hgo-standard', name: 'حجم قياسي (100 مل)', price: 4900, originalPrice: 5800, stock: 22 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-hair-thickening-powder',
      name: 'بودرة أعشاب تكثيف الشعر',
      slug: 'herbal-hair-thickening-powder',
      categoryId: 'cat-hair',
      description: 'مزيج فريد من الأعشاب الطبيعية المطحونة بعناية (السدر، المحلب، والروزماري) لملء الفراغات وتكثيف الشعر ومنحه قوة وحجماً طبيعياً.',
      features: ['تزيد كثافة الشعر وسماكته', 'تغذي الفروة بالعناصر الحيوية', 'خالية من أي إضافات كيميائية'],
      usageInstructions: 'تُخلط ملعقتان مع مغلي الأعشاب أو الزبادي حتى تتكون عجينة لينة، وتوضع ماسك على الشعر لمدة ساعة.',
      images: ['/src/assets/images/product_hair_oil_serum_1795590420472.jpg'],
      variants: [
        { id: 'v-htp-standard', name: 'حجم قياسي', price: 3600, originalPrice: null, stock: 20 },
      ],
      isFeatured: false,
      isBestSeller: false,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },

    // القسم الرابع: العناية بالرموش والأظافر
    {
      id: 'prod-nail-serum',
      name: 'سيروم تطويل وتقوية الأظافر',
      slug: 'nail-growth-strengthening-serum',
      categoryId: 'cat-lashes-nails',
      description: 'سيروم زيتي مغذٍ غني بفيتامين E والكيراتين الطبيعي يقوي الأظافر الهشة ويمنع تكسرها ويساعد على نموها بشكل صحي وسريع.',
      features: ['يقوي الأظافر ويمنع تقصفها', 'يرطب الجلد المحيط بالظفر', 'فرشاة سهلة الاستخدام والامتصاص'],
      usageInstructions: 'يُدهن على الأظافر والجلد المحيط بها مرتين يومياً مع تدليك خفيف.',
      images: ['/src/assets/images/hero_tulip_botanical_1795590417391.jpg'],
      variants: [
        { id: 'v-ns-standard', name: 'حجم قياسي', price: 2500, originalPrice: null, stock: 30 },
      ],
      isFeatured: false,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-lash-serum',
      name: 'سيروم تطويل وتكثيف الرموش',
      slug: 'eyelash-growth-density-serum',
      categoryId: 'cat-lashes-nails',
      description: 'تركيبة آمنة ولطيفة على العين بزيوت الخروع المعصورة على البارد وفيتامينات مغذية تطيل الرموش وتزيد كثافتها وجاذبيتها.',
      features: ['آمن على العيون الحساسة', 'فرشاة دقيقة لتطبيق مثالي', 'تكثيف وإطالة طبيعية للرموش والحواجب'],
      usageInstructions: 'يُمرر على جذور الرموش والحواجب قبل النوم على عيون نظيفة تماماً.',
      images: ['/src/assets/images/hero_tulip_botanical_1795590417391.jpg'],
      variants: [
        { id: 'v-ls-standard', name: 'حجم قياسي', price: 3000, originalPrice: 3500, stock: 25 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-lip-tint',
      name: 'مورد الشفايف الطبيعي',
      slug: 'natural-lip-tint',
      categoryId: 'cat-lashes-nails',
      description: 'بلسم ومورد شفايف طبيعي بخلاصة الشمندر والتوت وزبدة الكاكاو يمنح الشفاه لوناً وردياً جذاباً وترطيباً ناعماً يدوم ساعات طويلة.',
      features: ['لون وردي طبيعي جذاب', 'ترطيب فوري يمنع التشققات', 'مكونات صالحة للأكل وطبيعية 100%'],
      usageInstructions: 'يُطبق على الشفاه متى ما رغبتِ في لمسة توريد طبيعية وترطيب مخملي.',
      images: ['/src/assets/images/hero_tulip_botanical_1795590417391.jpg'],
      variants: [
        { id: 'v-lt-standard', name: 'حجم قياسي', price: 1800, originalPrice: null, stock: 45 },
      ],
      isFeatured: false,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },

    // القسم الخامس: العناية بالإبط
    {
      id: 'prod-deodorant',
      name: 'مزيل العرق الطبيعي من توليب',
      slug: 'natural-deodorant',
      categoryId: 'cat-underarm',
      description: 'مزيل عرق كريمي طبيعي خالٍ تماماً من أملاح الألمنيوم الضارة، يقضي على البكتيريا المسببة للرائحة ويفتح منطقة الإبط بلطف.',
      features: ['خالٍ من الألمنيوم والكيماويات', 'حماية وانتعاش يدوم 48 ساعة', 'يساعد في تفتيح وتوحيد لون الإبط'],
      usageInstructions: 'تُوضع كمية صغيرة بحجم حبة الحمص على منطقة إبط نظيفة وجافة.',
      images: ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
      variants: [
        { id: 'v-deo-small', name: 'حجم صغير', price: 2200, originalPrice: null, stock: 40 },
        { id: 'v-deo-large', name: 'حجم كبير', price: 3800, originalPrice: 4200, stock: 30 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-hair-reducer-oil',
      name: 'زيت تقليل نمو الشعر',
      slug: 'hair-growth-inhibitor-oil',
      categoryId: 'cat-underarm',
      description: 'زيت طبيعي مستخلص من نبات السعد والنمل النقي يُضعف بصيلات الشعر غير المرغوب فيه ويقلل سرعة وكثافة نموه تدريجياً بعد الإزالة.',
      features: ['يبطئ نمو الشعر بشكل ملحوظ', 'يقلل سماكة الشعرة بعد كل استخدام', 'ينعم ويلطف البشرة بعد الحلاقة أو الشمع'],
      usageInstructions: 'يُدهن مباشرة بعد إزالة الشعر من الجذور يومياً لمدة 5 أيام متتالية بعد كل جلسة إزالة.',
      images: ['/src/assets/images/product_hair_oil_serum_1795590420472.jpg'],
      variants: [
        { id: 'v-hro-standard', name: 'حجم قياسي', price: 3400, originalPrice: 4000, stock: 20 },
      ],
      isFeatured: false,
      isBestSeller: false,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-feet-balm',
      name: 'مرطب ومورد الأقدام',
      slug: 'feet-softening-and-pink-balm',
      categoryId: 'cat-underarm',
      description: 'بلسم مركز لعلاج تشققات القدمين والجفاف الشديد، مع لمسة توريد طبيعية بالكعبين ونعومة فائقة تعيد لقدميك حيويتهما.',
      features: ['علاج سريع لتشققات الكعبين', 'توريد وردي طبيعي وجذاب', 'ترطيب عميق بمواد شمعية وزيتية طبيعية'],
      usageInstructions: 'يُدهن على الأقدام قبل النوم وتُرتدى جوارب قطنية لنتائج مبهرة في الصباح.',
      images: ['/src/assets/images/product_skincare_cream_1795590418002.jpg'],
      variants: [
        { id: 'v-fb-standard', name: 'حجم قياسي', price: 2600, originalPrice: null, stock: 35 },
      ],
      isFeatured: false,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },

    // القسم السادس: التسمين والتنحيف
    {
      id: 'prod-weight-gain-mix',
      name: 'خلطة التسمين الطبيعية',
      slug: 'natural-weight-gain-blend',
      categoryId: 'cat-body-slimming',
      description: 'خلطة مغذية ومقوية محضرة من أنقى المكسرات والعسل والحبوب الطبيعية لفتح الشهية وزيادة الوزن والكتلة البدنية بطريقة صحية وطبيعية.',
      features: ['مكونات طبيعية وغنية بالطاقة', 'تفتح الشهية وتمد الجسم بالحيوية', 'خالية من المواد الصناعية والهرمونات'],
      usageInstructions: 'تُؤخذ ملعقة كبيرة مرتين يومياً مذابة في كوب حليب دافئ بعد الوجبات الرئيسية.',
      images: ['/src/assets/images/product_hair_oil_serum_1795590420472.jpg'],
      variants: [
        { id: 'v-wgm-standard', name: 'حجم قياسي', price: 5500, originalPrice: 6200, stock: 15 },
      ],
      isFeatured: false,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-slimming-herbs',
      name: 'أعشاب التنحيف والرشاقة',
      slug: 'natural-slimming-herbs',
      categoryId: 'cat-body-slimming',
      description: 'توليفة أعشاب برية منقية تساعد على تحسين الهضم والتخلص من الغازات والسوائل المحتبسة ودعم حرق الدهون بلطف ونقاء.',
      features: ['تحسين عملية الأيض والهضم', 'تخليص الجسم من السموم والانتفاخات', 'أعشاب طبيعية منتقاة بعناية'],
      usageInstructions: 'تُنقع ملعقة صغيرة في كوب ماء مغلي لمدة 10 دقائق وتُشرب دافئة بعد الوجبات.',
      images: ['/src/assets/images/product_hair_oil_serum_1795590420472.jpg'],
      variants: [
        { id: 'v-sh-size1', name: 'حجم أول (عبوة متوسطة)', price: 3400, originalPrice: null, stock: 25 },
        { id: 'v-sh-size2', name: 'حجم ثاني (عبوة كبيرة)', price: 5200, originalPrice: 6000, stock: 18 },
      ],
      isFeatured: false,
      isBestSeller: false,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },

    // القسم السابع: العطور والروائح
    {
      id: 'prod-men-perfume',
      name: 'عطر توليب الرجالي الفاخر',
      slug: 'tulip-men-perfume',
      categoryId: 'cat-perfumes',
      description: 'عطر رجالي راقٍ يجمع بين نفحات العود والجلود وأخشاب الأرز مع لمسة توابل دافئة، حضور مهيب وثبات عالٍ يدوم طوال اليوم.',
      features: ['ثبات وفوحان استثنائي', 'تركيبة شرقية خشبية فاخرة', 'زجاجة كرستالية أنيقة'],
      usageInstructions: 'يُرش على نقاط النبض (المعصمين والرقبة وخلف الأذنين) لفوحان مثالي.',
      images: ['/src/assets/images/product_perfume_incense_1795590419608.jpg'],
      variants: [
        { id: 'v-mp-standard', name: 'حجم قياسي (100 مل)', price: 8500, originalPrice: 9500, stock: 15 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-women-perfume',
      name: 'عطر توليب النسائي الملكي',
      slug: 'tulip-women-perfume',
      categoryId: 'cat-perfumes',
      description: 'عطر أنثوي ساحر بنفحات زهور التوليب والياسمين وعبير المسك الأبيض والفانيليا الفاخرة، يمنحك هالة من الرقي والجاذبية التي تأسر الحواس.',
      features: ['رائحة زهرية مسكية ساحرة', 'ثبات فائق يدوم أكثر من 24 ساعة', 'إطلالة أنثوية مميزة لا تُنسى'],
      usageInstructions: 'يُرش على الملابس وأماكن النبض للاستمتاع بعبير فواح ومميز.',
      images: ['/src/assets/images/product_perfume_incense_1795590419608.jpg'],
      variants: [
        { id: 'v-wp-standard', name: 'حجم قياسي (100 مل)', price: 8500, originalPrice: 9500, stock: 20 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-body-powder',
      name: 'بودرة جسم معطرة',
      slug: 'perfumed-body-powder',
      categoryId: 'cat-perfumes',
      description: 'بودرة حريرية فائقة النعومة معطرة بروائح المسك والورد، تمنح الجسم ملمساً مخملياً وتساعد على امتصاص الرطوبة وانتعاش البشرة.',
      features: ['ملمس حريري ناعم', 'عطر مسكي هادئ ومريح', 'تحمي من الاحتكاك وتعطي انتعاشاً'],
      usageInstructions: 'تُوزع على الجسم بعد الاستحمام بالبف المرفق لنعومة وعبير منعش.',
      images: ['/src/assets/images/product_perfume_incense_1795590419608.jpg'],
      variants: [
        { id: 'v-bp-standard', name: 'حجم قياسي', price: 3200, originalPrice: null, stock: 25 },
      ],
      isFeatured: false,
      isBestSeller: false,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-hair-mist',
      name: 'رائحة الشعر (ميسك ومعطر للشعر)',
      slug: 'fragrant-hair-mist',
      categoryId: 'cat-perfumes',
      description: 'معطر شعر خفيف غني بزيت الأرغان وفيتامين B5 يمنح خصلات الشعر رائحة آسرة ولمعاناً صحياً دون أن يسبب أي جفاف للشعر.',
      features: ['خالٍ من الكحول المجفف للشعر', 'مدعم بزيت الأرغان المغذي', 'ثبات رائع مع حركة الشعر'],
      usageInstructions: 'يُرش برفق على أطراف الشعر من مسافة 20 سم بعد تصفيفه.',
      images: ['/src/assets/images/product_hair_oil_serum_1795590420472.jpg'],
      variants: [
        { id: 'v-hm-standard', name: 'حجم قياسي (50 مل)', price: 3800, originalPrice: 4200, stock: 30 },
      ],
      isFeatured: false,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-body-mist',
      name: 'رائحة جسم (معطر الجسم الفواح)',
      slug: 'fragrant-body-mist',
      categoryId: 'cat-perfumes',
      description: 'سبلاش معطر للجسم بتركيبة خفيفة ومنعشة تنتشر برقة وتدوم لساعات، مثالي للاستخدام اليومي بعد الاستحمام.',
      features: ['انتعاش فوري يدوم طويلاً', 'لطيف جداً على البشرة', 'رائحة أنيقة منعشة تناسب كل الأوقات'],
      usageInstructions: 'يُرش مباشرة على كامل الجسم بعد الاستحمام.',
      images: ['/src/assets/images/product_perfume_incense_1795590419608.jpg'],
      variants: [
        { id: 'v-bmist-standard', name: 'حجم قياسي (150 مل)', price: 3500, originalPrice: null, stock: 25 },
      ],
      isFeatured: false,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-pyramid-bakhour',
      name: 'بخور أهرامات توليب',
      slug: 'tulip-pyramid-bakhour',
      categoryId: 'cat-perfumes',
      description: 'أهرامات بخور يمني ملكي محضرة يدوياً من دقة العود الفاخر والمسك والعنبر والزيوت العطرية العريقة، سهلة الاشتعال وتنشر أجواءً ساحرة.',
      features: ['شكل هرمي مميز وسهل الإشعال', 'دخان عطري كثيف وفوحان عالي', 'ثبات يدوم في أرجاء المنزل والملابس'],
      usageInstructions: 'يُشعل رأس الهرم حتى يجمر ثم يُوضع على المبخرة لينشر عبقه الملكي.',
      images: ['/src/assets/images/product_perfume_incense_1795590419608.jpg'],
      variants: [
        { id: 'v-pb-standard', name: 'عبوة أهرامات (12 حبة)', price: 4200, originalPrice: 4800, stock: 20 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'prod-discs-bakhour',
      name: 'بخور أقراص فاخر',
      slug: 'tulip-discs-bakhour',
      categoryId: 'cat-perfumes',
      description: 'أقراص بخور عرائسي يمني معتقة بأجود أنواع العطور الشرقية والظفر المعطر، متوفرة بثلاثة خيارات نغمية لتناسب مختلف الأذواق الرفيعة.',
      features: ['بخور عرائسي معتق على الأصول', 'ثلاث نكهات عطرية ملكية', 'فوحان عميق وثبات يدوم لأيام'],
      usageInstructions: 'يُوضع جزء من القرص على جمر هادئ في المبخرة لتبخير البيت والملابس ومجالس الضيوف.',
      images: ['/src/assets/images/product_perfume_incense_1795590419608.jpg'],
      variants: [
        { id: 'v-db-type1', name: 'النوع الأول (عود ملكي فاخر)', price: 4500, originalPrice: 5000, stock: 15 },
        { id: 'v-db-type2', name: 'النوع الثاني (مسك وعنبر عرائسي)', price: 4200, originalPrice: null, stock: 18 },
        { id: 'v-db-type3', name: 'النوع الثالث (زهري سويتي منعش)', price: 4000, originalPrice: null, stock: 20 },
      ],
      isFeatured: true,
      isBestSeller: true,
      isActive: true,
      inStock: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  return {
    version: 1,
    adminUser: {
      id: 'admin-1',
      email: adminEmail,
      passwordHash: hashPassword(initialPassword, adminSalt),
      salt: adminSalt,
      name: 'صاحب متجر توليب',
    },
    settings: defaultSettings,
    categories: defaultCategories,
    products: defaultProducts,
    orders: [],
  };
}

class StoreDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();

    // In production, the tracked seed file must never define the owner's login.
    // Use deployment secrets as the authoritative initial admin credentials.
    if (process.env.NODE_ENV === 'production') {
      const adminEmail = process.env.ADMIN_EMAIL?.trim();
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminEmail || !adminPassword || adminPassword.length < 12) {
        throw new Error('Production requires ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters).');
      }
      const salt = crypto.createHash('sha256').update(`tolip-admin-salt:${adminEmail.toLowerCase()}`).digest('hex').slice(0, 32);
      this.data.adminUser.email = adminEmail;
      this.data.adminUser.salt = salt;
      this.data.adminUser.passwordHash = hashPassword(adminPassword, salt);
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.products && parsed.categories) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading database, initializing fresh one:', err);
    }

    const initial = createDefaultDatabase();
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(dataToSave: DatabaseSchema) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database atomically:', err);
      throw new Error('تعذر حفظ بيانات المتجر. تحقق من صلاحية الكتابة أو إعداد قاعدة بيانات دائمة.');
    }
  }

  private persist() {
    this.saveDirect(this.data);
  }

  // --- Auth & Admin Methods ---
  public verifyAdminCredentials(email: string, pass: string): boolean {
    if (this.data.adminUser.email.toLowerCase() !== email.toLowerCase()) {
      return false;
    }
    return verifyPassword(pass, this.data.adminUser.salt, this.data.adminUser.passwordHash);
  }

  public getAdminInfo() {
    return {
      id: this.data.adminUser.id,
      email: this.data.adminUser.email,
      name: this.data.adminUser.name,
      role: 'admin' as const,
    };
  }

  public getAdminSessionVersion(): string {
    return this.data.adminUser.passwordHash;
  }

  public updateAdminCredentials(newEmail?: string, newPassword?: string) {
    if (newEmail) {
      this.data.adminUser.email = newEmail.trim();
    }
    if (newPassword && newPassword.length >= 6) {
      const newSalt = crypto.randomBytes(16).toString('hex');
      this.data.adminUser.salt = newSalt;
      this.data.adminUser.passwordHash = hashPassword(newPassword, newSalt);
    }
    this.persist();
    return this.getAdminInfo();
  }

  // --- Store Settings Methods ---
  public getSettings(): StoreSettings {
    return this.data.settings;
  }

  public updateSettings(partial: Partial<StoreSettings>): StoreSettings {
    this.data.settings = {
      ...this.data.settings,
      ...partial,
    };
    this.persist();
    return this.data.settings;
  }

  // --- Categories Methods ---
  public getCategories(includeInactive = false): Category[] {
    const list = includeInactive ? this.data.categories : this.data.categories.filter((c) => c.isActive);
    return list
      .map((cat) => ({
        ...cat,
        productCount: this.data.products.filter((p) => p.categoryId === cat.id && (includeInactive || p.isActive)).length,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public getCategoryById(id: string): Category | undefined {
    return this.data.categories.find((c) => c.id === id);
  }

  public createCategory(input: Omit<Category, 'id' | 'createdAt'>): Category {
    const id = `cat-${crypto.randomUUID()}`;
    const newCategory: Category = {
      ...input,
      id,
      createdAt: new Date().toISOString(),
    };
    this.data.categories.push(newCategory);
    this.persist();
    return newCategory;
  }

  public updateCategory(id: string, partial: Partial<Category>): Category | null {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const current = this.data.categories[idx];
    this.data.categories[idx] = {
      ...current,
      ...partial,
      id: current.id,
      createdAt: current.createdAt,
    };
    this.persist();
    return this.data.categories[idx];
  }

  public deleteCategory(id: string): boolean {
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.data.categories.splice(idx, 1);
    // Unassign products or hide them
    this.data.products.forEach((p) => {
      if (p.categoryId === id) {
        p.isActive = false;
      }
    });
    this.persist();
    return true;
  }

  // --- Products Methods ---
  public getProducts(options?: {
    categoryId?: string;
    search?: string;
    isFeatured?: boolean;
    isBestSeller?: boolean;
    inStockOnly?: boolean;
    includeInactive?: boolean;
    sortBy?: 'price-asc' | 'price-desc' | 'newest' | 'name';
  }): Product[] {
    let list = this.data.products;

    if (!options?.includeInactive) {
      list = list.filter((p) => p.isActive);
    }

    if (options?.categoryId && options.categoryId !== 'all') {
      list = list.filter((p) => p.categoryId === options.categoryId);
    }

    if (options?.isFeatured) {
      list = list.filter((p) => p.isFeatured);
    }

    if (options?.isBestSeller) {
      list = list.filter((p) => p.isBestSeller);
    }

    if (options?.inStockOnly) {
      list = list.filter((p) => p.inStock);
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.features.some((f) => f.toLowerCase().includes(q))
      );
    }

    // Attach category name
    const result = list.map((p) => {
      const cat = this.data.categories.find((c) => c.id === p.categoryId);
      return {
        ...p,
        categoryName: cat?.name || 'عام',
      };
    });

    if (options?.sortBy === 'price-asc') {
      result.sort((a, b) => {
        const minA = Math.min(...a.variants.map((v) => v.price ?? Infinity));
        const minB = Math.min(...b.variants.map((v) => v.price ?? Infinity));
        return minA - minB;
      });
    } else if (options?.sortBy === 'price-desc') {
      result.sort((a, b) => {
        const maxA = Math.max(...a.variants.map((v) => v.price ?? 0));
        const maxB = Math.max(...b.variants.map((v) => v.price ?? 0));
        return maxB - maxA;
      });
    } else if (options?.sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    } else {
      // Default: newest
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }

  public getProductById(id: string): Product | undefined {
    const product = this.data.products.find((p) => p.id === id || p.slug === id);
    if (!product) return undefined;
    const cat = this.data.categories.find((c) => c.id === product.categoryId);
    return {
      ...product,
      categoryName: cat?.name || 'عام',
    };
  }

  public createProduct(input: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const id = `prod-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.data.products.unshift(newProduct);
    this.persist();
    return newProduct;
  }

  public updateProduct(id: string, partial: Partial<Product>): Product | null {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const current = this.data.products[idx];
    this.data.products[idx] = {
      ...current,
      ...partial,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.products[idx];
  }

  public deleteProduct(id: string): boolean {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.data.products.splice(idx, 1);
    this.persist();
    return true;
  }

  // --- Orders Methods ---
  public createOrder(input: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Order {
    const orderNum = `TLP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const id = `ord-${crypto.randomUUID()}`;

    const newOrder: Order = {
      ...input,
      id,
      orderNumber: orderNum,
      createdAt: now,
      updatedAt: now,
    };

    this.data.orders.unshift(newOrder);
    this.persist();
    return newOrder;
  }

  public getOrders(filters?: {
    status?: OrderStatus;
    search?: string;
  }): Order[] {
    let list = this.data.orders;
    if (filters?.status) {
      list = list.filter((o) => o.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerDetails.fullName.toLowerCase().includes(q) ||
          o.customerDetails.phone.includes(q) ||
          o.customerDetails.city.toLowerCase().includes(q)
      );
    }
    return list;
  }

  public getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id || o.orderNumber === id);
  }

  public updateOrderStatus(id: string, status: OrderStatus): Order | null {
    const order = this.data.orders.find((o) => o.id === id || o.orderNumber === id);
    if (!order) return null;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    this.persist();
    return order;
  }

  public updateOrderWhatsAppMessage(id: string, whatsappMessage: string): Order | null {
    const order = this.data.orders.find((o) => o.id === id || o.orderNumber === id);
    if (!order) return null;
    order.whatsappMessage = whatsappMessage;
    order.updatedAt = new Date().toISOString();
    this.persist();
    return order;
  }

  // --- Admin Analytics & Stats ---
  public getAdminStats(): AdminStats {
    const totalProducts = this.data.products.length;
    const totalCategories = this.data.categories.length;
    const totalOrders = this.data.orders.length;
    const newOrders = this.data.orders.filter(
      (o) => o.status === 'new' || o.status === 'awaiting_whatsapp_confirmation'
    ).length;
    const outOfStockProducts = this.data.products.filter(
      (p) => !p.inStock || p.variants.every((v) => v.stock <= 0)
    ).length;

    // Confirmed orders revenue
    const confirmedOrders = this.data.orders.filter(
      (o) => o.status === 'confirmed' || o.status === 'delivered' || o.status === 'processing'
    );
    const confirmedRevenue = confirmedOrders.reduce((sum, o) => sum + (o.finalTotal || o.itemsTotal || 0), 0);

    // Best-selling analysis based on completed / confirmed orders
    const salesMap: Record<string, { name: string; count: number; image: string }> = {};
    for (const order of this.data.orders) {
      for (const item of order.items) {
        if (!salesMap[item.productId]) {
          const product = this.data.products.find((p) => p.id === item.productId);
          salesMap[item.productId] = {
            name: item.productName,
            count: 0,
            image: item.image || product?.images[0] || '',
          };
        }
        salesMap[item.productId].count += item.quantity;
      }
    }

    const bestSelling = Object.entries(salesMap)
      .map(([id, data]) => ({
        id,
        name: data.name,
        salesCount: data.count,
        image: data.image,
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 5);

    return {
      totalProducts,
      totalCategories,
      totalOrders,
      newOrders,
      outOfStockProducts,
      confirmedRevenue,
      bestSellingProducts: bestSelling,
      recentOrders: this.data.orders.slice(0, 6),
    };
  }
}

// Export singleton instance
export const db = new StoreDatabase();
