// components/ThemeToggle.js

import { Switch } from '@headlessui/react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ isDark, setIsDark }) {
  return (
    <Switch
      checked={isDark}
      onChange={setIsDark}
      className={`${
        isDark ? 'bg-yellow-400' : 'bg-gray-600'
      } relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
    >
      {/* Icono (sol/luna) que se mueve */}
      <span
        className={`${
          isDark ? 'translate-x-7' : 'translate-x-1'
        } inline-block h-6 w-6 transform rounded-full bg-white transition-transform`}
      >
        {isDark ? (
          <Sun className="h-6 w-6 text-yellow-500 p-1" />
        ) : (
          <Moon className="h-6 w-6 text-gray-700 p-1" />
        )}
      </span>
    </Switch>
  );
}
