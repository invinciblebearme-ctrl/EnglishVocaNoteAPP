import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  DeviceEventEmitter,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../src/theme/theme';
import allRounds from '../src/data/all_rounds.json';
import { base64Decode } from '../src/utils/base64';
import { GRADE_CHANGE_EVENT } from '../src/components/GradeNav';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('3학년 1학기');
  const [filteredRounds, setFilteredRounds] = useState(allRounds);
  const router = useRouter();

  useEffect(() => {
    // Initial grade load
    AsyncStorage.getItem('selectedGrade').then(val => {
      if (val) setSelectedGrade(val);
    });

    // Listen for grade changes
    const subscription = DeviceEventEmitter.addListener(GRADE_CHANGE_EVENT, (grade) => {
      setSelectedGrade(grade);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const filtered = allRounds.filter(round => {
      const matchSearch = 
        round.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        round.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        round.words.some(word => 
          word.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
          word.ko.includes(searchTerm)
        );
      
      if (searchTerm) {
        return matchSearch;
      } else {
        return round.grade === selectedGrade && matchSearch;
      }
    });

    setFilteredRounds(filtered);
  }, [searchTerm, selectedGrade]);

  const gradesToShow = searchTerm 
    ? [...new Set(filteredRounds.map(r => r.grade))]
    : [selectedGrade];

  const handlePress = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/challenge/${id}`);
  };

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>초등영어활용노트 어휘</Text>
        
        <View style={styles.searchWrapper}>
          <LinearGradient
            colors={['rgba(56, 189, 248, 0.1)', 'rgba(56, 189, 248, 0.05)'] as const}
            style={styles.searchContainer}
          >
            <TextInput
              style={styles.searchInput}
              placeholder="회차 또는 주제 검색..."
              placeholderTextColor={Theme.colors.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm !== '' && (
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => setSearchTerm('')}
              >
                <Text style={styles.resetText}>초기화</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
      </View>

      {filteredRounds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
        </View>
      ) : (
        gradesToShow.map((grade) => {
          const roundsInGrade = filteredRounds.filter(r => r.grade === grade);
          if (roundsInGrade.length === 0) return null;
          
          const themesInGrade = [...new Set(roundsInGrade.map(r => r.category))];
          
          return (
            <View key={grade} style={styles.gradeSection}>
              {searchTerm && <Text style={styles.gradeHeader}>{grade}</Text>}
              
              {themesInGrade.map(theme => (
                <View key={theme} style={styles.themeGroup}>
                  <Text style={styles.themeTitle}>{theme}</Text>
                  <View style={styles.gridContainer}>
                    {roundsInGrade
                      .filter(r => r.category === theme)
                      .map(round => (
                        <TouchableOpacity 
                          key={round.id} 
                          style={styles.item}
                          onPress={() => handlePress(round.id)}
                          activeOpacity={0.6}
                        >
                          <View style={styles.imageWrapper}>
                            <View style={styles.imageInner}>
                              <Image 
                                source={{ uri: `https://englishvocanote.pages.dev/${base64Decode(round.words[0].img)}` }} 
                                style={styles.roundImg}
                                resizeMode="contain"
                              />
                            </View>
                            <View style={styles.imageBorder} />
                          </View>
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundDeep,
  },
  container: {
    paddingTop: 180, // Space for Navbar + GradeNav
    paddingBottom: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  title: {
    fontSize: 26,
    color: '#fff',
    fontFamily: Theme.fonts.extraBold,
    textAlign: 'center',
    marginBottom: 25,
    letterSpacing: -0.5,
  },
  searchWrapper: {
    width: 280,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: Theme.colors.textPrimary,
    fontFamily: Theme.fonts.semiBold,
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 4,
  },
  resetText: {
    color: Theme.colors.accent,
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
  },
  gradeSection: {
    width: '100%',
    marginBottom: 30,
  },
  gradeHeader: {
    fontSize: 20,
    fontFamily: Theme.fonts.extraBold,
    color: Theme.colors.accent,
    paddingHorizontal: 25,
    marginBottom: 15,
    marginTop: 10,
  },
  themeGroup: {
    width: '100%',
    marginBottom: 25,
    alignItems: 'center',
  },
  themeTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: Theme.colors.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'center',
    gap: 15,
  },
  item: {
    width: 90,
    alignItems: 'center',
    marginBottom: 10,
  },
  imageWrapper: {
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageInner: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  imageBorder: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.1)',
    pointerEvents: 'none',
  },
  roundImg: {
    width: 72,
    height: 72,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 16,
    fontFamily: Theme.fonts.semiBold,
  }
});
