// Ennalta määritelty ainesosa-/ominaisuustagilista MenuItemForm/MenuItemModal-tagipoimintaa
// varten (PartnerDashboard.jsx, Ruokalista-välilehti). Kumppani voi lisätä myös omia tageja
// tämän listan ulkopuolelta - tämä on vain valmis lähtökohta, ei tyhjentävä luettelo.
export const INGREDIENT_TAG_GROUPS = [
  {
    label: 'Proteiinit',
    tags: [
      'Naudanliha',
      'Pihvi',
      'Kana',
      'Possu',
      'Lammas',
      'Kala',
      'Lohi',
      'Katkarapu',
      'Kinkku',
      'Pekoni',
      'Falafel',
      'Tofu',
      'Halloumi',
      'Muna',
    ],
  },
  {
    label: 'Vihannekset',
    tags: [
      'Sipuli',
      'Punasipuli',
      'Valkosipuli',
      'Tomaatti',
      'Salaatti',
      'Kurkku',
      'Paprika',
      'Avokado',
      'Sieni',
      'Maissi',
      'Punajuuri',
      'Chili',
      'Purjo',
      'Kaali',
      'Porkkana',
      'Pinaatti',
      'Oliivi',
      'Kapris',
      'Ananas',
    ],
  },
  {
    label: 'Juustot ja maitotuotteet',
    tags: ['Cheddar', 'Mozzarella', 'Feta', 'Parmesan', 'Sinihomejuusto', 'Kermaviili', 'Smetana', 'Kerma'],
  },
  {
    label: 'Kastikkeet ja mausteet',
    tags: [
      'Majoneesi',
      'Ketsuppi',
      'Sinappi',
      'BBQ-kastike',
      'Chilikastike',
      'Aioli',
      'Pestokastike',
      'Tzatziki',
      'Currykastike',
      'Soijakastike',
      'Basilika',
      'Koriander',
    ],
  },
  {
    label: 'Leivät ja pohjat',
    tags: ['Sämpylä', 'Täysjyväsämpylä', 'Naanleipä', 'Tortilla', 'Pitaleipä', 'Gluteeniton pohja'],
  },
  {
    label: 'Ruokavaliot',
    tags: ['Gluteeniton', 'Laktoositon', 'Maidoton', 'Vegaaninen', 'Kasvis', 'Pähkinätön'],
  },
]

export const ALL_PREDEFINED_TAGS = INGREDIENT_TAG_GROUPS.flatMap((group) => group.tags)
