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
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUri?: string;
}

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey;

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
  const [isSpeaking, setIsSpeaking] = useState(false);
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
      console.warn("Gemini API Key is missing.");
      return getFallbackResponse(userText);
    }

    try {
      // تحويل تاريخ المحادثة إلى تنسيق Gemini
      const contents = chatHistory.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // إضافة الرسالة الحالية
      contents.push({
        role: 'user',
        parts: [{ text: userText }]
      });

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{
              text: "أنت مساعد ذكي حنون وصبور لتطبيق 'رفيق الذاكرة' المخصص لمرضى الزهايمر. مهمتك هي الاستماع للمريض، مساعدته على تذكر الأشياء الجميلة، والحديث معه بلغة عربية بسيطة وودودة جداً (لهجة بيضاء أو فصحى مبسطة). افهم رسائل المستخدم بدقة ورد عليها بسياق مناسب. إذا شارك صورة، عبّر عن جمالها وساعده في تذكر تفاصيلها. كن رفيقاً حقيقياً لا يمل. تحدث بحنان وصبر وحب. لا تذكر أنك روبوت أو برنامج، بل أنت 'رفيق'."
            }]
          },
          generationConfig: { temperature: 0.8, maxOutputTokens: 300 }
        }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      return getFallbackResponse(userText);
    } catch (error) {
      console.error("Gemini API Error:", error);
      return getFallbackResponse(userText);
    }
  };

  const getFallbackResponse = (userText: string): string => {
      const userLower = userText.toLowerCase();
      if (userLower.includes('هاي') || userLower.includes('مرحبا')) return "أهلاً بك يا صديقي العزيز! يسعدني جداً أن أتحدث معك. كيف حالك؟";
      if (userLower.includes('تعب') || userLower.includes('ألم')) return "أنا آسف لسماع أنك لا تشعر بخير. هل تريد أن نتصل بمقدم الرعاية الخاص بك؟ أنا هنا بجانبك.";
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

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const aiResponseText = await getGeminiResponse(userText, updatedMessages);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      Alert.alert('تنبيه', 'أواجه مشكلة بسيطة في الاتصال، لكنني ما زلت معك.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('إذن الصور', 'نحتاج للوصول للصور لمشاركتها مع رفيقك.');
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
            text: 'يا لها من صورة جميلة جداً! الصور دائماً تحمل ذكريات غالية في قلوبنا. هل تحب أن تحكي لي قصة هذه الصورة؟',
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setIsLoading(false);
        }, 1500);
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في اختيار الصورة.');
    }
  };

  const handleSpeak = async (text: string) => {
    try {
      if (isSpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
      } else {
        setIsSpeaking(true);
        await Speech.speak(text, {
          language: 'ar-SA',
          rate: 0.85,
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    } catch (error) {
      setIsSpeaking(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessageContainer : styles.aiMessageContainer]}>
      <View style={[styles.messageBubble, item.sender === 'user' ? { backgroundColor: dynamicColors.primary } : { backgroundColor: 'white', borderWidth: 1, borderColor: '#eee' }]}>
        {item.imageUri && <Image source={{ uri: item.imageUri }} style={styles.messageImage} />}
        <Text style={[styles.messageText, { color: item.sender === 'user' ? 'white' : '#333' }]}>{item.text}</Text>
      </View>
      {item.sender === 'ai' && (
        <TouchableOpacity style={styles.speakButton} onPress={() => handleSpeak(item.text)}>
          <MaterialCommunityIcons name={isSpeaking ? 'volume-high' : 'volume-medium'} size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F0F2F5' }]}>
      <Stack.Screen options={{ title: 'رفيقك الذكي', headerTitleAlign: 'center', headerTitleStyle: { fontWeight: 'bold' } }} />
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
  messageText: { fontSize: 16, lineHeight: 24, textAlign: 'right' },
  messageImage: { width: 220, height: 160, borderRadius: 20, marginBottom: 10 },
  speakButton: { marginTop: 5, padding: 8, borderRadius: 20, alignSelf: 'flex-end', backgroundColor: 'white', elevation: 2 },
  loadingIndicator: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 10 },
  inputContainer: { flexDirection: 'row-reverse', alignItems: 'center', padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  attachButton: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginLeft: 10, backgroundColor: '#f0f0f0' },
  input: { flex: 1, borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, maxHeight: 100, fontSize: 16, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', textAlign: 'right' },
  sendButton: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
});
