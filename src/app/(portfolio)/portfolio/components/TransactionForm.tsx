'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import StockAutocomplete from './StockAutocomplete'  // ← NEU IMPORT
import { Transaction, Account } from '../types/portfolio'

interface TransactionFormProps {
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void
  onCancel: () => void
}

export default function TransactionForm({ onSubmit, onCancel }: TransactionFormProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', bank: '', type: 'CHECKING' as Account['type'] })
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'BUY' as Transaction['type'],
    category: 'INVESTMENT' as Transaction['category'],
    symbol: '',
    name: '',
    quantity: '1',
    price: '',
    fees: '0',
    broker: '',
    account: '',
    description: ''
  })

  // Load accounts on component mount
  useEffect(() => {
    const savedAccounts = localStorage.getItem('portfolio_accounts')
    if (savedAccounts) {
      setAccounts(JSON.parse(savedAccounts))
    } else {
      // Default accounts
      const defaultAccounts: Account[] = [
        { id: '1', name: 'Hauptkonto', bank: 'Standard', type: 'CHECKING' },
        { id: '2', name: 'Sparkonto', bank: 'Standard', type: 'SAVINGS' },
        { id: '3', name: 'Geschäftskonto', bank: 'Standard', type: 'BUSINESS' }
      ]
      setAccounts(defaultAccounts)
      localStorage.setItem('portfolio_accounts', JSON.stringify(defaultAccounts))
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.date) {
      alert('Bitte wähle ein Datum.')
      return
    }

    if (formData.type === 'BUY' || formData.type === 'SELL' || formData.type === 'DIVIDEND') {
      if (!formData.symbol || !formData.name || !formData.quantity || !formData.price) {
        alert('Bitte fülle alle Pflichtfelder aus.')
        return
      }
    } else {
      if (!formData.symbol || !formData.price) {
        alert('Bitte wähle eine Kategorie und gib einen Betrag ein.')
        return
      }
    }

    onSubmit({
      date: formData.date,
      type: formData.type,
      category: formData.category,
      symbol: formData.symbol.toUpperCase(),
      name: formData.name || formData.symbol,
      quantity: parseFloat(formData.quantity) || 1,
      price: parseFloat(formData.price),
      fees: parseFloat(formData.fees) || 0,
      broker: formData.broker,
      account: formData.account,
      description: formData.description
    })
  }

  const handleTypeChange = (type: Transaction['type']) => {
    setFormData(prev => ({
      ...prev,
      type,
      category: type === 'BUY' || type === 'SELL' ? 'INVESTMENT' : 
                type === 'DIVIDEND' ? 'INCOME' : 
                type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      symbol: '',
      name: '',
      quantity: type === 'INCOME' || type === 'EXPENSE' ? '1' : '',
      price: '',
      fees: '0',
      broker: '',
      account: ''
    }))
  }

  // ✅ NEU: Handler für Stock Selection
  const handleStockSelect = (symbol: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      symbol,
      name
    }))
  }

  const addAccount = () => {
    if (!newAccount.name || !newAccount.bank) {
      alert('Bitte fülle Name und Bank aus.')
      return
    }

    const account: Account = {
      id: Date.now().toString(),
      name: newAccount.name,
      bank: newAccount.bank,
      type: newAccount.type
    }

    const updatedAccounts = [...accounts, account]
    setAccounts(updatedAccounts)
    localStorage.setItem('portfolio_accounts', JSON.stringify(updatedAccounts))
    
    // Select the new account
    setFormData(prev => ({ ...prev, account: account.id }))
    
    // Reset form
    setNewAccount({ name: '', bank: '', type: 'CHECKING' })
    setShowAddAccount(false)
  }

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'CHECKING': return '💳'
      case 'SAVINGS': return '💰'
      case 'BUSINESS': return '🏢'
      case 'INVESTMENT': return '📈'
      default: return '🏦'
    }
  }

  const getAccountLabel = (type: Account['type']) => {
    switch (type) {
      case 'CHECKING': return 'Girokonto'
      case 'SAVINGS': return 'Sparkonto'
      case 'BUSINESS': return 'Geschäftskonto'
      case 'INVESTMENT': return 'Depot'
      default: return 'Sonstiges'
    }
  }

  const isInvestmentType = formData.type === 'BUY' || formData.type === 'SELL' || formData.type === 'DIVIDEND'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-card rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-theme-primary">
            Neue Transaktion
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-theme-hover rounded-lg transition"
          >
            <XMarkIcon className="w-5 h-5 text-theme-secondary" />
          </button>
        </div>

        <div className="space-y-4">
          
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Datum *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary focus:border-green-500 focus:outline-none transition"
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Transaktionstyp *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'BUY', label: '📈 Kauf', color: 'green' },
                { value: 'SELL', label: '📉 Verkauf', color: 'red' },
                { value: 'DIVIDEND', label: '💎 Dividende', color: 'blue' },
                { value: 'INCOME', label: '💰 Einnahme', color: 'green' },
                { value: 'EXPENSE', label: '💸 Ausgabe', color: 'red' }
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleTypeChange(value as Transaction['type'])}
                  className={`p-3 rounded-lg border-2 transition text-sm font-medium ${
                    formData.type === value
                      ? color === 'green' ? 'border-green-500 bg-green-500/10 text-green-400'
                      : color === 'red' ? 'border-red-500 bg-red-500/10 text-red-400'  
                      : 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-theme-hover bg-theme-tertiary text-theme-secondary hover:border-theme-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Fields based on Type */}
          {isInvestmentType ? (
            // INVESTMENT FIELDS
            <>
              {/* ✅ ERSETZT: Symbol Input durch StockAutocomplete */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Symbol/Ticker *
                </label>
                <StockAutocomplete
                  value={formData.symbol}
                  onSelect={handleStockSelect}
                  placeholder="z.B. AAPL, MSFT, TSLA..."
                />
              </div>

              {/* Name - wird jetzt automatisch ausgefüllt */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Wird automatisch ausgefüllt..."
                  className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition"
                />
              </div>

              {/* Quantity & Price - Different for Dividends */}
              {formData.type === 'DIVIDEND' ? (
                // DIVIDEND: Only total amount needed
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Dividenden-Betrag (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value, quantity: '1' }))}
                    placeholder="25.80"
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition numeric"
                  />
                  <p className="text-xs text-theme-muted mt-1">
                    Gesamtbetrag der erhaltenen Dividende (netto)
                  </p>
                </div>
              ) : (
                // BUY/SELL: Quantity and Price
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Anzahl *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="10"
                      className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition numeric"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                      Preis (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="150.00"
                      className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition numeric"
                    />
                  </div>
                </div>
              )}

              {/* Fees & Broker */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Gebühren (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fees}
                    onChange={(e) => setFormData(prev => ({ ...prev, fees: e.target.value }))}
                    placeholder="1.00"
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition numeric"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Broker
                  </label>
                  <select
                    value={formData.broker}
                    onChange={(e) => setFormData(prev => ({ ...prev, broker: e.target.value }))}
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary focus:border-green-500 focus:outline-none transition"
                  >
                    <option value="">Wählen...</option>
                    <option value="Trade Republic">Trade Republic</option>
                    <option value="Scalable Capital">Scalable Capital</option>
                    <option value="ING">ING</option>
                    <option value="DKB">DKB</option>
                    <option value="Consorsbank">Consorsbank</option>
                    <option value="Comdirect">Comdirect</option>
                    <option value="Sonstiges">Sonstiges</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            // INCOME/EXPENSE FIELDS
            <>
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Kategorie *
                </label>
                <select
                  value={formData.symbol}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    symbol: e.target.value, 
                    name: e.target.value 
                  }))}
                  className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary focus:border-green-500 focus:outline-none transition"
                >
                  <option value="">Kategorie wählen...</option>
                  {formData.type === 'INCOME' ? (
                    <>
                      <option value="Gehalt">💼 Gehalt</option>
                      <option value="YouTube">📺 YouTube</option>
                      <option value="Website">🌐 Website</option>
                      <option value="Freelance">💻 Freelance</option>
                      <option value="Bonus">🎉 Bonus</option>
                      <option value="Steuererstattung">💰 Steuererstattung</option>
                      <option value="Sonstiges">📄 Sonstiges</option>
                    </>
                  ) : (
                    <>
                      <option value="Miete">🏠 Miete</option>
                      <option value="Lebensmittel">🛒 Lebensmittel</option>
                      <option value="Transport">🚗 Transport</option>
                      <option value="Entertainment">🎬 Entertainment</option>
                      <option value="Betriebsausgaben">🏢 Betriebsausgaben</option>
                      <option value="Versicherungen">🛡️ Versicherungen</option>
                      <option value="Kleidung">👕 Kleidung</option>
                      <option value="Gesundheit">🏥 Gesundheit</option>
                      <option value="Bildung">📚 Bildung</option>
                      <option value="Sonstiges">📄 Sonstiges</option>
                    </>
                  )}
                </select>
              </div>

              {/* Amount & Account */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Betrag (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder={formData.type === 'INCOME' ? '3500.00' : '85.50'}
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition numeric"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Konto
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.account}
                      onChange={(e) => setFormData(prev => ({ ...prev, account: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary focus:border-green-500 focus:outline-none transition"
                    >
                      <option value="">Konto wählen...</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {getAccountIcon(account.type)} {account.name} ({account.bank})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddAccount(true)}
                      className="px-3 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">
              Beschreibung
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={
                formData.type === 'INCOME' ? 'z.B. Monatsgehalt August' :
                formData.type === 'EXPENSE' ? 'z.B. Wocheneinkauf Edeka' :
                formData.type === 'DIVIDEND' ? 'z.B. Quartalsdividende Q3' :
                'Zusätzliche Informationen...'
              }
              rows={2}
              className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Total Calculation - Updated for Dividends */}
          {isInvestmentType && formData.price && (
            <div className="bg-theme-tertiary rounded-lg p-4">
              {formData.type === 'DIVIDEND' ? (
                // Dividend: Show only total amount
                <div className="flex justify-between items-center text-theme-primary font-semibold">
                  <span>Dividenden-Ertrag:</span>
                  <span className="numeric text-green-400">
                    €{(parseFloat(formData.price) || 0).toFixed(2)}
                  </span>
                </div>
              ) : (
                // BUY/SELL: Show calculation
                <>
                  <div className="flex justify-between items-center text-theme-secondary text-sm">
                    <span>Gesamtwert:</span>
                    <span className="numeric">
                      €{((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0)).toFixed(2)}
                    </span>
                  </div>
                  {formData.fees !== '0' && (
                    <div className="flex justify-between items-center text-theme-secondary text-sm">
                      <span>Gebühren:</span>
                      <span className="numeric">€{(parseFloat(formData.fees) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-theme-hover mt-2 pt-2">
                    <div className="flex justify-between items-center text-theme-primary font-semibold">
                      <span>Gesamt:</span>
                      <span className="numeric">
                        €{(
                          (parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0) + 
                          (parseFloat(formData.fees) || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {!isInvestmentType && formData.price && (
            <div className="bg-theme-tertiary rounded-lg p-4">
              <div className="flex justify-between items-center text-theme-primary font-semibold">
                <span>Betrag:</span>
                <span className="numeric">€{(parseFloat(formData.price) || 0).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-theme-tertiary hover:bg-theme-hover text-theme-secondary font-medium rounded-lg transition"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition"
            >
              Speichern
            </button>
          </div>
        </div>

        {/* Add Account Modal */}
        {showAddAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-theme-card rounded-xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-theme-primary mb-4">
                Neues Konto hinzufügen
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Kontoname *
                  </label>
                  <input
                    type="text"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Hauptkonto, Sparkonto"
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Bank *
                  </label>
                  <input
                    type="text"
                    value={newAccount.bank}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, bank: e.target.value }))}
                    placeholder="z.B. Sparkasse, C24, ING"
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary placeholder-theme-muted focus:border-green-500 focus:outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Kontotyp
                  </label>
                  <select
                    value={newAccount.type}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, type: e.target.value as Account['type'] }))}
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary focus:border-green-500 focus:outline-none transition"
                  >
                    <option value="CHECKING">💳 Girokonto</option>
                    <option value="SAVINGS">💰 Sparkonto</option>
                    <option value="BUSINESS">🏢 Geschäftskonto</option>
                    <option value="INVESTMENT">📈 Depot</option>
                    <option value="OTHER">🏦 Sonstiges</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAccount(false)
                      setNewAccount({ name: '', bank: '', type: 'CHECKING' })
                    }}
                    className="flex-1 px-4 py-3 bg-theme-tertiary hover:bg-theme-hover text-theme-secondary font-medium rounded-lg transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={addAccount}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}