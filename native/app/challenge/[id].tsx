import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  SafeAreaView,
  Dimensions,
  Animated,
  ScrollView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Theme } from '../../src/theme/theme';
import allRounds from '../../src/data/all_rounds.json';
import { base64Decode } from '../../src/utils/base64';
import { 
  ExpoSpeechRecognitionModule, 
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionResultEvent,
  type ExpoSpeechRecognitionErrorEvent
} from 'expo-speech-recognition';

const { width, height: screenHeight } = Dimensions.get('window');

// Responsive scaling helpers
const headerPadding = screenHeight * 0.14; 
const cardHeight = screenHeight * 0.22;
const spacingSm = screenHeight * 0.015;

export default function WordChallenge() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [showingEnglish, setShowingEnglish] = useState(true);
  const [pronunciationScore, setPronunciationScore] = useState<{level: number, transcript: string} | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  
  useSpeechRecognitionEvent('start', () => setIsCapturing(true));
  useSpeechRecognitionEvent('end', () => setIsCapturing(false));
  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const transcript = event.results[0]?.transcript.toLowerCase().trim() || '';
    if (!transcript || !currentWord) return;

    const target = currentWord.en.toLowerCase().trim();
    let level = 1; // Try Again
    
    if (transcript === target) {
      level = 3; // Excellent
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (transcript.includes(target) || target.includes(transcript)) {
      level = 2; // Good
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setPronunciationScore({ transcript, level });
  });

  useSpeechRecognitionEvent('error', (event: ExpoSpeechRecognitionErrorEvent) => {
    console.error('Speech Recognition Error:', event.error, event.message);
    setIsCapturing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const roundData = allRounds.find(r => r.id === parseInt(id as string));
  const currentWord = roundData?.words[index];

  const speak = (text: string) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const triggerFadeEffect = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  // 1. Initial Load & Word Change: Auto Speak + Reset + Trigger Fade
  useEffect(() => {
    if (currentWord) {
      speak(currentWord.en);
      setShowingEnglish(true); // Reset to En
      setPronunciationScore(null); // Reset pronunciation result
      triggerFadeEffect();
    }
  }, [index, id]);

  // 2. Auto-hide pronunciation result after 3 seconds
  useEffect(() => {
    if (pronunciationScore) {
      const timeout = setTimeout(() => {
        setPronunciationScore(null);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [pronunciationScore]);

  // 2. Default Infinite Blinker: 1.5s Toggle (Fade applied to TEXT CARD only)
  useEffect(() => {
    timerRef.current = setInterval(() => {
      triggerFadeEffect();
      setTimeout(() => {
        setShowingEnglish(prev => !prev);
      }, 200);
    }, 1500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [index]);

  const nextWord = () => {
    if (!roundData) return;
    if (index < roundData.words.length - 1) {
      setIndex(prev => prev + 1);
    } else {
      alert("🎉 모든 단어를 마쳤습니다! 참 잘하셨어요!");
      router.back();
    }
  };

  const prevWord = () => {
    if (index > 0) {
      setIndex(prev => prev - 1);
    }
  };

  const handleSTT = async () => {
    if (isCapturing) {
      ExpoSpeechRecognitionModule.stop();
    } else {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        alert("마이크 사용 권한이 필요합니다.");
        return;
      }
      
      setPronunciationScore(null);
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: false,
      });
    }
  };

  if (!roundData || !currentWord) return null;

  const imgUrl = `https://englishvocanote.pages.dev/${base64Decode(currentWord.img)}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.roundLabel}>[{roundData.id}회]</Text>
            <Text style={styles.indexText}>단어 {index + 1} / {roundData.words.length}</Text>
          </View>

          <View style={styles.cardContainer}>
            {/* Optimized: Only the text card fades during En/Ko toggle */}
            <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] as const}
                style={styles.cardInner}
              >
                <BlurView intensity={10} style={StyleSheet.absoluteFill} tint="dark" />
                {showingEnglish ? (
                  <Text style={styles.wordEn}>{currentWord.en}</Text>
                ) : (
                  <Text style={styles.wordKo}>{currentWord.ko}</Text>
                )}
              </LinearGradient>
            </Animated.View>

            {/* Optimized: Image stays fixed and solid during the 1.5s blinker cycle */}
            <View style={styles.imageWrapperFree}>
              <View style={styles.imageAreaFree}>
                <Image 
                  source={{ uri: imgUrl }} 
                  style={styles.wordImageFree}
                  resizeMode="contain"
                />
              </View>
              {(currentWord as any)?.sentence && (
                <Text style={styles.sentenceTextFree}>{(currentWord as any).sentence}</Text>
              )}
            </View>
          </View>

          <View style={styles.bottomSection}>
            {pronunciationScore && (
              <View style={[styles.sttFeedback, styles[`sttLevel${pronunciationScore.level}` as keyof typeof styles]] as any}>
                <Text style={styles.feedbackTextMain}>
                  {pronunciationScore.level === 3 && "Excellent! ⭐⭐⭐"}
                  {pronunciationScore.level === 2 && "Good Job! ⭐⭐"}
                  {pronunciationScore.level === 1 && "Try Again! ⭐"}
                </Text>
                <Text style={styles.transcriptText}>"{pronunciationScore.transcript}"</Text>
              </View>
            )}

            <View style={styles.navActionsRow}>
              <TouchableOpacity style={styles.navBtnGlass} onPress={prevWord}>
                <Text style={styles.navBtnText}>이전</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtnGlass} onPress={nextWord}>
                <Text style={styles.navBtnText}>다음</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtnGlass} onPress={() => speak(currentWord.en)}>
                <Text style={styles.navBtnText}>발음 듣기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtnGlass} onPress={() => router.back()}>
                <Text style={styles.navBtnText}>목록으로</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.micContainer}>
              <LinearGradient
                colors={isCapturing ? (['#ef4444', '#b91c1c']) as any : (['#ef4444', '#dc2626']) as any}
                style={[styles.micButtonGradient, isCapturing && styles.micButtonListening]}
              >
                <TouchableOpacity 
                  style={styles.micButton}
                  activeOpacity={0.8}
                  onPress={handleSTT}
                >
                  <Text style={styles.micButtonText}>
                    {isCapturing ? "🎤 인식중..." : "🎤 발음하기"}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
              <Text style={styles.chromeHint}>버튼을 누르고 영어로 말씀하세요</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundDeep,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: headerPadding,
    paddingHorizontal: 20,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    width: '100%',
  },
  roundLabel: {
    fontSize: 28,
    fontFamily: Theme.fonts.extraBold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  indexText: {
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: spacingSm,
    letterSpacing: -0.4,
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: width * 0.85,
    maxWidth: 320,
    height: cardHeight,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: spacingSm * 1.5,
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordKo: {
    fontSize: 34,
    fontFamily: Theme.fonts.krBold,
    color: '#fbbf24', 
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingHorizontal: 20,
  },
  wordEn: {
    fontSize: 34,
    fontFamily: Theme.fonts.bold,
    color: '#38bdf8',
    textAlign: 'center',
    letterSpacing: 1,
    paddingHorizontal: 20,
  },
  imageWrapperFree: {
    width: width * 0.9,
    maxWidth: 360,
    alignItems: 'center',
    marginTop: spacingSm,
  },
  imageAreaFree: {
    width: width * 0.75,
    height: cardHeight * 0.9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  wordImageFree: {
    width: '100%',
    height: '100%',
  },
  sentenceTextFree: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 15,
    paddingHorizontal: 20,
    opacity: 0.8,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  sttFeedback: {
    width: width * 0.85,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  sttLevel3: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  sttLevel2: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  sttLevel1: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  feedbackTextMain: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#fff',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
  navActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  navBtnGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  navBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#fff',
    textAlign: 'center',
  },
  micContainer: {
    marginTop: spacingSm + 15,
    alignItems: 'center',
    width: '100%',
  },
  micButtonGradient: {
    width: width * 0.8,
    borderRadius: 100,
    padding: 1,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  micButtonListening: {
    shadowOpacity: 0.5,
    shadowRadius: 20,
    transform: [{ scale: 1.05 }],
  },
  micButton: {
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  micButtonText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: Theme.fonts.extraBold,
  },
  chromeHint: {
    marginTop: 10,
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
  }
});
