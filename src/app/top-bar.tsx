'use client';

import Image from 'next/image';

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

export function TopBar() {
  const pathname = usePathname();
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState<boolean>(false);
  const settingsDialogRef = useRef<HTMLDivElement | null>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    return bindAll(window, [
      {
        type: 'click',
        listener(event) {
          if (!(event.target instanceof Element)) {
            return;
          }

          if (!isSettingsDialogOpen) {
            return;
          }

          const dialog = settingsDialogRef.current;
          const trigger = settingsTriggerRef.current;
          if (!dialog || !trigger) {
            return;
          }
          if (trigger.contains(event.target)) {
            return;
          }

          if (dialog.contains(event.target)) {
            return;
          }

          setIsSettingsDialogOpen(false);
        },
      },
    ]);
  }, [isSettingsDialogOpen]);

  return (
    <>
      <header className="flex h-12 flex-row items-center justify-between gap-3 border-b bg-sky-800 px-3 leading-4 text-white">
        <div>
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
        <div className="flex flex-row items-center gap-2">
          <Link
            href="https://bsky.app/profile/alexreardon.bsky.social"
            target="_blank"
            aria-label="Alex Reardon's BlueSky profile"
            className=""
          >
            <Image
              role="presentation"
              src="/avatar.webp"
              alt="Profile"
              width={30}
              height={30}
              className="box-border h-fit max-w-none overflow-hidden rounded border border-green-200 outline-neutral-50 hover:outline hover:contrast-125"
              priority
              quality={100}
              draggable="false"
            />
          </Link>
          <button
            type="button"
            ref={settingsTriggerRef}
            className="rounded p-2 text-white hover:bg-sky-700 active:bg-sky-600"
            onClick={() => setIsSettingsDialogOpen((current) => !current)}
            aria-label="toggle top bar visibility"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>
      {isSettingsDialogOpen ? <SettingsDialog ref={settingsDialogRef} /> : null}
    </>
  );
}
