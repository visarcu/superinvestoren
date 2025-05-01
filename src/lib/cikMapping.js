// src/lib/cikMapping.ts

/**
 * Mapping von Investor-Slug → SEC CIK
 * Bitte alle 'XXX' durch die korrekten CIK-Nummern ersetzen.
 */
export const investorCiks = {
  // bereits vorhandene
  buffett: '0001067983',  
  ackman:  '0001336528',   
  pabrai:  '0001571785',
  akre:    '0001112520', 
  olstein: '0000947996',
  gregalexander:'0001773994',
  altarockpartners:     '0001631014', 
  miller:   '0001135778',
  tepper:          '0001377071',
  spier:             '0001404599', 


  //Manuell folgende Investoren updaten
 //burry:   '0001768023', MANUELL!!!
 // marks:  0000949509, MANUELL!!
 // smith:    '0001569205', MANUELL
// lilu:                  '0001709323', MANUELL

  // neu hinzuzufügende Investoren:
  // 'wallace-weitz':         'XXX',    // Wallace Weitz – Weitz Large Cap Equity Fund
  // 'david-katz':            'XXX',    // David Katz – Matrix Asset Advisors
  // 'tweedy-browne':         'XXX',    // Tweedy Browne Co. – Tweedy Browne Value Fund
  'mairs-power':           '0000061628',    // Mairs & Power Growth Fund
  // 'richard-pzena':         'XXX',    // Richard Pzena – Hancock Classic Value
  'dodgecox':             '0000020017',    // Dodge & Cox
  // 'romick':                'XXX',    // Steven Romick – FPA Crescent Fund
  // 'fpa-queens-road':       'XXX',    // FPA Queens Road Small Cap Value Fund
  'olstein':        '0000947996',    // Robert Olstein – Olstein Capital Management
  'robert-vinall':         '0001766596',    // Robert Vinall – RV Capital GmbH

  // 'hillman-value':         'XXX',    // Hillman Value Fund
  'greenhaven': '0000846222',    // Greenhaven Associates
  // 'bill-nygren':           'XXX',    // Bill Nygren – Oakmark Select Fund
  'mason-hawkins':         '0000806636',    // Mason Hawkins – Longleaf Partners
  // 'meridian-contrarian':   'XXX',    // Meridian Contrarian Fund
  'ruane-cunniff':         '0002049493',    // Ruane Cunniff – Sequoia Fund
  'tom-bancroft':          '0001540866',    // Tom Bancroft – Makaira Partners
  // 'john-rogers':           'XXX',    // John Rogers – Ariel Appreciation Fund
  // 'charles-bobrinskoy':    'XXX',    // Charles Bobrinskoy – Ariel Focus Fund

  'daniel-loeb':           '0001040273',    // Daniel Loeb – Third Point
  'stephen-mandel':        '0001061165',    // Stephen Mandel – Lone Pine Capital
  'carl-icahn':            '0000853610', // Carl Icahn – Icahn Capital (Beispiel)
  'lee-ainslie':           '0000934639',    // Lee Ainslie – Maverick Capital
  // 'nelson-peltz':          'XXX',    // Nelson Peltz – Trian Fund Management
  'david-einhorn':         '0001342577', // David Einhorn – Greenlight
  // 'valueact-capital':      'XXX',    // ValueAct Capital
  // 'norbert-lou':           'XXX',    // Norbert Lou – Punch Card Management
  'gates':      '0001166559',    // Bill & Melinda Gates Foundation Trust
  // 'bruce-berkowitz':       'XXX',    // Bruce Berkowitz – Fairholme Capital
  // 'alex-roepers':          'XXX',    // Alex Roepers – Atlantic Investment Management
  'kahn-brothers':         '0001039565',    // Kahn Brothers Group
  // 'valley-forge':          'XXX',    // Valley Forge Capital Management
  // 'david-rolfe':           'XXX',    // David Rolfe – Wedgewood Partners
  'greenberg':       '0001553733',    // Glenn Greenberg – Brave Warrior Advisors
  'viking-global':         '0001103804',    // Viking Global Investors
  'samantha-mclemore':     '0001854794',    // Samantha McLemore – Patient Capital Management
  'coleman':         '0001167483',    // Chase Coleman – Tiger Global Management
  // 'glenn-welling':         'XXX',    // Glenn Welling – Engaged Capital

  // 'pat-dorsey':            'XXX',    // Pat Dorsey – Dorsey Asset Management
  // 'leon-cooperman':        'XXX',    // Leon Cooperman
  // 'josh-tarasoff':         'XXX',    // Josh Tarasoff – Greenlea Lane Capital
   //'clifford-sosin':        'XXX',    // Clifford Sosin – CAS Investment Partners
   //'chris-hohn':            'XXX',    // Chris Hohn – TCI Fund Management
   //'bryan-lawrence':        'XXX',    // Bryan Lawrence – Oakcliff Capital

  //'prem-watsa':            'XXX',    // Prem Watsa – Fairfax Financial Holdings
  //'dennis-hong':           'XXX',    // Dennis Hong – ShawSpring Partners
  'seth-klarman':          '0000875415', // Seth Klarman – Baupost Group

  // 'francois-rochon':       'XXX',    // Francois Rochon – Giverny Capital
   //'third-avenue':          'XXX',    // Third Avenue Management
   //'francis-chou':          'XXX',    // Francis Chou – Chou Associates

  'howard-marks':          '0000976518', // Howard Marks – Oaktree Capital
  'thomas-russo':          '0000860643',    // Thomas Russo – Gardner Russo & Quinn
   // 'ako-capital':           'XXX',    // AKO Capital
   // 'triple-frond':          'XXX',    // Triple Frond Partners
   // 'harry-burn':            'XXX',    // Harry Burn – Sound Shore
  //'polen-capital':         'XXX',    // Polen Capital Management
  //'jensen-investment':     'XXX',    // Jensen Investment Management
  //'first-eagle':           'XXX',    // First Eagle Investment Management
  'david-tepper':          '0001377071', // David Tepper – Appaloosa Management
  //'john-armitage':         'XXX',    // John Armitage – Egerton Capital
  'gayner':         '0001096343',    // Thomas Gayner – Markel Group
  //'david-abrams':          'XXX',    // David Abrams – Abrams Capital Management
  //'christopher-davis':     'XXX',    // Christopher Davis – Davis Advisors
  //'torray-funds':          'XXX',    // Torray Funds
  //'william-von-mueffling': 'XXX',    // William Von Mueffling – Cantillon Capital Management
  //'yacktman-asset':        'XXX',    // Yacktman Asset Management
  //'lindsell-train':        'XXX',    // Lindsell Train
}