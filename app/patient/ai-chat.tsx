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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, COLORS } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUri?: string;
  base64Image?: string;
}

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || process.env.GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

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
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', scrollToBottom);
    return () => keyboardDidShowListener.remove();
  }, [messages]);

  const getGeminiResponse = async (userText: string, imageBase64?: string): Promise<string> => {
    if (!genAI) return getFallbackResponse(userText);
    try {
      // FIX: Use 'gemini-1.5-flash' or 'gemini-pro' based on availability, 
      // but let's try 'gemini-1.5-flash' again with proper configuration or fallback to 'gemini-pro'
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", // Most common and free
      });

      const history = messages
        .filter(msg => msg.id !== '1')
        .slice(-10)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

      let result;
      if (imageBase64) {
        const prompt = userText || "ماذا ترى في هذه الصورة؟ احكِ لي عنها بحنان.";
        const imagePart = { inlineData: { data: imageBase64, mimeType: "image/jpeg" } };
        result = await model.generateContent([
          { text: "أنت مساعد حنون لمرضى الزهايمر. حلل الصورة بحب." },
          prompt, 
          imagePart
        ]);
      } else {
        const chat = model.startChat({ 
          history,
          generationConfig: {
            maxOutputTokens: 500,
          }
        });
        result = await chat.sendMessage(userText);
      }
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini Error:", error);
      // Try fallback to gemini-pro if flash fails
      try {
          const model = genAI.getGenerativeModel({ model: "gemini-pro" });
          const chat = model.startChat({ history: [] });
          const result = await chat.sendMessage(userText);
          return (await result.response).text();
      } catch (e) {
          return getFallbackResponse(userText);
      }
    }
  };

  const getFallbackResponse = (userText: string): string => {
    const userLower = userText.toLowerCase();
    if (userLower.includes('هاي') || userLower.includes('مرحبا')) return "أهلاً بك يا صديقي العزيز! يسعدني جداً أن أتحدث معك. كيف حالك؟";
    return "أنا أسمعك جيداً يا صديقي، أخبرني المزيد عما يدور في خاطرك، أنا هنا معك دائماً.";
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    const userMessage: Message = { id: Date.now().toString(), text: userText, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    try {
      const aiResponseText = await getGeminiResponse(userText);
      const aiMessage: Message = { id: (Date.now() + 1).toString(), text: aiResponseText, sender: 'ai', timestamp: new Date() };
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
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const userMessage: Message = {
        id: Date.now().toString(),
        text: 'شاركت صورة معك',
        sender: 'user',
        timestamp: new Date(),
        imageUri: asset.uri,
        base64Image: asset.base64 || undefined,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      try {
        const aiResponseText = await getGeminiResponse("حلل هذه الصورة وحدثني عنها بحنان", asset.base64 || undefined);
        const aiMessage: Message = { id: (Date.now() + 1).toString(), text: aiResponseText, sender: 'ai', timestamp: new Date() };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={{ flex: 1 }}>
          <FlatList 
            ref={flatListRef} 
            data={messages} 
            keyExtractor={(item) => item.id} 
            renderItem={renderMessage} 
            contentContainerStyle={styles.listContent} 
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          />
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
            <TextInput 
              style={styles.input} 
              placeholder="اكتب لرفيقك..." 
              value={inputText} 
              onChangeText={setInputText} 
              multiline 
              textAlign="right" 
            />
            <TouchableOpacity 
              style={[styles.sendButton, { backgroundColor: inputText.trim() ? COLORS.primary : '#ccc' }]} 
              onPress={handleSendMessage} 
              disabled={!inputText.trim() || isLoading}
            >
              <MaterialCommunityIcons name="send" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 10 },
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
