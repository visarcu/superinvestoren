// app/(website)/lexikon/[term]/page.tsx - CLEAN MINIMAL DESIGN
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LEARN_DEFINITIONS, LEXIKON_CATEGORIES, type LearnDefinitionKey } from '@/data/learnDefinitions'
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

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

  // Get related terms from same category
  const relatedTerms = category ? 
    category.terms
      .filter(key => key !== termKey)
      .slice(0, 4)
      .map(key => ({ key, data: LEARN_DEFINITIONS[key as LearnDefinitionKey] }))
    : []

  // Get all terms for navigation
  const allTermKeys = Object.keys(LEARN_DEFINITIONS) as LearnDefinitionKey[]
  const currentIndex = allTermKeys.indexOf(termKey)
  const prevTerm = currentIndex > 0 ? allTermKeys[currentIndex - 1] : null
  const nextTerm = currentIndex < allTermKeys.length - 1 ? allTermKeys[currentIndex + 1] : null

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      
      {/* Header */}
      <div className="pt-32 pb-12">
        <div className="max-w-3xl mx-auto px-6">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-8">
            <Link href="/lexikon" className="hover:text-white transition-colors">
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
            <span className="text-neutral-300">{termData.term}</span>
          </div>

          {/* Back Link */}
          <Link
            href="/lexikon"
            className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors mb-10"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Zurück zur Übersicht
          </Link>

          {/* Title */}
          <div className="mb-4">
            {category && (
              <div className="inline-flex items-center gap-2 text-sm text-neutral-500 mb-4">
                <span>{category.icon}</span>
                {category.title}
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              {termData.term}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        
        {/* Definition */}
        <div className="mb-12">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
            Definition
          </h2>
          <p className="text-xl text-neutral-300 leading-relaxed">
            {termData.definition}
          </p>
        </div>

        {/* Calculation */}
        {termData.calculation && (
          <div className="mb-12">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
              Berechnung
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
              <code className="text-lg text-emerald-400 font-mono">
                {termData.calculation}
              </code>
            </div>
          </div>
        )}

        {/* Example */}
        {termData.example && (
          <div className="mb-12">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">
              Beispiel
            </h2>
            <p className="text-neutral-300 leading-relaxed">
              {termData.example}
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-neutral-800 my-12"></div>

        {/* Related Terms */}
        {relatedTerms.length > 0 && (
          <div className="mb-12">
            <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-6">
              Ähnliche Begriffe
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {relatedTerms.map(({ key, data }) => (
                <Link
                  key={key}
                  href={`/lexikon/${key}`}
                  className="group p-4 bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all"
                >
                  <div className="font-medium text-white group-hover:text-neutral-200 mb-1">
                    {data.term}
                  </div>
                  <div className="text-sm text-neutral-500 line-clamp-2">
                    {data.definition.slice(0, 80)}...
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          {prevTerm ? (
            <Link
              href={`/lexikon/${prevTerm}`}
              className="group flex items-center gap-3 text-neutral-500 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <div>
                <div className="text-xs text-neutral-600 mb-0.5">Vorheriger</div>
                <div className="text-sm font-medium">{LEARN_DEFINITIONS[prevTerm].term}</div>
              </div>
            </Link>
          ) : <div />}
          
          {nextTerm ? (
            <Link
              href={`/lexikon/${nextTerm}`}
              className="group flex items-center gap-3 text-right text-neutral-500 hover:text-white transition-colors"
            >
              <div>
                <div className="text-xs text-neutral-600 mb-0.5">Nächster</div>
                <div className="text-sm font-medium">{LEARN_DEFINITIONS[nextTerm].term}</div>
              </div>
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : <div />}
        </div>

        {/* Divider */}
        <div className="h-px bg-neutral-800 my-12"></div>

        {/* CTA */}
        <div className="text-center">
          <h3 className="text-lg font-medium text-white mb-2">
            Mit echten Daten analysieren
          </h3>
          <p className="text-neutral-500 text-sm mb-6">
            Nutze diese Kennzahl mit aktuellen Börsendaten
          </p>
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-100 text-black font-semibold rounded-xl transition-colors"
          >
            Terminal öffnen
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
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
    title: `${termData.term} - Finanz-Lexikon | FinClue`,
    description: termData.definition.slice(0, 160),
  }
}