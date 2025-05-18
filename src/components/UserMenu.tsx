// src/components/UserMenu.tsx
'use client'

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { FaCrown } from 'react-icons/fa'

export default function UserMenu() {
  const { data: session, status } = useSession()
  if (status === 'loading') return null

  if (!session) {
    return (
      <Link
        href="/auth/signin"
        className="px-4 py-1 bg-accent text-black rounded-lg hover:bg-accent/90 transition"
      >
        Anmelden
      </Link>
    )
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button
        className="
          inline-flex items-center gap-2
          px-3 py-1.5
          bg-gray-800/60 backdrop-blur-sm
          border border-gray-700
          rounded-full
          hover:bg-gray-800/80
          transition
        "
      >
        {session.user.isPremium && (
          <FaCrown className="w-4 h-4 text-yellow-400" />
        )}
        <span className="truncate max-w-[8rem] text-sm text-gray-100 font-medium">
          {session.user.email}
        </span>
        <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
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
       
       <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-card-dark border border-gray-700 rounded-2xl shadow-lg focus:outline-none z-50">
        
        {/* ← Email-Support einfügen */}
        <Menu.Item>
          {({ active }) => (
            <a
              href="mailto:support@superinvestor.test?subject=Support-Anfrage"
              className={`
                block px-4 py-2 text-sm
                ${active ? 'bg-gray-700 text-white' : 'text-gray-200'}
                transition
              `}
            >
              Email Support
            </a>
          )}
        </Menu.Item>

         {/* Profil bearbeiten */}
         <Menu.Item>
           {({ active }) => (
             <Link
               href="/profile"
               className={`
                 block px-4 py-2 text-sm
                 ${active ? 'bg-gray-700 text-white' : 'text-gray-200'}
                 transition
               `}
             >
               Profil bearbeiten
             </Link>
           )}
         </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className={`
                  w-full text-left px-4 py-2 text-sm flex items-center gap-2
                  ${active ? 'bg-gray-700 text-white' : 'text-gray-200'}
                  transition
                `}
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