import { useState } from 'react';
import { useSettingsStore } from '@/stores/appStore';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const presetThemes = [
  { name: 'Blu', hue: 215, saturation: 85 },
  { name: 'Viola', hue: 270, saturation: 75 },
  { name: 'Rosa', hue: 330, saturation: 75 },
  { name: 'Rosso', hue: 0, saturation: 75 },
  { name: 'Arancione', hue: 25, saturation: 85 },
  { name: 'Verde', hue: 145, saturation: 65 },
  { name: 'Ciano', hue: 195, saturation: 90 },
  { name: 'Giallo', hue: 50, saturation: 85 },
];

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function ThemeCustomizer() {
  const { themeHue, themeSaturation, setThemeColor } = useSettingsStore();
  const [customHex, setCustomHex] = useState(hslToHex(themeHue, themeSaturation, 55));
  const [tempHue, setTempHue] = useState(themeHue);
  const [tempSat, setTempSat] = useState(themeSaturation);

  const applyTheme = (hue: number, saturation: number) => {
    setThemeColor(hue, saturation);
    
    // Apply to CSS variables
    document.documentElement.style.setProperty('--primary', `${hue} ${saturation}% 55%`);
    document.documentElement.style.setProperty('--ring', `${hue} ${saturation}% 55%`);
    document.documentElement.style.setProperty('--accent', `${(hue + 20) % 360} ${saturation}% 55%`);
  };

  const handlePresetClick = (hue: number, saturation: number) => {
    setTempHue(hue);
    setTempSat(saturation);
    setCustomHex(hslToHex(hue, saturation, 55));
    applyTheme(hue, saturation);
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hue = parseInt(e.target.value);
    setTempHue(hue);
    setCustomHex(hslToHex(hue, tempSat, 55));
    applyTheme(hue, tempSat);
  };

  const handleSatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sat = parseInt(e.target.value);
    setTempSat(sat);
    setCustomHex(hslToHex(tempHue, sat, 55));
    applyTheme(tempHue, sat);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setCustomHex(hex);
    
    if (hex.length === 7) {
      const hsl = hexToHsl(hex);
      if (hsl) {
        setTempHue(hsl.h);
        setTempSat(hsl.s);
        applyTheme(hsl.h, hsl.s);
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-3">
          <Palette className="w-5 h-5" />
          <span className="font-medium text-sm">Personalizza Tema</span>
          <div 
            className="w-5 h-5 rounded-full ml-auto border border-border"
            style={{ backgroundColor: `hsl(${themeHue} ${themeSaturation}% 55%)` }}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizza Tema</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="presets" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Preset</TabsTrigger>
            <TabsTrigger value="custom">Personalizzato</TabsTrigger>
          </TabsList>
          
          <TabsContent value="presets" className="mt-4">
            <div className="grid grid-cols-4 gap-3">
              {presetThemes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => handlePresetClick(theme.hue, theme.saturation)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg transition-colors",
                    themeHue === theme.hue && themeSaturation === theme.saturation
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `hsl(${theme.hue} ${theme.saturation}% 55%)` }}
                  >
                    {themeHue === theme.hue && themeSaturation === theme.saturation && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="text-xs">{theme.name}</span>
                </button>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="custom" className="mt-4 space-y-4">
            {/* Hue slider */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tonalità (Hue)</label>
              <input
                type="range"
                min="0"
                max="360"
                value={tempHue}
                onChange={handleHueChange}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(0, ${tempSat}%, 55%), 
                    hsl(60, ${tempSat}%, 55%), 
                    hsl(120, ${tempSat}%, 55%), 
                    hsl(180, ${tempSat}%, 55%), 
                    hsl(240, ${tempSat}%, 55%), 
                    hsl(300, ${tempSat}%, 55%), 
                    hsl(360, ${tempSat}%, 55%)
                  )`
                }}
              />
            </div>
            
            {/* Saturation slider */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Saturazione</label>
              <input
                type="range"
                min="20"
                max="100"
                value={tempSat}
                onChange={handleSatChange}
                className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(${tempHue}, 20%, 55%), 
                    hsl(${tempHue}, 100%, 55%)
                  )`
                }}
              />
            </div>
            
            {/* Hex input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Codice Colore (HEX)</label>
              <div className="flex gap-2">
                <Input
                  value={customHex}
                  onChange={handleHexChange}
                  placeholder="#3B82F6"
                  className="font-mono"
                />
                <div 
                  className="w-10 h-10 rounded-lg border border-border flex-shrink-0"
                  style={{ backgroundColor: customHex }}
                />
              </div>
            </div>
            
            {/* Preview */}
            <div className="p-4 rounded-lg bg-secondary space-y-2">
              <p className="text-sm font-medium">Anteprima</p>
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: `hsl(${tempHue} ${tempSat}% 55%)` }}
                >
                  Primario
                </button>
                <button 
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: `hsl(${(tempHue + 20) % 360} ${tempSat}% 55%)` }}
                >
                  Accento
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
