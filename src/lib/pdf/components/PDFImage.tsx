import { Image, View, StyleSheet } from "@react-pdf/renderer";
import { colors } from "../styles";

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  image: {
    maxHeight: 180,
    objectFit: "contain",
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
});

type Props = {
  urls: string[];
};

export default function PDFImage({ urls }: Props) {
  if (!urls || urls.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.grid}>
        {urls.map((url, i) => (
          <Image key={i} src={url} style={styles.image} />
        ))}
      </View>
    </View>
  );
}
