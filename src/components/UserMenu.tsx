// src/components/UserMenu.tsx
'use client'

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

export default function UserMenu() {
  const { data: session, status } = useSession()

  if (status === 'loading') return null

  // Nicht eingeloggt?
  if (!session) {
    return (
      <Link
        href="/auth/signin"
        className="px-4 py-1 bg-accent text-black rounded hover:bg-accent/90"
      >
        Anmelden
      </Link>
    )
  }

  // Eingeloggt: Name + Dropdown
  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="inline-flex items-center gap-2 px-3 py-1 bg-gray-700 rounded">
        <span className="text-white font-medium">{session.user?.email}</span>
        <Cog6ToothIcon className="w-5 h-5 text-gray-300" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-card-dark border border-gray-700 rounded shadow-lg focus:outline-none z-50">
          <Menu.Item>
            {({ active }) => (
              <Link
                href="/profile"
                className={`block px-4 py-2 text-sm ${
                  active ? 'bg-gray-600' : ''
                }`}
              >
                Profil bearbeiten
              </Link>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  active ? 'bg-gray-600' : ''
                }`}
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Abmelden
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}