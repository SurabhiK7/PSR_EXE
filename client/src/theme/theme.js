import { createLightTheme } from '@fluentui/react-components';

// Brand ramp based on a corporate blue (#0B5FBF family) to match the
// "clean white background with blue accents" enterprise design direction.
const brandRamp = {
  10: '#020306',
  20: '#0B1526',
  30: '#0E2140',
  40: '#0F2C57',
  50: '#0F386F',
  60: '#0D4488',
  70: '#0851A1',
  80: '#0060BB',
  90: '#0B6FCE',
  100: '#2B80D6',
  110: '#4790DC',
  120: '#5FA0E2',
  130: '#76AFE8',
  140: '#8CBFEC',
  150: '#A3CEF1',
  160: '#BADDF5',
};

export const pcpTheme = createLightTheme(brandRamp);

pcpTheme.colorNeutralBackground1 = '#FFFFFF';
pcpTheme.colorNeutralBackground2 = '#F7F9FB';
pcpTheme.colorNeutralBackground3 = '#F0F3F7';
pcpTheme.fontFamilyBase =
  "'Segoe UI', Inter, -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif";

// Unify Fluent's own control chrome (buttons, inputs, dropdowns, menus) with the custom
// card/table system above - by default Fluent's corner radius and border/text colors are
// close but not identical to the hand-rolled --pcp-* values, and the mismatch is a big part
// of why the app can read as "generic" rather than deliberately designed.
pcpTheme.borderRadiusMedium = '8px';
pcpTheme.borderRadiusLarge = '10px';
pcpTheme.colorNeutralStroke1 = '#D7DCE3';
pcpTheme.colorNeutralStroke1Hover = '#B9C1CC';
pcpTheme.colorNeutralStroke1Pressed = '#9AA5B3';
pcpTheme.colorNeutralForeground1 = '#1F2937';
pcpTheme.colorNeutralForeground2 = '#4B5768';
pcpTheme.colorNeutralForeground3 = '#6B7684';


// Clean neutral palette for the sidebar / chrome — plain white background with
// restrained charcoal accents, matching a classic, understated enterprise look.
export const sidebarTheme = {
  bgTop: '#FFFFFF',
  bgBottom: '#FFFFFF',
  border: '#E3E7ED',
  text: '#4B5768',
  textMuted: '#8E97A6',
  textActive: '#0F1B2D',
  hoverBg: '#F4F6F9',
  activeBg: '#EEF1F5',
  accent: '#0F1B2D',
};

export const stageColors = {
  Initiation: { fg: '#5B6472', bg: '#EEF0F3', border: '#C7CCD3' },
  Planning: { fg: '#0851A1', bg: '#EAF3FC', border: '#9BC4EE' },
  'In Progress': { fg: '#0E7A2E', bg: '#E6F4EA', border: '#9BD8AE' },
  'On Hold': { fg: '#8A5A00', bg: '#FFF4E0', border: '#F2C46A' },
  Completed: { fg: '#0E7A2E', bg: '#E6F4EA', border: '#9BD8AE' },
  Closed: { fg: '#5B6472', bg: '#EEF0F3', border: '#C7CCD3' },
};

export const ragColors = {
  Green: { fg: '#0E7A2E', bg: '#E6F4EA', border: '#9BD8AE' },
  Yellow: { fg: '#8A5A00', bg: '#FFF4E0', border: '#F2C46A' },
  Red: { fg: '#B0272B', bg: '#FCE8E8', border: '#EFA6A8' },
  Blue: { fg: '#0851A1', bg: '#EAF3FC', border: '#9BC4EE' },
};

// What each milestone RAG status color actually means - shown as the badge label instead of
// the raw color name so users don't have to memorize what "Blue" or "Yellow" stands for.
export const ragMeanings = {
  Green: 'In Progress',
  Yellow: 'Not Started',
  Red: 'Critical Risk',
  Blue: 'Completed',
};

export const impactColors = {
  Low: { fg: '#0E7A2E', bg: '#E6F4EA', border: '#9BD8AE' },
  Medium: { fg: '#8A5A00', bg: '#FFF4E0', border: '#F2C46A' },
  High: { fg: '#B0272B', bg: '#FCE8E8', border: '#EFA6A8' },
  Critical: { fg: '#7A1418', bg: '#FCE8E8', border: '#EFA6A8' },
};
