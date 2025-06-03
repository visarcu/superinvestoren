// src/components/Navbar.tsx
'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import SearchBar from './SearchBar'
import UserMenu from './UserMenu'
import TickerBar from './TickerBar'

// 1) Flache Links (inkl. Home und Investoren)
const navLinks = [
  { href: '/',        label: 'Startseite' },
  { href: '/superinvestor', label: 'Super-Investoren' },
  { href: '/news',         label: 'News' },           // ← hier
]

// 2) Analyse-Dropdown
const analyseSubLinks = [
  { href: '/analyse',           label: 'Übersicht' },
  { href: '/analyse/watchlist', label: 'Watchlist' },
  { href: '/analyse/heatmap',   label: 'Heatmap' },
  { href: '/analyse/earnings',  label: 'Earnings' },
  
]

export default function Navbar() {
  return (
    <Disclosure as="header" className="sticky top-0 z-50 bg-black shadow-sm">
      {({ open }) => (
        <>
          <TickerBar />

          <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold text-white">
              <span>Fin</span><span className="text-accent">Clue</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex md:items-center md:space-x-8">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-300 hover:text-white transition"
                >
                  {link.label}
                </Link>
              ))}

              {/* Analyse Dropdown */}
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center text-gray-300 hover:text-white transition">
                  Analyse <ChevronDownIcon className="ml-1 h-4 w-4" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-150"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Menu.Items className="absolute left-0 mt-2 w-40 origin-top-left rounded-md bg-gray-800 ring-1 ring-black ring-opacity-20 focus:outline-none">
                    {analyseSubLinks.map(s => (
                      <Menu.Item key={s.href}>
                        {({ active }) => (
                          <Link
                            href={s.href}
                            className={`block px-4 py-2 text-sm ${
                              active ? 'bg-gray-700 text-white' : 'text-gray-300'
                            }`}
                          >
                            {s.label}
                          </Link>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>

            {/* Right: Suche + User + Mobile Toggle */}
            <div className="flex items-center space-x-4">
              <div className="hidden lg:block w-64">
                <SearchBar />
              </div>
              <div className="hidden md:block">
                <UserMenu />
              </div>
              <Disclosure.Button className="md:hidden p-2 text-gray-300 hover:text-white transition">
                {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </Disclosure.Button>
            </div>
          </div>

          {/* Mobile Panel */}
          <Disclosure.Panel className="md:hidden bg-gray-900 border-t border-gray-700 z-40 relative">
            <div className="space-y-1 px-2 pt-2 pb-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition"
                >
                  {link.label}
                </Link>
              ))}

              <Disclosure as="div" className="space-y-1">
                {({ open: subOpen }) => (
                  <>
                    <Disclosure.Button className="flex w-full items-center justify-between rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition">
                      Analyse <ChevronDownIcon className={`h-5 w-5 transform ${subOpen ? 'rotate-180' : ''}`} />
                    </Disclosure.Button>
                    <Disclosure.Panel className="space-y-1 pl-5">
                      {analyseSubLinks.map(s => (
                        <Link
                          key={s.href}
                          href={s.href}
                          className="block rounded-md px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition"
                        >
                          {s.label}
                        </Link>
                      ))}
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>

              {/* Suche & User unten */}
              <div className="mt-3 px-3">
                <SearchBar />
              </div>
              <div className="mt-3 px-3">
                <UserMenu />
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}