export type StatisticPreset =
  | "projects_delivered"
  | "clients_served"
  | "team_members"
  | "portfolio_projects"
  | "five_star_reviews"
  | "years_in_business";
export const STATISTIC_PRESETS: readonly StatisticPreset[] = [
  "projects_delivered",
  "clients_served",
  "team_members",
  "portfolio_projects",
  "five_star_reviews",
  "years_in_business",
];
