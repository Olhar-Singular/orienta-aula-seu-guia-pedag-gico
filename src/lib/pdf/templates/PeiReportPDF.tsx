import { View, Text, StyleSheet } from "@react-pdf/renderer";
import PDFDocument from "../components/PDFDocument";
import PDFSection from "../components/PDFSection";
import PDFTextBlock from "../components/PDFTextBlock";
import PDFTable from "../components/PDFTable";
import { colors, baseStyles } from "../styles";

const styles = StyleSheet.create({
  coverCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  studentName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.text,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 8,
    color: colors.muted,
    textAlign: "center",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 9,
    color: colors.text,
    width: "55%",
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#eee",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  barCount: {
    fontSize: 8,
    color: colors.muted,
    width: 24,
    textAlign: "right",
  },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  activityText: {
    fontSize: 10,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  activityDate: {
    fontSize: 9,
    color: colors.muted,
  },
});

const GOAL_STATUS: Record<string, string> = {
  pendente: "Pendente",
  em_progresso: "Em Progresso",
  atingida: "Atingida",
};

export type PeiGoalData = {
  area: string;
  description: string;
  deadline: string;
  status: string;
};

export type BarrierFreqData = {
  name: string;
  count: number;
};

export type DimensionData = {
  label: string;
  count: number;
  max: number;
};

export type StrategyData = {
  name: string;
  count: number;
};

export type ActivityData = {
  text: string;
  date: string;
};

export type PeiReportPDFProps = {
  studentName: string;
  className: string;
  registrationCode?: string;
  date: string;
  // Stats
  totalAdaptations: number;
  totalBarriers: number;
  totalStrategies: number;
  // PEI content
  goals: PeiGoalData[];
  studentProfile?: string;
  curricularAdaptations?: string;
  resourcesAndSupport?: string;
  pedagogicalStrategies?: string;
  reviewSchedule?: string;
  additionalNotes?: string;
  // Report data
  topBarriers: BarrierFreqData[];
  dimensions: DimensionData[];
  topStrategies: StrategyData[];
  recentActivities: ActivityData[];
};

export default function PeiReportPDF(props: PeiReportPDFProps) {
  return (
    <PDFDocument
      title={`Relatório PEI — ${props.studentName}`}
      headerParts={[props.studentName, props.className, props.date]}
    >
      {/* Cover / Header Card */}
      <View style={styles.coverCard}>
        <Text style={styles.studentName}>{props.studentName}</Text>
        <Text style={baseStyles.metaLine}>
          {props.className} · Matrícula: {props.registrationCode || "—"}
        </Text>
        <Text style={{ fontSize: 9, color: colors.muted, marginTop: 2 }}>
          Relatório gerado em {props.date}
        </Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{props.totalAdaptations}</Text>
          <Text style={styles.summaryLabel}>Adaptações realizadas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{props.totalBarriers}</Text>
          <Text style={styles.summaryLabel}>Barreiras identificadas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{props.totalStrategies}</Text>
          <Text style={styles.summaryLabel}>Estratégias utilizadas</Text>
        </View>
      </View>

      {/* Goals Table */}
      {props.goals.length > 0 && (
        <PDFSection title="Metas do PEI">
          <PDFTable
            columns={[
              { key: "area", header: "Área", width: "20%" },
              { key: "description", header: "Descrição", width: "40%" },
              { key: "deadline", header: "Prazo", width: "20%" },
              { key: "status", header: "Status", width: "20%" },
            ]}
            data={props.goals.map((g) => ({
              area: g.area,
              description: g.description,
              deadline: g.deadline,
              status: GOAL_STATUS[g.status] || g.status,
            }))}
          />
        </PDFSection>
      )}

      {/* PEI text sections - only show if content exists */}
      {props.studentProfile && (
        <PDFSection title="Perfil do Aluno">
          <PDFTextBlock text={props.studentProfile} />
        </PDFSection>
      )}

      {props.curricularAdaptations && (
        <PDFSection title="Adaptações Curriculares">
          <PDFTextBlock text={props.curricularAdaptations} />
        </PDFSection>
      )}

      {props.resourcesAndSupport && (
        <PDFSection title="Recursos e Apoios">
          <PDFTextBlock text={props.resourcesAndSupport} />
        </PDFSection>
      )}

      {props.pedagogicalStrategies && (
        <PDFSection title="Estratégias Pedagógicas">
          <PDFTextBlock text={props.pedagogicalStrategies} />
        </PDFSection>
      )}

      {props.reviewSchedule && (
        <PDFSection title="Acompanhamento e Revisão">
          <PDFTextBlock text={props.reviewSchedule} />
        </PDFSection>
      )}

      {props.additionalNotes && (
        <PDFSection title="Observações Adicionais">
          <PDFTextBlock text={props.additionalNotes} />
        </PDFSection>
      )}

      {/* Top Barriers as bar chart */}
      {props.topBarriers.length > 0 && (
        <PDFSection title="Barreiras mais frequentes">
          <View>
            {props.topBarriers.map((b, i) => (
              <View key={i} style={styles.barRow} wrap={false}>
                <Text style={styles.barLabel}>{b.name}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${(b.count / Math.max(...props.topBarriers.map((x) => x.count), 1)) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barCount}>{b.count}</Text>
              </View>
            ))}
          </View>
        </PDFSection>
      )}

      {/* Dimensions */}
      {props.dimensions.length > 0 && (
        <PDFSection title="Barreiras por dimensão">
          <View>
            {props.dimensions.map((d, i) => (
              <View key={i} style={styles.barRow} wrap={false}>
                <Text style={styles.barLabel}>{d.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(d.count / d.max) * 100}%` }]} />
                </View>
                <Text style={styles.barCount}>{d.count}</Text>
              </View>
            ))}
          </View>
        </PDFSection>
      )}

      {/* Top Strategies */}
      {props.topStrategies.length > 0 && (
        <PDFSection title="Estratégias mais utilizadas">
          <PDFTable
            columns={[
              { key: "name", header: "Estratégia", width: "80%" },
              { key: "count", header: "Freq.", width: "20%" },
            ]}
            data={props.topStrategies.map((s) => ({
              name: s.name,
              count: `${s.count}x`,
            }))}
          />
        </PDFSection>
      )}

      {/* Recent Activities */}
      {props.recentActivities.length > 0 && (
        <PDFSection title="Atividades adaptadas recentes">
          <View>
            {props.recentActivities.map((a, i) => (
              <View key={i} style={styles.activityRow} wrap={false}>
                <Text style={styles.activityText}>
                  {a.text.length > 80 ? a.text.slice(0, 80) + "…" : a.text}
                </Text>
                <Text style={styles.activityDate}>{a.date}</Text>
              </View>
            ))}
          </View>
        </PDFSection>
      )}
    </PDFDocument>
  );
}
