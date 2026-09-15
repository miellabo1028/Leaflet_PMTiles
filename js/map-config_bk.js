const GESAT_CONFIG = {
  map: {
    center: [-16.7, -64.7],
    zoom: 6,
    minZoom: 3,
    maxZoom: 19
  },

  data: {
    boliviaBasemap: "./data/bolivia_basemap.pmtiles",
    protectedAreas: "./data/protected_areas.pmtiles",
    administrativeBoundaries: "./data/administrative_boundaries.pmtiles"
  },

  /*
   * Google Maps Tile APIの完全なURLを設定してください。
   * 未使用の場合は空文字のままにします。
   * APIキーやセッショントークンを共有ファイルへ保存しないでください。
   */
  googleSatelliteUrl: "https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=AJVsH2z8ozcnNBa_jqjtqaIr95p8ZpgVSDw67aJGRORtsHlElRRynOFhuJJv7HGZUuGoUS-i1UtN-Z7n-5FBd0jnmg&key=AIzaSyDqgh_3PJSTI2dNUwhFRuzj0Zk-T6ds1XQ",

  maxDataZoom: {
    basemap: 14,
    protectedAreas: 14,
    administrativeBoundaries: 14
  },

  protectedAreas: {
    sourceLayer: "protected_areas",
    designationField: "DESG"
  },

  admin: {
    international: {
      sourceLayer: "international_boundary",
      nameField: "NAME_0",
      labelMinZoom: 4
    },
    departamento: {
      sourceLayer: "departamento",
      nameField: "NAME_1",
      labelMinZoom: 6
    },
    provincia: {
      sourceLayer: "provincia",
      nameField: "NAME_2",
      labelMinZoom: 9
    },
    distrito: {
      sourceLayer: "distrito",
      nameField: "NAME_3",
      labelMinZoom: 12
    }
  },

  visible: {
    boliviaBasemap: true,
    protectedAreas: true,
    administrativeBoundaries: true,
    international: true,
    departamento: true,
    provincia: true,
    distrito: true
  }
};
