/**
 * Built-in systems — committed to the repo so data persists on every deploy.
 * Edit this file to change default names, URLs, or credentials.
 */
export const BUILTIN_SYSTEMS = [
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
    nameEn: "Employee Form API",
    url: "https://empform-api.cmfsa-iq.com/Auth/DashboardCount",
    requiresAuth: false,
    auth: {
      phoneNumber: "",
      password: "",
    },
  },
];

export const BUILTIN_SYSTEM_IDS = new Set(BUILTIN_SYSTEMS.map((s) => s.id));
