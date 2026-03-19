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
  imageSingle: {
    maxWidth: "100%",
    maxHeight: 260,
    objectFit: "contain",
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  imageMulti: {
    maxWidth: "48%",
    maxHeight: 200,
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
          <Image key={i} src={url} style={urls.length === 1 ? styles.imageSingle : styles.imageMulti} />
        ))}
      </View>
    </View>
  );
}
