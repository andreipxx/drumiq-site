// DRUMIQ v2.0.0 — Overlay Demo (Aurora theme)

import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import AuroraBg from '../components/AuroraBg';
import { FONT, SIZE, RADIUS, GAP } from '../constants/typography';
import { VERDICT_DISPLAY, type ProfitVerdict } from '../types';
import type { OverlayMode } from '../native/overlay';

interface Props {
  onOpenSettings: () => void;
  onOpenAccessibility: () => void;
}

interface DemoData {
  profitKm: string;
  profitMin: string;
  pickup: string;
  cursa: string;
  gross: string;
  durata: string;
  net: string;
  source: 'api' | 'fallback';
  daily: string;
  warning?: string;
  warningColor?: string;
}

const DEMO_DATA: Record<ProfitVerdict, DemoData> = {
  go: {
    profitKm: '4.68 / 5.2 lei/km', profitMin: '2.34 RON/min',
    pickup: '1.5 km / 2 min', cursa: '2.0 km / 2 min',
    gross: '31.12 lei', durata: '4 min', net: '+9.36 lei',
    source: 'api', daily: '247/300 lei',
  },
  think: {
    profitKm: '2.10 / 3.0 lei/km', profitMin: '1.20 RON/min',
    pickup: '2.3 km / 5 min', cursa: '~2.0 km',
    gross: '15.15 lei', durata: '7 min', net: '+8.40 lei',
    source: 'fallback', daily: '247/300 lei',
    warning: 'Cerere mare 1.2x', warningColor: '#f59e0b',
  },
  stop: {
    profitKm: '0.07 / 0.9 lei/km', profitMin: '0.05 RON/min',
    pickup: '1.5 km / 2 min', cursa: '11.0 km / 15 min',
    gross: '9.75 lei', durata: '17 min', net: '+0.85 lei',
    source: 'api', daily: '247/300 lei',
    warning: 'Pickup 1.5km > prag', warningColor: '#ef4444',
  },
};

/* ── Section label ── */
function SectionLabel({ text, colors, ff }: { text: string; colors: any; ff: boolean }) {
  return (
    <View style={st.sectionRow}>
      <Text style={[st.sectionText, {
        color: colors.textMuted,
        fontFamily: ff ? FONT.mono : FONT.systemMono,
      }]}>
        {'// '}{text}
      </Text>
      <LinearGradient
        colors={colors.gradPrimary}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={st.sectionLine}
      />
    </View>
  );
}

