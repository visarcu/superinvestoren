// src/components/UserDropdown.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, Mail, Crown, ChevronDown, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  is_premium: boolean;
  premium_since: string | null;
}

interface Props {
  user: SupabaseUser;
  profile: UserProfile;
}

export default function UserDropdown({ user, profile }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate initials
  const getInitials = () => {
    if (profile.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    return (user.email || '').charAt(0).toUpperCase();
  };

  // Get display name
  const getDisplayName = () => {
    if (profile.first_name) {
      return profile.first_name + (profile.last_name ? ` ${profile.last_name}` : '');
    }
    return (user.email || '').split('@')[0];
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const menuItems = [
    {
      icon: <User size={18} />,
      label: 'Profil bearbeiten',
      action: () => router.push('/profile'),
      description: 'Persönliche Daten verwalten'
    },
    {
      icon: <Mail size={18} />,
      label: 'Email Support',
      action: () => window.location.href = 'mailto:support@finclue.de',
      description: 'Hilfe & Kontakt'
    },
    {
      icon: <Settings size={18} />,
      label: 'Einstellungen',
      action: () => router.push('/settings'), 
      description: 'App-Einstellungen'
    },
    {
      icon: <LogOut size={18} />,
      label: 'Abmelden',
      action: handleLogout,
      description: 'Sicher ausloggen',
      isLogout: true
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-gray-800/60 backdrop-blur-md border border-gray-700/50 hover:border-gray-600 transition-all duration-200 group"
      >
        {/* Avatar */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            {getInitials()}
          </div>
          {profile.is_premium && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
              <Crown size={10} className="text-black" />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="hidden md:block text-left">
          <div className="text-white text-sm font-medium">{getDisplayName()}</div>
          <div className="text-gray-400 text-xs">{profile.is_premium ? 'Premium' : 'Free'}</div>
        </div>

        {/* Chevron */}
        <ChevronDown 
          size={16} 
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
          
          {/* Header with User Info */}
          <div className="p-4 border-b border-gray-700/50 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {getInitials()}
                </div>
                {profile.is_premium && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Crown size={12} className="text-black" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold truncate">{getDisplayName()}</div>
                <div className="text-gray-300 text-sm truncate">{user.email}</div>
                <div className="flex items-center gap-2 mt-1">
                  {profile.is_premium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                      <Sparkles size={10} />
                      Premium
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-600/50 text-gray-400 text-xs rounded-full">
                      Free Account
                    </span>
                  )}
                  {!profile.email_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">
                      Email nicht bestätigt
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  item.isLogout 
                    ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300' 
                    : 'hover:bg-gray-700/50 text-gray-300 hover:text-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  item.isLogout 
                    ? 'bg-red-900/30 group-hover:bg-red-900/50' 
                    : 'bg-gray-700/50 group-hover:bg-gray-600/50'
                } transition-colors duration-200`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium truncate">{item.label}</div>
                  <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors duration-200 truncate">
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700/50 bg-gray-900/50">
            <div className="text-center text-xs text-gray-500">
              Mitglied seit {new Date(user.created_at || '').toLocaleDateString('de-DE', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}