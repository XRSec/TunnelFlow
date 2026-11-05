import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

export function useAppVersion(): string {
  const [version, setVersion] = useState<string>(() => {
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.9';
  });

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  return version;
}
