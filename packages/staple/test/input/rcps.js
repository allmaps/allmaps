export const rcps0 = [
  {
    type: 'rcp',
    id: '1,0',
    mapId: 'https://annotations.allmaps.org/maps/83d44a0b956681b0',
    resource: [512, 299]
  },
  {
    type: 'rcp',
    id: '2,0',
    mapId: 'https://annotations.allmaps.org/maps/83d44a0b956681b0',
    resource: [486, 3644]
  },
  {
    type: 'rcp',
    id: '2,1',
    mapId: 'https://annotations.allmaps.org/maps/83d44a0b956681b0',
    resource: [4811, 3656]
  },
  {
    type: 'rcp',
    id: '1,1',
    mapId: 'https://annotations.allmaps.org/maps/83d44a0b956681b0',
    resource: [4779, 261]
  }
]
const rcps0Extra = [
  {
    type: 'rcp',
    id: 'extra',
    mapId: 'https://annotations.allmaps.org/maps/83d44a0b956681b0',
    resource: [4000, 200]
  }
]

export const rcps1 = [
  {
    type: 'rcp',
    id: '0,1',
    mapId: 'https://annotations.allmaps.org/maps/3b72f58c723da9c4',
    resource: [434, 329]
  },
  {
    type: 'rcp',
    id: '1,1',
    mapId: 'https://annotations.allmaps.org/maps/3b72f58c723da9c4',
    resource: [414, 3597]
  },
  {
    type: 'rcp',
    id: '1,2',
    mapId: 'https://annotations.allmaps.org/maps/3b72f58c723da9c4',
    resource: [4791, 3584]
  },
  {
    type: 'rcp',
    id: '0,2',
    mapId: 'https://annotations.allmaps.org/maps/3b72f58c723da9c4',
    resource: [4772, 335]
  }
]

export const rcps2 = [
  {
    type: 'rcp',
    id: '0,0',
    mapId: 'https://annotations.allmaps.org/maps/bb4029969eeff948',
    resource: [553, 389]
  },
  {
    type: 'rcp',
    id: '1,0',
    mapId: 'https://annotations.allmaps.org/maps/bb4029969eeff948',
    resource: [566, 3653]
  },
  {
    type: 'rcp',
    id: '1,1',
    mapId: 'https://annotations.allmaps.org/maps/bb4029969eeff948',
    resource: [4780, 3608]
  },
  {
    type: 'rcp',
    id: '0,1',
    mapId: 'https://annotations.allmaps.org/maps/bb4029969eeff948',
    resource: [4799, 395]
  }
]

export const rcps3 = [
  {
    type: 'rcp',
    id: '1,1',
    mapId: 'https://annotations.allmaps.org/maps/5cf13f6681d355e3',
    resource: [465, 257]
  },
  {
    type: 'rcp',
    id: '2,1',
    mapId: 'https://annotations.allmaps.org/maps/5cf13f6681d355e3',
    resource: [427, 3666]
  },
  {
    type: 'rcp',
    id: '2,2',
    mapId: 'https://annotations.allmaps.org/maps/5cf13f6681d355e3',
    resource: [4832, 3672]
  },
  {
    type: 'rcp',
    id: '1,2',
    mapId: 'https://annotations.allmaps.org/maps/5cf13f6681d355e3',
    resource: [4832, 264]
  }
]

export const rcps = [...rcps0, ...rcps1, ...rcps2, ...rcps3]
export const rcps11 = rcps.filter((rcp) => rcp.id == '1,1')
