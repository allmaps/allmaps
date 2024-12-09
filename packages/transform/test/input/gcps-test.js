export const generalGcps3 = [
  {
    source: [518, 991],
    destination: [4.9516614, 52.4633102]
  },
  {
    source: [4345, 2357],
    destination: [5.0480391, 52.5123762]
  },
  {
    source: [2647, 475],
    destination: [4.9702906, 52.5035815]
  }
]

export const generalGcps3Identity = [
  {
    source: [0, 0],
    destination: [0, 0]
  },
  {
    source: [0, 1],
    destination: [0, 1]
  },
  {
    source: [1, 0],
    destination: [1, 0]
  }
]

export const generalGcps6 = [
  {
    source: [1344, 4098],
    destination: [4.4091165, 51.9017125]
  },
  {
    source: [4440, 3441],
    destination: [4.5029222, 51.9164451]
  },
  {
    source: [3549, 4403],
    destination: [4.4764224, 51.897309]
  },
  {
    source: [1794, 2130],
    destination: [4.4199066, 51.9391509]
  },
  {
    source: [3656, 2558],
    destination: [4.4775683, 51.9324358]
  },
  {
    source: [2656, 3558],
    destination: [4.4572643, 51.9143043]
  }
]

// These gcps are of type GCP instead of GeneralGCP
export const gcps6 = [
  {
    resource: [1344, 4098],
    geo: [4.4091165, 51.9017125]
  },
  {
    resource: [4440, 3441],
    geo: [4.5029222, 51.9164451]
  },
  {
    resource: [3549, 4403],
    geo: [4.4764224, 51.897309]
  },
  {
    resource: [1794, 2130],
    geo: [4.4199066, 51.9391509]
  },
  {
    resource: [3656, 2558],
    geo: [4.4775683, 51.9324358]
  },
  {
    resource: [2656, 3558],
    geo: [4.4572643, 51.9143043]
  }
]

// There points are correct according to Helmert, except point i=4
// The geo coordinates span big arc, so these can be used to test for geographic features
export const generalGcps7 = [
  {
    source: [0, 0],
    destination: [0, 0]
  },
  {
    source: [100, 0],
    destination: [20, 0]
  },
  {
    source: [200, 100],
    destination: [40, 20]
  },
  {
    source: [200, 200],
    destination: [40, 40]
  },
  {
    source: [150, 250],
    destination: [40, 100]
  },
  {
    source: [100, 200],
    destination: [20, 40]
  },
  {
    source: [0, 100],
    destination: [0, 20]
  }
]

export const generalGcps10 = [
  { source: [6933, 3641], destination: [-5.6931398, 56.1290282] },
  {
    source: [6158, 1470],
    destination: [-6.2921755, 58.5220974]
  },
  {
    source: [9142, 2240],
    destination: [-2.1077545, 57.687078]
  },
  {
    source: [9626, 9058],
    destination: [-1.5642528, 50.6648133]
  },
  {
    source: [8387, 1447],
    destination: [-3.0589806, 58.6152482]
  },
  {
    source: [11709, 8644],
    destination: [1.5829224, 50.8667829]
  },
  {
    source: [8995, 5647],
    destination: [-2.8041724, 54.0553335]
  },
  {
    source: [12903, 6620],
    destination: [4.7685316, 52.9630668]
  },
  {
    source: [8262, 9534],
    destination: [-3.6827528, 50.2116403]
  },
  {
    source: [6925, 9356],
    destination: [-5.7572694, 50.055299]
  }
]
