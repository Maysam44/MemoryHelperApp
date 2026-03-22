import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUri?: string;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // من platform.openai.com

const getAIResponse = async (text: string, retries = 2): Promise<string> => {
  try {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // رخيص وسريع
          messages: [{ role: 'user', content: text }],
          max_tokens: 500,
        }),
      }
    );

    if (response.status === 429 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return getAIResponse(text, retries - 1);
    }

    if (!response.ok) {
      console.error('API Error:', response.status);
      return "صار خطأ بسيط، بس أنا معك ❤️";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "ما فهمت، ممكن تعيد؟";
  } catch (error) {
    console.error('Fetch Error:', error);
    return "صار خطأ بسيط، بس أنا معك ❤️";
  }
};

export default function AIChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'مرحباً! أنا رفيقك الذكي. كيف تشعر اليوم؟',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const response = await getAIResponse(inputText);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: response,
      sender: 'ai',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('نحتاج إذن للصور');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ base64: true });

    if (!result.canceled) {
      const img = result.assets[0];
      const msg: Message = {
        id: Date.now().toString(),
        text: 'تم إرسال صورة',
        sender: 'user',
        timestamp: new Date(),
        imageUri: img.uri,
      };
      setMessages((prev) => [...prev, msg]);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessage : styles.aiMessage,
      ]}
    >
      {item.sender === 'ai' && (
        <View style={styles.aiAvatar}>
          <MaterialCommunityIcons name="robot-happy" size={18} color="#fff" />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          item.sender === 'user' ? styles.userBubble : styles.aiBubble,
        ]}
      >
        {item.imageUri && (
          <Image source={{ uri: item.imageUri }} style={styles.image} />
        )}
        <Text style={{ color: item.sender === 'user' ? '#fff' : '#222', lineHeight: 20 }}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'AI Chat', headerTitleAlign: 'center' }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {isLoading && (
          <View style={styles.loading}>
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>يكتب...</Text>
            </View>
          </View>
        )}

        {/* INPUT BAR */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.iconBtn}
              disabled={isLoading}
            >
              <MaterialCommunityIcons
                name="image-plus"
                size={24}
                color={isLoading ? '#ccc' : COLORS.primary}
              />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="اكتب رسالتك..."
              placeholderTextColor="#aaa"
              multiline
              maxLength={500}
              editable={!isLoading}
            />

            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              style={[
                styles.sendBtn,
                { backgroundColor: isLoading || !inputText.trim() ? '#ddd' : COLORS.primary },
              ]}
            >
              <MaterialCommunityIcons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },

  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },

  userMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },

  aiMessage: {
    alignSelf: 'flex-start',
  },

  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  bubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },

  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },

  image: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 5,
  },

  // INPUT
  inputWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F4F4F4',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },

  iconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
    textAlignVertical: 'center',
  },

  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  loading: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  loadingText: {
    color: '#888',
    fontSize: 14,
  },
});