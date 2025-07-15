// src/lib/portfolio/secureStorage.ts
import CryptoJS from 'crypto-js'

class SecurePortfolioStorage {
  private storageKey = 'finclue_portfolio_encrypted'
  private encryptionKey: string | null = null

  // User muss beim ersten Mal ein Passwort setzen
  async initWithPassword(password: string): Promise<boolean> {
    try {
      // Erstelle Encryption Key aus User-Passwort
      this.encryptionKey = CryptoJS.PBKDF2(password, 'finclue-salt', {
        keySize: 256/32,
        iterations: 10000
      }).toString()
      
      // Teste ob Passwort stimmt (bei existing data)
      const existing = localStorage.getItem(this.storageKey)
      if (existing) {
        try {
          await this.loadPortfolio()
          return true // Passwort korrekt
        } catch {
          return false // Falsches Passwort
        }
      }
      return true // Neuer User
    } catch (error) {
      return false
    }
  }

  async savePortfolio(portfolio: any): Promise<void> {
    if (!this.encryptionKey) throw new Error('Nicht authentifiziert')
    
    // Verschlüssele Portfolio-Daten
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(portfolio), 
      this.encryptionKey
    ).toString()
    
    localStorage.setItem(this.storageKey, encrypted)
  }

  async loadPortfolio(): Promise<any> {
    if (!this.encryptionKey) throw new Error('Nicht authentifiziert')
    
    const encrypted = localStorage.getItem(this.storageKey)
    if (!encrypted) return null

    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey)
      const portfolioData = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8))
      return portfolioData
    } catch (error) {
      throw new Error('Entschlüsselung fehlgeschlagen - falsches Passwort?')
    }
  }

  logout(): void {
    this.encryptionKey = null
  }
}
