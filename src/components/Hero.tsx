// src/components/Hero.tsx
export default function Hero() {
    return (
      <section className="w-full bg-gradient-to-r from-heroFrom to-heroTo">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center text-white">
          <h1 className="text-5xl font-orbitron font-bold mb-4">
            LERNE VON DEN BESTEN INVESTOREN DER WELT
          </h1>
          <p className="text-lg font-sans">
            "Der Preis ist, was Sie bezahlen, der Wert ist, was Sie erhalten."
            <br />
            Warren Buffett
          </p>
        </div>
      </section>
    )
  }