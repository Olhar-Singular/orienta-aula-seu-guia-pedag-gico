import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.text,
    marginBottom: 4,
  },
});

type Props = {
  text: string;
};

/** Renders a multi-line text block, splitting by newlines into paragraphs */
export default function PDFTextBlock({ text }: Props) {
  const paragraphs = text.split("\n").filter((l) => l.trim());

  return (
    <View>
      {paragraphs.map((p, i) => (
        <Text key={i} style={styles.paragraph}>
          {p}
        </Text>
      ))}
    </View>
  );
}
