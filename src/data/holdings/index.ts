// src/data/holdings/index.ts

// 1) Statische JSON-Imports aus jeweiligen Unterordnern:

//Bill Gates
import gates_2013_Q3 from './gates/gates-2013-Q3.json'
import gates_2013_Q4 from './gates/gates-2013-Q4.json'
import gates_2014_Q1 from './gates/gates-2014-Q1.json'
import gates_2014_Q2 from './gates/gates-2014-Q2.json'
import gates_2024_Q2 from './gates/gates-2024-Q2.json'
import gates_2024_Q3 from './gates/gates-2024-Q3.json'
import gates_2024_Q4 from './gates/gates-2024-Q4.json'
import gates_2025_Q1 from './gates/gates-2025-Q1.json'

//Warren Buffett
//import gates_2013_Q3 from './gates/gates-2013-Q3.json'
//import gates_2013_Q4 from './gates/gates-2013-Q4.json'
//import gates_2014_Q1 from './gates/gates-2014-Q1.json'
//import gates_2014_Q2 from './gates/gates-2014-Q2.json'
//import gates_2024_Q2 from './gates/gates-2024-Q2.json'
//import gates_2024_Q3 from './gates/gates-2024-Q3.json'
import buffett_2024_Q4 from './buffett/2024-Q4.json'
import buffett_2025_Q1 from './buffett/2025-Q1.json'

//Bill Ackman

import ackman_2024_Q1 from './ackman/2024-Q1.json'
import ackman_2024_Q2 from './ackman/2024-Q2.json'
import ackman_2024_Q3 from './ackman/2024-Q3.json'
import ackman_2024_Q4 from './ackman/2024-Q4.json'
import ackman_2025_Q1 from './ackman/2025-Q1.json'
//import ackman_2025_Q2 from './ackman/2025-Q2.json'

//Marks

import marks_2024_Q3 from './marks/2024-Q3.json'
import marks_2024_Q4 from './marks/2024-Q4.json'
import marks_2025_Q1 from './marks/2025-Q1.json'


//akre
import akre_2024_Q1 from './akre/2024-Q1.json'
import akre_2024_Q2 from './akre/2024-Q2.json'
import akre_2024_Q3 from './akre/2024-Q3.json'
import akre_2024_Q4 from './akre/2024-Q4.json'
import akre_2025_Q1 from './akre/2025-Q1.json'
import akre_2025_Q2 from './akre/2025-Q2.json'

//olstein
import olstein_2024_Q1 from './olstein/2024-Q1.json'
import olstein_2024_Q2 from './olstein/2024-Q2.json'
import olstein_2024_Q3 from './olstein/2024-Q3.json'
import olstein_2024_Q4 from './olstein/2024-Q4.json'
import olstein_2025_Q1 from './olstein/2025-Q1.json'

//greenberg
import greenberg_2024_Q1 from './greenberg/2024-Q1.json'
import greenberg_2024_Q2 from './greenberg/2024-Q2.json'
import greenberg_2024_Q3 from './greenberg/2024-Q3.json'
import greenberg_2024_Q4 from './greenberg/2024-Q4.json'
import greenberg_2025_Q1 from './greenberg/2025-Q1.json'

//greenhaven
import greenhaven_2024_Q1 from './greenhaven/2024-Q1.json'
import greenhaven_2024_Q2 from './greenhaven/2024-Q2.json'
import greenhaven_2024_Q3 from './greenhaven/2024-Q3.json'
import greenhaven_2024_Q4 from './greenhaven/2024-Q4.json'
import greenhaven_2025_Q1 from './greenhaven/2025-Q1.json'

//greenhaven
import gregalexander_2024_Q1 from './gregalexander/2024-Q1.json'
import gregalexander_2024_Q2 from './gregalexander/2024-Q2.json'
import gregalexander_2024_Q3 from './gregalexander/2024-Q3.json'
import gregalexander_2024_Q4 from './gregalexander/2024-Q4.json'
import gregalexander_2025_Q1 from './gregalexander/2025-Q1.json'

//Terry Smith
import smith_2024_Q4 from './smith/2024-Q4.json'
import smith_2025_Q1 from './smith/2025-Q1.json'

