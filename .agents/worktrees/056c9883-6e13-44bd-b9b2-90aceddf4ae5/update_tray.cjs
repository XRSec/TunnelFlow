const fs = require('fs');
const file = 'src/components/TrayPopoverView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { listen } from "@tauri-apps/api/event";\nimport { AppWindow, Power } from "lucide-react";',
  'import { listen, emit } from "@tauri-apps/api/event";\nimport { AppWindow, Power, Info } from "lucide-react";'
);

content = content.replace(
  '        <div className="px-2 py-1 mt-1">\n          <div className="border-t border-[#d4d4d6] dark:border-[#3c3c3e] w-full mb-1" />\n          <button \n            onClick={() => invoke(\'open_main_window\')} ',
  `        <div className="px-2 py-1 mt-1">
          <div className="border-t border-[#d4d4d6] dark:border-[#3c3c3e] w-full mb-1" />
          <button 
            onClick={() => {
              invoke('open_main_window');
              emit('open-about');
            }} 
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-[6px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[13px] font-normal text-[#1d1d1f] dark:text-[#f5f5f7] cursor-default mb-0.5"
          >
            <div className="flex items-center gap-2">
              <Info className="w-[14px] h-[14px] opacity-75" />
              <span>关于 TunnelFlow</span>
            </div>
          </button>
          <button 
            onClick={() => invoke('open_main_window')} `
);

fs.writeFileSync(file, content);
console.log('Updated', file);
