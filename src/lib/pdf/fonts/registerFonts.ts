/**
 * Font configuration for PDF rendering.
 * Note: Custom fonts like OpenDyslexic require special handling in react-pdf.
 * For now, we fallback to built-in Helvetica variants for PDF export.
 * The web editor still supports OpenDyslexic via CSS @font-face.
 */

// Define available font families for the editor
export const FONT_FAMILIES = {
  default: "Helvetica",
  openDyslexic: "OpenDyslexic",
  arial: "Helvetica",
  courier: "Courier",
} as const;

export type FontFamily = keyof typeof FONT_FAMILIES;

// PDF font family mapping (fallback to built-in fonts)
// OpenDyslexic and other custom fonts fallback to Helvetica in PDF
export const PDF_FONT_FAMILY_MAP: Record<string, string> = {
  "OpenDyslexic, sans-serif": "Helvetica",
  "OpenDyslexic": "Helvetica",
  "Arial, sans-serif": "Helvetica",
  "Verdana, sans-serif": "Helvetica",
  "Courier New, monospace": "Courier",
  "inherit": "Helvetica",
};

// Define highlight colors (accessibility-friendly palette)
export const HIGHLIGHT_COLORS = {
  yellow: "#FEF08A",
  green: "#BBF7D0",
  blue: "#BFDBFE",
  pink: "#FBCFE8",
  orange: "#FED7AA",
  purple: "#DDD6FE",
} as const;

export type HighlightColor = keyof typeof HIGHLIGHT_COLORS;

// Define text colors
export const TEXT_COLORS = {
  default: "#1F2937",
  red: "#DC2626",
  blue: "#2563EB",
  green: "#16A34A",
  purple: "#9333EA",
  gray: "#6B7280",
} as const;

export type TextColor = keyof typeof TEXT_COLORS;

// Define font sizes
export const FONT_SIZES = {
  small: "10px",
  normal: "12px",
  large: "14px",
  xlarge: "16px",
} as const;

export type FontSize = keyof typeof FONT_SIZES;

// Font size values in points for PDF
export const FONT_SIZES_PT = {
  small: 9,
  normal: 11,
  large: 13,
  xlarge: 15,
} as const;
