/** Clothed crowd. Stylized CC0 people, not photoreal scans. See public/models/ASSETS.md. */
export const PEOPLE = [
  "/models/characters/people/Casual_Male.glb",
  "/models/characters/people/Casual_Female.glb",
  "/models/characters/people/Suit_Male.glb",
  "/models/characters/people/Suit_Female.glb",
  "/models/characters/people/Worker_Male.glb",
  "/models/characters/people/OldClassy_Female.glb",
  "/models/characters/people/Doctor_Male_Young.glb",
  "/models/characters/people/Casual_Bald.glb",
] as const;

export type PersonClip = "Idle" | "Walk" | "Run" | "SitDown";