export default function OverlayScreen({ onOpenSettings, onOpenAccessibility }: Props) {
  const { colors, fontsLoaded: ff } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<OverlayMode>('full');
  const [verdict, setVerdict] = useState<ProfitVerdict>('go');

  const data = DEMO_DATA[verdict];

  return (
    <View style={[st.root, { backgroundColor: colors.bg }]}>
      <AuroraBg />
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onOpenSettings} style={st.headerBtn}>
          <Text style={[st.backTxt, {
            color: colors.cyan,
            fontFamily: ff ? FONT.bodySB : FONT.system,
          }]}>‹ Inapoi</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[st.title, {
            color: colors.text,
            fontFamily: ff ? FONT.display : FONT.system,
          }]}>
            Overlay{' '}
            <Text style={{ fontFamily: ff ? FONT.serifItalic : FONT.system, color: colors.cyan }}>
              demo
            </Text>
          </Text>
          <Text style={[st.sub, {
            color: colors.textMuted,
            fontFamily: ff ? FONT.mono : FONT.systemMono,
          }]}>{'// preview interactiv'}</Text>
        </View>
        <View style={st.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* Info card */}
        <View style={[st.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <View style={[st.infoIcon, { backgroundColor: colors.cyan + '22', borderColor: colors.cyan + '44' }]}>
            <Text style={{ fontSize: 14, color: colors.cyan }}>ℹ</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.infoTitle, {
              color: colors.text,
              fontFamily: ff ? FONT.bodySB : FONT.system,
            }]}>Cum funcționează overlay-ul?</Text>
            <Text style={[st.infoDesc, {
              color: colors.textMuted,
              fontFamily: ff ? FONT.mono : FONT.systemMono,
            }]}>Când Bolt afișează o cursă, DRUMIQ analizează și suprapune verdictul.</Text>
          </View>
        </View>

        {/* Bolt mock — intentionally hardcoded colors */}
        <View style={st.boltMock}>
          <View style={st.boltRefuza}>
            <Text style={st.boltRefuzaTxt}>✕ Refuza</Text>
          </View>

          <View style={st.overlayWrap}>
            {mode === 'simple' ? (
              <SimpleOverlay verdict={verdict} data={data} ff={ff} />
            ) : (
              <ProOverlay verdict={verdict} data={data} ff={ff} />
            )}
          </View>

          <View style={st.boltCard}>
            <View style={st.boltTags}>
              <View style={[st.boltTag, { backgroundColor: '#f0f0f0' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#333' }}>Bolt</Text>
              </View>
              <View style={[st.boltTag, { backgroundColor: '#d8f3dc' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#1b6e3a' }}>$ Numerar</Text>
              </View>
              {verdict === 'stop' && (
                <View style={[st.boltTag, { backgroundColor: '#f8d7da' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#721c24' }}>In afara razei</Text>
                </View>
              )}
            </View>
            <Text style={st.boltPrice}>{data.gross} <Text style={{ fontSize: 11, color: '#555', fontWeight: '500' }}>(NET, taxe incluse)</Text></Text>
            <Text style={st.boltInfo}>Respingerea nu va afecta rata de acceptare</Text>
            <Text style={st.boltPass}>Marcu · 5.0 ★</Text>
            <Text style={st.boltRoute}>{data.pickup}{'\n'}Spitalul Judetean Baia Mare</Text>
            <View style={st.boltAccept}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>Accepta</Text>
            </View>
          </View>
        </View>

        {/* Mode toggle */}
        <SectionLabel text="Mod overlay" colors={colors} ff={ff} />
        <View style={[st.modeRow, { backgroundColor: colors.bgInput, borderColor: colors.borderSoft }]}>
          {(['simple', 'full'] as OverlayMode[]).map((m) => {
            const active = mode === m;
            const label = m === 'simple' ? 'SIMPLU' : 'PRO';
            const desc = m === 'simple' ? 'mini-card' : 'card detaliat';
            if (active) {
              return (
                <TouchableOpacity key={m} style={{ flex: 1 }} onPress={() => setMode(m)} activeOpacity={0.8}>
                  <LinearGradient
                    colors={colors.gradButton}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={st.modeBtn}
                  >
                    <Text style={[st.modeBtnTxt, { color: '#fff', fontFamily: ff ? FONT.displayXB : FONT.system }]}>{label}</Text>
                    <Text style={[st.modeBtnSub, { color: 'rgba(255,255,255,0.8)', fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{desc}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={m} style={[st.modeBtn, { flex: 1 }]} onPress={() => setMode(m)} activeOpacity={0.7}>
                <Text style={[st.modeBtnTxt, { color: colors.textMuted, fontFamily: ff ? FONT.displayXB : FONT.system }]}>{label}</Text>
                <Text style={[st.modeBtnSub, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Verdict tabs */}
        <SectionLabel text="Verdict · alege scenariu" colors={colors} ff={ff} />
        <View style={st.verdictRow}>
          {(['go', 'think', 'stop'] as ProfitVerdict[]).map((vk) => {
            const vd = VERDICT_DISPLAY[vk];
            const active = verdict === vk;
            const verdictColor = vk === 'go' ? colors.go : vk === 'think' ? colors.think : colors.stop;
            return (
              <TouchableOpacity
                key={vk}
                style={[
                  st.verdictBtn,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: active ? colors.cyan : colors.borderSoft,
                    borderWidth: active ? 2 : 1,
                  },
                ]}
                onPress={() => setVerdict(vk)}
              >
                <View style={[st.verdictIcon, {
                  backgroundColor: verdictColor,
                  shadowColor: verdictColor,
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                  elevation: 6,
                }]}>
                  <Text style={[st.verdictSym, {
                    color: vk === 'stop' ? '#fff' : '#000',
                    fontFamily: ff ? FONT.displayXB : FONT.system,
                  }]}>{vd.symbol}</Text>
                </View>
                <Text style={[st.verdictLbl, {
                  color: active ? colors.text : colors.textMuted,
                  fontFamily: ff ? FONT.monoBold : FONT.systemMono,
                }]}>{vd.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Educational tips */}
        <SectionLabel text="Cum citești cardul" colors={colors} ff={ff} />
        {[
          { sym: '$', color: colors.go, title: 'Verde · GO', desc: 'Profit/km peste pragul tău. Acceptă fără ezitare.' },
          { sym: '?', color: colors.think, title: 'Galben · THINK', desc: 'În zona galbenă. Verifică pickup-ul și locația.' },
          { sym: '✕', color: colors.stop, title: 'Roșu · STOP', desc: 'Sub pragul minim SAU filtru dur încălcat.' },
        ].map((tip) => (
          <View key={tip.sym} style={[st.tipCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
            <View style={[st.tipIcon, { backgroundColor: tip.color + '22' }]}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: tip.color }}>{tip.sym}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.tipTitle, {
                color: colors.text,
                fontFamily: ff ? FONT.bodySB : FONT.system,
              }]}>{tip.title}</Text>
              <Text style={[st.tipDesc, {
                color: colors.textMuted,
                fontFamily: ff ? FONT.mono : FONT.systemMono,
              }]}>{tip.desc}</Text>
            </View>
          </View>
        ))}

        {/* Diagnostic */}
        <TouchableOpacity onPress={onOpenAccessibility} style={[st.diagBtn, { borderColor: colors.borderSoft }]}>
          <Text style={[st.diagTxt, {
            color: colors.textMuted,
            fontFamily: ff ? FONT.mono : FONT.systemMono,
          }]}>ACCESSIBILITY DIAGNOSTIC</Text>
        </TouchableOpacity>

        {/* Note */}
        <View style={[st.noteCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSoft }]}>
          <Text style={[st.note, {
            color: colors.textMuted,
            fontFamily: ff ? FONT.mono : FONT.systemMono,
          }]}>
            ⚙ <Text style={{ color: colors.cyan }}>Acesta este doar un preview.</Text>{'\n'}
            În condusul real, overlay-ul apare automat peste Bolt.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

/* ═══ OVERLAY CARDS — hardcoded dark (simulates real overlay) ═══ */

function SimpleOverlay({ verdict, data, ff }: { verdict: ProfitVerdict; data: DemoData; ff: boolean }) {
  const v = VERDICT_DISPLAY[verdict];
  return (
    <View style={[sov.cardOuter, { width: 180 }]}>
      <View style={[sov.card, { backgroundColor: 'rgba(8,4,20,0.94)' }]}>
        <LinearGradient
          colors={verdict === 'go' ? ['#10b981', '#06b6d4'] as [string, string] : verdict === 'think' ? ['#f59e0b', '#fbbf24'] as [string, string] : ['#ef4444', '#ec4899'] as [string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={sov.colorBar}
        />
        <View style={sov.cardBody}>
          <View style={sov.verdictRow}>
            <View style={[sov.symbolCircle, { backgroundColor: v.color, shadowColor: v.color, shadowOpacity: 0.8, shadowRadius: 12, elevation: 10 }]}>
              <Text style={[sov.symbolTxt, { fontFamily: ff ? FONT.displayXB : FONT.system }]}>{v.symbol}</Text>
            </View>
            <Text style={[sov.heroNetSimple, { color: v.color, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>{data.net}</Text>
          </View>
          <Text style={[sov.profitKmSub, { color: v.color, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>{data.profitKm}</Text>
          <Text style={[sov.daily, { color: '#f59e0b', fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>AZI: {data.daily}</Text>
        </View>
      </View>
    </View>
  );
}

function ProOverlay({ verdict, data, ff }: { verdict: ProfitVerdict; data: DemoData; ff: boolean }) {
  const v = VERDICT_DISPLAY[verdict];
  return (
    <View style={[sov.cardOuter, { width: 234 }]}>
      <View style={[sov.cardPro, { backgroundColor: 'rgba(8,4,20,0.94)' }]}>
        <LinearGradient
          colors={verdict === 'go' ? ['#10b981', '#06b6d4'] as [string, string] : verdict === 'think' ? ['#f59e0b', '#fbbf24'] as [string, string] : ['#ef4444', '#ec4899'] as [string, string]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={sov.colorBar}
        />
        <View style={sov.proBody}>
          <View style={sov.verdictRow}>
            <View style={[sov.symbolCirclePro, { backgroundColor: v.color, shadowColor: v.color, shadowOpacity: 0.8, shadowRadius: 14, elevation: 12 }]}>
              <Text style={[sov.symbolTxtPro, { fontFamily: ff ? FONT.displayXB : FONT.system }]}>{v.symbol}</Text>
            </View>
            <Text style={[sov.heroNet, { color: v.color, fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>{data.net}</Text>
          </View>

          <View style={[sov.divider, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

          <View style={sov.statsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[sov.statLbl, { fontFamily: ff ? FONT.mono : FONT.systemMono }]}>PICKUP</Text>
              <Text style={[sov.statVal, { fontFamily: ff ? FONT.monoMd : FONT.systemMono }]}>{data.pickup}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sov.statLbl, { fontFamily: ff ? FONT.mono : FONT.systemMono }]}>CURSA</Text>
              <Text style={[sov.statVal, { fontFamily: ff ? FONT.monoMd : FONT.systemMono }]}>{data.cursa}</Text>
            </View>
          </View>
          <View style={sov.statsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[sov.statLbl, { fontFamily: ff ? FONT.mono : FONT.systemMono }]}>DURATA</Text>
              <Text style={[sov.statVal, { fontFamily: ff ? FONT.monoMd : FONT.systemMono }]}>{data.durata}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sov.statLbl, { fontFamily: ff ? FONT.mono : FONT.systemMono }]}>NET</Text>
              <Text style={[sov.statVal, { fontFamily: ff ? FONT.monoMd : FONT.systemMono }]}>{data.gross}</Text>
            </View>
          </View>

          <View style={[sov.divider, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />

          <View style={sov.statsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[sov.statLbl, { fontFamily: ff ? FONT.mono : FONT.systemMono }]}>PROFIT/KM</Text>
              <Text style={[sov.statVal, { color: v.color, fontFamily: ff ? FONT.monoMd : FONT.systemMono }]}>{data.profitKm}</Text>
            </View>
          </View>
          <View style={sov.statsRow}>
            <View style={{ flex: 1 }}>
              <Text style={[sov.statLbl, { fontFamily: ff ? FONT.mono : FONT.systemMono }]}>PROFIT/MIN</Text>
              <Text style={[sov.statVal, { color: v.color, fontFamily: ff ? FONT.monoMd : FONT.systemMono }]}>{data.profitMin}</Text>
            </View>
          </View>

          <View style={[sov.divider, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
          <View style={sov.sourceRow}>
            <Text style={[sov.daily, { color: '#f59e0b', fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>AZI: {data.daily}</Text>
            <Text style={[sov.proSrc, {
              color: data.source === 'api' ? '#10b981' : '#7A8A7C',
              fontFamily: ff ? FONT.mono : FONT.systemMono,
            }]}>
              {data.source === 'api' ? '✓ Google trafic real' : '~ estimat'}
            </Text>
          </View>

          {data.warning && (
            <View style={[sov.warningStrip, { backgroundColor: (data.warningColor || '#f59e0b') + '1A', borderColor: (data.warningColor || '#f59e0b') + '44' }]}>
              <Text style={[sov.warningTxt, { color: data.warningColor || '#f59e0b', fontFamily: ff ? FONT.monoBold : FONT.systemMono }]}>{data.warning}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/* ═══ STYLES ═══ */

const st = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8, zIndex: 2 },
  headerBtn: { width: 70 },
  backTxt:   { fontSize: SIZE.lg },
  title:     { fontSize: SIZE.xl, letterSpacing: -0.5 },
  sub:       { fontSize: SIZE.xs, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // Section label
  sectionRow:  { flexDirection: 'row', alignItems: 'center', marginTop: GAP.xl, marginBottom: GAP.sm, gap: 10 },
  sectionText: { fontSize: SIZE.xs, letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: 1, borderRadius: 1, opacity: 0.4 },

  // Info card
  infoCard:  { flexDirection: 'row', padding: 14, gap: 12, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: GAP.lg, alignItems: 'flex-start' },
  infoIcon:  { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  infoTitle: { fontSize: SIZE.base, marginBottom: 4 },
  infoDesc:  { fontSize: SIZE.xs, letterSpacing: 2, lineHeight: 15 },

  // Bolt mock — intentionally hardcoded
  boltMock: {
    backgroundColor: '#f5f5f5',
    borderRadius: RADIUS.lg,
    minHeight: 460,
    position: 'relative',
    overflow: 'hidden',
  },
  boltRefuza: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, zIndex: 5,
  },
  boltRefuzaTxt: { color: 'white', fontSize: 12, fontWeight: '600' },
  overlayWrap: { position: 'absolute', top: 16, left: 16, zIndex: 10 },
  boltCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: 14, paddingBottom: 60,
    borderTopWidth: 3, borderTopColor: '#00B85F',
  },
  boltTags:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  boltTag:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  boltPrice: { fontSize: 18, fontWeight: '800', color: '#111' },
  boltInfo:  { fontSize: 11, color: '#888', marginTop: 4, marginBottom: 6 },
  boltPass:  { fontSize: 11, color: '#444' },
  boltRoute: { fontSize: 11, color: '#555', marginTop: 4, lineHeight: 16 },
  boltAccept: { position: 'absolute', bottom: 12, left: 14, right: 14, backgroundColor: '#00B85F', padding: 12, borderRadius: 22, alignItems: 'center' },

  // Mode toggle
  modeRow: { flexDirection: 'row', gap: 4, borderRadius: RADIUS.md, borderWidth: 1, padding: 4 },
  modeBtn: { padding: 14, borderRadius: RADIUS.sm, alignItems: 'center' },
  modeBtnTxt: { fontSize: SIZE.base, letterSpacing: 2 },
  modeBtnSub: { fontSize: SIZE.xs, letterSpacing: 0.5, marginTop: 2 },

  // Verdict tabs
  verdictRow: { flexDirection: 'row', gap: 8 },
  verdictBtn: { flex: 1, padding: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  verdictIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  verdictSym: { fontSize: 14 },
  verdictLbl: { fontSize: SIZE.xs, letterSpacing: 1 },

  // Tip cards
  tipCard:  { flexDirection: 'row', padding: 12, gap: 10, borderRadius: RADIUS.md, borderWidth: 1, marginBottom: GAP.sm, alignItems: 'flex-start' },
  tipIcon:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: SIZE.base, marginBottom: 2 },
  tipDesc:  { fontSize: SIZE.xs, letterSpacing: 2, lineHeight: 14 },

  // Diagnostic
  diagBtn: { padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: GAP.lg },
  diagTxt: { fontSize: SIZE.sm, letterSpacing: 1.5 },

  // Note
  noteCard: { borderRadius: RADIUS.md, borderWidth: 1, borderStyle: 'dashed', padding: 14, marginTop: GAP.xl },
  note: { fontSize: SIZE.xs, textAlign: 'center', lineHeight: 16, letterSpacing: 0.5 },
});

const sov = StyleSheet.create({
  cardOuter: {
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }, elevation: 20,
  },
  card:     { borderRadius: 16, overflow: 'hidden' },
  cardPro:  { borderRadius: 16, overflow: 'hidden' },
  colorBar: { height: 3, width: '100%' },
  cardBody: { padding: 10, paddingTop: 8 },
  proBody:  { padding: 14, paddingTop: 10 },
  verdictRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  symbolCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  symbolCirclePro: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  symbolTxt:    { fontSize: 20, fontWeight: '900', color: '#000' },
  symbolTxtPro: { fontSize: 26, fontWeight: '900', color: '#000' },
  heroNetSimple: { fontSize: 15, marginLeft: 10, flex: 1 },
  profitKmSub: { fontSize: 10, marginTop: 2, marginBottom: 4 },
  heroNet: { fontSize: 20, marginLeft: 12, flex: 1 },
  daily: { fontSize: 10 },
  divider: { height: 1, marginVertical: 7 },
  statsRow: { flexDirection: 'row', marginVertical: 4 },
  statLbl: { fontSize: 8, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 },
  statVal: { fontSize: 12, color: '#E8FFE8', marginTop: 2 },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proSrc: { fontSize: 9 },
  warningStrip: {
    marginTop: 8, paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1, alignItems: 'center',
  },
  warningTxt: { fontSize: 10, letterSpacing: 2 },
});
