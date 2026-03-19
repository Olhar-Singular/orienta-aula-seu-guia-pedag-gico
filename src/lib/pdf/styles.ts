import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  primary: "#0d7377",
  primaryLight: "#0d737722",
  text: "#333333",
  muted: "#666666",
  caption: "#999999",
  border: "#e5e5e5",
  background: "#ffffff",
  sectionBg: "#f8fafb",
};

export const spacing = {
  page: { top: 40, bottom: 50, left: 40, right: 40 },
  section: 14,
  paragraph: 6,
};

export const baseStyles = StyleSheet.create({
  page: {
    paddingTop: spacing.page.top,
    paddingBottom: spacing.page.bottom,
    paddingHorizontal: spacing.page.left,
    backgroundColor: colors.background,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.text,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: colors.text,
  },
  heading: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primaryLight,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.text,
  },
  caption: {
    fontSize: 9,
    color: colors.caption,
    fontStyle: "italic",
  },
  metaLine: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
  },
  sectionWrapper: {
    marginBottom: spacing.section,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
});
