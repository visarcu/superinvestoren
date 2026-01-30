'use client'

import React from 'react'
import Link from 'next/link'
import {
    scaleLinear
} from 'd3-scale' // Just importing to verify d3 presence, actually not using d3 here directly for simplicity
import {
    ScaleIcon,
    ChatBubbleLeftRightIcon,
    ChartBarIcon,
    ArrowUpRightIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline'

const features = [
    {
        title: "Der Ruthless Judge",
        description: "Unsere AI analysiert dein Portfolio und vergleicht es mit den besten Investoren der Welt. Bekomme ehrliches Feedback und konkrete Tipps.",
        icon: ScaleIcon,
        className: "md:col-span-2",
        link: "/analyse/portfolio-check",
        color: "text-brand-light",
        bgPattern: "bg-gradient-to-br from-brand/10 to-transparent"
    },
    {
        title: "13F Super-Data",
        description: "Verfolge jeden Trade von Buffett, Burry & Co. Live und aufbereitet.",
        icon: ChartBarIcon,
        className: "md:col-span-1",
        link: "/analyse",
        color: "text-blue-400",
        bgPattern: "bg-gradient-to-br from-blue-500/10 to-transparent"
    },
    {
        title: "Finclue AI Chat",
        description: "Stelle fragen zu Aktien, Bilanzen und Strategien. Dein persönlicher Finanz-Analyst.",
        icon: ChatBubbleLeftRightIcon,
        className: "md:col-span-1",
        link: "/analyse/finclue-ai",
        color: "text-purple-400",
        bgPattern: "bg-gradient-to-br from-purple-500/10 to-transparent"
    },
    {
        title: "Sicherheit & Qualität",
        description: "Daten direkt von der SEC. Verifiziert und sauber aufbereitet.",
        icon: ShieldCheckIcon,
        className: "md:col-span-2",
        link: "/analyse",
        color: "text-emerald-400",
        bgPattern: "bg-gradient-to-br from-emerald-500/10 to-transparent"
    },
]

export default function BentoGrid() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

            <div className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">Dein unfairer Vorteil.</h2>
                <p className="text-theme-secondary max-w-xl">
                    Wir geben dir die Werkzeuge, die sonst nur Profis haben.
                    Kombiniert mit der Analyse-Kraft von künstlicher Intelligenz.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((feature, idx) => (
                    <Link
                        key={idx}
                        href={feature.link}
                        className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#131316]/50 backdrop-blur-sm p-8 transition-all hover:border-white/[0.15] hover:-translate-y-1 ${feature.className}`}
                    >
                        {/* Background Pattern */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${feature.bgPattern}`}></div>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className={`w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-light transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-theme-secondary leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>

                            <div className="mt-8 flex items-center gap-2 text-sm font-medium text-theme-muted group-hover:text-white transition-colors">
                                Ausprobieren <ArrowUpRightIcon className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}
