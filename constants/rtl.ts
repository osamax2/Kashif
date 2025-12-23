import { I18nManager, StyleSheet } from 'react-native';

// Enable RTL support for Arabic
I18nManager.allowRTL(true);

export const rtlStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
  textLeft: {
    textAlign: 'left',
  },
});

export const ensureRTL = (isRTL: boolean) => {
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
  }
};
