// Mapping of investor slug → photo URL
// Photos stored in /public/images/ on finclue.de
// Prefers -cartoon.png > .png > .jpg when multiple exist

export const INVESTOR_PHOTOS: Record<string, string> = {
  buffett:          'https://finclue.de/images/buffett-cartoon.png',
  ackman:           'https://finclue.de/images/ackman-cartoon.png',
  burry:            'https://finclue.de/images/burry-cartoon.png',
  marks:            'https://finclue.de/images/marks-cartoon.png',
  pabrai:           'https://finclue.de/images/pabrai-cartoon.png',
  druckenmiller:    'https://finclue.de/images/druckenmiller.png',
  tepper:           'https://finclue.de/images/tepper.png',
  gates:            'https://finclue.de/images/gates.png',
  einhorn:          'https://finclue.de/images/einhorn.png',
  klarman:          'https://finclue.de/images/klarman.png',
  akre:             'https://finclue.de/images/akre.png',
  greenblatt:       'https://finclue.de/images/greenblatt.png',
  fisher:           'https://finclue.de/images/fisher.png',
  soros:            'https://finclue.de/images/soros.png',
  gayner:           'https://finclue.de/images/gayner.png',
  peltz:            'https://finclue.de/images/peltz.png',
  chou:             'https://finclue.de/images/chou.png',
  dalio:            'https://finclue.de/images/dalio.png',
  icahn:            'https://finclue.de/images/icahn.png',
  coleman:          'https://finclue.de/images/coleman.png',
  mandel:           'https://finclue.de/images/mandel.png',
  dodgecox:         'https://finclue.de/images/dodgecox.png',
  loeb:             'https://finclue.de/images/loeb.png',
  abrams:           'https://finclue.de/images/abrams.png',
  russo:            'https://finclue.de/images/russo.png',
  rochon:           'https://finclue.de/images/rochon.png',
  train:            'https://finclue.de/images/train.png',
  polen:            'https://finclue.de/images/polen.png',
  davis:            'https://finclue.de/images/davis.png',
  kantesaria:       'https://finclue.de/images/kantesaria.png',
  vinall:           'https://finclue.de/images/vinall.png',
  hawkins:          'https://finclue.de/images/hawkins.png',
  olstein:          'https://finclue.de/images/olstein.png',
  weitz:            'https://finclue.de/images/weitz.png',
  yacktman:         'https://finclue.de/images/yacktman.png',
  armitage:         'https://finclue.de/images/armitage.png',
  firsteagle:       'https://finclue.de/images/firsteagle.png',
  greenhaven:       'https://finclue.de/images/greenhaven.png',
  altarockpartners: 'https://finclue.de/images/altarockpartners.png',
  mairspower:       'https://finclue.de/images/mairspower.png',
  viking:           'https://finclue.de/images/viking.png',
  duan:             'https://finclue.de/images/lilu.png',  // "duan" API slug = Li Lu
};

/** Returns photo URL or null if no photo exists for this investor */
export function getInvestorPhoto(slug: string): string | null {
  return INVESTOR_PHOTOS[slug] || null;
}
