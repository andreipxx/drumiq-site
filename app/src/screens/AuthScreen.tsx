import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import AuroraBg from '../components/AuroraBg';
import { signUp, signIn, signInWithGoogle } from '../services/auth';
import { supabase } from '../services/supabase';
import AppMascot from '../components/AppMascot';
import TurnstileCaptcha from '../components/TurnstileCaptcha';
import { APP_VERSION } from '../constants/config';
import { FONT, SIZE, RADIUS } from '../constants/typography';

interface Props {
  onAuthenticated: () => void;
}

type Mode = 'login' | 'register';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen({ onAuthenticated }: Props) {
  const { colors, fontsLoaded: ff } = useTheme();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [lastResetAt, setLastResetAt] = useState<number>(0);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setCaptchaToken(null);
  };

  const validate = (): string | null => {
    if (!EMAIL_REGEX.test(email.trim())) {
      return 'Adresa de email nu este valida.';
    }
    if (mode === 'register') {
      // Reguli mai stricte la inregistrare
      if (password.length < 8) {
        return 'Parola trebuie sa aiba minim 8 caractere.';
      }
      if (!/[A-Z]/.test(password)) {
        return 'Parola trebuie sa contina cel putin o litera mare.';
      }
      if (!/\d/.test(password)) {
        return 'Parola trebuie sa contina cel putin o cifra.';
      }
      if (!name.trim()) {
        return 'Te rugam sa introduci numele.';
      }
      if (password !== confirmPassword) {
        return 'Parolele nu se potrivesc.';
      }
    } else {
      // Login: pastram pragul vechi ca sa nu blocam conturile existente cu parola de 6 chars
      if (password.length < 6) {
        return 'Parola trebuie sa aiba minim 6 caractere.';
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!captchaToken) {
      setError('Te rugam sa completezi verificarea CAPTCHA.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        await signUp(email.trim(), password, name.trim(), captchaToken);
      } else {
        await signIn(email.trim(), password, captchaToken);
      }
      onAuthenticated();
    } catch (e: any) {
      setCaptchaToken(null);
      setError(e?.message || 'A aparut o eroare. Incearca din nou.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Introdu adresa de email mai intai.');
      return;
    }
    if (!captchaToken) {
      setError('Te rugam sa completezi verificarea CAPTCHA inainte de resetare.');
      return;
    }
    const now = Date.now();
    if (now - lastResetAt < 60000) {
      const secLeft = Math.ceil((60000 - (now - lastResetAt)) / 1000);
      setError(`Asteapta ${secLeft}s inainte de a trimite din nou.`);
      return;
    }
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { captchaToken });
      setCaptchaToken(null);
      setLastResetAt(Date.now());
      Alert.alert(
        'Resetare parola',
        'Un email de resetare a fost trimis la adresa ta (daca exista un cont asociat).',
        [{ text: 'OK' }],
      );
    } catch {
      Alert.alert('Eroare', 'Nu s-a putut trimite email-ul de resetare.');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onAuthenticated();
    } catch (e: any) {
      setError(e?.message || 'Autentificarea Google a esuat.');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && email.trim().length > 0 && password.length > 0 && !!captchaToken;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
      <AuroraBg />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mascot + Brand */}
          <View style={s.mascotWrap}>
            <AppMascot size={90} color={colors.cyan} glowing />
          </View>
          <Text style={[s.brand, { color: colors.cyan, fontFamily: ff ? FONT.displayXB : FONT.system }]}>DRUMIQ</Text>
          <Text style={[s.tagline, { color: colors.textMuted, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
            ROMANIA · RIDESHARE INTEL
          </Text>

          {/* Title */}
          <Text style={[s.title, { color: colors.text, fontFamily: ff ? FONT.display : FONT.system }]}>
            {mode === 'login' ? 'Autentificare' : 'Cont nou'}
          </Text>

          {/* Google button — glassmorphism card */}
          <TouchableOpacity
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.7}
            style={[s.socialBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          >
            <Text style={s.googleG}>G</Text>
            <Text style={[s.socialTxt, { color: colors.text }]}>Google</Text>
          </TouchableOpacity>

          {/* Separator */}
          <View style={s.separatorRow}>
            <View style={[s.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[s.separatorTxt, { color: colors.textFaint }]}>sau</Text>
            <View style={[s.separatorLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Form */}
          {mode === 'register' && (
            <>
              <Text style={[s.label, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>Nume</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="ex: Andrei"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
                style={[s.input, { color: colors.text, backgroundColor: colors.bgCard, borderColor: colors.border }]}
                selectionColor={colors.cyan}
              />
            </>
          )}

          <View style={s.labelRow}>
            <Text style={[s.label, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>Email</Text>
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplu.ro"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            maxLength={100}
            style={[s.input, { color: colors.text, backgroundColor: colors.bgCard, borderColor: colors.border }]}
            selectionColor={colors.cyan}
          />

          <View style={s.labelRow}>
            <Text style={[s.label, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system }]}>Parola</Text>
            {mode === 'login' && (
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={[s.forgotLink, { color: colors.cyan }]}>Ai uitat parola?</Text>
              </TouchableOpacity>
            )}
          </View>
          <View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'register' ? 'minim 8 caractere, 1 majuscula, 1 cifra' : 'minim 6 caractere'}
              placeholderTextColor={colors.textFaint}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              maxLength={100}
              style={[s.input, { color: colors.text, backgroundColor: colors.bgCard, borderColor: colors.border }]}
              selectionColor={colors.cyan}
            />
            <TouchableOpacity
              style={s.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.6}
            >
              <Text style={[s.eyeIcon, { color: colors.textMuted }]}>
                {showPassword ? '◉' : '◎'}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' && (
            <>
              <Text style={[s.label, { color: colors.text, fontFamily: ff ? FONT.bodySB : FONT.system, marginTop: 16 }]}>Confirma parola</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="repeta parola"
                placeholderTextColor={colors.textFaint}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                style={[s.input, { color: colors.text, backgroundColor: colors.bgCard, borderColor: colors.border }]}
                selectionColor={colors.cyan}
              />
            </>
          )}

          {/* CAPTCHA */}
          <View style={s.captchaSection}>
            <Text style={[s.captchaLabel, { color: colors.textMuted }]}>
              Confirma ca esti om
            </Text>
            <TurnstileCaptcha
              onToken={setCaptchaToken}
              onError={() => setCaptchaToken(null)}
            />
            {captchaToken && (
              <Text style={[s.captchaOk, { color: colors.go }]}>Verificat</Text>
            )}
          </View>

          {/* Error */}
          {error && (
            <View style={[s.errorBox, { backgroundColor: colors.stopGlow }]}>
              <Text style={[s.errorTxt, { color: colors.stop }]}>{error}</Text>
            </View>
          )}

          {/* Submit — gradient button */}
          {canSubmit ? (
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <LinearGradient colors={colors.gradButton} start={{x:0,y:0}} end={{x:1,y:0}} style={[s.submitBtn, { borderRadius: RADIUS.md }]}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[s.submitTxt, { color: '#fff' }]}>
                    {mode === 'login' ? 'Intra' : 'Creaza cont'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                s.submitBtn,
                {
                  backgroundColor: colors.bgCardStrong,
                  opacity: 0.5,
                  borderRadius: RADIUS.md,
                },
              ]}
            >
              <Text style={[s.submitTxt, { color: colors.textFaint }]}>
                {mode === 'login' ? 'Intra' : 'Creaza cont'}
              </Text>
            </View>
          )}

          {/* Switch mode link */}
          <View style={s.switchRow}>
            <Text style={[s.switchTxt, { color: colors.textMuted }]}>
              {mode === 'login' ? 'Nu ai cont? ' : 'Ai deja cont? '}
            </Text>
            <TouchableOpacity
              onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}
              activeOpacity={0.7}
            >
              <Text style={[s.switchLink, { color: colors.cyan }]}>
                {mode === 'login' ? 'Inregistreaza-te' : 'Autentifica-te'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={[s.version, { color: colors.textFaint, fontFamily: ff ? FONT.mono : FONT.systemMono }]}>
            v{APP_VERSION} · GO PAMPA S.R.L.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  mascotWrap: { alignItems: 'center', marginBottom: 8 },

  brand: {
    fontSize: SIZE['2xl'],
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: SIZE.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },

  title: {
    fontSize: SIZE.xl,
    fontWeight: '700',
    marginBottom: 20,
  },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    marginRight: 10,
  },
  socialTxt: {
    fontSize: 15,
    fontWeight: '600',
  },

  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  separatorTxt: {
    marginHorizontal: 16,
    fontSize: SIZE.base,
    fontWeight: '500',
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 16,
  },
  forgotLink: {
    fontSize: SIZE.base,
    fontWeight: '500',
    marginTop: 16,
  },

  input: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: SIZE.lg,
    borderWidth: 1,
    borderRadius: RADIUS.md,
  },

  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },

  captchaSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  captchaLabel: {
    fontSize: SIZE.base,
    fontWeight: '500',
    marginBottom: 8,
  },
  captchaOk: {
    fontSize: SIZE.base,
    fontWeight: '600',
    marginTop: 4,
  },

  errorBox: {
    padding: 12,
    borderRadius: RADIUS.md,
    marginTop: 16,
  },
  errorTxt: {
    fontSize: SIZE.base,
    fontWeight: '600',
    textAlign: 'center',
  },

  submitBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitTxt: {
    fontSize: SIZE.lg,
    fontWeight: '700',
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchTxt: {
    fontSize: 14,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '600',
  },

  version: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
  },
});
