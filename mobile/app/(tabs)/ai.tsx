// mobile/app/(tabs)/ai.tsx — Finclue AI Chat
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StyleSheet, SafeAreaView, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/auth';

const BASE_URL = 'https://finclue.de';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  { label: '📈 Markt heute', prompt: 'Wie ist die aktuelle Marktsituation? Was bewegt die Märkte heute?' },
  { label: '🧠 Buffett Käufe', prompt: 'Was hat Warren Buffett zuletzt gekauft oder verkauft?' },
  { label: '⚡ Top Momentum', prompt: 'Welche Aktien haben gerade starkes Momentum und warum?' },
  { label: '💰 Dividenden', prompt: 'Welche Aktien bieten aktuell attraktive Dividendenrenditen?' },
];

export default function AIScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticker, setTicker] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function sendMessage(customPrompt?: string) {
    const text = (customPrompt || input).trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    Keyboard.dismiss();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Nicht eingeloggt');

      // Detect ticker mention in message
      const tickerMatch = text.match(/\b([A-Z]{1,5})\b/g);
      const detectedTicker = ticker || (tickerMatch ? tickerMatch[0] : undefined);

      const body = {
        message: text,
        context: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        analysisType: detectedTicker ? 'stock' : 'general',
        ticker: detectedTicker || undefined,
        contextHints: {
          isHybridQuery: false,
          hasExplicitTicker: !!detectedTicker,
          messageContainsPortfolioTerms: /portfolio|käufe|verkäufe|holdings/i.test(text),
          messageContainsStockTerms: /quartal|earnings|umsatz|kuv/i.test(text),
        }
      };

      const res = await fetch(`${BASE_URL}/api/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Fehler ${res.status}`);
      }

      const data = await res.json();
      const aiContent = data?.response?.content || data?.content || 'Keine Antwort erhalten.';

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ ${err.message || 'Fehler beim Laden der Antwort.'}`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setTicker('');
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.aiBadge}>
              <Text style={s.aiBadgeText}>AI</Text>
            </View>
            <View>
              <Text style={s.headerTitle}>Finclue AI</Text>
              <Text style={s.headerSub}>Dein Finanzassistent</Text>
            </View>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={s.clearBtn}>
              <Ionicons name="trash-outline" size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Ticker Filter */}
        <View style={s.tickerRow}>
          <Ionicons name="search" size={14} color={theme.text.tertiary} style={{ marginRight: 6 }} />
          <TextInput
            style={s.tickerInput}
            placeholder="Aktie fokussieren (z.B. AAPL)"
            placeholderTextColor={theme.text.muted}
            value={ticker}
            onChangeText={t => setTicker(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />
          {ticker.length > 0 && (
            <TouchableOpacity onPress={() => setTicker('')}>
              <Ionicons name="close-circle" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Messages or Welcome */}
        <ScrollView
          ref={scrollRef}
          style={s.messages}
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={s.welcome}>
              <View style={s.welcomeIcon}>
                <Text style={{ fontSize: 32 }}>✨</Text>
              </View>
              <Text style={s.welcomeTitle}>Finclue AI</Text>
              <Text style={s.welcomeText}>
                Stell mir Fragen zu Aktien, Märkten, Superinvestoren oder deinem Portfolio. Du kannst auch gezielt eine Aktie fokussieren.
              </Text>
              <View style={s.quickGrid}>
                {QUICK_PROMPTS.map(q => (
                  <TouchableOpacity
                    key={q.label}
                    style={s.quickBtn}
                    onPress={() => sendMessage(q.prompt)}
                  >
                    <Text style={s.quickBtnText}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map(msg => (
              <View
                key={msg.id}
                style={[s.bubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}
              >
                {msg.role === 'assistant' && (
                  <View style={s.aiAvatar}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.text.primary }}>AI</Text>
                  </View>
                )}
                <View style={[s.bubbleInner, msg.role === 'user' ? s.userInner : s.aiInner]}>
                  <Text style={[s.bubbleText, msg.role === 'user' ? s.userText : s.aiText]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))
          )}
          {loading && (
            <View style={[s.bubble, s.aiBubble]}>
              <View style={s.aiAvatar}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.text.primary }}>AI</Text>
              </View>
              <View style={[s.bubbleInner, s.aiInner, { paddingVertical: 14 }]}>
                <ActivityIndicator size="small" color={theme.text.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder={ticker ? `Frage zu ${ticker}...` : 'Stell eine Frage...'}
            placeholderTextColor={theme.text.muted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={18} color={input.trim() && !loading ? theme.text.inverse : theme.text.muted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { theme } from '../../lib/theme';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg.base },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, paddingBottom: theme.space.sm + 2,
    borderBottomWidth: 1, borderBottomColor: theme.border.default,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm + 2 },
  aiBadge: {
    width: 32, height: 32, borderRadius: theme.radius.md - 1,
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  aiBadgeText: { fontSize: theme.font.caption, fontWeight: theme.weight.bold, color: theme.text.primary },
  headerTitle: { fontSize: theme.font.title2, fontWeight: theme.weight.semibold, color: theme.text.primary, letterSpacing: theme.tracking.normal },
  headerSub: { fontSize: theme.font.caption, color: theme.text.tertiary, marginTop: 1 },
  clearBtn: { padding: theme.space.sm },

  tickerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: theme.space.lg, marginTop: theme.space.sm + 2, marginBottom: 2,
    backgroundColor: theme.bg.card, borderRadius: theme.radius.md, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm,
    borderWidth: 1, borderColor: theme.border.default,
  },
  tickerInput: { flex: 1, color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.semibold },

  messages: { flex: 1 },

  welcome: { alignItems: 'center', paddingTop: theme.space.xl },
  welcomeIcon: {
    width: 56, height: 56, borderRadius: theme.radius.lg,
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.space.lg,
  },
  welcomeTitle: { fontSize: theme.font.display2, fontWeight: theme.weight.bold, color: theme.text.primary, marginBottom: theme.space.sm, letterSpacing: theme.tracking.tight },
  welcomeText: {
    fontSize: theme.font.title3, color: theme.text.tertiary, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: theme.space.xl, marginBottom: theme.space.xxl,
  },
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm, justifyContent: 'center',
  },
  quickBtn: {
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    borderRadius: theme.radius.full, paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.sm + 1,
  },
  quickBtnText: { color: theme.text.secondary, fontSize: theme.font.body, fontWeight: theme.weight.medium },

  bubble: { flexDirection: 'row', marginBottom: theme.space.md, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 24, height: 24, borderRadius: theme.radius.sm + 2,
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center', marginRight: theme.space.sm, marginBottom: 2,
  },
  bubbleInner: { maxWidth: '80%', borderRadius: theme.radius.lg, padding: theme.space.md },
  userInner: { backgroundColor: theme.text.primary, borderBottomRightRadius: theme.space.xs },
  aiInner: { backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, borderBottomLeftRadius: theme.space.xs },
  bubbleText: { fontSize: theme.font.title3, lineHeight: 20 },
  userText: { color: theme.text.inverse, fontWeight: theme.weight.medium },
  aiText: { color: theme.text.primary },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: theme.space.sm,
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md,
    borderTopWidth: 1, borderTopColor: theme.border.default,
    backgroundColor: theme.bg.base,
  },
  input: {
    flex: 1, backgroundColor: theme.bg.card, borderRadius: theme.radius.lg, borderWidth: 1,
    borderColor: theme.border.default, color: theme.text.primary, fontSize: theme.font.title3,
    paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.sm + 2, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: theme.radius.md,
    backgroundColor: theme.text.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: theme.bg.cardElevated },
});
