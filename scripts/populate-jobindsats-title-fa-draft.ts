import "dotenv/config";

import { enJobindsatsTitleTranslations } from "@/lib/i18n/generated/jobindsats-title-translations";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const faDraftByEnglish: Record<string, string> = {
  "Administrative assistant": "دستیار اداری",
  "Administrative work": "کار اداری",
  "Administrative healthcare work": "کار اداری در حوزه سلامت",
  "Evening school teacher": "معلم مدرسه شبانه",
  "Academic work": "کار دانشگاهی",
  "Civil works": "کارهای عمرانی",
  "Landscape gardener": "باغبان فضای سبز",
  "Landscape gardening production work": "کار تولیدی در باغبانی و فضای سبز",
  "Civil engineering structure worker": "کارگر سازه‌های عمرانی",
  "Construction site supervisor": "سرپرست کارگاه ساختمانی",
  "Auto mechanic": "مکانیک خودرو",
  "Bartender": "بارمن",
  "Cemetery and funeral service work": "کار خدمات قبرستان و مراسم تدفین",
  "Treatment and rehabilitation": "درمان و توان‌بخشی",
  "Library and museum work": "کار کتابخانه و موزه",
  "Van and delivery driver": "راننده ون و تحویل کالا",
  "Bookkeeping and accounting work": "کار دفترداری و حسابداری",
  "Paver": "سنگفرش‌کار",
  "Delivery work and related roles": "کار تحویل و مشاغل مرتبط",
  "Bus driver": "راننده اتوبوس",
  "Shop assistant": "دستیار فروشگاه",
  "Retail sales work": "کار فروش خرده‌فروشی",
  "Shop assistant helper": "کمک‌فروش فروشگاه",
  "Construction and civil works": "ساخت‌وساز و کارهای عمرانی",
  "Construction manager": "مدیر ساخت",
  "Building work and related roles": "کار ساختمانی و مشاغل مرتبط",
  "Building painter": "نقاش ساختمان",
  "Childcare": "مراقبت از کودک",
  "Childminder": "مراقب کودک",
  "Cafe worker": "کارگر کافه",
  "Call center worker": "کارمند مرکز تماس",
  "Driver, freight, distribution, mixed driving": "راننده بار و توزیع",
  "Driver, passenger transport": "راننده حمل‌ونقل مسافر",
  "Driver, special transport": "راننده حمل‌ونقل ویژه",
  "Operations planner": "برنامه‌ریز عملیات",
  "Property services and meter reading": "خدمات ملکی و قرائت کنتور",
  "Sales clerk": "فروشنده",
  "Electrician": "برق‌کار",
  "Electrical work": "کار برق",
  "Students and trainees": "دانشجویان و کارآموزان",
  "Trainees: hotel, restaurant, kitchen, and canteen": "کارآموزان: هتل، رستوران، آشپزخانه و سلف",
  "Trainees: office, administration, accounting, and finance": "کارآموزان: دفتر، مدیریت، حسابداری و مالی",
  "Trainees: pedagogical, social, and theological work": "کارآموزان: کار تربیتی، اجتماعی و الهیات",
  "Trainees: health, care, and personal support": "کارآموزان: سلامت، مراقبت و حمایت شخصی",
  "Nutrition assistant": "دستیار تغذیه",
  "Nutrition assistant trainee": "کارآموز دستیار تغذیه",
  "Fast food counter assistant": "متصدی فست‌فود",
  "Flight dispatcher": "هماهنگ‌کننده پرواز",
  "Air traffic controller": "کنترل‌گر ترافیک هوایی",
  "Primary and lower secondary school teacher": "معلم دبستان و متوسطه اول",
  "Research and university teaching in natural sciences and engineering": "پژوهش و آموزش دانشگاهی در علوم طبیعی و مهندسی",
  "Research and university teaching in social sciences": "پژوهش و آموزش دانشگاهی در علوم اجتماعی",
  "Photography and camera work": "کار عکاسی و دوربین",
  "Senior administrative officer": "کارشناس ارشد اداری",
  "Metalworking and blacksmithing work and related roles": "کار فلزکاری و آهنگری و مشاغل مرتبط",
  "Disability support assistant": "دستیار حمایت از افراد دارای معلولیت",
  "Hospital service assistant": "دستیار خدمات بیمارستانی",
  "Hotel, restaurant, kitchen, and canteen": "هتل، رستوران، آشپزخانه و سلف",
  "Industrial production": "تولید صنعتی",
  "Industrial butcher": "قصاب صنعتی",
  "Engineering work": "کار مهندسی",
  "Insulation work": "کار عایق‌کاری",
  "IT and telecommunications engineering": "فناوری اطلاعات و مهندسی مخابرات",
  "Metal, iron, and automotive work": "کار فلز، آهن و خودرو",
  "Legal work": "کار حقوقی",
  "Lawyer": "وکیل",
  "Sewer pipe layer": "لوله‌گذار فاضلاب",
  "Cook": "آشپز",
  "Communication and business language work": "کار ارتباطات و زبان‌های تجاری",
  "Office and secretarial work": "کار دفتری و منشی‌گری",
  "Office, administration, accounting, and finance": "دفتر، مدیریت، حسابداری و مالی",
  "Office administration trainee": "کارآموز مدیریت اداری",
  "Office worker": "کارمند اداری",
  "Crane and forklift operation": "کار با جرثقیل و لیفتراک",
  "Kitchen and canteen work": "کار آشپزخانه و سلف",
  "Kitchen assistant": "دستیار آشپزخانه",
  "Warehouse and logistics worker": "کارگر انبار و لجستیک",
  "Warehouse work and related roles": "کار انبار و مشاغل مرتبط",
  "Agriculture, forestry, horticulture, fishing, and animal care": "کشاورزی، جنگلداری، باغبانی، ماهیگیری و مراقبت از حیوانات",
  "Farm assistant": "دستیار مزرعه",
  "Management": "مدیریت",
  "Management: administration, strategy, and personnel": "مدیریت: اداره، راهبرد و منابع انسانی",
  "Management: operations and production": "مدیریت: عملیات و تولید",
  "Management: institution": "مدیریت: مؤسسه",
  "Management: sales, procurement, and marketing": "مدیریت: فروش، تدارکات و بازاریابی",
  "Management: healthcare sector": "مدیریت: بخش سلامت",
  "Air transport": "حمل‌ونقل هوایی",
  "Doctor": "پزشک",
  "Doctor, dentist, and veterinarian": "پزشک، دندان‌پزشک و دامپزشک",
  "Painting work": "کار نقاشی",
  "Medical device and laboratory work": "کار تجهیزات پزشکی و آزمایشگاهی",
  "Media, culture, tourism, sports, and entertainment": "رسانه، فرهنگ، گردشگری، ورزش و سرگرمی",
  "Mechanic": "مکانیک",
  "Transport mechanic work": "کار مکانیک حمل‌ونقل",
  "General mechanic work": "کار عمومی مکانیکی",
  "Bricklayer": "آجرچین",
  "Bricklaying work": "کار آجرچینی",
  "Museum assistant": "دستیار موزه",
  "Demolition worker": "کارگر تخریب",
  "Food and beverages": "خوراکی‌ها و نوشیدنی‌ها",
  "Care assistant": "دستیار مراقبت",
  "Surveillance and control": "نظارت و کنترل",
  "Pedagogical assistant trainee": "کارآموز دستیار تربیتی",
  "PhD, natural sciences and engineering": "دکتری در علوم طبیعی و مهندسی",
  "Care and support": "مراقبت و حمایت",
  "Production worker": "کارگر تولید",
  "Project manager": "مدیر پروژه",
  "Psychology work": "کار روان‌شناسی",
  "Pedagogue": "کارشناس تربیتی",
  "Pedagogical work": "کار تربیتی",
  "Pedagogical assistant": "دستیار تربیتی",
  "Pedagogical, social, and church-related work": "کار تربیتی، اجتماعی و کلیسایی",
  "Pedagogical assistant worker": "کمک‌یار تربیتی",
  "Cleaning work and related roles": "کار نظافت و مشاغل مرتبط",
  "Cleaning, property services, and waste management": "نظافت، خدمات ملکی و مدیریت پسماند",
  "Cleaning assistant": "دستیار نظافت",
  "Pipe layer": "لوله‌گذار",
  "Sales and procurement": "فروش و تدارکات",
  "Sales, procurement, and marketing": "فروش، تدارکات و بازاریابی",
  "Sales assistant": "دستیار فروش",
  "Serving work and related roles": "کار پذیرایی و مشاغل مرتبط",
  "Butcher": "قصاب",
  "Butchery and fish processing work": "قصابی و فرآوری ماهی",
  "Joinery, carpentry, and glazing work": "نجاری، درودگری و شیشه‌کاری",
  "Social and healthcare associate": "دستیار اجتماعی و سلامت",
  "Social and healthcare associate trainee": "کارآموز دستیار اجتماعی و سلامت",
  "Social and healthcare assistant": "دستیار اجتماعی و بهداشتی",
  "Social and healthcare assistant trainee": "کارآموز دستیار اجتماعی و بهداشتی",
  "Social pedagogue": "مددکار تربیتی اجتماعی",
  "Social worker": "مددکار اجتماعی",
  "Social work and related roles": "کار اجتماعی و مشاغل مرتبط",
  "Construction worker, earth and concrete": "کارگر ساخت‌وساز، خاک و بتن",
  "Student assistant": "دستیار دانشجو",
  "Health, care, and personal support": "سلامت، مراقبت و حمایت شخصی",
  "Nursing and midwifery": "پرستاری و مامایی",
  "Nurse": "پرستار",
  "Nursing student": "دانشجوی پرستاری",
  "Team leader": "سرپرست تیم",
  "Waiter": "پیشخدمت",
  "Transport, postal, warehouse, and machine operation": "حمل‌ونقل، پست، انبار و کار با ماشین‌آلات",
  "Forklift driver": "راننده لیفتراک",
  "Cross-functional work in construction and civil works": "کار میان‌وظیفه‌ای در ساخت‌وساز و عمران",
  "Cross-functional work in industrial production": "کار میان‌وظیفه‌ای در تولید صنعتی",
  "Cross-functional pedagogical and social work": "کار میان‌وظیفه‌ای تربیتی و اجتماعی",
  "Cross-functional IT work": "کار میان‌وظیفه‌ای فناوری اطلاعات",
  "Carpenter": "نجار",
  "Teaching in primary and lower secondary schools": "تدریس در دبستان و متوسطه اول",
  "Teaching and guidance": "تدریس و راهنمایی",
  "Teaching assistant, natural sciences and engineering": "دستیار آموزشی در علوم طبیعی و مهندسی",
  "Security guard": "نگهبان",
  "Guarding, security, and surveillance": "حراست، امنیت و نظارت",
  "Road transport": "حمل‌ونقل جاده‌ای",
  "Visual merchandiser": "مسئول چیدمان بصری فروشگاه",
  "Plumbing and sheet metal work": "لوله‌کشی و ورق‌کاری",
  "Plumber": "لوله‌کش",
  "Host/hostess": "میزبان",
  "Finance and auditing": "مالی و حسابرسی",
  "Other teaching": "سایر آموزش",
  "Other hospital work": "سایر کارهای بیمارستانی",
  "Other hotel, kitchen, and household work": "سایر کارهای هتل، آشپزخانه و خانه‌داری",
};

async function main() {
  const updates = Object.entries(enJobindsatsTitleTranslations).map(([daKey, en]) => {
    const fa = faDraftByEnglish[en];

    if (!fa) {
      throw new Error(`Missing Farsi draft translation for English master: ${en}`);
    }

    return {
      daKey,
      fa,
    };
  });

  for (const update of updates) {
    await prisma.jobindsatsTitleTranslation.update({
      where: { daKey: update.daKey },
      data: { fa: update.fa },
    });
  }

  console.log(`Updated Farsi draft translations for ${updates.length} Jobindsats titles.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
