/**
 * Renders a single line of text with inline fraction support for PDF export.
 * Detects \frac{a}{b}, \tfrac{a}{b}, \dfrac{a}{b} and plain a/b patterns
 * and renders them as stacked fractions using PDFFraction.
 */
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";
import PDFFraction from "./PDFFraction";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  textSegment: {
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.text,
  },
});

// Match \frac{...}{...} or \tfrac{...}{...} or \dfrac{...}{...}
const LATEX_FRAC_RE = /\\[tdf]?frac\{([^{}]+)\}\{([^{}]+)\}/g;
// Match plain fractions like 7/8, 42/48, ?/48 — but NOT decimals like 1.2/
// Only match when numerator is NOT preceded by a dot (to avoid 0.5/3 splitting wrong)
const PLAIN_FRAC_RE = /(^|[\s=,(;+\-])(\?|\d+)\s*\/\s*(\?|\d+)(?=[\s=,);.\-+:]|$)/g;

type Segment = { type: "text"; content: string } | { type: "fraction"; num: string; den: string };

function parseLineFractions(text: string): Segment[] {
  // First pass: replace LaTeX fractions with placeholders
  let processed = text;
  const fractions: { num: string; den: string }[] = [];
  
  processed = processed.replace(LATEX_FRAC_RE, (_m, num, den) => {
    fractions.push({ num, den });
    return `\x00FRAC${fractions.length - 1}\x00`;
  });

  // Second pass: replace plain fractions
  processed = processed.replace(PLAIN_FRAC_RE, (_m, prefix, num, den) => {
    fractions.push({ num, den });
    return `${prefix}\x00FRAC${fractions.length - 1}\x00`;
  });

  // Split by placeholders
  const parts = processed.split(/\x00/);
  const segments: Segment[] = [];
  
  for (const part of parts) {
    const fracMatch = part.match(/^FRAC(\d+)$/);
    if (fracMatch) {
      const idx = parseInt(fracMatch[1], 10);
      segments.push({ type: "fraction", ...fractions[idx] });
    } else if (part) {
      segments.push({ type: "text", content: part });
    }
  }

  return segments;
}

export function hasFractions(text: string): boolean {
  return LATEX_FRAC_RE.test(text) || PLAIN_FRAC_RE.test(text);
}

type Props = {
  text: string;
  style?: any;
};

export default function PDFRichLine({ text, style }: Props) {
  // Reset regex lastIndex
  LATEX_FRAC_RE.lastIndex = 0;
  PLAIN_FRAC_RE.lastIndex = 0;

  if (!hasFractions(text)) {
    return <Text style={style}>{text}</Text>;
  }

  // Reset again for parseLineFractions
  LATEX_FRAC_RE.lastIndex = 0;
  PLAIN_FRAC_RE.lastIndex = 0;

  const segments = parseLineFractions(text);

  return (
    <View style={styles.row}>
      {segments.map((seg, i) =>
        seg.type === "fraction" ? (
          <PDFFraction key={i} numerator={seg.num} denominator={seg.den} />
        ) : (
          <Text key={i} style={[styles.textSegment, style]}>
            {seg.content}
          </Text>
        )
      )}
    </View>
  );
}