//Michael Burry
import burry_2024_Q3 from './burry/2024-Q3.json'
import burry_2024_Q4 from './burry/2024-Q4.json'
import burry_2025_Q1 from './burry/2025-Q1.json'

//Li Lu
import lilu_2024_Q4 from './lilu/2024-Q4.json'
import lilu_2025_Q1 from './lilu/2025-Q1.json'

//Altarock Partners
import   altarockpartners_2024_Q4 from './altarockpartners/2024-Q4.json'
import   altarockpartners_2025_Q1 from './altarockpartners/2025-Q1.json'

//Bill Miller
import   miller_2024_Q4 from './miller/2024-Q4.json'
import   miller_2025_Q1 from './miller/2025-Q1.json'

// Chase Coleman
import coleman_2024_Q1 from './coleman/2024-Q1.json'
import coleman_2024_Q2 from './coleman/2024-Q2.json'
import coleman_2024_Q3 from './coleman/2024-Q3.json'
import coleman_2024_Q4 from './coleman/2024-Q4.json'
import coleman_2025_Q1 from './coleman/2025-Q1.json'

//gayner
import gayner_2024_Q1 from './gayner/2024-Q1.json'
import gayner_2024_Q2 from './gayner/2024-Q2.json'
import gayner_2024_Q3 from './gayner/2024-Q3.json'
import gayner_2024_Q4 from './gayner/2024-Q4.json'
import gayner_2025_Q1 from './gayner/2025-Q1.json'

//ainslie
import ainslie_2024_Q1 from './ainslie/2024-Q1.json'
import ainslie_2024_Q2 from './ainslie/2024-Q2.json'
import ainslie_2024_Q3 from './ainslie/2024-Q3.json'
import ainslie_2024_Q4 from './ainslie/2024-Q4.json'
import ainslie_2025_Q1 from './ainslie/2025-Q1.json'


// … für jeden weiteren Slug analog …

// 2) Typen
export interface HoldingsFile {
  date: string
  positions: Array<{
    cusip:  string
    name:   string
    shares: number
    value:  number
  }>
}

export interface Snapshot {
  quarter: string
  data: HoldingsFile
}

