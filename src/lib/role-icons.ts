/**
 * Interface icons offered alongside the brand logos, for things a brand mark cannot
 * describe: the kind of role someone held, or a school.
 *
 * Shared by the website's renderer and the Strapi picker so the two can never drift.
 * Names are lucide-react exports.
 */
export const ROLE_ICON_NAMES = [
  "Briefcase",
  "BriefcaseBusiness",
  "CodeXml",
  "Code2",
  "Terminal",
  "Server",
  "Database",
  "Cloud",
  "Palette",
  "PenTool",
  "Paintbrush",
  "Lightbulb",
  "Rocket",
  "GraduationCap",
  "BookOpen",
  "Users",
  "UserCog",
  "ChartLine",
  "ChartColumn",
  "Shield",
  "Wrench",
  "Settings",
  "Megaphone",
  "Camera",
  "Smartphone",
  "Globe",
  "Layers",
  "Package",
  "GitBranch",
  "Bug",
  "Cpu",
  "Sparkles",
  // Contact methods and notes in the call-to-action block.
  "Mail",
  "Calendar",
  "CalendarDays",
  "Phone",
  "MessageCircle",
  "Send",
  "FileText",
  "MapPin",
  "Clock",
  "CircleCheck",
  "Handshake",
] as const;

export type RoleIconName = (typeof ROLE_ICON_NAMES)[number];
