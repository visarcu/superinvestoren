// scripts/seed-dax-companies.ts
// Seed-Daten für alle 40 DAX-Firmen mit Metadaten für manuelle Finanzdaten-Pflege
//
// Run: npx tsx scripts/seed-dax-companies.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface DaxCompanySeed {
  ticker: string
  tickerUS?: string
  isin?: string
  lei?: string
  name: string
  nameShort: string
  sector: string
  country?: string
  currency?: string
  fiscalYearEnd?: string
  irUrl?: string
  reportsUrl?: string
}

const DAX_COMPANIES: DaxCompanySeed[] = [
  // Automobilindustrie
  { ticker: 'BMW.DE', isin: 'DE0005190003', lei: '529900RZ1WUDHF9DI614', name: 'Bayerische Motoren Werke Aktiengesellschaft', nameShort: 'BMW', sector: 'Automobilindustrie', irUrl: 'https://www.bmwgroup.com/en/investor-relations.html', reportsUrl: 'https://www.bmwgroup.com/en/investor-relations/financial-reports.html' },
  { ticker: 'MBG.DE', isin: 'DE0007100000', lei: '529900R27DL06UVNT076', name: 'Mercedes-Benz Group AG', nameShort: 'Mercedes-Benz', sector: 'Automobilindustrie', irUrl: 'https://group.mercedes-benz.com/investors/', reportsUrl: 'https://group.mercedes-benz.com/investors/reports-news/financial-reports/' },
  { ticker: 'VOW3.DE', isin: 'DE0007664039', lei: '529900NNUPAGGOMPXZ31', name: 'Volkswagen AG', nameShort: 'Volkswagen', sector: 'Automobilindustrie', irUrl: 'https://www.volkswagenag.com/en/InvestorRelations.html', reportsUrl: 'https://www.volkswagenag.com/en/InvestorRelations/news-and-publications/Annual_Reports.html' },
  { ticker: 'P911.DE', isin: 'DE000PAG9113', lei: '529900K5PG6FL8EA2B30', name: 'Porsche AG', nameShort: 'Porsche AG', sector: 'Automobilindustrie', irUrl: 'https://investorrelations.porsche.com/', reportsUrl: 'https://investorrelations.porsche.com/publications/financial-reports.html' },
  { ticker: 'PAH3.DE', isin: 'DE000PAH0038', lei: '529900A9A95ZZQPEJW40', name: 'Porsche Automobil Holding SE', nameShort: 'Porsche SE', sector: 'Automobilindustrie', irUrl: 'https://www.porsche-se.com/en/investors' },
  { ticker: 'DTG.DE', isin: 'DE000DTR0CK8', lei: '529900K10PLKXDCKVR64', name: 'Daimler Truck Holding AG', nameShort: 'Daimler Truck', sector: 'Nutzfahrzeuge', irUrl: 'https://www.daimlertruck.com/en/investors' },
  { ticker: 'CON.DE', isin: 'DE0005439004', lei: '529900SL2WSPV293B552', name: 'Continental AG', nameShort: 'Continental', sector: 'Automobilzulieferer', irUrl: 'https://www.continental.com/en/investors/' },

  // Industrie
  { ticker: 'SIE.DE', isin: 'DE0007236101', lei: 'W38RGI023J3WT1HWRP32', name: 'Siemens AG', nameShort: 'Siemens', sector: 'Industrie', fiscalYearEnd: '09-30', irUrl: 'https://www.siemens.com/global/en/company/investor-relations.html' },
  { ticker: 'ENR.DE', isin: 'DE000ENER6Y0', lei: '549300OTC91EA4KB2P38', name: 'Siemens Energy AG', nameShort: 'Siemens Energy', sector: 'Energie-Technik', fiscalYearEnd: '09-30', irUrl: 'https://www.siemens-energy.com/global/en/home/investor-relations.html' },
  { ticker: 'SHL.DE', isin: 'DE000SHL1006', lei: '529900UYNX2SU7Y0FP89', name: 'Siemens Healthineers AG', nameShort: 'Siemens Healthineers', sector: 'Medizintechnik', fiscalYearEnd: '09-30', irUrl: 'https://www.siemens-healthineers.com/investor-relations' },
  { ticker: 'MTX.DE', isin: 'DE000A0D9PT0', lei: '529900OE2CT2G07TIQ16', name: 'MTU Aero Engines AG', nameShort: 'MTU', sector: 'Luftfahrt', irUrl: 'https://www.mtu.de/investors/' },
  { ticker: 'RHM.DE', isin: 'DE0007030009', lei: '529900NDH5M0WMBIC077', name: 'Rheinmetall AG', nameShort: 'Rheinmetall', sector: 'Rüstung/Automotive', irUrl: 'https://www.rheinmetall.com/en/investor-relations' },
  { ticker: 'HEI.DE', isin: 'DE0006047004', lei: '529900TNJ4QGENXEV798', name: 'Heidelberg Materials AG', nameShort: 'Heidelberg Materials', sector: 'Baustoffe', irUrl: 'https://www.heidelbergmaterials.com/en/investor-relations' },
  { ticker: 'AIR.DE', isin: 'NL0000235190', lei: '529900S21EQ1BO4ESM68', name: 'Airbus SE', nameShort: 'Airbus', sector: 'Luftfahrt', country: 'NL', irUrl: 'https://www.airbus.com/en/investors' },

  // Chemie & Pharma
  { ticker: 'BAS.DE', isin: 'DE000BASF111', lei: '529900PM64WH8AF1E917', name: 'BASF SE', nameShort: 'BASF', sector: 'Chemie', irUrl: 'https://www.basf.com/global/en/investors.html' },
  { ticker: 'BAYN.DE', isin: 'DE000BAY0017', lei: '549300T9QE8BPDVWN450', name: 'Bayer AG', nameShort: 'Bayer', sector: 'Pharma/Chemie', irUrl: 'https://www.bayer.com/en/investors' },
  { ticker: 'MRK.DE', isin: 'DE0006599905', lei: '529900BDHKEIX3UL2H50', name: 'Merck KGaA', nameShort: 'Merck', sector: 'Pharma/Chemie', irUrl: 'https://www.merckgroup.com/en/investors.html' },
  { ticker: 'SRT3.DE', isin: 'DE0007165631', lei: '5299008GPEFQPYD19Y26', name: 'Sartorius AG', nameShort: 'Sartorius', sector: 'Laborausrüstung', irUrl: 'https://www.sartorius.com/en/investor-relations' },
  { ticker: 'SY1.DE', isin: 'DE000SYM9999', lei: '5299009VHKV1S7HCSG38', name: 'Symrise AG', nameShort: 'Symrise', sector: 'Aromen/Duftstoffe', irUrl: 'https://www.symrise.com/investors/' },
  { ticker: 'FRE.DE', isin: 'DE0005785604', lei: '549300E9PC51EN656011', name: 'Fresenius SE & Co. KGaA', nameShort: 'Fresenius', sector: 'Gesundheit', irUrl: 'https://www.fresenius.com/investors' },
  { ticker: 'QIA.DE', tickerUS: 'QGEN', isin: 'NL0012169213', lei: '724500HZE83TRCOZV257', name: 'QIAGEN N.V.', nameShort: 'Qiagen', sector: 'Biotech', country: 'NL', currency: 'USD', irUrl: 'https://corporate.qiagen.com/English/investor-relations' },

  // Finanzen
  { ticker: 'ALV.DE', isin: 'DE0008404005', lei: '529900K9B0N5BT694847', name: 'Allianz SE', nameShort: 'Allianz', sector: 'Versicherung', irUrl: 'https://www.allianz.com/en/investor_relations.html' },
  { ticker: 'MUV2.DE', isin: 'DE0008430026', lei: '529900MUF4C20K50JS49', name: 'Münchener Rückversicherungs-Gesellschaft AG', nameShort: 'Munich Re', sector: 'Rückversicherung', irUrl: 'https://www.munichre.com/en/company/investors.html' },
  { ticker: 'HNR1.DE', isin: 'DE0008402215', lei: '529900UOBDNF1CB9LR95', name: 'Hannover Rück SE', nameShort: 'Hannover Rück', sector: 'Rückversicherung', irUrl: 'https://www.hannover-rueck.com/investors' },
  { ticker: 'DBK.DE', tickerUS: 'DB', isin: 'DE0005140008', lei: '7LTWFZYICNSX8D621K86', name: 'Deutsche Bank AG', nameShort: 'Deutsche Bank', sector: 'Banken', irUrl: 'https://investor-relations.db.com/' },
  { ticker: 'CBK.DE', isin: 'DE000CBK1001', lei: '851WYGNLUQLFZBSYGB56', name: 'Commerzbank AG', nameShort: 'Commerzbank', sector: 'Banken', irUrl: 'https://www.commerzbank.com/en/hauptnavigation/aktionaere/aktionaere.html' },
  { ticker: 'DB1.DE', isin: 'DE0005810055', lei: '529900G3SW56SHYNPR95', name: 'Deutsche Börse AG', nameShort: 'Deutsche Börse', sector: 'Börsenbetreiber', irUrl: 'https://www.deutsche-boerse.com/dbg-en/investor-relations' },

  // Tech & Software
  { ticker: 'SAP.DE', tickerUS: 'SAP', isin: 'DE0007164600', lei: '529900D6BF99LW9R2E68', name: 'SAP SE', nameShort: 'SAP', sector: 'Software', irUrl: 'https://www.sap.com/investors.html' },
  { ticker: 'IFX.DE', isin: 'DE0006231004', lei: '529900T7ARONWFVOIR25', name: 'Infineon Technologies AG', nameShort: 'Infineon', sector: 'Halbleiter', fiscalYearEnd: '09-30', irUrl: 'https://www.infineon.com/cms/en/about-infineon/investor/' },

  // Konsum
  { ticker: 'ADS.DE', isin: 'DE000A1EWWW0', lei: '549300JSX0Z4CW0V5023', name: 'adidas AG', nameShort: 'adidas', sector: 'Sportartikel', irUrl: 'https://www.adidas-group.com/en/investors/' },
  { ticker: 'PUM.DE', isin: 'DE0006969603', lei: '529900GRZ2BQY5ZM9N49', name: 'PUMA SE', nameShort: 'PUMA', sector: 'Sportartikel', irUrl: 'https://about.puma.com/en/investor-relations' },
  { ticker: 'BEI.DE', isin: 'DE0005200000', lei: '5493008QH1I5IC8K2Z64', name: 'Beiersdorf AG', nameShort: 'Beiersdorf', sector: 'Kosmetik', irUrl: 'https://www.beiersdorf.com/investor-relations' },
  { ticker: 'HEN3.DE', isin: 'DE0006048432', lei: '529900OVQ3YKZZUMWT37', name: 'Henkel AG & Co. KGaA', nameShort: 'Henkel', sector: 'Konsumgüter', irUrl: 'https://www.henkel.com/investors-and-analysts' },
  { ticker: 'ZAL.DE', isin: 'DE000ZAL1111', lei: '391200LRYZNBJ7TLQO66', name: 'Zalando SE', nameShort: 'Zalando', sector: 'E-Commerce', irUrl: 'https://corporate.zalando.com/en/investor-relations' },

  // Versorger & Logistik
  { ticker: 'RWE.DE', isin: 'DE0007037129', lei: '529900PVHQ4D88E7MJ14', name: 'RWE AG', nameShort: 'RWE', sector: 'Energieversorgung', irUrl: 'https://www.rwe.com/en/investor-relations/' },
  { ticker: 'EOAN.DE', isin: 'DE000ENAG999', lei: '529900FCQ34KMY4J8Q83', name: 'E.ON SE', nameShort: 'E.ON', sector: 'Energieversorgung', irUrl: 'https://www.eon.com/en/investor-relations.html' },
  { ticker: 'DTE.DE', isin: 'DE0005557508', lei: '549300V9QSIG4WX4GJ96', name: 'Deutsche Telekom AG', nameShort: 'Deutsche Telekom', sector: 'Telekom', irUrl: 'https://www.telekom.com/en/investor-relations' },
  { ticker: 'DHL.DE', isin: 'DE0005552004', lei: '529900V4EMEOTROCBD45', name: 'Deutsche Post AG (DHL Group)', nameShort: 'DHL Group', sector: 'Logistik', irUrl: 'https://www.dpdhl.com/en/investors.html' },

  // Immobilien & Sonstige
  { ticker: 'VNA.DE', isin: 'DE000A1ML7J1', lei: '529900PQK6N76YNCD397', name: 'Vonovia SE', nameShort: 'Vonovia', sector: 'Immobilien', irUrl: 'https://investoren.vonovia.de/en/' },
  { ticker: 'BNR.DE', isin: 'DE000A1DAHH0', lei: '391200T6FZBADQLBFO22', name: 'Brenntag SE', nameShort: 'Brenntag', sector: 'Chemiedistribution', irUrl: 'https://www.brenntag.com/en/investor-relations/' },
  { ticker: 'G24.DE', isin: 'DE000A12DM80', lei: '5493007EIKM2ENQS7U66', name: 'Scout24 SE', nameShort: 'Scout24', sector: 'Online-Marktplatz', irUrl: 'https://www.scout24.com/investor-relations' },
]

