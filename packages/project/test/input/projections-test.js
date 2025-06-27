export const epsg4326 = {
  name: 'EPSG:4326',
  definition: 'EPSG:4326'
}

export const epsg3857 = {
  name: 'EPSG:3857',
  definition: 'EPSG:3857'
}

export const epsg28992 = {
  name: 'EPSG:28992',
  definition:
    '+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.4171,50.3319,465.5524,1.9342,-1.6677,9.1019,4.0725 +units=m +no_defs +type=crs'
}

export const epsg31370 = {
  name: 'EPSG:31370',
  definition:
    '+proj=lcc +lat_0=90 +lon_0=4.36748666666667 +lat_1=51.1666672333333 +lat_2=49.8333339 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.8686,52.2978,-103.7239,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs +type=crs'
}

export const projjsonDefinitionEpsg31370 = {
  $schema: 'https://proj.org/schemas/v0.7/projjson.schema.json',
  type: 'ProjectedCRS',
  name: 'BD72 / Belgian Lambert 72',
  base_crs: {
    type: 'GeographicCRS',
    name: 'BD72',
    datum: {
      type: 'GeodeticReferenceFrame',
      name: 'Reseau National Belge 1972',
      ellipsoid: {
        name: 'International 1924',
        semi_major_axis: 6378388,
        inverse_flattening: 297
      }
    },
    coordinate_system: {
      subtype: 'ellipsoidal',
      axis: [
        {
          name: 'Geodetic latitude',
          abbreviation: 'Lat',
          direction: 'north',
          unit: 'degree'
        },
        {
          name: 'Geodetic longitude',
          abbreviation: 'Lon',
          direction: 'east',
          unit: 'degree'
        }
      ]
    },
    id: {
      authority: 'EPSG',
      code: 4313
    }
  },
  conversion: {
    name: 'Belgian Lambert 72',
    method: {
      name: 'Lambert Conic Conformal (2SP)',
      id: {
        authority: 'EPSG',
        code: 9802
      }
    },
    parameters: [
      {
        name: 'Latitude of false origin',
        value: 90,
        unit: 'degree',
        id: {
          authority: 'EPSG',
          code: 8821
        }
      },
      {
        name: 'Longitude of false origin',
        value: 4.36748666666667,
        unit: 'degree',
        id: {
          authority: 'EPSG',
          code: 8822
        }
      },
      {
        name: 'Latitude of 1st standard parallel',
        value: 51.1666672333333,
        unit: 'degree',
        id: {
          authority: 'EPSG',
          code: 8823
        }
      },
      {
        name: 'Latitude of 2nd standard parallel',
        value: 49.8333339,
        unit: 'degree',
        id: {
          authority: 'EPSG',
          code: 8824
        }
      },
      {
        name: 'Easting at false origin',
        value: 150000.013,
        unit: 'metre',
        id: {
          authority: 'EPSG',
          code: 8826
        }
      },
      {
        name: 'Northing at false origin',
        value: 5400088.438,
        unit: 'metre',
        id: {
          authority: 'EPSG',
          code: 8827
        }
      }
    ]
  },
  coordinate_system: {
    subtype: 'Cartesian',
    axis: [
      {
        name: 'Easting',
        abbreviation: 'X',
        direction: 'east',
        unit: 'metre'
      },
      {
        name: 'Northing',
        abbreviation: 'Y',
        direction: 'north',
        unit: 'metre'
      }
    ]
  },
  scope: 'Engineering survey, topographic mapping.',
  area: 'Belgium - onshore.',
  bbox: {
    south_latitude: 49.5,
    west_longitude: 2.5,
    north_latitude: 51.51,
    east_longitude: 6.4
  },
  id: {
    authority: 'EPSG',
    code: 31370
  }
}

export const epsg31370projjson = {
  name: 'EPSG:31370',
  definition: projjsonDefinitionEpsg31370
}
