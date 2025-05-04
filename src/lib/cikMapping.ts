// src/lib/cikMapping.ts

/**
 * Mapping von Investor-Slug → SEC CIK
 * Bitte alle 'XXX' durch die korrekten CIK-Nummern ersetzen.
 */
export const investorCiks: Record<string,string> = {
  // bereits vorhandene
  buffett: '0001067983',
  ackman:  '0001336528',   
  // burry:   '0001768023',  MANUELL
 // marks:  0000949509, MANUELL!
  pabrai: '0001549575',
  greenhaven: '0000846222',
  greenberg: '0001553733',
  gregalexander:'0001773994',
  // smith:    '0001569205', MANUELL!!
  // lilu:                  '0001709323', MANUELL
altarockpartners:     '0001631014',
miller:           '0001135778',  // Bill Miller – Miller Value Partners
tepper:          ' 0001656456', // David Tepper – Appaloosa Management
spier:  '0001953324',
coleman:         '0001167483',    // Chase Coleman – Tiger Global Management
 gayner:         '0001096343',    // Thomas Gayner – Markel Group
ainslie:           '0000934639',  // Lee Ainslie – Maverick Capital
einhorn:         '0001489933', // David Einhorn – Greenlight
hohn: '0001647251',
yacktman: '0000905567',
polen:'0001034524', //NICHT GEKLAPPT NOCHMAL VERSUCHEN MIT CIK
viking:'0001103804',
cantillon: '0001279936',
duan:'0001759760', //nicht geklappt die letzten quartale leer
bloomstran: '0001115373', //OK
klarman: '0001061768', // 0 positionen letzte 2 Quartale.
vinall:         '0001766596',    // Robert Vinall – RV Capital GmbH


  // neu hinzuzufügende Investoren:
  // 'wallace-weitz':         'XXX',    // Wallace Weitz – Weitz Large Cap Equity Fund
  // 'david-katz':            'XXX',    // David Katz – Matrix Asset Advisors
  // 'tweedy-browne':         'XXX',    // Tweedy Browne Co. – Tweedy Browne Value Fund
 // 'mairs-power':           '0000061628',    // Mairs & Power Growth Fund
  // 'richard-pzena':         'XXX',    // Richard Pzena – Hancock Classic Value
           'dodgecox':             '0000029440',    // Dodge & Cox
  // 'romick':                'XXX',    // Steven Romick – FPA Crescent Fund
  // 'fpa-queens-road':       'XXX',    // FPA Queens Road Small Cap Value Fund
            //'olstein':        '0000947996',    // Robert Olstein – Olstein Capital Management
        
  // 'hillman-value':         'XXX',    // Hillman Value Fund
  // 'bill-nygren':           'XXX',    // Bill Nygren – Oakmark Select Fund
 //             'mason-hawkins':         '0000806636',    // Mason Hawkins – Longleaf Partners
  // 'meridian-contrarian':   'XXX',    // Meridian Contrarian Fund
            //'ruane-cunniff':         '0002049493',    // Ruane Cunniff – Sequoia Fund
          //'tom-bancroft':          '0001540866',    // Tom Bancroft – Makaira Partners
  // 'john-rogers':           'XXX',    // John Rogers – Ariel Appreciation Fund
  // 'charles-bobrinskoy':    'XXX',    // Charles Bobrinskoy – Ariel Focus Fund


            //   'daniel-loeb':           '0001040273',    // Daniel Loeb – Third Point
             //   'stephen-mandel':        '0001061165',    // Stephen Mandel – Lone Pine Capital
             //   'carl-icahn':            '0000853610', // Carl Icahn – Icahn Capital (Beispiel)
    
  // 'nelson-peltz':          'XXX',    // Nelson Peltz – Trian Fund Management
         
  // 'valueact-capital':      'XXX',    // ValueAct Capital
  // 'norbert-lou':           'XXX',    // Norbert Lou – Punch Card Management
            //    'gates':      '0001166559',    // Bill & Melinda Gates Foundation Trust
  // 'bruce-berkowitz':       'XXX',    // Bruce Berkowitz – Fairholme Capital
  // 'alex-roepers':          'XXX',    // Alex Roepers – Atlantic Investment Management
             //   'kahn-brothers':         '0001039565',    // Kahn Brothers Group
  // 'valley-forge':          'XXX',    // Valley Forge Capital Management
  // 'david-rolfe':           'XXX',    // David Rolfe – Wedgewood Partners
             //   'greenberg':       '0001553733',    // Glenn Greenberg – Brave Warrior Advisors
             //   'samantha-mclemore':     '0001854794',    // Samantha McLemore – Patient Capital Management
  // 'glenn-welling':         'XXX',    // Glenn Welling – Engaged Capital
             //   'bill-miller':           '0001135778',    // Bill Miller – Miller Value Partners
  // 'pat-dorsey':            'XXX',    // Pat Dorsey – Dorsey Asset Management
  // 'leon-cooperman':        'XXX',    // Leon Cooperman
  // 'josh-tarasoff':         'XXX',    // Josh Tarasoff – Greenlea Lane Capital
   //'clifford-sosin':        'XXX',    // Clifford Sosin – CAS Investment Partners
   //'chris-hohn':            'XXX',    // Chris Hohn – TCI Fund Management
   //'bryan-lawrence':        'XXX',    // Bryan Lawrence – Oakcliff Capital
   
  //'prem-watsa':            'XXX',    // Prem Watsa – Fairfax Financial Holdings
  //'dennis-hong':           'XXX',    // Dennis Hong – ShawSpring Partners
             //   'seth-klarman':          ' 0001061768', // Seth Klarman – Baupost Group
             //   'akre':            '0001112520',    // Chuck Akre – Akre Capital Management
  // 'francois-rochon':       'XXX',    // Francois Rochon – Giverny Capital
   //'third-avenue':          'XXX',    // Third Avenue Management
   //'francis-chou':          'XXX',    // Francis Chou – Chou Associates

            //    'howard-marks':          '0000976518', // Howard Marks – Oaktree Capital
            //    'thomas-russo':          '0000860643',    // Thomas Russo – Gardner Russo & Quinn
   // 'ako-capital':           'XXX',    // AKO Capital
   // 'triple-frond':          'XXX',    // Triple Frond Partners
   // 'harry-burn':            'XXX',    // Harry Burn – Sound Shore
  //'polen-capital':         'XXX',    // Polen Capital Management
  //'jensen-investment':     'XXX',    // Jensen Investment Management
  //'first-eagle':           'XXX',    // First Eagle Investment Management
              
  //'john-armitage':         'XXX',    // John Armitage – Egerton Capital
             
  //'david-abrams':          'XXX',    // David Abrams – Abrams Capital Management
  //'christopher-davis':     'XXX',    // Christopher Davis – Davis Advisors
  //'torray-funds':          'XXX',    // Torray Funds
  //'william-von-mueffling': 'XXX',    // William Von Mueffling – Cantillon Capital Management
 
  //'lindsell-train':        'XXX',    // Lindsell Train
}