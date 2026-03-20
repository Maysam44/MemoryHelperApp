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

// Gemini API Configuration (Direct Fetch)
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

  // Direct Fetch API call to Gemini (Most Reliable Method)
  const getGeminiResponse = async (userText: string): Promise<string> => {
    if (!GEMINI_API_KEY) {
      console.warn("Gemini API Key is missing. Using fallback responses.");
      return getFallbackResponse(userText);
    }

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: userText,
                }
              ]
            }
          ],
          systemInstruction: {
            parts: [
              {
                text: "أنت مساعد ذكي حنون وصبور لتطبيق 'رفيق الذاكرة' المخصص لمرضى الزهايمر. مهمتك هي الاستماع للمريض، مساعدته على تذكر الأشياء الجميلة، والحديث معه بلغة عربية بسيطة وودودة جداً. افهم رسائل المستخدم بدقة ورد عليها بسياق مناسب. إذا شارك صورة، عبّر عن جمالها وساعده في تذكر تفاصيلها. كن رفيقاً حقيقياً لا يمل. تحدث بحنان وصبر وحب."
              }
            ]
          },
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 500,
          }
        }),
      });

      if (!response.ok) {
        console.error('Gemini API Error:', response.status, response.statusText);
        return getFallbackResponse(userText);
      }

      const data = await response.json();
      
      // Extract text from Gemini response
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const text = data.candidates[0].content.parts[0].text;
        if (text && text.trim().length > 0) {
          return text;
        }
      }

      return getFallbackResponse(userText);
    } catch (error: any) {
      console.error("Gemini API Error Details:", error);
      return getFallbackResponse(userText);
    }
  };

  const getFallbackResponse = (userText: string): string => {
      const userLower = userText.toLowerCase();
      
      if (userLower.includes('هاي') || userLower.includes('مرحبا') || userLower.includes('سلام')) {
        return "أهلاً بك يا صديقي العزيز! يسعدني جداً أن أتحدث معك. كيف حالك؟";
      }
      
      if (userLower.includes('ما اليوم') || userLower.includes('شو اليوم') || userLower.includes('تاريخ')) {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = new Intl.DateTimeFormat('ar-EG', options).format(now);
        return `اليوم هو ${dateStr}. إنه يوم جميل لنصنع فيه ذكريات جديدة.`;
      }

      if (userLower.includes('وقت') || userLower.includes('ساعة') || userLower.includes('كم الساعة')) {
        const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        return `الساعة الآن هي ${timeStr}. هل هناك شيء تود فعله في هذا الوقت؟`;
      }

      if (userLower.includes('تعب') || userLower.includes('وجع') || userLower.includes('ألم') || userLower.includes('مريض')) {
        return "أنا آسف لسماع أنك لا تشعر بخير. هل تريد أن نتصل بمقدم الرعاية الخاص بك؟ أنا هنا بجانبك.";
      }

      if (userLower.includes('مين انت') || userLower.includes('شو بتعمل')) {
        return "أنا رفيقك الذكي في تطبيق 'رفيق الذاكرة'. وظيفتي هي أن أكون معك دائماً، أذكرك بالأشياء الجميلة وأسمع قصصك الرائعة.";
      }

      if (userLower.includes('نسيت') || userLower.includes('مش متذكر') || userLower.includes('ذكرني')) {
        return "لا تقلق أبداً، النسيان أمر طبيعي. يمكنك دائماً تصفح 'بنك الذكريات' لرؤية صور أحبائك. هل تريدني أن أساعدك في العثور على شيء معين؟";
      }

      if (userLower.includes('بحبك') || userLower.includes('شكرا') || userLower.includes('حلو')) {
        return "هذا من لطفك وجمال قلبك! أنا أيضاً سعيد جداً بوجودي معك. أنت شخص رائع جداً.";
      }

      const genericResponses = [
        "هذا موضوع شيق جداً! أخبرني المزيد عن ذلك، أنا أصغي إليك باهتمام.",
        "أفهمك تماماً. الحياة مليئة بالقصص الجميلة، وأنا أحب سماع كل ما تقوله.",
        "شكراً لمشاركتي هذه الكلمات. هل تذكر شيئاً مشابهاً حدث لك في الماضي؟",
        "كلامك يبعث على التفاؤل. أنت دائماً ما تلهمنا بحديثك. ماذا أيضاً؟",
        "أنا أتعلم منك الكثير في كل مرة نتحدث فيها. هل تريد أن نحكي عن عائلتك أو أصدقائك؟"
      ];
      
      return genericResponses[Math.floor(Math.random() * genericResponses.length)];
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

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    Keyboard.dismiss();

    try {
      const aiResponseText = await getGeminiResponse(userText);

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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
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
            text: 'يا لها من صورة جميلة جداً! الصور دائماً تحمل ذكريات غالية في قلوبنا. هل تحب أن تحكي لي قصة هذه الصورة؟ ومن هم الأشخاص فيها؟',
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
          rate: 0.9,
          pitch: 1,
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    } catch (error) {
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
        {item.imageUri && (
          <Image 
            source={{ uri: item.imageUri }} 
            style={styles.messageImage}
          />
        )}
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
        >
          <MaterialCommunityIcons
            name={isSpeaking ? 'volume-high' : 'volume-medium'}
            size={18}
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
          title: 'رفيقك الذكي',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: dynamicColors.backgroundLight },
          headerShadowVisible: false,
          headerTitleStyle: { color: dynamicColors.textDark, fontSize: SIZES.h3, fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
              <MaterialCommunityIcons name="chevron-right" size={30} color={dynamicColors.textDark} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {isLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={{ marginRight: 10, color: COLORS.textMuted }}>الرفيق الذكي يفكر...</Text>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: dynamicColors.card, borderTopColor: dynamicColors.border }]}>
          <TouchableOpacity 
            style={[styles.attachButton, { backgroundColor: dynamicColors.primary + '15' }]} 
            onPress={handlePickImage}
          >
            <MaterialCommunityIcons name="image-plus" size={24} color={dynamicColors.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={[styles.input, { backgroundColor: dynamicColors.backgroundLight, color: dynamicColors.textDark, borderColor: dynamicColors.border }]}
            placeholder="اكتب رسالتك هنا..."
            placeholderTextColor={dynamicColors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            textAlign="right"
          />

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: inputText.trim() ? dynamicColors.primary : COLORS.textMuted }]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <MaterialCommunityIcons name="send" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 10 },
  messageContainer: { marginBottom: 20, maxWidth: '85%' },
  userMessageContainer: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  aiMessageContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageBubble: {
    padding: 15,
    borderRadius: 20,
    elevation: 1,
  },
  messageText: { fontSize: 16, lineHeight: 24, textAlign: 'right' },
  messageImage: { width: 200, height: 150, borderRadius: 15, marginBottom: 10 },
  speakButton: {
    marginTop: 8,
    padding: 8,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  loadingIndicator: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
  },
  attachButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  input: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    borderWidth: 1,
    textAlign: 'right',
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
});