async function main() {
  console.log(`🌱 Seeding ${DAX_COMPANIES.length} DAX companies...`)
  let created = 0
  let updated = 0

  for (const company of DAX_COMPANIES) {
    const result = await prisma.daxCompany.upsert({
      where: { ticker: company.ticker },
      create: {
        ticker: company.ticker,
        tickerUS: company.tickerUS,
        isin: company.isin,
        lei: company.lei,
        name: company.name,
        nameShort: company.nameShort,
        sector: company.sector,
        fiscalYearEnd: company.fiscalYearEnd ?? '12-31',
        country: company.country ?? 'DE',
        currency: company.currency ?? 'EUR',
        irUrl: company.irUrl,
        reportsUrl: company.reportsUrl,
      },
      update: {
        // Update metadata but keep earnings dates + status
        name: company.name,
        nameShort: company.nameShort,
        sector: company.sector,
        irUrl: company.irUrl,
        reportsUrl: company.reportsUrl,
        lei: company.lei,
        isin: company.isin,
        tickerUS: company.tickerUS,
      },
    })
    const wasNew = result.createdAt.getTime() === result.updatedAt.getTime()
    if (wasNew) created++
    else updated++
    console.log(`  ${wasNew ? '✨' : '🔄'} ${company.ticker.padEnd(10)} ${company.nameShort}`)
  }

  const total = await prisma.daxCompany.count()
  console.log(`\n✅ Done: ${created} created, ${updated} updated, ${total} total in DB.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
