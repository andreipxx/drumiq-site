import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import AuroraBg from '../components/AuroraBg';
import { acceptToS } from '../services/licenseManager';
import { FONT, SIZE, RADIUS } from '../constants/typography';

interface Props { onAccepted: () => void; }

export default function TermsScreen({ onAccepted }: Props) {
  const { colors, fontsLoaded: ff } = useTheme();
  const [checked, setChecked] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    await acceptToS();
    onAccepted();
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <AuroraBg />
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.title, { color: colors.text, fontFamily: ff ? FONT.displayXB : FONT.system }]}>Termeni și condiții</Text>
        <Text style={[s.version, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>Versiunea 1.0 · GO PAMPA S.R.L.</Text>

        <Section colors={colors} title="1. Neutralitate față de platforme terțe" ff={ff}>
          DRUMIQ este o aplicație independentă, neasociată și neafiliată cu Bolt Technology OÜ, Uber Technologies Inc. sau orice alt furnizor de servicii de transport. Toate mărcile menționate sunt proprietatea respectivelor companii.
        </Section>

        <Section colors={colors} title="2. Limitarea răspunderii" ff={ff}>
          Aplicația oferă informații analitice cu titlu orientativ. Decizia de a accepta sau refuza orice cursă aparține în întregime utilizatorului. DRUMIQ și GO PAMPA S.R.L. NU sunt răspunzători pentru: (a) blocarea, suspendarea sau dezactivarea contului utilizatorului pe platformele terțe, (b) pierderi financiare rezultate din decizii bazate pe analizele aplicației, (c) erori de parsare sau calcul, (d) modificări ale politicilor platformelor terțe care pot afecta funcționarea aplicației.
        </Section>

        <Section colors={colors} title="3. Utilizarea Accessibility Service" ff={ff}>
          Aplicația folosește Android Accessibility Service exclusiv pentru a citi text afișat pe ecran în scop de analiză locală pe dispozitivul utilizatorului. Nicio dată nu este transmisă către servere externe fără consimțământ explicit.
        </Section>

        <Section colors={colors} title="4. Termeni de utilizare" ff={ff}>
          Utilizatorul confirmă că folosirea aplicației nu încalcă termenii contractuali cu Bolt/Uber/alți operatori. Verificarea conformității cu acei termeni este responsabilitatea exclusivă a utilizatorului.
        </Section>

        <Section colors={colors} title="5. Politica de rambursare" ff={ff}>
          Pentru abonamente plătite, conform Directivei UE 2011/83/UE art. 16(m), prin activarea abonamentului utilizatorul renunță expres la dreptul de retragere de 14 zile prevăzut pentru servicii digitale livrate imediat.
        </Section>

        <Section colors={colors} title="6. Plafon de răspundere" ff={ff}>
          Răspunderea totală a GO PAMPA S.R.L. față de utilizator nu poate depăși suma plătită în ultimele 12 luni pentru abonamentul DRUMIQ.
        </Section>

        <Section colors={colors} title="7. Jurisdicție" ff={ff}>
          Orice litigiu se soluționează la instanțele competente din Baia Mare, România, conform legii române.
        </Section>

        <TouchableOpacity onPress={() => setChecked(!checked)} activeOpacity={0.7}
          style={[s.checkRow, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
          <View style={[s.box, { borderColor: checked ? colors.cyan : colors.border, backgroundColor: checked ? colors.cyan : 'transparent' }]}>
            {checked && <Text style={s.checkMark}>✓</Text>}
          </View>
          <Text style={[s.checkLabel, { color: colors.text }]}>Am citit și sunt de acord cu termenii și condițiile</Text>
        </TouchableOpacity>

        {checked ? (
          <TouchableOpacity onPress={handleAccept} activeOpacity={0.7}>
            <LinearGradient colors={colors.gradButton} start={{x:0,y:0}} end={{x:1,y:0}} style={[s.btn, { borderRadius: RADIUS.md }]}>
              <Text style={s.btnText}>Continuă la activare</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={[s.btn, { backgroundColor: colors.border, opacity: 0.5, borderRadius: RADIUS.md }]}>
            <Text style={s.btnText}>Continuă la activare</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ colors, title, children, ff }: { colors: any; title: string; children: React.ReactNode; ff: boolean }) {
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: colors.text, fontFamily: ff ? FONT.display : FONT.system }]}>{title}</Text>
      <Text style={[s.sectionBody, { color: colors.textSoft }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { padding: 20, paddingBottom: 40 },
  title:        { fontSize: SIZE['2xl'], fontWeight: '700', marginTop: 30 },
  version:      { fontSize: SIZE.base, marginBottom: 24 },
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: SIZE.lg, fontWeight: '700', marginBottom: 6 },
  sectionBody:  { fontSize: 14, lineHeight: 20 },
  checkRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.sm, padding: 14, marginTop: 16 },
  box:          { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkMark:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkLabel:   { flex: 1, fontSize: 14, lineHeight: 20 },
  btn:          { marginTop: 20, paddingVertical: 16, alignItems: 'center' },
  btnText:      { color: '#fff', fontSize: SIZE.lg, fontWeight: '700' },
});
