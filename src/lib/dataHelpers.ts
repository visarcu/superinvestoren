// src/lib/dataHelpers.ts - NUR die Normalisierung (Script bleibt unverändert)
export function normalizeHolding(rawData: any) {
    // Case 1: Script-generierte 13F-HR Daten (dein aktuelles Format)
    if (rawData.form === '13F-HR' && rawData.quarterKey) {
      // ✅ HIER wird das Filing-Quartal → Berichtetes Quartal umgewandelt
      const filingQuarter = rawData.quarterKey; // "2025-Q2"
      const [year, quarterPart] = filingQuarter.split('-');
      const filingQ = parseInt(quarterPart.replace('Q', ''));
      
      let reportedQ = filingQ - 1; // Q2 Filing → Q1 Daten
      let reportedYear = parseInt(year);
      
      if (reportedQ === 0) {
        reportedQ = 4;
        reportedYear = reportedYear - 1;
      }
      
      const reportedQuarter = `${reportedYear}-Q${reportedQ}`;
      
      return {
        ...rawData,
        quarterKey: reportedQuarter, // ← KORRIGIERT: "2025-Q1"
        originalQuarterKey: filingQuarter // ← Zum Debugging
      };
    }
    
    // Case 2: Dataroma-Daten (kein quarterKey)
    if (!rawData.form && rawData.positions) {
      const date = new Date(rawData.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      let quarter: number;
      if (month <= 3) quarter = 1;
      else if (month <= 6) quarter = 2;
      else if (month <= 9) quarter = 3;
      else quarter = 4;
      
      return {
        ...rawData,
        quarterKey: `${year}-Q${quarter}`,
        form: 'DATAROMA'
      };
    }
    
    // Case 3: Schon normalisiert
    return rawData;
  }
  
