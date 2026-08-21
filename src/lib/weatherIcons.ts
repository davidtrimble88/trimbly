import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Moon, CloudMoon, type LucideIcon } from "lucide-react";

// Open-Meteo WMO weather codes collapsed into a handful of icon buckets —
// see https://open-meteo.com/en/docs for the full table.
export function iconForWeatherCode(code: number, isDay = true): LucideIcon {
  if (code === 0 || code === 1) return isDay ? Sun : Moon;
  if (code === 2) return isDay ? Cloud : CloudMoon;
  if (code === 3) return Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}
