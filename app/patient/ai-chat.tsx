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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import { COLORS } from '../../constants/theme';
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

const GEMINI_API_KEY =
  Constants.expoConfig?.extra?.geminiApiKey ||
  process.env.GEMINI_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

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

  const flatListRef = useRef<any>(null);

  const getGeminiResponse = async (text: string) => {
    if (!genAI) return "أنا هنا معك ❤️";

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
      });

      const chat = model.startChat({
        history: [],
      });

      const result = await chat.sendMessage(text);
      return (await result.response).text();
    } catch (e) {
      return "صار خطأ بسيط، بس أنا معك ❤️";
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
        <KeyboardAwareFlatList
innerRef={(ref) => {
  flatListRef.current = ref;
}}          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 100,
          }}
        />

        {isLoading && (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text>يكتب...</Text>
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
    alignSelf: 'flex-start',
  },

  aiMessage: {
    alignSelf: 'flex-end',
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
  },

  loading: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 60,
  },
});