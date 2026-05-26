import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
  Alert, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { signUp, signIn, signInWithGoogle } from '../services/auth';
import { supabase } from '../services/supabase';
import AppMascot from '../components/AppMascot';
import TurnstileCaptcha from '../components/TurnstileCaptcha';

interface Props {
  onAuthenticated: () => void;
}

type Mode = 'login' | 'register';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen({ onAuthenticated }: Props) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setCaptchaToken(null);
  };

  const validate = (): string | null => {
    if (!EMAIL_REGEX.test(email.trim())) {
      return 'Adresa de email nu este valida.';
    }
    if (password.length < 6) {
      return 'Parola trebuie sa aiba minim 6 caractere.';
    }
    if (mode === 'register') {
      if (!name.trim()) {
        return 'Te rugam sa introduci numele.';
      }
      if (password !== confirmPassword) {
        return 'Parolele nu se potrivesc.';
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
    try {
      await supabase.auth.resetPasswordForEmail(email.trim());
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
            <AppMascot size={90} color={colors.accent} glowing />
          </View>
          <Text style={[s.brand, { color: colors.accent }]}>DRUMIQ</Text>
          <Text style={[s.tagline, { color: colors.textMuted }]}>
            ROMANIA · RIDESHARE INTEL
          </Text>

          {/* Title */}
          <Text style={[s.title, { color: colors.text }]}>
            {mode === 'login' ? 'Autentificare' : 'Cont nou'}
          </Text>

          {/* Google button */}
          <TouchableOpacity
            onPress={handleGoogle}
            disabled={loading}
            activeOpacity={0.7}
            style={[s.socialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={s.googleG}>G</Text>
            <Text style={[s.socialTxt, { color: colors.text }]}>Google</Text>
          </TouchableOpacity>

          {/* Separator */}
          <View style={s.separatorRow}>
            <View style={[s.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[s.separatorTxt, { color: colors.textDim }]}>sau</Text>
            <View style={[s.separatorLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Form */}
          {mode === 'register' && (
            <>
              <Text style={[s.label, { color: colors.text }]}>Nume</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="ex: Andrei"
                placeholderTextColor={colors.textDim}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
                style={[s.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                selectionColor={colors.accent}
              />
            </>
          )}

          <View style={s.labelRow}>
            <Text style={[s.label, { color: colors.text }]}>Email</Text>
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplu.ro"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            maxLength={100}
            style={[s.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
            selectionColor={colors.accent}
          />

          <View style={s.labelRow}>
            <Text style={[s.label, { color: colors.text }]}>Parola</Text>
            {mode === 'login' && (
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={[s.forgotLink, { color: colors.accent }]}>Ai uitat parola?</Text>
              </TouchableOpacity>
            )}
          </View>
          <View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="minim 6 caractere"
              placeholderTextColor={colors.textDim}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              maxLength={100}
              style={[s.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              selectionColor={colors.accent}
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
              <Text style={[s.label, { color: colors.text, marginTop: 16 }]}>Confirma parola</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="repeta parola"
                placeholderTextColor={colors.textDim}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                style={[s.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                selectionColor={colors.accent}
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

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.85}
            style={[
              s.submitBtn,
              {
                backgroundColor: canSubmit ? colors.accent : colors.surfaceAlt,
                opacity: canSubmit ? 1 : 0.5,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={[s.submitTxt, { color: canSubmit ? '#000' : colors.textDim }]}>
                {mode === 'login' ? 'Intra' : 'Creaza cont'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Switch mode link */}
          <View style={s.switchRow}>
            <Text style={[s.switchTxt, { color: colors.textMuted }]}>
              {mode === 'login' ? 'Nu ai cont? ' : 'Ai deja cont? '}
            </Text>
            <TouchableOpacity
              onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}
              activeOpacity={0.7}
            >
              <Text style={[s.switchLink, { color: colors.accent }]}>
                {mode === 'login' ? 'Inregistreaza-te' : 'Autentifica-te'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={[s.version, { color: colors.textDim }]}>
            v1.0.0 · GO PAMPA S.R.L.
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
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
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
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '500',
    marginTop: 16,
  },

  input: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
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
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  captchaOk: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorTxt: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  submitBtn: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitTxt: {
    fontSize: 16,
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
