import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bullet: {
    width: 14,
    fontSize: 11,
    color: colors.primary,
  },
  number: {
    width: 18,
    fontSize: 11,
    color: colors.primary,
    fontFamily: "Helvetica-Bold",
  },
  text: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
    color: colors.text,
  },
});

type Props = {
  items: string[];
  ordered?: boolean;
};

export default function PDFList({ items, ordered = false }: Props) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={styles.item} wrap={false}>
          {ordered ? (
            <Text style={styles.number}>{i + 1}.</Text>
          ) : (
            <Text style={styles.bullet}>•</Text>
          )}
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
