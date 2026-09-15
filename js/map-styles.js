const ADMIN_BOUNDARY_ORDER = [
  "distrito",
  "provincia",
  "departamento",
  "international"
];

const ADMIN_NAME_ORDER = [
  "distritoName",
  "provinciaName",
  "departamentoName"
];

function createBoliviaBasemapLayer() {
  const paintRules = [
    {
      dataLayer: "water",
      symbolizer: new protomapsL.PolygonSymbolizer({
        fill: "#b9dff5",
        opacity: 0.75
      })
    },
    {
      dataLayer: "waterway",
      symbolizer: new protomapsL.LineSymbolizer({
        color: "#45a7df",
        width: 1.2,
        opacity: 0.95
      })
    },
    {
      dataLayer: "transportation",
      symbolizer: new protomapsL.LineSymbolizer({
        color: "#ffffff",
        width: 3,
        opacity: 0.85
      })
    },
    {
      dataLayer: "transportation",
      symbolizer: new protomapsL.LineSymbolizer({
        color: "#444444",
        width: 1.3,
        opacity: 0.95
      })
    }
  ];

  return protomapsL.leafletLayer({
    url: GESAT_CONFIG.data.boliviaBasemap,
    maxDataZoom: GESAT_CONFIG.maxDataZoom.basemap,
    pane: "boliviaBasemapPane",
    paintRules: paintRules,
    labelRules: [],
    attribution: "© OpenStreetMap contributors"
  });
}

function createProtectedAreasLayer() {
  const sourceLayer = GESAT_CONFIG.protectedAreas.sourceLayer;

  const paintRules = [
    {
      dataLayer: sourceLayer,
      symbolizer: new protomapsL.PolygonSymbolizer({
        fill: "#31a354",
        opacity: 0.22
      })
    },
    {
      dataLayer: sourceLayer,
      symbolizer: new protomapsL.LineSymbolizer({
        color: "#008f3d",
        width: 1.8,
        opacity: 0.95
      })
    }
  ];

  return protomapsL.leafletLayer({
    url: GESAT_CONFIG.data.protectedAreas,
    maxDataZoom: GESAT_CONFIG.maxDataZoom.protectedAreas,
    pane: "protectedAreasPane",
    paintRules: paintRules,
    labelRules: [],
    attribution: "Protected areas data provider"
  });
}

