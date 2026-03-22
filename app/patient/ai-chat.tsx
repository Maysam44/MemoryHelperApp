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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUri?: string;
  base64Image?: string;
}

const GEMINI_API_KEY = "AIzaSyDO5MD1bBQ3EwYO-_Bw-jHO_cFPKF4Vc-o";

// قائمة الردود الذكية المحلية (Fallback responses)
const SMART_RESPONSES: { [key: string]: string } = {
  'صباح': 'صباح الخير! كيف حالك؟ 😊',
  'مساء': 'مساء الخير! أتمنى يومك كان رائع 🌙',
  'شكرا': 'أهلاً وسهلاً! أنا هنا لمساعدتك ❤️',
  'شو': 'أنا هنا لمساعدتك في أي شيء تحتاجه 💪',
  'كيف': 'أنا بخير الحمد لله! وأنت كيفك؟',
  'ذاكرة': 'تطبيق مساعد الذاكرة يساعدك على تذكر الأشياء المهمة 🧠',
  'مساعدة': 'أنا هنا لمساعدتك! اسأل عني أي شيء',
  'hello': 'Hello! How can I help you? 👋',
  'hi': 'Hi there! 😊',
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // الدالة الذكية للبحث عن ردود محلية
  const getSmartFallbackResponse = (text: string): string | null => {
    const lowerText = text.toLowerCase().trim();
    
    for (const [keyword, response] of Object.entries(SMART_RESPONSES)) {
      if (lowerText.includes(keyword)) {
        return response;
      }
    }
    
    return null;
  };

  // محاولة الحصول على رد من Gemini API مع عدة محاولات
  const tryGeminiEndpoints = async (text: string): Promise<string | null> => {
    const endpoints = [
      // المحاولة الأولى: v1beta مع gemini-1.5-flash
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        model: 'gemini-1.5-flash',
      },
      // المحاولة الثانية: v1 مع gemini-pro
      {
        url: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        model: 'gemini-pro',
      },
      // المحاولة الثالثة: v1beta مع gemini-pro
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        model: 'gemini-pro-beta',
      },
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`محاولة الاتصال بـ ${endpoint.model}...`);
        
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: text,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        });

        console.log(`Response Status (${endpoint.model}):`, response.status);

        if (response.ok) {
          const data = await response.json();
          
          if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            console.log(`✓ نجحت المحاولة مع ${endpoint.model}`);
            return data.candidates[0].content.parts[0].text;
          }
        } else {
          const errorText = await response.text();
          console.log(`✗ فشلت المحاولة مع ${endpoint.model}: ${response.status}`);
        }
      } catch (error) {
        console.log(`✗ خطأ في الاتصال مع ${endpoint.model}:`, error);
      }
    }

    return null;
  };

  const getGeminiResponse = async (text: string): Promise<string> => {
    if (!GEMINI_API_KEY) {
      return "أنا هنا معك ❤️ (يرجى إضافة مفتاح Gemini API)";
    }

    try {
      // المحاولة الأولى: Gemini API
      console.log('بدء محاولة الاتصال بـ Gemini API...');
      const geminiResponse = await tryGeminiEndpoints(text);
      
      if (geminiResponse) {
        return geminiResponse;
      }

      // المحاولة الثانية: البحث عن ردود ذكية محلية
      console.log('فشلت جميع محاولات Gemini، البحث عن ردود محلية...');
      const smartResponse = getSmartFallbackResponse(text);
      
      if (smartResponse) {
        return smartResponse;
      }

      // الرد الافتراضي النهائي
      return "أنا هنا معك ❤️ يمكنك أن تسألني عن أي شيء!";
    } catch (error) {
      console.error('خطأ عام:', error);
      
      // محاولة أخيرة: البحث عن ردود محلية
      const smartResponse = getSmartFallbackResponse(text);
      return smartResponse || "أنا هنا معك ❤️";
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const response = await getGeminiResponse(inputText);

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

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
    });

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
        item.sender === 'user'
          ? styles.userMessage
          : styles.aiMessage,
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor:
              item.sender === 'user' ? COLORS.primary : '#fff',
          },
        ]}
      >
        {item.imageUri && (
          <Image source={{ uri: item.imageUri }} style={styles.image} />
        )}
        <Text
          style={{
            color: item.sender === 'user' ? '#fff' : '#000',
          }}
        >
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'AI Chat',
          headerTitleAlign: 'center',
        }}
      />

      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 100,
          }}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        />

        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={{ marginLeft: 10, color: COLORS.primary }}>يكتب...</Text>
          </View>
        )}

        {/* INPUT */}
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={handlePickImage}>
            <MaterialCommunityIcons
              name="image"
              size={26}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="اكتب..."
            placeholderTextColor="#999"
          />

          <TouchableOpacity onPress={handleSendMessage}>
            <MaterialCommunityIcons
              name="send"
              size={26}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },

  messageContainer: {
    marginBottom: 10,
    maxWidth: '80%',
  },

  userMessage: {
    alignSelf: 'flex-end',
  },

  aiMessage: {
    alignSelf: 'flex-start',
  },

  bubble: {
    padding: 12,
    borderRadius: 20,
  },

  image: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 5,
  },

  inputContainer: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    width: '100%',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
  },

  input: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 5,
    color: '#000',
  },

  loading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
    paddingHorizontal: 20,
  },
});
