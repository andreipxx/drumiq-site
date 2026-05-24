import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const SITE_KEY = '0x4AAAAAADQAZRdJotVQmgGC';

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<style>
  body{margin:0;display:flex;justify-content:center;align-items:center;min-height:70px;background:transparent}
  .cf-turnstile{transform-origin:center center}
</style>
</head>
<body>
<div class="cf-turnstile"
  data-sitekey="${SITE_KEY}"
  data-callback="onSuccess"
  data-error-callback="onError"
  data-expired-callback="onExpired"
  data-theme="dark"
  data-size="compact">
</div>
<script>
function onSuccess(token){window.ReactNativeWebView.postMessage(JSON.stringify({type:'success',token:token}))}
function onError(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}))}
function onExpired(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'expired'}))}
</script>
</body>
</html>`;

interface Props {
  onToken: (token: string) => void;
  onError?: () => void;
}

export default function TurnstileCaptcha({ onToken, onError }: Props) {
  const webRef = useRef<WebView>(null);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'success' && msg.token) {
        onToken(msg.token);
      } else if (msg.type === 'error' || msg.type === 'expired') {
        onError?.();
      }
    } catch {}
  }, [onToken, onError]);

  return (
    <View style={s.wrap}>
      <WebView
        ref={webRef}
        source={{ html: HTML, baseUrl: 'https://drumiq.ro' }}
        style={s.webview}
        scrollEnabled={false}
        javaScriptEnabled
        originWhitelist={['https://drumiq.ro', 'https://challenges.cloudflare.com']}
        onMessage={handleMessage}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { height: 75, alignItems: 'center', marginVertical: 12 },
  webview: { width: 160, height: 75, backgroundColor: 'transparent' },
});
