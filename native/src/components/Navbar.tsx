import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme/theme';
import { Headphones, PenTool } from 'lucide-react-native';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const isScramble = pathname.includes('scramble');

  return (
    <View style={styles.container}>
      <BlurView intensity={25} tint="dark" style={styles.segmentedControl}>
        <TouchableOpacity 
          style={styles.itemWrapper}
          onPress={() => router.replace('/')}
          activeOpacity={0.8}
        >
          {!isScramble ? (
            <LinearGradient
              colors={['#38bdf8', '#818cf8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeGradient}
            >
              <Headphones size={18} color={Theme.colors.backgroundDeep} />
              <Text style={styles.activeText}>듣기 / 읽기</Text>
            </LinearGradient>
          ) : (
            <View style={styles.item}>
              <Headphones size={18} color={Theme.colors.textSecondary} />
              <Text style={styles.text}>듣기 / 읽기</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.itemWrapper}
          onPress={() => router.replace('/scramble')}
          activeOpacity={0.8}
        >
          {isScramble ? (
            <LinearGradient
              colors={['#38bdf8', '#818cf8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeGradient}
            >
              <PenTool size={18} color={Theme.colors.backgroundDeep} />
              <Text style={styles.activeText}>쓰기 연습</Text>
            </LinearGradient>
          ) : (
            <View style={styles.item}>
              <PenTool size={18} color={Theme.colors.textSecondary} />
              <Text style={styles.text}>쓰기 연습</Text>
            </View>
          )}
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    width: '100%',
    zIndex: 1000,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 50,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  itemWrapper: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 40,
    justifyContent: 'center',
  },
  activeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 40,
    justifyContent: 'center',
    // Glow effect
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  text: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    letterSpacing: -0.4,
  },
  activeText: {
    color: Theme.colors.backgroundDeep,
    fontSize: 14,
    fontFamily: Theme.fonts.extraBold,
    letterSpacing: -0.5,
  }
});
