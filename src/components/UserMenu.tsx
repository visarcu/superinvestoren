// src/components/UserMenu.tsx
"use client";

import { Fragment, useEffect, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import Link from "next/link";
import { Cog6ToothIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { FaCrown } from "react-icons/fa";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface SupabaseUser {
  id: string;
  email: string;
  // Falls du in Supabase Auth `user_metadata: { is_premium: boolean }` nutzt, kannst du das hier erweitern:
  // is_premium?: boolean;
}

export default function UserMenu() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1) Beim ersten Laden: aktuelle Supabase-Session holen
    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("[UserMenu] Fehler beim Laden der Session:", error.message);
        setUser(null);
        setLoading(false);
        return;
      }
      if (session?.user) {
        // Hier nehmen wir nur id und email. Wenn du weitere Metadaten speicherst (z. B. is_premium),
        // dann lies sie aus session.user.user_metadata heraus:
        // const is_premium: boolean = (session.user.user_metadata as any)?.is_premium ?? false;
        setUser({ id: session.user.id, email: session.user.email || "" });
      } else {
        setUser(null);
      }
      setLoading(false);
    }

    loadSession();

    // 2) Auth-Listener: wenn sich Session ändert, aktualisieren wir unseren State
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 3) Während noch geladen wird, nichts anzeigen
  if (loading) {
    return null;
  }

  // 4) Falls kein User angemeldet, zeigen wir nur den Link „Anmelden“
  if (!user) {
    return (
      <Link
        href="/auth/signin"
        className="px-4 py-1 bg-accent text-black rounded-lg hover:bg-accent/90 transition"
      >
        Anmelden
      </Link>
    );
  }

  // 5) Falls User existiert: Dropdown anzeigen
  //    (Hier kann man `user.is_premium` anzeigen, wenn du in deinen Supabase-Metadaten
  //     das Flag `is_premium` gespeichert hast. Zur Vereinfachung lassen wir es zunächst weg.)
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[UserMenu] Fehler beim Abmelden:", error.message);
    } else {
      // Nach Logout auf Login-Seite oder Home weiterleiten
      router.push("/auth/signin");
    }
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-full hover:bg-gray-800/80 transition">
        {/* Wenn du ein is_premium-Flag in user.user_metadata führst, könntest du hier:
            {user.is_premium && <FaCrown … />} */}
        <span className="truncate max-w-[8rem] text-sm text-gray-100 font-medium">
          {user.email}
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
          {/* → E-Mail-Support */}
          <Menu.Item>
            {({ active }) => (
              <a
                href="mailto:team.finclue@gmail.com?subject=Support-Anfrage"
                className={`
                  block px-4 py-2 text-sm
                  ${active ? "bg-gray-700 text-white" : "text-gray-200"}
                  transition
                `}
              >
                Email Support
              </a>
            )}
          </Menu.Item>

          {/* → Profil bearbeiten */}
          <Menu.Item>
            {({ active }) => (
              <Link
                href="/profile"
                className={`
                  block px-4 py-2 text-sm
                  ${active ? "bg-gray-700 text-white" : "text-gray-200"}
                  transition
                `}
              >
                Profil bearbeiten
              </Link>
            )}
          </Menu.Item>

          {/* → Abmelden */}
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={handleSignOut}
                className={`
                  w-full text-left px-4 py-2 text-sm flex items-center gap-2
                  ${active ? "bg-gray-700 text-white" : "text-gray-200"}
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
  );
}