import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { VERDICT_DISPLAY, type ProfitVerdict } from '../types';
import type { OverlayMode } from '../native/overlay';

interface Props {
  onOpenSettings: () => void;
  onOpenAccessibility: () => void;
}

interface DemoData {
  ppkm: string;
  pickup: string;
  cursa: string;
  enc: string;
  durata: string;
  profit: string;
  net: string;
  source: 'api' | 'fallback';
  daily: string;
  warning?: string;
  warningColor?: string;
}

const DEMO_DATA: Record<ProfitVerdict, DemoData> = {
  go: {
    ppkm: '4.68 RON/km', pickup: '1.5 km / 2 min', cursa: '2.0 km / 2 min',
    enc: '31.12 lei', durata: '4 min', profit: '9.36 lei', net: '+9.36 lei',
    source: 'api', daily: '247/300 lei',
  },
  think: {
    ppkm: '2.10 RON/km', pickup: '2.3 km / 5 min', cursa: '~2.0 km',
    enc: '15.15 lei', durata: '7 min', profit: '8.40 lei', net: '+8.40 lei',
    source: 'fallback', daily: '247/300 lei',
    warning: 'Cerere mare 1.2x', warningColor: '#FFB800',
  },
  stop: {
    ppkm: '0.07 RON/km', pickup: '1.5 km / 2 min', cursa: '11.0 km / 15 min',
    enc: '9.75 lei', durata: '17 min', profit: '0.85 lei', net: '+0.85 lei',
    source: 'api', daily: '247/300 lei',
    warning: 'Pickup 1.5km > prag', warningColor: '#FF3366',
  },
};

