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
              <Ionicons name="trash-outline" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Ticker Filter */}
        <View style={s.tickerRow}>
          <Ionicons name="search" size={14} color="#64748B" style={{ marginRight: 6 }} />
          <TextInput
            style={s.tickerInput}
            placeholder="Aktie fokussieren (z.B. AAPL)"
            placeholderTextColor="#475569"
            value={ticker}
            onChangeText={t => setTicker(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
          />
          {ticker.length > 0 && (
            <TouchableOpacity onPress={() => setTicker('')}>
              <Ionicons name="close-circle" size={16} color="#475569" />
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
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#34C759' }}>AI</Text>
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
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#34C759' }}>AI</Text>
              </View>
              <View style={[s.bubbleInner, s.aiInner, { paddingVertical: 14 }]}>
                <ActivityIndicator size="small" color="#34C759" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder={ticker ? `Frage zu ${ticker}...` : 'Stell eine Frage...'}
            placeholderTextColor="#475569"
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
            <Ionicons name="send" size={18} color={input.trim() && !loading ? '#000000' : '#475569'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#2C2C2E',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#34C75920', borderWidth: 1, borderColor: '#34C75940',
    alignItems: 'center', justifyContent: 'center',
  },
  aiBadgeText: { fontSize: 11, fontWeight: '800', color: '#34C759' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  clearBtn: { padding: 8 },

  tickerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 10, marginBottom: 2,
    backgroundColor: '#1C1C1E', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#2C2C2E',
  },
  tickerInput: { flex: 1, color: '#F8FAFC', fontSize: 13, fontWeight: '600' },

  messages: { flex: 1 },

  welcome: { alignItems: 'center', paddingTop: 20 },
  welcomeIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#34C75915', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#F8FAFC', marginBottom: 8 },
  welcomeText: {
    fontSize: 14, color: '#94A3B8', textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 20, marginBottom: 24,
  },
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
  },
  quickBtn: {
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
  },
  quickBtnText: { color: '#CBD5E1', fontSize: 13, fontWeight: '500' },

  bubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#34C75915', borderWidth: 1, borderColor: '#34C75930',
    alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2,
  },
  bubbleInner: { maxWidth: '80%', borderRadius: 14, padding: 12 },
  userInner: { backgroundColor: '#34C759', borderBottomRightRadius: 4 },
  aiInner: { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#000000', fontWeight: '500' },
  aiText: { color: '#E2E8F0' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#2C2C2E',
    backgroundColor: '#000000',
  },
  input: {
    flex: 1, backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1,
    borderColor: '#2C2C2E', color: '#F8FAFC', fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#34C759', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#2C2C2E' },
});
