// Valmiit pohjat valintaryhmille (PartnerDashboard.jsx, OptionGroupsSection) - yhdellä
// klikkauksella luodaan koko ryhmä oletusvaihtoehtoineen ja -hintoineen, jotka kumppani voi
// sitten muokata. Nopeuttaa yleisimpien ryhmien (koko, lisätäytteet) perustamista verrattuna
// siihen että jokainen vaihtoehto pitäisi lisätä ja hinnoitella yksitellen tyhjästä.
export const OPTION_GROUP_TEMPLATES = [
  {
    key: 'koko',
    label: 'Koko',
    selection_type: 'single',
    min_selections: 1,
    max_selections: 1,
    free_selections: 0,
    options: [
      { name: 'Normaali', price: '0.00', is_default: true },
      { name: 'Jättipizza', price: '21.99', is_default: false },
      { name: 'Gluteeniton', price: '2.49', is_default: false },
      { name: 'Pannupizza', price: '2.49', is_default: false },
    ],
  },
  {
    key: 'taytteet',
    label: 'Lisätäytteet',
    selection_type: 'multi',
    min_selections: 2,
    max_selections: null,
    free_selections: 2,
    options: [
      { name: 'Leikattuna', price: '0.49', is_default: false },
      { name: 'Aura', price: '1.99', is_default: false },
      { name: 'Kebab', price: '1.99', is_default: false },
      { name: 'Kinkkusuikale', price: '1.99', is_default: false },
      { name: 'Pepperoni', price: '1.99', is_default: false },
    ],
  },
]
