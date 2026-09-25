const GESAT_CONFIG = {
  map: {
    center: [-16.7, -64.7],
    zoom: 6,
    minZoom: 3,
    maxZoom: 19
  },

  data: {
    boliviaBasemap: "https://pub-d44086fa57624870a3a45a6fd01ea211.r2.dev/bolivia_basemap.pmtiles",
    protectedAreas: "https://pub-d44086fa57624870a3a45a6fd01ea211.r2.dev/protected_areas.pmtiles",

    /* 行政界線専用のラインPMTiles */
    administrativeBoundaryLines:
      "https://pub-d44086fa57624870a3a45a6fd01ea211.r2.dev/administrative_boundaries_pl.pmtiles",

    /* 行政名称専用として残す従来のポリゴンPMTiles */
    administrativeNames:
      "https://pub-d44086fa57624870a3a45a6fd01ea211.r2.dev/administrative_boundaries.pmtiles",

    sentinel2025: "https://pub-d44086fa57624870a3a45a6fd01ea211.r2.dev/s2_Tarija_RGB_2025_mosaic_3857r11.tif",
    sentinel2026: "https://pub-d44086fa57624870a3a45a6fd01ea211.r2.dev/s2_Tarija_RGB_2026_mosaic_3857r2.tif",
    
    // Single band data saumple through TiTiler
    mapBiomas2024: "http://localhost:8000/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png" + "?url=file:///data/MapBiomas/Bol_Mapbiomas_LULC_2024_cog.tif",
    
    // 今回のボリビア市町村FlatGeobufを追加
    boliviaMunicipiosFgb: "https://pub-d44086fa57624870a3a45a6fd01ea211.r2.dev/bolivia_municipios.fgb"
},

  googleSatelliteUrl: "https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=AJVsH2z8ozcnNBa_jqjtqaIr95p8ZpgVSDw67aJGRORtsHlElRRynOFhuJJv7HGZUuGoUS-i1UtN-Z7n-5FBd0jnmg&key=AIzaSyDqgh_3PJSTI2dNUwhFRuzj0Zk-T6ds1XQ",

  maxDataZoom: {
    basemap: 14,
    protectedAreas: 14,
    administrativeBoundaryLines: 14,
    administrativeNames: 14
  },

  protectedAreas: {
    sourceLayer: "protected_areas",
    designationField: "DESG"
  },

  administrativeBoundaryLines: {
    /*
     * administrative_boundaries_pl.pmtiles内のソースレイヤ名です。
     * 実際の内部レイヤ名が異なる場合は、この値だけ変更してください。
     */
    sourceLayer: "administrative_boundaries_pl",
    borderTypeField: "Border_Typ",

    /*
     * Border_Typの実値に合わせて配列を編集できます。
     * 大文字・小文字、空白、ハイフン、アンダースコアの差は正規化します。
     */
    borderTypes: {
      international: [
        "international_boundary",
        "international boundary",
        "international",
        "country",
        "national"
      ],
      departamento: [
        "departamento",
        "department",
        "admin_1",
        "level_1"
      ],
      provincia: [
        "provincia",
        "province",
        "admin_2",
        "level_2"
      ],
      distrito: [
        "distrito",
        "district",
        "admin_3",
        "level_3"
      ]
    }
  },

  administrativeNames: {
    departamento: {
      sourceLayer: "departamento",
      nameField: "NAME_1",
      labelMinZoom: 6,
      labelMaxZoom: 19
    },
    provincia: {
      sourceLayer: "provincia",
      nameField: "NAME_2",
      labelMinZoom: 9,
      labelMaxZoom: 19
    },
    distrito: {
      sourceLayer: "distrito",
      nameField: "NAME_3",
      labelMinZoom: 12,
      labelMaxZoom: 19
    }
  },

  visibility: {
    boliviaBasemap: true,
    protectedAreas: true,

    administrativeBoundaries: true,
    international: true,
    departamento: true,
    provincia: true,
    distrito: true,

    administrativeNames: true,
    departamentoName: true,
    provinciaName: true,
    distritoName: true,

    mapBiomas2024: false,
    
    sentinel2025: false,
    sentinel2026: true
    
  }
};