// 3) Historie pro Investor
const holdingsHistory: Record<string, Snapshot[]> = {
  gates: [
    { quarter: '2013-Q3', data: gates_2013_Q3 },
    { quarter: '2013-Q4', data: gates_2013_Q4 },
    { quarter: '2014-Q1', data: gates_2014_Q1 },
    { quarter: '2014-Q2', data: gates_2014_Q2 },
    { quarter: '2024-Q2', data: gates_2024_Q2 },
    { quarter: '2024-Q3', data: gates_2024_Q3 },
    { quarter: '2024-Q4', data: gates_2024_Q4 },
    { quarter: '2025-Q1', data: gates_2025_Q1 },
  ],

  buffett: [
   { quarter: '2024-Q4', data: buffett_2024_Q4 },
   { quarter: '2025-Q1', data: buffett_2025_Q1 },
   // …
  ],
  ackman: [
   
    { quarter: '2024-Q1', data: ackman_2024_Q1 },
    { quarter: '2024-Q2', data: ackman_2024_Q2 },
    { quarter: '2024-Q3', data: ackman_2024_Q3 },
    { quarter: '2024-Q4', data: ackman_2024_Q4 },
    { quarter: '2025-Q1', data: ackman_2025_Q1 },
    //{ quarter: '2025-Q2', data: ackman_2025_Q2 },
    // …
   ],

   marks: [
   
    //{ quarter: '2024-Q1', data: marks_2024_Q1 },
    //{ quarter: '2024-Q2', data: marks_2024_Q2 },
    { quarter: '2024-Q3', data: marks_2024_Q3 },
    { quarter: '2024-Q4', data: marks_2024_Q4 },
    { quarter: '2025-Q1', data: marks_2025_Q1 },
   
    // …
   ],

   akre: [
   
    { quarter: '2024-Q1', data: akre_2024_Q1 },
    { quarter: '2024-Q2', data: akre_2024_Q2 },
    { quarter: '2024-Q3', data: akre_2024_Q3 },
    { quarter: '2024-Q4', data: akre_2024_Q4 },
    { quarter: '2025-Q1', data: akre_2025_Q1 },
   
    // …
   ],
   olstein: [
   
    { quarter: '2024-Q1', data: olstein_2024_Q1 },
    { quarter: '2024-Q2', data: olstein_2024_Q2 },
    { quarter: '2024-Q3', data: olstein_2024_Q3 },
    { quarter: '2024-Q4', data: olstein_2024_Q4 },
    { quarter: '2025-Q1', data: olstein_2025_Q1 },
   
    // …
   ],

   greenberg: [
   
    { quarter: '2024-Q1', data: greenberg_2024_Q1 },
    { quarter: '2024-Q2', data: greenberg_2024_Q2 },
    { quarter: '2024-Q3', data: greenberg_2024_Q3 },
    { quarter: '2024-Q4', data: greenberg_2024_Q4 },
    { quarter: '2025-Q1', data: greenberg_2025_Q1},
    
   ],


   greenhaven: [
   
    { quarter: '2024-Q1', data: greenhaven_2024_Q1 },
    { quarter: '2024-Q2', data: greenhaven_2024_Q2 },
    { quarter: '2024-Q3', data: greenhaven_2024_Q3 },
    { quarter: '2024-Q4', data: greenhaven_2024_Q4 },
    { quarter: '2025-Q1', data: greenhaven_2025_Q1},
  
   ],
   gregalexander: [
   
    { quarter: '2024-Q1', data: gregalexander_2024_Q1 },
    { quarter: '2024-Q2', data: gregalexander_2024_Q2 },
    { quarter: '2024-Q3', data: gregalexander_2024_Q3},
    { quarter: '2024-Q4', data: gregalexander_2024_Q4},
    { quarter: '2025-Q1', data: gregalexander_2025_Q1},
  
   
   ],
   
   smith: [
    { quarter: '2024-Q4', data: smith_2024_Q4 },
    { quarter: '2025-Q1', data: smith_2025_Q1 },
   ],

   burry: [
    { quarter: '2024-Q3', data: burry_2024_Q3 },
    { quarter: '2024-Q4', data: burry_2024_Q4 },
    { quarter: '2025-Q1', data: burry_2025_Q1 },
   ],

    lilu: [
    { quarter: '2024-Q4', data: lilu_2024_Q4 },
    { quarter: '2025-Q1', data: lilu_2025_Q1 },
   ],

   altarockpartners: [
    { quarter: '2024-Q4', data: altarockpartners_2024_Q4 },
    { quarter: '2025-Q1', data: altarockpartners_2025_Q1 },
   ],

   miller: [
    { quarter: '2024-Q4', data: miller_2024_Q4 },
    { quarter: '2025-Q1', data: miller_2025_Q1 },
   ],

   coleman: [
    { quarter: '2024-Q1', data: coleman_2024_Q1 },
    { quarter: '2024-Q2', data: coleman_2024_Q2 },
    { quarter: '2024-Q3', data: coleman_2024_Q3},
    { quarter: '2024-Q4', data: coleman_2024_Q4},
    { quarter: '2025-Q1', data: coleman_2025_Q1},
   ],

   gayner: [
    { quarter: '2024-Q1', data: gayner_2024_Q1 },
    { quarter: '2024-Q2', data: gayner_2024_Q2 },
    { quarter: '2024-Q3', data: gayner_2024_Q3},
    { quarter: '2024-Q4', data: gayner_2024_Q4},
    { quarter: '2025-Q1', data: gayner_2025_Q1},
   ],

   ainslie: [
    { quarter: '2024-Q1', data: ainslie_2024_Q1},
    { quarter: '2024-Q2', data: ainslie_2024_Q2 },
    { quarter: '2024-Q3', data: ainslie_2024_Q3},
    { quarter: '2024-Q4', data: ainslie_2024_Q4},
    { quarter: '2025-Q1', data: ainslie_2025_Q1},
   ],








  // … alle weiteren Investoren analog …
}

export default holdingsHistory