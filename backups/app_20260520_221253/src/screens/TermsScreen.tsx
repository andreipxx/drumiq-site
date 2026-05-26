import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { acceptToS } from '../services/licenseManager';

interface Props { onAccepted: () => void; }

export default function TermsScreen({ onAccepted }: Props) {
  const { colors, isDark } = useTheme();
  const [checked, setChecked] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    await acceptToS();
    onAccepted();
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={[s.title, { color: colors.text }]}>Termeni și condiții</Text>
        <Text style={[s.version, { color: colors.textTertiary }]}>Versiunea 1.0 · GO PAMPA S.R.L.</Text>

        <Section colors={colors} title="1. Neutralitate față de platforme terțe">
          DRUMIQ este o aplicație independentă, neasociată și neafiliată cu Bolt Technology OÜ, Uber Technologies Inc. sau orice alt furnizor de servicii de transport. Toate mărcile menționate sunt proprietatea respectivelor companii.
        </Section>

        <Section colors={colors} title="2. Limitarea răspunderii">
          Aplicația oferă informații analitice cu titlu orientativ. Decizia de a accepta sau refuza orice cursă aparține în întregime utilizatorului. DRUMIQ și GO PAMPA S.R.L. NU sunt răspunzători pentru: (a) blocarea, suspendarea sau dezactivarea contului utilizatorului pe platformele terțe, (b) pierderi financiare rezultate din decizii bazate pe analizele aplicației, (c) erori de parsare sau calcul, (d) modificări ale politicilor platformelor terțe care pot afecta funcționarea aplicației.
        </Section>

        <Section colors={colors} title="3. Utilizarea Accessibility Service">
          Aplicația folosește Android Accessibility Service exclusiv pentru a citi text afișat pe ecran în scop de analiză locală pe dispozitivul utilizatorului. Nicio dată nu este transmisă către servere externe fără consimțământ explicit.
        </Section>

        <Section colors={colors} title="4. Termeni de utilizare">
          Utilizatorul confirmă că folosirea aplicației nu încalcă termenii contractuali cu Bolt/Uber/alți operatori. Verificarea conformității cu acei termeni este responsabilitatea exclusivă a utilizatorului.
        </Section>

        <Section colors={colors} title="5. Politica de rambursare">
          Pentru abonamente plătite, conform Directivei UE 2011/83/UE art. 16(m), prin activarea abonamentului utilizatorul renunță expres la dreptul de retragere de 14 zile prevăzut pentru servicii digitale livrate imediat.
        </Section>

        <Section colors={colors} title="6. Plafon de răspundere">
          Răspunderea totală a GO PAMPA S.R.L. față de utilizator nu poate depăși suma plătită în ultimele 12 luni pentru abonamentul DRUMIQ.
        </Section>

        <Section colors={colors} title="7. Jurisdicție">
          Orice litigiu se soluționează la instanțele competente din Baia Mare, România, conform legii române.
        </Section>

        <TouchableOpacity onPress={() => setChecked(!checked)} activeOpacity={0.7}
          style={[s.checkRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[s.box, { borderColor: checked ? colors.accent : colors.border, backgroundColor: checked ? colors.accent : 'transparent' }]}>
            {checked && <Text style={s.checkMark}>✓</Text>}
          </View>
          <Text style={[s.checkLabel, { color: colors.text }]}>Am citit și sunt de acord cu termenii și condițiile</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleAccept} disabled={!checked} activeOpacity={0.7}
          style={[s.btn, { backgroundColor: checked ? colors.accent : colors.border, opacity: checked ? 1 : 0.5 }]}>
          <Text style={s.btnText}>Continuă la activare</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ colors, title, children }: { colors: any; title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[s.sectionBody, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  scroll:       { padding: 20, paddingBottom: 40 },
  title:        { fontSize: 28, fontWeight: '700', marginTop: 30 },
  version:      { fontSize: 13, marginBottom: 24 },
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  sectionBody:  { fontSize: 14, lineHeight: 20 },
  checkRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 14, marginTop: 16 },
  box:          { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkMark:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkLabel:   { flex: 1, fontSize: 14, lineHeight: 20 },
  btn:          { marginTop: 20, paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
