'use client';

import { bindAll } from 'bind-event-listener';
import { PanelTopClose, PanelTopOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useRef, useState } from 'react';
import { SettingsDialog } from './settings-dialog';

type TLink = { title: string; href: string };

const links: TLink[] = [
  { title: 'Board', href: '/board' },
  { title: 'One column', href: '/one-column' },
  { title: 'Two columns', href: '/two-columns' },
];
export function SideBar() {
  const pathname = usePathname();
  return (
    <div className="flex w-60 flex-col border-r bg-sky-900 text-white">
      <h2 className="flex h-12 items-center border-b bg-red-800 pl-3">Task board</h2>
      <div className="flex flex-col p-2">
        {links.map((link) => (
          <Link
            href={link.href}
            key={link.href}
            className={`rounded p-2 font-bold hover:bg-sky-700 active:bg-sky-600 ${pathname === link.href ? 'bg-blue-900' : ''}`}
          >
            {link.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
