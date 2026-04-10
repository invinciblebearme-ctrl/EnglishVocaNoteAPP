import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  SafeAreaView,
  Dimensions,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../../src/theme/theme';
import allRounds from '../../src/data/all_rounds.json';
import { base64Decode } from '../../src/utils/base64';

const { width, height: screenHeight } = Dimensions.get('window');

// Responsive scaling helpers
const headerPadding = 190; // Fixed space for Navbar + GradeNav
const gameCardMinHeight = screenHeight * 0.55; // Fluid min-height
const spacingSm = screenHeight * 0.015;
const spacingMd = screenHeight * 0.03;

export default function ScrambleGame() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [scrambled, setScrambled] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{level: number, message: string} | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const roundData = useMemo(() => allRounds.find(r => r.id === parseInt(id as string)), [id]);
  const currentWord = roundData?.words[index];

  // Shuffle algorithm
  const shuffleWord = (word: string): string[] => {
    let arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (arr.join('') === word && word.length > 1) return shuffleWord(word);
    return arr;
  };

  useEffect(() => {
    if (currentWord) {
      setScrambled(shuffleWord(currentWord.en.toLowerCase()));
      setUserInput('');
      setFeedback(null);
      setShowImage(false);
      setIsImageLoading(false);
    }
  }, [index, currentWord]);

  if (!roundData) return null;

  const handleCheck = () => {
    if (!currentWord) return;
    if (userInput.toLowerCase().trim() === currentWord.en.toLowerCase().trim()) {
      setFeedback({ level: 3, message: 'Excellent! ⭐⭐⭐' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleSpeak();
      setShowImage(true);
    } else {
      setFeedback({ level: 1, message: 'Try Again! ⭐' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleShowImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowImage(true);
    setIsImageLoading(true);
    setTimeout(() => {
      setIsImageLoading(false);
    }, 800);
  };

  const handleSpeak = () => {
    if (!currentWord) return;
    Speech.speak(currentWord.en, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
    });
  };

  const nextWord = () => {
    if (index < roundData.words.length - 1) {
      setIndex(index + 1);
    } else {
      alert("모든 단어를 마쳤습니다! 참 잘하셨어요!");
      router.replace('/scramble');
    }
  };

  const prevWord = () => {
    if (index > 0) setIndex(index - 1);
  };

  const handleLetterClick = (letter: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUserInput(prev => prev + letter);
  };

  const imgUrl = currentWord ? `https://englishvocanote.pages.dev/${base64Decode(currentWord.img)}` : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {roundData.category}
            </Text>
            <Text style={styles.indexText}>단어 {index + 1} / {roundData.words.length}</Text>
          </View>

          <View style={styles.cardContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)'] as const}
              style={styles.card}
            >
              <Text style={styles.wordKo}>{currentWord?.ko}</Text>

              <View style={[styles.imageArea, { height: showImage ? screenHeight * 0.15 : 20 }]}>
                {showImage && (
                  isImageLoading ? (
                    <ActivityIndicator size="small" color={Theme.colors.accent} />
                  ) : (
                    imgUrl && (
                      <View style={styles.imageWrapper}>
                        <Image source={{ uri: imgUrl }} style={styles.wordImage} resizeMode="contain" />
                      </View>
                    )
                  )
                )}
              </View>

              <View style={styles.scrambledArea}>
                {scrambled.map((char, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={styles.letterCard} 
                    onPress={() => handleLetterClick(char)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['rgba(99, 102, 241, 0.2)', 'rgba(99, 102, 241, 0.1)'] as const}
                      style={styles.letterGradient}
                    >
                      <Text style={styles.letterText}>{char}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.scrambleInput}
                  value={userInput}
                  onChangeText={setUserInput}
                  placeholder="단어를 완성하세요..."
                  placeholderTextColor={Theme.colors.textMuted}
                  autoCapitalize="none"
                  onSubmitEditing={handleCheck}
                />
                <View style={styles.inputBorder} />
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setUserInput('')}>
                  <LinearGradient colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'] as const} style={styles.btnInner}>
                    <Text style={styles.btnText}>지우기</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, styles.checkBtn]} onPress={handleCheck}>
                  <LinearGradient colors={Theme.gradients.accent as any} style={styles.btnInner}>
                    <Text style={styles.btnTextDark}>정답 확인</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {!showImage && (
                <TouchableOpacity style={styles.viewImgBtn} onPress={handleShowImage}>
                  <Text style={styles.viewImgText}>📸 단어 이미지 보기</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          <View style={styles.bottomSection}>
            {feedback && (
              <View style={[styles.feedback, feedback.level === 3 ? styles.feedbackSuccess : styles.feedbackError]}>
                <Text style={styles.feedbackText}>{feedback.message}</Text>
              </View>
            )}

            <View style={styles.navigation}>
              <TouchableOpacity style={styles.navBtn} onPress={prevWord}>
                <Text style={styles.navText}>← 이전</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={nextWord}>
                <Text style={styles.navText}>다음 →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={handleSpeak}>
                <Text style={styles.navText}>발음 듣기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => router.replace('/scramble')}>
                <Text style={styles.navText}>목록으로</Text>
              </TouchableOpacity>
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
    paddingBottom: spacingMd,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Theme.fonts.extraBold,
    color: '#fff',
    letterSpacing: -1,
  },
  indexText: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    fontFamily: Theme.fonts.semiBold,
    marginTop: 4,
    letterSpacing: -0.4,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    borderRadius: 32,
    padding: 24,
    minHeight: gameCardMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  wordKo: {
    fontSize: 28,
    fontFamily: Theme.fonts.krBold,
    color: Theme.colors.amber,
    marginBottom: spacingSm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  imageArea: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingSm,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  wordImage: {
    width: '100%',
    height: '100%',
  },
  scrambledArea: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacingSm,
  },
  letterCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  letterGradient: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterText: {
    fontSize: 18,
    color: '#fff',
    fontFamily: Theme.fonts.bold,
  },
  inputWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: spacingSm,
  },
  scrambleInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    color: '#fff',
    fontSize: 18,
    fontFamily: Theme.fonts.semiBold,
    textAlign: 'center',
  },
  inputBorder: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: Theme.colors.accent,
    opacity: 0.3,
    borderRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: spacingSm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  checkBtn: {
    flex: 1.5,
  },
  btnInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
  },
  btnTextDark: {
    color: Theme.colors.backgroundDeep,
    fontSize: 15,
    fontFamily: Theme.fonts.extraBold,
  },
  viewImgBtn: {
    padding: 10,
  },
  viewImgText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontFamily: Theme.fonts.semiBold,
    textDecorationLine: 'underline',
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  feedback: {
    marginTop: spacingSm,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  feedbackError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  feedbackText: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#fff',
  },
  navigation: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginTop: spacingSm,
  },
  navBtn: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  navText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontFamily: Theme.fonts.semiBold,
  }
});
