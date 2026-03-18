import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";
import { parseActivityText, normalizeMathText, type ParsedElement } from "../textParser";
import PDFRichLine from "./PDFRichLine";

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.text,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: colors.primary,
    marginTop: 14,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  questionNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.text,
    marginTop: 16,
    marginBottom: 4,
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
  alternative: {
    fontSize: 11,
    lineHeight: 1.5,
    color: colors.text,
    marginLeft: 20,
    marginBottom: 3,
    paddingLeft: 4,
  },
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
  instruction: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#d97706",
    marginTop: 8,
    marginBottom: 4,
  },
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
  separator: {
    marginTop: 6,
    marginBottom: 6,
  },
});

function renderElement(el: ParsedElement, index: number) {
  switch (el.type) {
    case "title":
      return <PDFRichLine key={index} text={el.content} style={styles.title} />;

    case "question-number":
      return <PDFRichLine key={index} text={el.content} style={styles.questionNumber} />;

    case "bullet-item":
      return (
        <View key={index} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <PDFRichLine text={el.content} style={styles.bulletText} />
        </View>
      );

    case "step":
      return <PDFRichLine key={index} text={el.content} style={styles.step} />;

    case "alternative":
      return <PDFRichLine key={index} text={el.content} style={styles.alternative} />;

    case "formula":
      return <PDFRichLine key={index} text={el.content} style={styles.formula} />;

    case "instruction":
      return <PDFRichLine key={index} text={el.content} style={styles.instruction} />;

    case "header":
      return <PDFRichLine key={index} text={el.content} style={styles.header} />;

    case "separator":
      return <View key={index} style={styles.separator} />;

    case "paragraph":
    default:
      return <PDFRichLine key={index} text={el.content} style={styles.paragraph} />;
  }
}

type Props = {
  text: string;
};

export default function PDFTextBlock({ text }: Props) {
  const safeText = normalizeMathText(text);
  const elements = parseActivityText(safeText);

  return <View>{elements.map((el, i) => renderElement(el, i))}</View>;
}
