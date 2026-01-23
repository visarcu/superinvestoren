'use client'

import React, { useState, useEffect } from 'react'
import { 
  CodeBracketIcon,
  ChartBarIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  CubeIcon,
  GlobeAltIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function DevelopersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState('')
  const [language, setLanguage] = useState<'de' | 'en'>('de')
  
  const demoApiKey = 'fw_demo_1234567890abcdef' // Demo key for showcase
  
  const t = {
    de: {
      title: "Widget API",
      subtitle: "Integriere live Super-Investor Daten in deine Website. Responsive Design, Echtzeit-Updates und professionelles Styling.",
      livePortfolio: "Live Portfolio Daten",
      plugPlay: "Plug & Play Widget",
      responsive: "Responsive Design",
      livePortfolioDesc: "Aktuelle Portfolio-Werte und Performance von Top-Investoren",
      plugPlayDesc: "Einfache Integration ohne Build-Prozess oder Dependencies",
      responsiveDesc: "Dark Theme mit nahtloser Integration auf allen Geräten",
      liveDemo: "Live Demo",
      warrenBuffett: "Warren Buffett Portfolio Widget",
      demoDescription: "Dieses Widget zeigt echte Portfolio-Daten von Berkshire Hathaways letzter 13F Einreichung. Es aktualisiert sich automatisch bei neuen Daten.",
      whyFinclue: "Warum Finclue Widgets?",
      realData: "Echte 13F Daten",
      quarterlyUpdates: "Quartalsweise Updates", 
      germanTranslation: "Deutsche Übersetzung",
      noMaintenance: "Keine Wartung nötig",
      launchSpecial: "🚀 Beta Phase - Erste 20 Kunden erhalten 50% Lifetime-Rabatt",
      requestAccess: "Beta Zugang anfragen"
    },
    en: {
      title: "Widget API", 
      subtitle: "Integrate live super investor data into your website. Responsive design, real-time updates and professional styling.",
      livePortfolio: "Live Portfolio Data",
      plugPlay: "Plug & Play Widget", 
      responsive: "Responsive Design",
      livePortfolioDesc: "Current portfolio values and performance from top investors",
      plugPlayDesc: "Easy integration without build process or dependencies",
      responsiveDesc: "Dark theme with seamless integration on all devices",
      liveDemo: "Live Demo",
      warrenBuffett: "Warren Buffett Portfolio Widget",
      demoDescription: "This widget shows real portfolio data from Berkshire Hathaway's latest 13F filing. It updates automatically with new data.",
      whyFinclue: "Why Finclue Widgets?",
      realData: "Real 13F Data",
      quarterlyUpdates: "Quarterly Updates",
      germanTranslation: "German Translation", 
      noMaintenance: "No Maintenance Required",
      launchSpecial: "🚀 Beta Phase - First 20 customers get 50% lifetime discount",
      requestAccess: "Request Beta Access"
    }
  }
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    // Load the widget script dynamically with better error handling
    const script = document.createElement('script')
    script.src = '/widget-loader.js'
    script.onload = () => {
      console.log('Widget script loaded successfully')
      
      // Small delay to ensure everything is ready
      timeoutId = setTimeout(() => {
        if (window.FinclueWidget) {
          console.log('Creating widget instance...')
          try {
            new window.FinclueWidget('finclue-demo-widget-container', {
              investor: 'buffett',
              apiKey: demoApiKey
            })
          } catch (error) {
            console.error('Error creating widget:', error)
          }
        } else {
          console.error('FinclueWidget not found on window object')
        }
      }, 500) // Increased delay to let React finish rendering
    }
    script.onerror = (error) => {
      console.error('Failed to load widget script:', error)
    }
    document.body.appendChild(script)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lade Developer Tools...</p>
        </div>
      </div>
    )
  }

  const htmlCode = `<!-- Basic HTML Implementation -->
<div id="finclue-buffett-widget"></div>

<script src="https://finclue.de/widget-loader.js"></script>
<script>
  new FinclueWidget('finclue-buffett-widget', {
    investor: 'buffett',
    apiKey: 'your-api-key-here'
  });
</script>`

  const autoInitCode = `<!-- Auto-Initialize with Data Attributes -->
<div 
  id="finclue-widget-1" 
  data-finclue-widget
  data-finclue-investor="buffett"
  data-finclue-api-key="your-api-key-here">
</div>

<script src="https://finclue.de/widget-loader.js"></script>`

  const reactCode = `// React Implementation
import { useEffect } from 'react'

export default function MyComponent() {
  useEffect(() => {
    // Load widget script
    const script = document.createElement('script')
    script.src = 'https://finclue.de/widget-loader.js'
    script.onload = () => {
      new window.FinclueWidget('buffett-widget', {
        investor: 'buffett',
        apiKey: 'your-api-key-here'
      })
    }
    document.body.appendChild(script)
    
    return () => {
      document.body.removeChild(script)
    }
  }, [])
  
  return <div id="buffett-widget"></div>
}`

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-24">
        
        {/* Hero Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium">
                <CodeBracketIcon className="w-4 h-4" />
                Developer API
              </div>
              
              {/* Language Toggle */}
              <div className="ml-4 inline-flex items-center gap-1 bg-white/5 rounded-full p-1">
                <button 
                  onClick={() => setLanguage('de')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    language === 'de' 
                      ? 'bg-brand text-black' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  DE
                </button>
                <button 
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    language === 'en' 
                      ? 'bg-brand text-black' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-medium text-white leading-[0.85] tracking-[-0.02em] mb-6">
              {t[language].title.split(' ')[0]}
              <br />
              <span className="text-gray-300">{t[language].title.split(' ')[1]}</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              {t[language].subtitle}
            </p>
          </div>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center hover:bg-white/[0.05] transition-all duration-300">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ChartBarIcon className="w-8 h-8 text-brand-light" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{t[language].livePortfolio}</h3>
            <p className="text-gray-400 leading-relaxed">
              {t[language].livePortfolioDesc}
            </p>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center hover:bg-white/[0.05] transition-all duration-300">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CubeIcon className="w-8 h-8 text-brand-light" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{t[language].plugPlay}</h3>
            <p className="text-gray-400 leading-relaxed">
              {t[language].plugPlayDesc}
            </p>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center hover:bg-white/[0.05] transition-all duration-300">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <GlobeAltIcon className="w-8 h-8 text-brand-light" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">{t[language].responsive}</h3>
            <p className="text-gray-400 leading-relaxed">
              {t[language].responsiveDesc}
            </p>
          </div>
        </div>
        
        {/* Why Finclue Widgets Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
              {t[language].whyFinclue}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-6 h-6 text-brand-light" />
              </div>
              <h4 className="font-semibold text-white mb-2">{t[language].realData}</h4>
              <p className="text-sm text-gray-400">SEC 13F Filings von echten Investoren</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-6 h-6 text-brand-light" />
              </div>
              <h4 className="font-semibold text-white mb-2">{t[language].quarterlyUpdates}</h4>
              <p className="text-sm text-gray-400">Automatische Aktualisierung alle 3 Monate</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-6 h-6 text-brand-light" />
              </div>
              <h4 className="font-semibold text-white mb-2">{t[language].germanTranslation}</h4>
              <p className="text-sm text-gray-400">Vollständig lokalisiert für DACH-Markt</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-6 h-6 text-brand-light" />
              </div>
              <h4 className="font-semibold text-white mb-2">{t[language].noMaintenance}</h4>
              <p className="text-sm text-gray-400">Set it and forget it - läuft vollautomatisch</p>
            </div>
          </div>
        </div>
        
        {/* Beta Access Banner - Subtiler platziert */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 text-center">
            <div className="text-lg font-medium text-white mb-3">
              {t[language].launchSpecial}
            </div>
            <button 
              onClick={() => window.open('https://tally.so/r/mRDyB9', '_blank')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-colors"
            >
              {t[language].requestAccess}
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Demo */}
      <div className="mb-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            {t[language].liveDemo}
          </div>
          <h2 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
            {t[language].warrenBuffett.split(' ').slice(0, 2).join(' ')}
            <span className="block text-gray-300">{t[language].warrenBuffett.split(' ').slice(2).join(' ')}</span>
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-gray-400 mb-6">
              {t[language].demoDescription}
            </p>
            
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                <span>Echtzeit Portfolio-Wert und Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                <span>Top Holdings mit aktuellen Allokationen</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                <span>Responsive Design für alle Geräte</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                <span>Dark Theme mit sanften Animationen</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <div id="finclue-demo-widget-container" className="w-full max-w-md">
              {/* Widget will render here */}
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Examples */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            Implementation Examples
          </h2>
          <p className="text-lg text-gray-400">
            Einfache Integration in wenigen Zeilen Code
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* HTML */}
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-brand-light flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Pure HTML
              </h3>
              <button
                onClick={() => copyToClipboard(htmlCode, 'html')}
                className="flex items-center gap-2 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {copied === 'html' ? (
                  <>
                    <CheckIcon className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <SyntaxHighlighter 
              language="html" 
              style={tomorrow}
              customStyle={{ 
                background: 'transparent', 
                padding: 0, 
                margin: 0,
                fontSize: '13px'
              }}
            >
              {htmlCode}
            </SyntaxHighlighter>
          </div>

          {/* Auto-Initialize */}
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-brand-light flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Auto-Initialize
              </h3>
              <button
                onClick={() => copyToClipboard(autoInitCode, 'auto')}
                className="flex items-center gap-2 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {copied === 'auto' ? (
                  <>
                    <CheckIcon className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <SyntaxHighlighter 
              language="html" 
              style={tomorrow}
              customStyle={{ 
                background: 'transparent', 
                padding: 0, 
                margin: 0,
                fontSize: '13px'
              }}
            >
              {autoInitCode}
            </SyntaxHighlighter>
          </div>

          {/* React */}
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-brand-light flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                React Implementation
              </h3>
              <button
                onClick={() => copyToClipboard(reactCode, 'react')}
                className="flex items-center gap-2 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {copied === 'react' ? (
                  <>
                    <CheckIcon className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <SyntaxHighlighter 
              language="jsx" 
              style={tomorrow}
              customStyle={{ 
                background: 'transparent', 
                padding: 0, 
                margin: 0,
                fontSize: '13px'
              }}
            >
              {reactCode}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>

      {/* Available Investors */}
      <div className="mb-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-sm font-medium backdrop-blur-sm mb-4">
            <UserGroupIcon className="w-3 h-3" />
            Verfügbare Investoren
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            Portfolio Widgets
          </h2>
          <p className="text-lg text-gray-400">
            Wähle aus über 90+ Super-Investoren und Fonds
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            'buffett', 'fisher', 'ackman', 'gates', 'icahn', 'einhorn', 
            'klarman', 'dalio', 'soros', 'tepper', 'loeb', 'greenblatt',
            'burry', 'arkman', 'coleman', 'cantillon'
          ].map(investor => (
            <div key={investor} className="group bg-gray-900/50 border border-white/10 rounded-xl p-4 text-center hover:border-green-500/30 transition-all duration-200">
              <code className="text-brand-light font-mono text-sm group-hover:text-green-300 transition-colors">
                {investor}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Superinvestor News API */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium backdrop-blur-sm mb-8">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
          New API
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
          Superinvestor News API
        </h2>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12">
          Erhalte automatisch generierte News über Portfolio-Bewegungen von Top-Investoren basierend auf 13F-Filings und Marktanalysen.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* All News Endpoint */}
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-brand-light flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Alle News
              </h3>
              <button
                onClick={() => copyToClipboard('/api/superinvestor-news/all?limit=10', 'news-all')}
                className="flex items-center gap-2 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {copied === 'news-all' ? (
                  <>
                    <CheckIcon className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="text-left">
              <p className="text-gray-300 text-sm mb-3">Aggregierte News aller Superinvestoren mit Trending-Analyse</p>
              <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-brand-light">
                GET /api/superinvestor-news/all?limit=10
              </div>
            </div>
          </div>

          {/* Individual Investor Endpoint */}
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                Investor-spezifisch
              </h3>
              <button
                onClick={() => copyToClipboard('/api/superinvestor-news/buffett', 'news-investor')}
                className="flex items-center gap-2 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {copied === 'news-investor' ? (
                  <>
                    <CheckIcon className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="text-left">
              <p className="text-gray-300 text-sm mb-3">News für einen spezifischen Investor basierend auf 13F-Daten</p>
              <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-blue-400">
                GET /api/superinvestor-news/buffett
              </div>
            </div>
          </div>

          {/* Response Example */}
          <div className="lg:col-span-2 bg-gray-900/50 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                Response Example
              </h3>
              <button
                onClick={() => copyToClipboard(`{
  "news": [
    {
      "id": "buffett_apple_1",
      "type": "major_move",
      "investor": {
        "slug": "buffett",
        "name": "Warren Buffett",
        "firm": "Berkshire Hathaway"
      },
      "title": "Warren Buffett increases Apple position by 15%",
      "summary": "15% increase in AAPL position (+$8.6B)",
      "relatedStock": "AAPL",
      "publishedDate": "2025-09-11T08:00:00.000Z",
      "relevanceScore": 0.95,
      "metadata": {
        "portfolioChange": {
          "action": "increased",
          "value": 8600000000,
          "percentage": 15
        }
      }
    }
  ],
  "summary": {
    "total": 7,
    "totalValue": 32600000000
  }
}`, 'news-response')}
                className="flex items-center gap-2 px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                {copied === 'news-response' ? (
                  <>
                    <CheckIcon className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <SyntaxHighlighter 
              language="json" 
              style={tomorrow}
              customStyle={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '16px', 
                borderRadius: '8px',
                fontSize: '12px',
                maxHeight: '300px',
                overflow: 'auto'
              }}
            >
{`{
  "news": [
    {
      "id": "buffett_apple_1",
      "type": "major_move",
      "investor": {
        "slug": "buffett",
        "name": "Warren Buffett",
        "firm": "Berkshire Hathaway"
      },
      "title": "Warren Buffett increases Apple position by 15%",
      "summary": "15% increase in AAPL position (+$8.6B)",
      "relatedStock": "AAPL",
      "publishedDate": "2025-09-11T08:00:00.000Z",
      "relevanceScore": 0.95,
      "metadata": {
        "portfolioChange": {
          "action": "increased",
          "value": 8600000000,
          "percentage": 15
        }
      }
    }
  ],
  "summary": {
    "total": 7,
    "totalValue": 32600000000
  }
}`}
            </SyntaxHighlighter>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <p className="text-blue-300 text-sm">
            <strong>Features:</strong> Portfolio-Change Detection, Cross-Investor Trending, Major Move Identification, Relevance Scoring, Demo Data Fallback
          </p>
        </div>
      </div>

      {/* Pricing */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 border border-brand/20 text-brand-light rounded-full text-sm font-medium backdrop-blur-sm mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          API Zugang
        </div>
        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-8">
          Pricing & Pläne
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-2">Basic</h3>
            <div className="text-3xl font-semibold text-white mb-4">€29<span className="text-lg text-gray-400">/mo</span></div>
            <ul className="text-sm text-gray-300 space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                1,000 Requests/Monat
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                30 Requests/Minute
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Alle Investoren
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Email Support
              </li>
            </ul>
            <button className="w-full py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors">
              Get Started
            </button>
          </div>

          <div className="bg-white/[0.04] border border-white/20 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-black text-xs font-medium rounded-full">
              Beliebt
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
            <div className="text-3xl font-semibold text-white mb-4">€99<span className="text-lg text-gray-400">/mo</span></div>
            <ul className="text-sm text-gray-300 space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                10,000 Requests/Monat
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                100 Requests/Minute
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Domain Whitelist
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Priority Support
              </li>
            </ul>
            <button className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors">
              Get Started
            </button>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
            <div className="text-3xl font-semibold text-white mb-4">€299<span className="text-lg text-gray-400">/mo</span></div>
            <ul className="text-sm text-gray-300 space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                100,000 Requests/Monat
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                500 Requests/Minute
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Custom Domains
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                SLA Garantie
              </li>
            </ul>
            <button className="w-full py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors">
              Kontakt
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            className="px-8 py-3 bg-white text-black hover:bg-gray-100 font-medium rounded-xl transition-colors inline-flex items-center gap-2"
            onClick={() => window.open('mailto:api@finclue.de?subject=Widget API Access Request', '_blank')}
          >
            API Key anfordern
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// Type declaration for the widget
declare global {
  interface Window {
    FinclueWidget: any
  }
}