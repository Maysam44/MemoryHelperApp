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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../constants/ThemeContext';
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  imageUri?: string;
}

// AI Response patterns based on user input
const generateContextualResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  // Health-related responses
  if (lowerMessage.includes('صحة') || lowerMessage.includes('ألم') || lowerMessage.includes('مرض')) {
    return 'أنا قلق على صحتك. هل تريد أن تخبرني أكثر عن الأعراض التي تشعر بها؟ قد أساعدك في فهم الموقف بشكل أفضل.';
  }
  
  // Memory-related responses
  if (lowerMessage.includes('ذكرى') || lowerMessage.includes('تذكر') || lowerMessage.includes('نسيت')) {
    return 'الذكريات مهمة جداً. يمكنك الاطلاع على بنك الذكريات الخاص بك لاسترجاع الأشخاص والأماكن المهمة. هل تريد مساعدة في البحث عن ذكرى معينة؟';
  }
  
  // Greeting responses
  if (lowerMessage.includes('مرحبا') || lowerMessage.includes('السلام') || lowerMessage.includes('كيف حالك')) {
    return 'مرحباً! أنا بخير، شكراً لسؤالك. كيف حالك أنت اليوم؟ هل هناك شيء أستطيع مساعدتك به؟';
  }
  
  // Family-related responses
  if (lowerMessage.includes('عائلة') || lowerMessage.includes('أهل') || lowerMessage.includes('أطفال') || lowerMessage.includes('زوج') || lowerMessage.includes('والد')) {
    return 'عائلتك مهمة جداً. يمكنك مشاركة صورهم وقصصهم في بنك الذكريات. هل تريد أن تخبرني عن شخص مهم في حياتك؟';
  }
  
  // Time-related responses
  if (lowerMessage.includes('وقت') || lowerMessage.includes('ساعة') || lowerMessage.includes('يوم') || lowerMessage.includes('أمس')) {
    return 'الوقت يمر بسرعة. ما الذي تتذكره من اليوم؟ أم أنك تريد أن تخطط لشيء في المستقبل القريب؟';
  }
  
  // Help/assistance responses
  if (lowerMessage.includes('ساعد') || lowerMessage.includes('أحتاج') || lowerMessage.includes('مساعدة') || lowerMessage.includes('كيف')) {
    return 'أنا هنا لمساعدتك! يمكنك أن تسأل عن أي شيء، أو تشارك صورك وذكرياتك. ماذا تحتاج؟';
  }
  
  // Default response
  return `شكراً لك على قول: "${userMessage}". هذا موضوع مهم. هل يمكنك أن تخبرني المزيد عن هذا؟`;
};

export default function AIChatScreen() {
  const router = useRouter();
  const { dynamicColors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'مرحباً! أنا مساعدك الذكي. أنا هنا لمساعدتك والاستماع إليك. كيف يمكنني مساعدتك اليوم؟',
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

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = inputText;
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Generate contextual response based on user input
      const aiResponseText = generateContextualResponse(userInput);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      scrollToBottom();
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الحصول على الرد. حاول مرة أخرى.');
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
          text: 'لقد شاركت صورة معك',
          sender: 'user',
          timestamp: new Date(),
          imageUri,
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        scrollToBottom();

        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: 'شكراً لمشاركة هذه الصورة معي! إنها جميلة جداً. هل تريد أن تخبرني قصة عن هذه الصورة؟',
            sender: 'ai',
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, aiMessage]);
          scrollToBottom();
        } finally {
          setIsLoading(false);
        }
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
        });
        setIsSpeaking(false);
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في تشغيل الصوت.');
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
          disabled={isSpeaking}
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
          title: 'الدردشة مع المساعد الذكي',
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

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        scrollEnabled={true}
        onContentSizeChange={() => scrollToBottom()}
        scrollEventThrottle={16}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
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
    borderTopColor: COLORS.border,
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
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
