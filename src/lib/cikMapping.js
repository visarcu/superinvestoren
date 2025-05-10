// src/lib/cikMapping.ts

/**
 * Mapping von Investor-Slug → SEC CIK
 */
export const investorCiks = {
  // bereits vorhandene
  buffett: '0001067983',  
  ackman:  '0001336528',   
  pabrai:  '0001549575',
  akre:    '0001112520', 
  olstein: '0000947996',
  gregalexander:'0001773994',
  altarockpartners:     '0001631014', 
  miller:   '0001135778', // 0 positionen
  tepper:          '0001656456',
  coleman:         '0001167483',    // Chase Coleman – Tiger Global Management 
  gayner:         '0001096343',    // Thomas Gayner – Markel Group
  ainslie:           '0000934639',    // Lee Ainslie – Maverick Capital
  einhorn: '0001489933',
  hohn: '0001647251',
  yacktman: '0000905567',
  polen: '0001034524',
  viking:'0001103804',
  cantillon: '0001279936',
  duan:'0001759760',
  bloomstran: '0001115373',
  vinall:         '0001766596',    // Robert Vinall – RV Capital GmbH
  mandel:        '0001061165',    // Stephen Mandel – Lone Pine Capital
  ellenbogen: '0001798849',
  jensen:'0001106129',
  russo:          '0000860643',    // Thomas Russo – Gardner Russo & Quinn
  armitage:'0001581811', // John Armitage – Egerton Capital
  loeb:'0001040273',
  icahn: '0000921669',// Carl Icahn – Icahn Capital (Beispiel)
  tangen: '0001376879',    // AKO Capital
  greenhaven: '0000846222',    // Greenhaven Associates
  abrams: '0001358706',    // David Abrams – Abrams Capital Management
  martin: '0001050442', // Fred Martin 
  kantesaria: '0001697868', // Valley Forge Capital MGMT
  ubben: '0001418814',
  train: '0001484150',    // Lindsell Train
  brenton: '0001484148',
  peltz: '0001345471',
  burn:  '0000820124',    // Harry Burn – Sound Shore
  dorsey: '0001671657',
  chou:  '0001389403',    // Francis Chou – Chou Associates
  lawrence: '0001657335',    // Bryan Lawrence – Oakcliff Capital
  greenberg:       '0001553733',    // Glenn Greenberg – Brave Warrior Advisors
  roepers: '0001063296',    // Alex Roepers – Atlantic Investment Management
  munger: '0000783412',
  lountzis: '0001821168',
  haley:'0001858353',
  lou: '0001631664',    // Norbert Lou – Punch Card Management
  wyden:  '0001745214',
  muhlenkamp:  '0001133219',
  tarasoff: '0001766504',    // Josh Tarasoff – Greenlea Lane Capital
  welling: '0001559771',    // Glenn Welling – Engaged Capital
  rolfe: '0000859804',    // David Rolfe – Wedgewood Partners


  
  //NPORT P TYPES: EVTL NOCH CODE ANPASSEN
  //mairspower: '0001141819',    // Mairs & Power Growth Fund NPORT P -> O FILES
 // davis:     'XXX',    // Christopher Davis – Davis Advisors NPORT P
   // 'bill-nygren':           'XXX',    // Bill Nygren – Oakmark Select Fund
  // dodgecox:  '0000029440',    // Dodge & Cox
    // 'john-rogers':           'XXX',    // John Rogers – Ariel Appreciation Fund
   // cunniff:         '0002049493',    // Ruane Cunniff – Sequoia Fund //NPORT
   //'mason-hawkins':         '0000806636',    // Mason Hawkins – Longleaf Partners
  // torray:          'XXX',    // Torray Funds

 // 0 Einträge:
 klarman: '0001061768',
 triplefrond: '0001454502',    // Triple Frond Partners
 spier:             '0001953324',
 lee: '0001426749',
 whitman:  '0001099281',    // Third Avenue Management


  //Manuell folgende Investoren updaten
 //burry:   '0001768023', MANUELL!!!
 marks:  '0000949509',// MANUELL!!,
 // smith:    '0001569205', MANUELL
// lilu:                  '0001709323', MANUELL

  // neu hinzuzufügende Investoren:
  // 'wallace-weitz':         'XXX',    // Wallace Weitz – Weitz Large Cap Equity Fund NPORT P TYPE
  // 'david-katz':            'XXX',    // David Katz – Matrix Asset Advisors NPORT P TYPE
  // 'tweedy-browne':         'XXX',    // Tweedy Browne Co. – Tweedy Browne Value Fund

  // 'richard-pzena':         'XXX',    // Richard Pzena – Hancock Classic Value
 
  // 'romick':                'XXX',    // Steven Romick – FPA Crescent Fund
  // 'fpa-queens-road':       'XXX',    // FPA Queens Road Small Cap Value Fund



  // 'hillman-value':         'XXX',    // Hillman Value Fund


  
  // 'meridian-contrarian':   'XXX',    // Meridian Contrarian Fund

  'tom-bancroft':          '0001540866',    // Tom Bancroft – Makaira Partners

  // 'charles-bobrinskoy':    'XXX',    // Charles Bobrinskoy – Ariel Focus Fund



  // 'valueact-capital':      'XXX',    // ValueAct Capital

  'gates':      '0001166559',    // Bill & Melinda Gates Foundation Trust
  // 'bruce-berkowitz':       'XXX',    // Bruce Berkowitz – Fairholme Capital

  'kahn-brothers':         '0001039565',    // Kahn Brothers Group
  // 'valley-forge':          'XXX',    // Valley Forge Capital Management
 

  'samantha-mclemore':     '0001854794',    // Samantha McLemore – Patient Capital Management



 
  // 'leon-cooperman':        'XXX',    // Leon Cooperman

   //'clifford-sosin':        'XXX',    // Clifford Sosin – CAS Investment Partners



  //'prem-watsa':            'XXX',    // Prem Watsa – Fairfax Financial Holdings
  //'dennis-hong':           'XXX',    // Dennis Hong – ShawSpring Partners
  

  // 'francois-rochon':       'XXX',    // Francois Rochon – Giverny Capital



  

   // 'triple-frond':          'XXX',    // Triple Frond Partners



  

  //'christopher-davis':     'XXX',    // Christopher Davis – Davis Advisors




}