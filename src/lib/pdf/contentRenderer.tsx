import { View, Text, Image as PdfImage, StyleSheet } from "@react-pdf/renderer";
import type {
  ContentBlock,
  TextStyle,
  PdfFontFamily,
  ActivityHeader,
} from "@/types/adaptation";
import { TEXT_STYLE_DEFAULTS } from "@/types/adaptation";

const CONTENT_WIDTH = 483; // A4 width (595) - 56*2 padding

const styles = StyleSheet.create({
  textBlock: {
    marginBottom: 8,
    textAlign: "justify",
  },
  imageWrapper: {
    marginVertical: 10,
  },
  imageWrapperLeft: { alignItems: "flex-start" },
  imageWrapperCenter: { alignItems: "center" },
  imageWrapperRight: { alignItems: "flex-end" },
  imageCaption: {
    fontSize: 9,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    borderBottomStyle: "solid",
  },
  headerLogo: {
    marginRight: 12,
  },
  headerFields: {
    flex: 1,
  },
  headerSchool: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#111827",
  },
  headerLine: {
    fontSize: 10,
    color: "#4b5563",
    marginBottom: 1,
  },
  studentLine: {
    marginTop: 8,
    fontSize: 11,
    color: "#374151",
  },
  studentLineRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#374151",
    borderBottomStyle: "solid",
    flex: 1,
    marginLeft: 4,
    minWidth: 200,
  },
  // Separator
  separator: {
    borderTopWidth: 0.5,
    borderTopColor: "#9ca3af",
    borderTopStyle: "solid",
    marginBottom: 12,
    marginTop: 4,
  },
  // Answer lines
  answerLineRow: {
    flexDirection: "row",
    marginBottom: 12,
    marginTop: 4,
  },
  answerLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
    borderBottomStyle: "solid",
    height: 20,
    flex: 1,
  },
});

export { styles as contentRendererStyles };

/**
 * Resolves @react-pdf/renderer font variant names.
 */
export function resolveFontFamily(
  family: PdfFontFamily,
  bold: boolean,
  italic: boolean,
): string {
  if (family === "Times-Roman") {
    if (bold && italic) return "Times-BoldItalic";
    if (bold) return "Times-Bold";
    if (italic) return "Times-Italic";
    return "Times-Roman";
  }
  if (bold && italic) return `${family}-BoldOblique`;
  if (bold) return `${family}-Bold`;
  if (italic) return `${family}-Oblique`;
  return family;
}

/**
 * Converts a TextStyle to @react-pdf/renderer style object.
 */
export function textStyleToPdf(style?: TextStyle) {
  const s = { ...TEXT_STYLE_DEFAULTS, ...style };
  return {
    fontSize: s.fontSize,
    fontFamily: resolveFontFamily(s.fontFamily, s.bold, s.italic),
    textAlign: s.textAlign as "left" | "center" | "right" | "justify",
    lineHeight: s.lineHeight,
  };
}

/**
 * Renders a single ContentBlock to PDF elements.
 */
export function renderContentBlock(block: ContentBlock) {
  if (block.type === "page_break") {
    return <View key={block.id} break />;
  }

  if (block.type === "text") {
    return (
      <Text
        key={block.id}
        style={{ ...styles.textBlock, ...textStyleToPdf(block.style) }}
      >
        {block.content}
      </Text>
    );
  }

  if (block.type === "image") {
    const wrapperAlignStyle =
      block.alignment === "left"
        ? styles.imageWrapperLeft
        : block.alignment === "right"
          ? styles.imageWrapperRight
          : styles.imageWrapperCenter;

    return (
      <View
        key={block.id}
        style={[styles.imageWrapper, wrapperAlignStyle]}
        wrap={false}
      >
        <PdfImage
          src={block.src}
          style={{
            width: CONTENT_WIDTH * block.width,
            maxHeight: 280,
            objectFit: "contain",
          }}
        />
        {block.caption ? (
          <Text style={styles.imageCaption}>{block.caption}</Text>
        ) : null}
      </View>
    );
  }

  return null;
}

/**
 * Renders an ActivityHeader to PDF elements.
 */
export function renderActivityHeader(header: ActivityHeader) {
  return (
    <View style={styles.headerRow} wrap={false}>
      {header.logoSrc && (
        <View style={styles.headerLogo}>
          <PdfImage
            src={header.logoSrc}
            style={{
              width: header.logoWidth ?? 60,
              height: header.logoWidth ?? 60,
              objectFit: "contain",
            }}
          />
        </View>
      )}
      <View style={styles.headerFields}>
        <Text style={styles.headerSchool}>{header.schoolName}</Text>
        <Text style={styles.headerLine}>{header.subject}</Text>
        <Text style={styles.headerLine}>
          Professor(a): {header.teacherName} | Turma: {header.className} |
          Data: {header.date}
        </Text>
        {header.showStudentLine && (
          <View
            style={[
              styles.studentLine,
              { flexDirection: "row", alignItems: "flex-end" },
            ]}
          >
            <Text>Nome do aluno(a): </Text>
            <View style={styles.studentLineRule} />
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Renders answer lines (dotted lines for open-ended responses).
 */
export function renderAnswerLines(count: number) {
  if (count <= 0) return null;
  return (
    <View style={styles.answerLineRow} wrap={false}>
      <View style={{ flex: 1 }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={styles.answerLine} />
        ))}
      </View>
    </View>
  );
}