export default function OverlayScreen({ onOpenSettings, onOpenAccessibility }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<OverlayMode>('full');
  const [verdict, setVerdict] = useState<ProfitVerdict>('go');

  const data = DEMO_DATA[verdict];

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onOpenSettings} style={s.headerBtn}>
          <Text style={[s.backTxt, { color: colors.accent }]}>‹ Inapoi</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[s.title, { color: colors.text }]}>OVERLAY DEMO</Text>
          <Text style={[s.sub, { color: colors.textMuted }]}>preview interactiv</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        <View style={s.boltMock}>
          <View style={s.boltRefuza}>
            <Text style={s.boltRefuzaTxt}>✕ Refuza</Text>
          </View>

          <View style={s.overlayWrap}>
            {mode === 'simple' ? (
              <SimpleOverlay verdict={verdict} data={data} />
            ) : (
              <ProOverlay verdict={verdict} data={data} />
            )}
          </View>

          <View style={s.boltCard}>
            <View style={s.boltTags}>
              <View style={[s.boltTag, { backgroundColor: '#f0f0f0' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#333' }}>Bolt</Text>
              </View>
              <View style={[s.boltTag, { backgroundColor: '#d8f3dc' }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#1b6e3a' }}>$ Numerar</Text>
              </View>
              {verdict === 'stop' && (
                <View style={[s.boltTag, { backgroundColor: '#f8d7da' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#721c24' }}>In afara razei</Text>
                </View>
              )}
            </View>
            <Text style={s.boltPrice}>{data.enc} <Text style={{ fontSize: 11, color: '#555', fontWeight: '500' }}>(NET, taxe incluse)</Text></Text>
            <Text style={s.boltInfo}>Respingerea nu va afecta rata de acceptare</Text>
            <Text style={s.boltPass}>Marcu · 5.0 ★</Text>
            <Text style={s.boltRoute}>{data.pickup}{'\n'}Spitalul Judetean Baia Mare</Text>
            <View style={s.boltAccept}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>Accepta</Text>
            </View>
          </View>
        </View>

        <Text style={[s.label, { color: colors.textMuted }]}>MOD OVERLAY</Text>
        <View style={s.modeRow}>
          <TouchableOpacity
            style={[
              s.modeBtn,
              { backgroundColor: mode === 'simple' ? colors.accent : colors.surface, borderColor: mode === 'simple' ? colors.accent : colors.border },
            ]}
            onPress={() => setMode('simple')}
          >
            <Text style={[s.modeBtnTxt, { color: mode === 'simple' ? '#000' : colors.text }]}>SIMPLU</Text>
            <Text style={[s.modeBtnSub, { color: mode === 'simple' ? '#000' : colors.textMuted }]}>mini-card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              s.modeBtn,
              { backgroundColor: mode === 'full' ? colors.accent : colors.surface, borderColor: mode === 'full' ? colors.accent : colors.border },
            ]}
            onPress={() => setMode('full')}
          >
            <Text style={[s.modeBtnTxt, { color: mode === 'full' ? '#000' : colors.text }]}>PRO</Text>
            <Text style={[s.modeBtnSub, { color: mode === 'full' ? '#000' : colors.textMuted }]}>card detaliat</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.label, { color: colors.textMuted }]}>VERDICT</Text>
        <View style={s.verdictRow}>
          {(['go', 'think', 'stop'] as ProfitVerdict[]).map((vk) => {
            const vd = VERDICT_DISPLAY[vk];
            const active = verdict === vk;
            // GO = green bg always, Gandeste = yellow border, Refuza = red border
            const isGo = vk === 'go';
            return (
              <TouchableOpacity
                key={vk}
                style={[
                  s.verdictBtn,
                  {
                    backgroundColor: active
                      ? vd.color
                      : isGo
                        ? vd.color + '22'
                        : colors.surface,
                    borderColor: vd.color,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setVerdict(vk)}
              >
                <Text style={[s.verdictSym, { color: active ? '#000' : vd.color }]}>{vd.symbol}</Text>
                <Text style={[s.verdictLbl, { color: active ? '#000' : vd.color }]}>{vd.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={onOpenAccessibility} style={[s.diagBtn, { borderColor: colors.border }]}>
          <Text style={[s.diagTxt, { color: colors.textMuted }]}>ACCESSIBILITY DIAGNOSTIC</Text>
        </TouchableOpacity>

        <Text style={[s.note, { color: colors.textDim }]}>
          Acesta este doar un preview.{'\n'}
          In condusul real, overlay-ul apare automat peste Bolt.
        </Text>

      </ScrollView>
    </View>
  );
}

function SimpleOverlay({ verdict, data }: { verdict: ProfitVerdict; data: DemoData }) {
  const v = VERDICT_DISPLAY[verdict];
  return (
    <View style={[sov.cardOuter, { width: 180 }]}>
      <View style={[sov.card, { backgroundColor: 'rgba(10,14,11,0.96)' }]}>
        <View style={[sov.colorBar, { backgroundColor: v.color }]} />
        <View style={sov.cardBody}>
          <View style={sov.verdictRow}>
            <View style={[sov.symbolCircle, { backgroundColor: v.color, shadowColor: v.color, shadowOpacity: 0.8, shadowRadius: 12, elevation: 10 }]}>
              <Text style={sov.symbolTxt}>{v.symbol}</Text>
            </View>
            <Text style={[sov.ppkmSimple, { color: v.color }]}>{data.ppkm}</Text>
          </View>
          <Text style={[sov.daily, { color: '#FFB800' }]}>AZI: {data.daily}</Text>
        </View>
      </View>
    </View>
  );
}

function ProOverlay({ verdict, data }: { verdict: ProfitVerdict; data: DemoData }) {
  const v = VERDICT_DISPLAY[verdict];
  return (
    <View style={[sov.cardOuter, { width: 234 }]}>
      <View style={[sov.cardPro, { backgroundColor: 'rgba(10,14,11,0.96)' }]}>
        <View style={[sov.colorBar, { backgroundColor: v.color }]} />
        <View style={sov.proBody}>
          {/* Verdict + profit/km */}
          <View style={sov.verdictRow}>
            <View style={[sov.symbolCirclePro, { backgroundColor: v.color, shadowColor: v.color, shadowOpacity: 0.8, shadowRadius: 14, elevation: 12 }]}>
              <Text style={sov.symbolTxtPro}>{v.symbol}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={sov.proLbl}>PROFIT/KM</Text>
              <Text style={[sov.proPpkm, { color: v.color }]}>{data.ppkm}</Text>
            </View>
          </View>

          <View style={[sov.divider, { backgroundColor: '#1E2A1F' }]} />

          {/* Metric rows */}
          <View style={sov.statsRow}>
            <View style={{ flex: 1 }}>
              <Text style={sov.statLbl}>PICKUP</Text>
              <Text style={sov.statVal}>{data.pickup}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sov.statLbl}>CURSA</Text>
              <Text style={sov.statVal}>{data.cursa}</Text>
            </View>
          </View>
          <View style={sov.statsRow}>
            <View style={{ flex: 1 }}>
              <Text style={sov.statLbl}>INCASARE</Text>
              <Text style={sov.statVal}>{data.enc}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sov.statLbl}>DURATA</Text>
              <Text style={sov.statVal}>{data.durata}</Text>
            </View>
          </View>

          {/* Profit line */}
          <View style={[sov.divider, { backgroundColor: '#1E2A1F' }]} />
          <View style={sov.profitRow}>
            <Text style={sov.profitLbl}>IN BUZUNAR</Text>
            <Text style={[sov.profitVal, { color: v.color }]}>{data.net}</Text>
          </View>

          {/* Source + daily */}
          <View style={[sov.divider, { backgroundColor: '#1E2A1F' }]} />
          <View style={sov.sourceRow}>
            <Text style={[sov.proSrc, { color: data.source === 'api' ? '#00FF88' : '#7A8A7C' }]}>
              {data.source === 'api' ? '✓ Google trafic real' : '~ estimat'}
            </Text>
            <Text style={[sov.daily, { color: '#FFB800' }]}>AZI: {data.daily}</Text>
          </View>

          {/* Warning strip */}
          {data.warning && (
            <View style={[sov.warningStrip, { backgroundColor: (data.warningColor || '#FFB800') + '1A', borderColor: (data.warningColor || '#FFB800') + '44' }]}>
              <Text style={[sov.warningTxt, { color: data.warningColor || '#FFB800' }]}>{data.warning}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  headerBtn: { width: 70 },
  backTxt: { fontSize: 15, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  sub: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },

  // Bolt mock colors are intentionally hardcoded to simulate the Bolt app UI,
  // regardless of DrumIQ theme. The overlay (sov) is also always dark by design.
  boltMock: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    minHeight: 460,
    position: 'relative',
    marginBottom: 24,
    overflow: 'hidden',
  },
  boltRefuza: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 5,
  },
  boltRefuzaTxt: { color: 'white', fontSize: 12, fontWeight: '600' },
  overlayWrap: { position: 'absolute', top: 16, left: 16, zIndex: 10 },

  boltCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 14,
    paddingBottom: 60,
    borderTopWidth: 3,
    borderTopColor: '#00B85F',
  },
  boltTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  boltTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  boltPrice: { fontSize: 18, fontWeight: '800', color: '#111' },
  boltInfo: { fontSize: 11, color: '#888', marginTop: 4, marginBottom: 6 },
  boltPass: { fontSize: 11, color: '#444' },
  boltRoute: { fontSize: 11, color: '#555', marginTop: 4, lineHeight: 16 },
  boltAccept: { position: 'absolute', bottom: 12, left: 14, right: 14, backgroundColor: '#00B85F', padding: 12, borderRadius: 22, alignItems: 'center' },

  label: { fontSize: 10, letterSpacing: 2.5, fontWeight: '900', marginTop: 8, marginBottom: 8 },

  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  modeBtnTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  modeBtnSub: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },

  verdictRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  verdictBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  verdictSym: { fontSize: 22, fontWeight: '900' },
  verdictLbl: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 1 },

  diagBtn: { padding: 14, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  diagTxt: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  note: { fontSize: 10, textAlign: 'center', marginTop: 24, lineHeight: 14, fontStyle: 'italic' },
});

const sov = StyleSheet.create({
  cardOuter: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardPro: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  colorBar: { height: 4, width: '100%' },
  cardBody: { padding: 10, paddingTop: 8 },
  proBody: { padding: 14, paddingTop: 10 },
  verdictRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  symbolCircle: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  symbolCirclePro: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  symbolTxt: { fontSize: 20, fontWeight: '900', color: '#000' },
  symbolTxtPro: { fontSize: 26, fontWeight: '900', color: '#000' },
  ppkmSimple: { fontSize: 15, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginLeft: 10, flex: 1 },
  proLbl: { fontSize: 9, color: '#7A8A7C', fontWeight: '700', letterSpacing: 1.5 },
  proPpkm: { fontSize: 20, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  daily: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '700' },
  divider: { height: 1, marginVertical: 7 },
  statsRow: { flexDirection: 'row', marginVertical: 4 },
  statLbl: { fontSize: 8, color: '#5A6B5C', fontWeight: '700', letterSpacing: 1.2 },
  statVal: { fontSize: 12, color: '#E8FFE8', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600', marginTop: 2 },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  profitLbl: { fontSize: 9, color: '#7A8A7C', fontWeight: '800', letterSpacing: 1.5 },
  profitVal: { fontSize: 16, fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proSrc: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  warningStrip: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  warningTxt: { fontSize: 10, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 0.5 },
});
