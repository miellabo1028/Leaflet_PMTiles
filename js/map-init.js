(function initializeGesatMap() {
  const status = document.getElementById("status");

  function showStatus(message) {
    status.textContent = message;
    console.log(message);
  }

  try {
    if (typeof L === "undefined") {
      throw new Error("Leaflet was not loaded.");
    }

    if (typeof protomapsL === "undefined") {
      throw new Error("Protomaps Leaflet was not loaded.");
    }

    const config = GESAT_CONFIG;

    const map = L.map("map", {
      center: config.map.center,
      zoom: config.map.zoom,
      minZoom: config.map.minZoom,
      maxZoom: config.map.maxZoom
    });

    const paneDefinitions = {
      boliviaBasemapPane: 300,
      protectedAreasPane: 400,

      distritoPane: 500,
      provinciaPane: 510,
      departamentoPane: 520,
      internationalPane: 530,

      distritoNamePane: 600,
      provinciaNamePane: 610,
      departamentoNamePane: 620
    };

    Object.entries(paneDefinitions).forEach(
      function ([paneName, zIndex]) {
        map.createPane(paneName);
        const pane = map.getPane(paneName);
        pane.style.zIndex = String(zIndex);
        pane.style.pointerEvents = "none";
      }
    );

    const esri = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles © Esri and imagery providers"
      }
    );

    const osm = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors"
      }
    );

    const baseLayers = {
      "Esri World Imagery": esri,
      "Online OpenStreetMap": osm
    };

    let initialBaseLayer = esri;

    if (config.googleSatelliteUrl) {
      const googleSatellite = L.tileLayer(
        config.googleSatelliteUrl,
        {
          maxZoom: 19,
          attribution: "Imagery © Google"
        }
      );

      baseLayers["Google Satellite"] = googleSatellite;
      initialBaseLayer = googleSatellite;
    }

    initialBaseLayer.addTo(map);

    const layers = {
      boliviaBasemap: createBoliviaBasemapLayer(),
      protectedAreas: createProtectedAreasLayer(),
      adminBoundaries: createAdministrativeBoundaryLayers(),
      adminNames: createAdministrativeNameLayers()
    };

    const visibility = {
      ...config.visible
    };

    if (visibility.boliviaBasemap) {
      layers.boliviaBasemap.addTo(map);
    }

    if (visibility.protectedAreas) {
      layers.protectedAreas.addTo(map);
    }

    refreshAdministrativeLayers(
      map,
      layers.adminBoundaries,
      visibility
    );

    refreshAdministrativeNameLayers(
      map,
      layers.adminNames,
      visibility
    );

    L.control.layers(
      baseLayers,
      null,
      {
        collapsed: true,
        position: "topleft"
      }
    ).addTo(map);

    addGesatLayerControl(
      map,
      layers,
      visibility
    );

    L.control.scale({
      metric: true,
      imperial: false,
      position: "bottomleft"
    }).addTo(map);

    window.gesatDebug = {
      map: map,
      layers: layers,
      visibility: visibility,
      panes: paneDefinitions,
      config: config
    };

    showStatus("GESAT map loaded successfully.");

    setTimeout(function () {
      status.style.display = "none";
    }, 2500);
  } catch (error) {
    console.error("Startup error:", error);
    showStatus("Startup error: " + error.message);
  }
})();
