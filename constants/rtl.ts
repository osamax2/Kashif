import * as RN from 'react-native';
import { StyleSheet } from 'react-native';

// Safe I18nManager access
const I18nManager = RN.I18nManager || { isRTL: false, allowRTL: () => {}, forceRTL: () => {} };

// Enable RTL support for Arabic
try {
  if (I18nManager && typeof I18nManager.allowRTL === 'function') {
    I18nManager.allowRTL(true);
  }
} catch (e) {
  console.warn('I18nManager not available');
}

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
  try {
    if (I18nManager && typeof I18nManager.forceRTL === 'function' && I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }
  } catch (e) {
    console.warn('I18nManager.forceRTL not available');
  }
};

// Safe getter for isRTL
export const getIsRTL = (): boolean => {
  try {
    return I18nManager?.isRTL ?? false;
  } catch (e) {
    return false;
  }
};
