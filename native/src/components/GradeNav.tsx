import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  DeviceEventEmitter,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { Theme } from '../theme/theme';

const GRADES = ['3학년 1학기', '4학년 1학기', '5학년 1학기', '6학년 1학기'];
export const GRADE_CHANGE_EVENT = 'grade_change';

export function GradeNav() {
  const [selectedGrade, setSelectedGrade] = useState('3학년 1학기');

  useEffect(() => {
    // Initial load
    AsyncStorage.getItem('selectedGrade').then(val => {
      if (val) setSelectedGrade(val);
    });

    // Listen for changes from other components (if any)
    const subscription = DeviceEventEmitter.addListener(GRADE_CHANGE_EVENT, (newGrade) => {
      setSelectedGrade(newGrade);
    });

    return () => subscription.remove();
  }, []);

  const handleGradePress = async (grade: string) => {
    setSelectedGrade(grade);
    await AsyncStorage.setItem('selectedGrade', grade);
    DeviceEventEmitter.emit(GRADE_CHANGE_EVENT, grade);
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
        <View style={styles.navRow}>
          {GRADES.map((grade) => (
            <TouchableOpacity
              key={grade}
              style={[
                styles.tab,
                selectedGrade === grade && styles.tabActive
              ]}
              onPress={() => handleGradePress(grade)}
              activeOpacity={0.7}
            >
              <Text 
                style={[
                  styles.text,
                  selectedGrade === grade && styles.textActive
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {grade}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 115, // Under Navbar
    left: 0,
    width: '100%',
    zIndex: 900,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  blurContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  navRow: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingHorizontal: 2,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  tabActive: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    borderColor: Theme.colors.accent,
    // Note: React Native shadow is different from web filter: drop-shadow
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    color: Theme.colors.textMuted,
    fontSize: width < 380 ? 11 : 12,
    fontFamily: Theme.fonts.bold,
    textAlign: 'center',
  },
  textActive: {
    color: Theme.colors.accent,
  }
});
