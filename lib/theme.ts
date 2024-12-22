export const colors = {
  primary: "#3B82F6", // Blue
  secondary: "#10B981", // Green
  accent: "#8B5CF6", // Purple
  background: "#FFFFFF",
  text: "#1F2937",
};

type Colors = typeof colors;

export function applyTheme(colors: Colors) {
  document.documentElement.style.setProperty("--color-primary", colors.primary);
  document.documentElement.style.setProperty(
    "--color-secondary",
    colors.secondary
  );
  document.documentElement.style.setProperty("--color-accent", colors.accent);
  document.documentElement.style.setProperty(
    "--color-background",
    colors.background
  );
  document.documentElement.style.setProperty("--color-text", colors.text);
}
