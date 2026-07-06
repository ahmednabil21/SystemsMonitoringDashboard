/**
 * Built-in systems — committed to the repo so data persists on every deploy.
 * Edit this file to change names, URLs, or credentials.
 */
export const BUILTIN_SYSTEMS = [
  {
    id: "system-hr",
    name: "إدارة الموارد البشرية",
    nameEn: "Human Resources",
    url: "https://hr-api.cmfsa-iq.com/api/Auth/Login",
    requiresAuth: true,
    auth: {
      phoneNumber: "0",
      password: "0",
      monitorLogin: true,
    },
  },
  {
    id: "system-cds",
    name: "نظام التوزيع الوظيفي",
    nameEn: "Job Distribution System",
    url: "http://cds-cmfsa.duckdns.org/dashboard/login",
    requiresAuth: false,
    auth: { phoneNumber: "", password: "" },
  },
  {
    id: "system-health-services",
    name: "نظام الخدمات الصحية",
    nameEn: "Health Services System",
    url: "https://services-api.cmfsa-iq.com/Auth/GetUsers",
    requiresAuth: false,
    auth: { phoneNumber: "", password: "" },
  },
  {
    id: "system-assets",
    name: "نظام الأصول",
    nameEn: "Assets System",
    url: "https://asset-api.cmfsa-iq.com/api/Auth/Login",
    requiresAuth: true,
    auth: {
      phoneNumber: "0",
      password: "0",
      monitorLogin: true,
    },
  },
  {
    id: "system-medication",
    name: "نظام إدارة المخازن",
    nameEn: "Medication / Warehouse System",
    url: "https://api-medication.cmfsa-iq.com/api/Auth/Login",
    requiresAuth: true,
    auth: {
      phoneNumber: "0",
      password: "0",
      monitorLogin: true,
    },
  },
  {
    id: "system-vacation",
    name: "نظام الإجازات",
    nameEn: "Vacation System",
    url: "https://vacation-api.cmfsa-iq.com/api/Users/login",
    requiresAuth: true,
    auth: {
      phoneNumber: "2",
      password: "2",
      loginStyle: "pascal",
      monitorLogin: true,
    },
  },
  {
    id: "system-crowd-medicine",
    name: "موقع طب الحشود",
    nameEn: "Crowd Medicine Website",
    url: "https://int-mgm.org/index",
    requiresAuth: false,
    auth: { phoneNumber: "", password: "" },
  },
  {
    id: "system-media",
    name: "موقع الإعلام",
    nameEn: "Media Website",
    url: "http://cmfsa-iq.com",
    requiresAuth: false,
    auth: { phoneNumber: "", password: "" },
  },
  {
    id: "system-health-media",
    name: "موقع إعلام الخدمات الصحية",
    nameEn: "Health Services Media",
    url: "https://healthservicesdir.com",
    requiresAuth: false,
    auth: { phoneNumber: "", password: "" },
  },
  {
    id: "system-tayid",
    name: "نظام التأييدات",
    nameEn: "Endorsements System",
    url: "https://tayid-api.cmfsa-iq.com/api/Dashboard",
    requiresAuth: false,
    auth: { phoneNumber: "", password: "" },
  },
  {
    id: "system-pb",
    name: "نظام الخدج",
    nameEn: "PB System",
    url: "https://pb-api.cmfsa-iq.com/swagger",
    requiresAuth: false,
    auth: { phoneNumber: "", password: "" },
  },
  {
    id: "system-medical",
    name: "النظام الطبي",
    nameEn: "Medical System",
    url: "https://medical-api.cmfsa-iq.com/api/Dashbord/GetDashboardCounts",
    requiresAuth: true,
    auth: {
      phoneNumber: "ghafar",
      password: "1212",
    },
  },
  {
    id: "system-empform",
    name: "نظام استمارة الموظف",
    nameEn: "Employee Form System",
    url: "https://empform-api.cmfsa-iq.com/Auth/DashboardCount",
    requiresAuth: false,
    auth: { phoneNumber: "", password: "" },
  },
];

export const BUILTIN_SYSTEM_IDS = new Set(BUILTIN_SYSTEMS.map((s) => s.id));
