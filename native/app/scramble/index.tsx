import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../src/theme/theme';
import allRounds from '../../src/data/all_rounds.json';
import { base64Decode } from '../../src/utils/base64';

const { width } = Dimensions.get('window');

const RANGES = ['전체', '1-20', '21-40', '41-60', '61-80'];

export default function ScrambleHome() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRange, setSelectedRange] = useState('전체');
  const [filteredRounds, setFilteredRounds] = useState(allRounds);
  const router = useRouter();

  useEffect(() => {
    let filtered = allRounds;

    // Filter by Search
    if (searchTerm !== '') {
      filtered = filtered.filter(round => 
        round.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        round.words.some(word => 
          word.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
          word.ko.includes(searchTerm)
        )
      );
    }

    // Filter by Range
    if (selectedRange !== '전체') {
      const [start, end] = selectedRange.split('-').map(Number);
      filtered = filtered.filter(round => round.id >= start && round.id <= end);
    }

    setFilteredRounds(filtered);
  }, [searchTerm, selectedRange]);

  const categories = [...new Set(allRounds.map(r => r.category))];

  const handleRangeChange = (range: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRange(range);
  };

  const handlePress = (id: number) => {
    router.push(`/scramble/${id}`);
  };

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>오늘의 영단어로 {"\n"} 실력 Up (쓰기)</Text>
        
        <View style={styles.searchWrapper}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(99, 102, 241, 0.05)'] as const}
            style={styles.searchContainer}
          >
            <TextInput
              style={styles.searchInput}
              placeholder="스크램블 회차 검색..."
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

        {/* Range Tabs */}
        <View style={styles.tabsWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {RANGES.map((range) => (
              <TouchableOpacity
                key={range}
                style={[styles.tabButton, selectedRange === range && styles.tabButtonActive]}
                onPress={() => handleRangeChange(range)}
              >
                <Text style={[styles.tabText, selectedRange === range && styles.tabTextActive]}>
                  {range}
                </Text>
                {selectedRange === range && (
                  <View style={styles.tabIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {categories.map((category) => (
        <View key={category} style={styles.categoryContainer}>
          <View style={styles.gridContainer}>
            {filteredRounds
              .filter(r => r.category === category)
              .slice(0, 80)
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
                  <Text style={styles.itemName}>
                    {round.name.replace(/Today's Word|오늘의 영단어/g, '').trim().replace(/\[(.*?)회\]/g, '$1회').replace(/ /g, '\n')}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundDeep,
  },
  container: {
    paddingTop: 140,
    paddingBottom: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontFamily: Theme.fonts.extraBold,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 36,
  },
  searchWrapper: {
    width: 280,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    marginBottom: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
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
    color: Theme.colors.indigo,
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
  },
  tabsWrapper: {
    width: '100%',
    paddingVertical: 10,
  },
  tabsContainer: {
    paddingHorizontal: 15,
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
    alignItems: 'center',
  },
  tabButtonActive: {
    // Optional
  },
  tabText: {
    color: Theme.colors.textMuted,
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 25,
    height: 3,
    backgroundColor: Theme.colors.indigo,
    borderRadius: 4,
    shadowColor: Theme.colors.indigo,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  categoryContainer: {
    width: '100%',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: '2.5%',
    justifyContent: 'flex-start',
  },
  item: {
    width: '25%',
    alignItems: 'center',
    marginVertical: 12,
    minHeight: 130,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageInner: {
    width: 74,
    height: 74,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  imageBorder: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    pointerEvents: 'none',
  },
  roundImg: {
    width: 68,
    height: 68,
  },
  itemName: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 14,
    color: Theme.colors.textSecondary,
    fontFamily: Theme.fonts.bold,
    lineHeight: 18,
    letterSpacing: -0.5,
  }
});