function normalizeBorderType(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function normalizedBorderTypeSet(values) {
  return new Set(values.map(normalizeBorderType));
}

class ClassifiedBoundaryLineSymbolizer {
  constructor(options) {
    this.field = options.field;
    this.acceptedValues = normalizedBorderTypeSet(
      options.acceptedValues
    );
    this.color = options.color;
    this.width = options.width;
    this.opacity = options.opacity ?? 1;
    this.dash = options.dash || [];
  }

  draw(context, geom, zoom, feature) {
    const properties = feature.props || {};
    const borderType = normalizeBorderType(
      properties[this.field]
    );

    if (!this.acceptedValues.has(borderType)) {
      return;
    }

    context.save();
    context.strokeStyle = this.color;
    context.lineWidth = this.width;
    context.globalAlpha = this.opacity;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.setLineDash(this.dash);
    context.beginPath();

    /* ラインデータは複数のLineStringとして処理します。 */
    for (const line of geom) {
      if (!line || line.length === 0) {
        continue;
      }

      context.moveTo(line[0].x, line[0].y);

      for (let i = 1; i < line.length; i += 1) {
        context.lineTo(line[i].x, line[i].y);
      }
    }

    context.stroke();
    context.restore();
  }
}

function createAdministrativeBoundaryLineLayer(
  category,
  style,
  paneName
) {
  const config = GESAT_CONFIG.administrativeBoundaryLines;

  return protomapsL.leafletLayer({
    url: GESAT_CONFIG.data.administrativeBoundaryLines,
    maxDataZoom:
      GESAT_CONFIG.maxDataZoom.administrativeBoundaryLines,
    pane: paneName,
    paintRules: [
      {
        dataLayer: config.sourceLayer,
        symbolizer: new ClassifiedBoundaryLineSymbolizer({
          field: config.borderTypeField,
          acceptedValues: config.borderTypes[category],
          color: style.color,
          width: style.width,
          opacity: style.opacity,
          dash: style.dash
        })
      }
    ],
    labelRules: [],
    attribution: "Administrative boundaries: GADM"
  });
}

function createAdministrativeBoundaryLayers() {
  return {
    distrito: createAdministrativeBoundaryLineLayer(
      "distrito",
      {
        color: "#ffffff",
        width: 1.2,
        opacity: 0.9,
        dash: [2, 3]
      },
      "distritoPane"
    ),

    provincia: createAdministrativeBoundaryLineLayer(
      "provincia",
      {
        color: "#00b7ff",
        width: 1.8,
        opacity: 0.95,
        dash: [7, 4]
      },
      "provinciaPane"
    ),

    departamento: createAdministrativeBoundaryLineLayer(
      "departamento",
      {
        color: "#ff3b30",
        width: 2.7,
        opacity: 0.98,
        dash: []
      },
      "departamentoPane"
    ),

    international: createAdministrativeBoundaryLineLayer(
      "international",
      {
        color: "#ffd400",
        width: 4,
        opacity: 1,
        dash: []
      },
      "internationalPane"
    )
  };
}

function createAdministrativeNameLayer(
  config,
  textStyle,
  paneName
) {
  /*
   * paintRulesを空にすることで、ポリゴンと境界線を描画せず、
   * administrative_boundaries.pmtilesを名称表示専用にします。
   */
  const paintRules = [];

  /* const paintRules = [
   {
     dataLayer: config.sourceLayer,

     symbolizer:
       new protomapsL.PolygonSymbolizer({
         fill: "#ff00ff",
         opacity: 0.15
       })
   }
 ]; */

  const labelRules = [
    {
      dataLayer: config.sourceLayer,
      minzoom: config.labelMinZoom,
      maxzoom: config.labelMaxZoom,
      symbolizer: new protomapsL.CenteredTextSymbolizer({
        field: config.nameField,
        fill: textStyle.fill,
        stroke: textStyle.stroke,
        width: textStyle.strokeWidth,
        size: textStyle.size,
        maxLineChars: 24
      })
    }
  ];

  return protomapsL.leafletLayer({
    url: GESAT_CONFIG.data.administrativeNames,
    maxDataZoom: GESAT_CONFIG.maxDataZoom.administrativeNames,
    pane: paneName,
    paintRules: paintRules,
    labelRules: labelRules,
    attribution: "Administrative names: GADM"
  });
}

function createAdministrativeNameLayers() {
  const config = GESAT_CONFIG.administrativeNames;

  return {
    departamentoName: createAdministrativeNameLayer(
      config.departamento,
      {
        fill: "#fff2a8",
        stroke: "#222222",
        strokeWidth: 4,
        size: 14
      },
      "departamentoNamePane"
    ),

    provinciaName: createAdministrativeNameLayer(
      config.provincia,
      {
        fill: "#b9edff",
        stroke: "#222222",
        strokeWidth: 3,
        size: 12
      },
      "provinciaNamePane"
    ),

    distritoName: createAdministrativeNameLayer(
      config.distrito,
      {
        fill: "#ffffff",
        stroke: "#333333",
        strokeWidth: 3,
        size: 10
      },
      "distritoNamePane"
    )
  };
}

function refreshAdministrativeLayers(map, layers, visibility) {
  ADMIN_BOUNDARY_ORDER.forEach(function (layerName) {
    const layer = layers[layerName];

    if (layer && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });

  if (!visibility.administrativeBoundaries) {
    return;
  }

  ADMIN_BOUNDARY_ORDER.forEach(function (layerName) {
    if (visibility[layerName] && layers[layerName]) {
      map.addLayer(layers[layerName]);
    }
  });
}

function refreshAdministrativeNameLayers(map, layers, visibility) {
  ADMIN_NAME_ORDER.forEach(function (layerName) {
    const layer = layers[layerName];

    if (layer && map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });

  if (!visibility.administrativeNames) {
    return;
  }

  ADMIN_NAME_ORDER.forEach(function (layerName) {
    if (visibility[layerName] && layers[layerName]) {
      map.addLayer(layers[layerName]);
    }
  });
}
