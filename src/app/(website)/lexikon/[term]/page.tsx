// app/(website)/lexikon/[term]/page.tsx - MODERNE BEGRIFF-DETAILSEITE
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LEARN_DEFINITIONS, LEXIKON_CATEGORIES, type LearnDefinitionKey } from '@/data/learnDefinitions'
import { ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, CalculatorIcon, LightBulbIcon } from '@heroicons/react/24/outline'

interface PageProps {
  params: {
    term: string
  }
}

export default function LexikonTermPage({ params }: PageProps) {
  const termKey = params.term as LearnDefinitionKey
  const termData = LEARN_DEFINITIONS[termKey]
  
  if (!termData) {
    notFound()
  }

  // Find category for this term
  const categoryEntry = Object.entries(LEXIKON_CATEGORIES).find(([_, cat]) => 
    cat.terms.includes(termKey)
  )
  const category = categoryEntry ? categoryEntry[1] : null
  const categoryKey = categoryEntry ? categoryEntry[0] : null

  // Get related terms from same category
  const relatedTerms = category ? 
    category.terms
      .filter(key => key !== termKey)
      .slice(0, 3)
      .map(key => ({ key, data: LEARN_DEFINITIONS[key as LearnDefinitionKey] }))
    : []

  // Get all terms for navigation
  const allTermKeys = Object.keys(LEARN_DEFINITIONS) as LearnDefinitionKey[]
  const currentIndex = allTermKeys.indexOf(termKey)
  const prevTerm = currentIndex > 0 ? allTermKeys[currentIndex - 1] : null
  const nextTerm = currentIndex < allTermKeys.length - 1 ? allTermKeys[currentIndex + 1] : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-24">
      {/* Header */}
      <div className="mb-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/lexikon" className="hover:text-green-400 transition-colors">
            Lexikon
          </Link>
          <span>/</span>
          {category && (
            <>
              <span className="flex items-center gap-1">
                <span>{category.icon}</span>
                {category.title}
              </span>
              <span>/</span>
            </>
          )}
          <span className="text-white">{termData.term}</span>
        </nav>

        {/* Back Button */}
        <Link
          href="/lexikon"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors mb-8"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>

        {/* Term Header */}
        <div className="text-center mb-8">
          {category && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium backdrop-blur-sm mb-4">
              <span>{category.icon}</span>
              {category.title}
            </div>
          )}
          
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-4">
            {termData.term}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8 mb-16">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Definition */}
          <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpenIcon className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Definition</h2>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed">
              {termData.definition}
            </p>
          </div>

          {/* Calculation */}
          {termData.calculation && (
            <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CalculatorIcon className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Berechnung</h2>
              </div>
              <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                <code className="text-green-400 text-lg font-mono">
                  {termData.calculation}
                </code>
              </div>
            </div>
          )}

          {/* Example */}
          {termData.example && (
            <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <LightBulbIcon className="w-5 h-5 text-green-400" />
                <h2 className="text-xl font-semibold text-white">Beispiel</h2>
              </div>
              <p className="text-gray-300 leading-relaxed">
                {termData.example}
              </p>
            </div>
          )}

          {/* CTA to Terminal */}
          <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Mit echten Daten analysieren
                </h3>
                <p className="text-gray-400 text-sm">
                  Nutze diese Kennzahl mit aktuellen Börsendaten
                </p>
              </div>
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl transition-all"
              >
                Terminal öffnen
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Navigation */}
          <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-4">Navigation</h3>
            <div className="space-y-3">
              {prevTerm && (
                <Link
                  href={`/lexikon/${prevTerm}`}
                  className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm"
                >
                  <ArrowLeftIcon className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-gray-400">Vorheriger Begriff</div>
                    <div className="text-white font-medium">
                      {LEARN_DEFINITIONS[prevTerm].term}
                    </div>
                  </div>
                </Link>
              )}
              
              {nextTerm && (
                <Link
                  href={`/lexikon/${nextTerm}`}
                  className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm"
                >
                  <div className="flex-1">
                    <div className="text-gray-400">Nächster Begriff</div>
                    <div className="text-white font-medium">
                      {LEARN_DEFINITIONS[nextTerm].term}
                    </div>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                </Link>
              )}
            </div>
          </div>

          {/* Related Terms */}
          {relatedTerms.length > 0 && (
            <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">Ähnliche Begriffe</h3>
              <div className="space-y-3">
                {relatedTerms.map(({ key, data }) => (
                  <Link
                    key={key}
                    href={`/lexikon/${key}`}
                    className="block p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <div className="font-medium text-white text-sm mb-1">
                      {data.term}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {data.definition.slice(0, 80)}...
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Category Overview */}
          {category && categoryKey && (
            <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <h3 className="font-semibold text-white">{category.title}</h3>
                  <p className="text-gray-400 text-xs">{category.description}</p>
                </div>
              </div>
              <div className="text-sm text-green-400">
                {category.terms.length} Begriffe in dieser Kategorie
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Generate static params for all terms
export async function generateStaticParams() {
  return Object.keys(LEARN_DEFINITIONS).map((key) => ({
    term: key,
  }))
}

// Generate metadata
export async function generateMetadata({ params }: PageProps) {
  const termKey = params.term as LearnDefinitionKey
  const termData = LEARN_DEFINITIONS[termKey]
  
  if (!termData) {
    return {
      title: 'Begriff nicht gefunden'
    }
  }

  return {
    title: `${termData.term} - Finanz-Lexikon`,
    description: termData.definition.slice(0, 160),
  }
}