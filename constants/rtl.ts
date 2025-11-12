import { I18nManager, StyleSheet } from 'react-native';

// Setze standardmäßig LTR
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export const rtlStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexGrow: 1,
    direction: 'ltr',
  },
  scrollContent: {
    flexGrow: 1,
    direction: 'ltr',
  },
  rowReverse: {
    flexDirection: 'row',
  },
  textRight: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
});

export const ensureRTL = () => {
  if (I18nManager.isRTL) {
    I18nManager.forceRTL(false);
  }
};
