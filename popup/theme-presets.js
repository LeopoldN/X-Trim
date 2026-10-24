const themePresets = {
  "dim": [
    "Dim",
    "#15202B",
    "#1E2732",
    "#F7F9F9",
    "#8B98A5",
    "#38444D",
    "#1D9BF0"
  ],
  "tokyo-night": [
    "Tokyo Night",
    "#1A1B26",
    "#24283B",
    "#C0CAF5",
    "#A9B1D6",
    "#414868",
    "#7AA2F7"
  ],
  "rose-pine": [
    "Rosé Pine",
    "#191724",
    "#1F1D2E",
    "#E0DEF4",
    "#908CAA",
    "#403D52",
    "#C4A7E7"
  ],
  "catppuccin-mocha": [
    "Catppuccin Mocha",
    "#1E1E2E",
    "#313244",
    "#CDD6F4",
    "#A6ADC8",
    "#45475A",
    "#CBA6F7"
  ],
  "dracula": [
    "Dracula",
    "#282A36",
    "#44475A",
    "#F8F8F2",
    "#BD93F9",
    "#6272A4",
    "#BD93F9"
  ],
  "nord": [
    "Nord",
    "#2E3440",
    "#3B4252",
    "#ECEFF4",
    "#D8DEE9",
    "#4C566A",
    "#88C0D0"
  ],
  "gruvbox": [
    "Gruvbox Dark",
    "#282828",
    "#3C3836",
    "#EBDBB2",
    "#A89984",
    "#504945",
    "#D79921"
  ]
};
function paletteFromPreset(id) {
 const row=themePresets[id];if(!row)return null;
 const [name,background,surface,text,muted,border,accent]=row;
 return {background,surface,text,muted,border,accent,icons:text,buttonBackground:accent,buttonText:background,buttonAutoContrast:true,tabBackground:background,tabText:muted,tabActive:text,tabIndicator:accent,gradient:false,gradientEnd:surface,gradientAngle:135};
}
