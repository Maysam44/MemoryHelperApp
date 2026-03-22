import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUri?: string;
}

// استخدام OpenAI API كبديل أكثر استقراراً
const GEMINI_API_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_API_KEY = process.env.OPENAI_API_KEY;

export default function AIChatScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'مرحباً! أنا رفيقك الذكي. أنا هنا لأسمعك وأشاركك يومك الجميل. كيف تشعر اليوم؟',
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getGeminiResponse = async (userText: string, chatHistory: Message[]): Promise<string> => {
    if (!GEMINI_API_KEY) {
      return getFallbackResponse(userText);
    }

    try {
      const conversationMessages = chatHistory.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      conversationMessages.push({
        role: 'user',
        content: userText
      });

      const requestBody = {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: 'system',
            content: "أنت مساعد ذكي حنون وصبور لتطبيق 'رفيق الذاكرة' المخصص لمرضى الزهايمر. مهمتك هي الاستماع للمريض، مساعدته على تذكر الأشياء الجميلة، والحديث معه بلغة عربية بسيطة وودودة جداً. افهم رسائل المستخدم بدقة ورد عليها بسياق مناسب. كن رفيقاً حقيقياً لا يمل. تحدث بحنان وصبر وحب. لا تذكر أنك روبوت أو برنامج، بل أنت 'رفيق'."
          },
          ...conversationMessages
        ],
        temperature: 0.8,
        max_tokens: 300
      };

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GEMINI_API_KEY}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      return data.choices?.[0]?.message?.content || getFallbackResponse(userText);
    } catch (error) {
      return getFallbackResponse(userText);
    }
  };

  const getFallbackResponse = (userText: string): string => {
      const userLower = userText.toLowerCase();
      if (userLower.includes('هاي') || userLower.includes('مرحبا')) return "أهلاً بك يا صديقي العزيز! يسعدني جداً أن أتحدث معك. كيف حالك؟";
      return "هذا جميل جداً! أخبرني المزيد، أنا أصغي إليك بكل حب.";
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const aiResponseText = await getGeminiResponse(userText, [...messages, userMessage]);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('عذراً', 'نحتاج لإذن الوصول للمعرض.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      const userMessage: Message = {
        id: Date.now().toString(),
        text: 'شاركت صورة معك',
        sender: 'user',
        timestamp: new Date(),
        imageUri,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'يا لها من صورة جميلة جداً! هل تحب أن تحكي لي قصة هذه الصورة؟',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1500);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessageContainer : styles.aiMessageContainer]}>
      <View style={[styles.messageBubble, item.sender === 'user' ? { backgroundColor: COLORS.primary } : { backgroundColor: 'white', borderWidth: 1, borderColor: '#eee' }]}>
        {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.messageImage} />}
        <Text style={[styles.messageText, { color: item.sender === 'user' ? 'white' : '#333' }]}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F0F2F5' }]}>
      <Stack.Screen options={{ 
        title: 'رفيقك الذكي', 
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 15 }}>
            <MaterialCommunityIcons name="arrow-right" size={32} color={COLORS.primary} />
          </TouchableOpacity>
        )
      }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item.id} renderItem={renderMessage} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={{ marginRight: 10, color: '#666' }}>الرفيق الذكي يكتب...</Text>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
            <MaterialCommunityIcons name="image-plus" size={26} color={COLORS.primary} />
          </TouchableOpacity>
          <TextInput style={styles.input} placeholder="اكتب لرفيقك..." value={inputText} onChangeText={setInputText} multiline textAlign="right" />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: inputText.trim() ? COLORS.primary : '#ccc' }]} onPress={handleSendMessage} disabled={!inputText.trim() || isLoading}>
            <MaterialCommunityIcons name="send" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 20 },
  messageContainer: { marginBottom: 20, maxWidth: '85%' },
  userMessageContainer: { alignSelf: 'flex-start' },
  aiMessageContainer: { alignSelf: 'flex-end' },
  messageBubble: { padding: 15, borderRadius: 25, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  messageText: { fontSize: 18, lineHeight: 26, textAlign: 'right' },
  messageImage: { width: 220, height: 160, borderRadius: 20, marginBottom: 10 },
  loadingIndicator: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 10 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  attachButton: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginLeft: 10, backgroundColor: '#f0f0f0' },
  input: { flex: 1, borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, maxHeight: 100, fontSize: 18, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', textAlign: 'right' },
  sendButton: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
});
