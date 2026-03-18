import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";
import { parseActivityText, normalizeMathText, type ParsedElement, type TextElementType } from "../textParser";

const styles = StyleSheet.create({
  // Fallback paragraph
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.text,
    marginBottom: 4,
  },
  // Title: PROVA DE FÍSICA
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: colors.primary,
    marginTop: 14,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  // Question number + optional title: "1. Força Eletrostática:"
  questionNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
  },
  // Bullet item
  bulletItem: {
    fontSize: 11,
    lineHeight: 1.5,
    color: colors.text,
    marginLeft: 16,
    marginBottom: 3,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: 6,
    marginTop: 5,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginLeft: 16,
    marginBottom: 3,
  },
  bulletText: {
    fontSize: 11,
    lineHeight: 1.5,
    color: colors.text,
    flex: 1,
  },
  // Step: PRIMEIRO PASSO:
  step: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#f0f9f9",
    padding: "4 8",
    borderRadius: 3,
  },
  // Alternative: a) Atração; 0,2 N.
  alternative: {
    fontSize: 11,
    lineHeight: 1.5,
    color: colors.text,
    marginLeft: 20,
    marginBottom: 3,
    paddingLeft: 4,
  },
  altLetter: {
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  // Formula
  formula: {
    fontFamily: "Courier",
    fontSize: 10.5,
    backgroundColor: "#f5f5f5",
    padding: "3 6",
    borderRadius: 3,
    marginBottom: 4,
    color: colors.text,
    letterSpacing: 0.3,
  },
  // Instruction: ATENÇÃO:, IMPORTANTE:
  instruction: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#d97706",
    marginTop: 8,
    marginBottom: 4,
  },
  // Header: BLOCO I, PARTE A
  header: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryLight,
    paddingBottom: 3,
  },
  // Separator
  separator: {
    marginTop: 6,
    marginBottom: 6,
  },
});

function renderElement(el: ParsedElement, index: number) {
  switch (el.type) {
    case "title":
      return (
        <Text key={index} style={styles.title}>
          {el.content}
        </Text>
      );

    case "question-number":
      return (
        <Text key={index} style={styles.questionNumber}>
          {el.content}
        </Text>
      );

    case "bullet-item":
      return (
        <View key={index} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{el.content}</Text>
        </View>
      );

    case "step":
      return (
        <Text key={index} style={styles.step}>
          {el.content}
        </Text>
      );

    case "alternative":
      return (
        <Text key={index} style={styles.alternative}>
          {el.content}
        </Text>
      );

    case "formula":
      return (
        <Text key={index} style={styles.formula}>
          {el.content}
        </Text>
      );

    case "instruction":
      return (
        <Text key={index} style={styles.instruction}>
          {el.content}
        </Text>
      );

    case "header":
      return (
        <Text key={index} style={styles.header}>
          {el.content}
        </Text>
      );

    case "separator":
      return <View key={index} style={styles.separator} />;

    case "paragraph":
    default:
      return (
        <Text key={index} style={styles.paragraph}>
          {el.content}
        </Text>
      );
  }
}

type Props = {
  text: string;
};

/**
 * Renders a text block with smart formatting:
 * detects titles, questions, alternatives, steps, bullets, formulas, etc.
 */
export default function PDFTextBlock({ text }: Props) {
  const elements = parseActivityText(text);

  return <View>{elements.map((el, i) => renderElement(el, i))}</View>;
}
