import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import * as Speech from 'expo-speech';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AIChatScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulated AI responses - in production, this would call an actual AI API
    const responses = [
      'هذا موضوع مهم جداً. هل تريد أن تخبرني المزيد عنه؟',
      'أنا هنا لمساعدتك. كيف يمكنني أن أكون مفيداً أكثر؟',
      'شكراً لك على مشاركة هذا معي. هل هناك أي شيء آخر تود أن تسأل عنه؟',
      'أتفهم ما تقول. دعني أساعدك بأفضل طريقة ممكنة.',
      'هذا رأي جيد جداً. هل تريد معرفة المزيد عن هذا الموضوع؟',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const aiResponse = await generateAIResponse(inputText);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الحصول على الرد. حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async (text: string) => {
    try {
      setIsSpeaking(true);
      await Speech.speak(text, {
        language: 'ar-SA',
        rate: 0.9,
        pitch: 1,
      });
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في تشغيل الصوت.');
    } finally {
      setIsSpeaking(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessageContainer : styles.aiMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.sender === 'user'
            ? { backgroundColor: dynamicColors.primary }
            : { backgroundColor: dynamicColors.card, borderWidth: 1, borderColor: dynamicColors.border },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: item.sender === 'user' ? dynamicColors.textLight : dynamicColors.textDark,
            },
          ]}
        >
          {item.text}
        </Text>
      </View>

      {item.sender === 'ai' && (
        <TouchableOpacity
          style={[styles.speakButton, { backgroundColor: dynamicColors.primary + '20' }]}
          onPress={() => handleSpeak(item.text)}
          disabled={isSpeaking}
        >
          <MaterialCommunityIcons
            name={isSpeaking ? 'volume-high' : 'volume-medium'}
            size={20}
            color={dynamicColors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicColors.backgroundLight }]}>
      <Stack.Screen
        options={{
          title: 'الدردشة مع المساعد الذكي',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: dynamicColors.backgroundLight },
          headerShadowVisible: false,
          headerTitleStyle: { color: dynamicColors.textDark },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
              <MaterialCommunityIcons name="chevron-right" size={30} color={dynamicColors.textDark} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        ref={scrollViewRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        scrollEnabled={true}
        onContentSizeChange={() => scrollToBottom()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={[styles.inputWrapper, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
          <TextInput
            style={[styles.input, { color: dynamicColors.textDark }]}
            placeholder="اكتب رسالتك هنا..."
            placeholderTextColor={dynamicColors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: dynamicColors.primary }]}
            onPress={handleSendMessage}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={dynamicColors.textLight} />
            ) : (
              <MaterialCommunityIcons name="send" size={24} color={dynamicColors.textLight} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesList: { padding: SIZES.padding, paddingBottom: SIZES.padding * 2 },
  messageContainer: {
    marginBottom: SIZES.padding,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    borderRadius: SIZES.radius,
  },
  messageText: {
    fontSize: SIZES.body,
    lineHeight: SIZES.body * 1.4,
  },
  speakButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.base,
  },
  inputContainer: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.base / 2,
  },
  input: {
    flex: 1,
    fontSize: SIZES.body,
    maxHeight: 100,
    marginHorizontal: SIZES.base,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
