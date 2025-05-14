// src/components/Navbar.tsx
'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import SearchBar from './SearchBar'
import AuthButton from './AuthButton'
import TickerBar from './TickerBar'

const hubLinks = [
  { href: '/analyse',           label: 'Übersicht' },
  { href: '/analyse/watchlist', label: 'Watchlist' },
  { href: '/analyse/heatmap',   label: 'Heatmap' },
  { href: '/analyse/earnings',  label: 'Earnings' },
]

export default function Navbar() {
  return (
    <Disclosure as="header" className="sticky top-0 z-50 bg-black/80 backdrop-blur-md">
      {({ open }) => (
        <>
          <TickerBar />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-2xl font-bold text-white">
                  <span>Super</span>
                  <span className="text-accent">Investor</span>
                </Link>
              </div>

              {/* Desktop nav */}
              <div className="hidden md:flex md:items-center md:space-x-6">
                <Link href="/" className="text-gray-300 hover:text-white transition">
                  Home
                </Link>

                {/* Hub Dropdown */}
                <Menu as="div" className="relative">
                  <Menu.Button className="flex items-center text-gray-300 hover:text-white transition">
                    Analyse-Hub <ChevronDownIcon className="ml-1 w-4 h-4" />
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
                    <Menu.Items className="absolute left-0 mt-2 w-48 bg-surface-dark rounded-md shadow-lg ring-1 ring-black ring-opacity-20 focus:outline-none">
                      {hubLinks.map(link => (
                        <Menu.Item key={link.href}>
                          {({ active }) => (
                            <Link
                              href={link.href}
                              className={`block px-4 py-2 text-sm ${
                                active ? 'bg-gray-700 text-white' : 'text-gray-300'
                              }`}
                            >
                              {link.label}
                            </Link>
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Items>
                  </Transition>
                </Menu>

                <Link href="/realtime" className="text-gray-300 hover:text-white transition">
                  Echtzeit Filings
                </Link>
              </div>

              {/* Right: search + auth + mobile toggle */}
              <div className="flex items-center">
                <div className="hidden lg:block w-64 mr-4">
                  <SearchBar />
                </div>
                <div className="hidden md:block">
                  <AuthButton />
                </div>
                <Disclosure.Button className="md:hidden inline-flex items-center justify-center p-2 text-gray-300 hover:text-white transition">
                  {open ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Mobile panel */}
          <Disclosure.Panel className="md:hidden bg-surface-dark border-t border-gray-700">
            <div className="px-4 pt-4 pb-2 space-y-1">
              <Disclosure.Button as={Link} href="/" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition">
                Home
              </Disclosure.Button>
              
              <Disclosure as="div" className="space-y-1">
                {({ open: hubOpen }) => (
                  <>
                    <Disclosure.Button className="w-full flex justify-between items-center px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition">
                      Analyse-Hub <ChevronDownIcon className={`w-5 h-5 transform ${hubOpen ? 'rotate-180' : ''}`} />
                    </Disclosure.Button>
                    <Disclosure.Panel className="pl-6 space-y-1">
                      {hubLinks.map(link => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>

              <Disclosure.Button as={Link} href="/realtime" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition">
                Echtzeit Filings
              </Disclosure.Button>
              
              <div className="mt-2 px-3">
                <SearchBar />
              </div>
              <div className="mt-2 px-3">
                <AuthButton />
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}