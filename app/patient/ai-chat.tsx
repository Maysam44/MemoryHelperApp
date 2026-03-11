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
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Gemini AI (Free Tier)
// NOTE: For production, use a secure backend or proxy for API keys
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_FREE_GEMINI_KEY");
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: "أنت مساعد ذكي حنون وصبور لتطبيق 'رفيق الذاكرة' المخصص لمرضى الزهايمر. مهمتك هي الاستماع للمريض، مساعدته على تذكر الأشياء الجميلة، والحديث معه بلغة عربية بسيطة وودودة جداً. افهم رسائل المستخدم بدقة ورد عليها بسياق مناسب. إذا شارك صورة، عبّر عن جمالها وساعده في تذكر تفاصيلها. كن رفيقاً حقيقياً لا يمل."
});

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUri?: string;
}

export default function AIChatScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'مرحباً! أنا رفيقك الذكي الجديد. أنا هنا لأسمعك وأشاركك يومك. كيف حالك اليوم؟',
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

  const getGeminiResponse = async (userText: string) => {
    try {
      const result = await model.generateContent(userText);
      const response = await result.response;
      return response.text() || "أنا هنا معك، هل يمكنك إخباري بالمزيد؟";
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return "عذراً يا صديقي، يبدو أنني أحتاج لثانية للتفكير. ماذا كنت تقول؟";
    }
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

        // For Gemini Pro Vision or similar, you'd send the image. 
        // For Flash, we simulate a warm response about the image.
        setTimeout(() => {
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'يا لها من صورة جميلة جداً! الصور دائماً تحمل ذكريات غالية. هل تحب أن تحكي لي قصة هذه الصورة؟',
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
          title: 'رفيقك الذكي (Google Gemini)',
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: dynamicColors.backgroundLight },
          headerShadowVisible: false,
          headerTitleStyle: { color: dynamicColors.textDark, fontSize: SIZES.h3 },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.padding }}>
              <MaterialCommunityIcons name="chevron-right" size={28} color={dynamicColors.textDark} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => scrollToBottom()}
          scrollEventThrottle={16}
        />

        <View style={[styles.inputContainer, { backgroundColor: dynamicColors.backgroundLight }]}>
          <View style={[styles.inputWrapper, { backgroundColor: dynamicColors.card, borderColor: dynamicColors.border }]}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={handlePickImage}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="image-plus" size={24} color={dynamicColors.primary} />
            </TouchableOpacity>

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
                <MaterialCommunityIcons name="send" size={20} color={dynamicColors.textLight} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesList: { 
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
    paddingBottom: SIZES.padding * 2,
  },
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
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: SIZES.radius - 5,
    marginBottom: SIZES.base,
  },
  messageText: {
    fontSize: SIZES.body,
    lineHeight: SIZES.body * 1.5,
    fontWeight: FONTS.regular,
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
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    borderRadius: SIZES.radius,
    borderWidth: 1,
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.base / 2,
    minHeight: 50,
  },
  imageButton: {
    padding: SIZES.base,
    marginLeft: SIZES.base / 2,
  },
  input: {
    flex: 1,
    fontSize: SIZES.body,
    maxHeight: 100,
    marginHorizontal: SIZES.base,
    paddingVertical: SIZES.base,
    textAlign: 'right',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
