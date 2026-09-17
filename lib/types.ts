export type Participant = {
  id: string;
  name: string;
  score: number;
  team: string; // team option id, or "" for unassigned
};

export type TeamOption = {
  id: string;
  label: string;
  bg: string;
  text: string;
};

export const TEAM_OPTIONS: TeamOption[] = [
  { id: "executive", label: "Executive Team", bg: "#fef3c7", text: "#92400e" },
  { id: "lead", label: "Lead", bg: "#dbeafe", text: "#1e40af" },
  { id: "co-lead", label: "Co-Lead", bg: "#e0e7ff", text: "#3730a3" },
  { id: "event-management", label: "Event Management", bg: "#dbeafe", text: "#1d4ed8" },
  { id: "design", label: "Design", bg: "#fce7f3", text: "#9d174d" },
  { id: "pr-marketing", label: "PR & Marketing", bg: "#cffafe", text: "#155e75" },
  { id: "social-media", label: "Social Media", bg: "#ccfbf1", text: "#115e59" },
  { id: "photography", label: "Photography", bg: "#ede9fe", text: "#5b21b6" },
  { id: "video-editing", label: "Video Editing", bg: "#dcfce7", text: "#166534" },
  { id: "anchor", label: "Anchor", bg: "#ffedd5", text: "#9a3412" },
  { id: "logistics-decor", label: "Logistics & Decor", bg: "#e2e8f0", text: "#334155" },
];

export const UNASSIGNED: TeamOption = { id: "", label: "No team", bg: "#f1f5f9", text: "#64748b" };

export function teamOption(id: string): TeamOption {
  return TEAM_OPTIONS.find((t) => t.id === id) ?? UNASSIGNED;
}
