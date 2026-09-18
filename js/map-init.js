// 他の制御ファイル（layer-control.jsなど）からアクセスできるようにグローバル変数として定義
window.s2_2025_layer = null;
window.s2_2026_layer = null;

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

    if (typeof parseGeoraster === "undefined") {
      throw new Error("georaster library was not loaded.");
    }

    const config = GESAT_CONFIG;

    const map = L.map("map", {
      center: config.map.center,
      zoom: config.map.zoom,
      minZoom: config.map.minZoom,
      maxZoom: config.map.maxZoom
    });

    // --------------------------------------------------
    // 重ね合わせ順序（Pane）の定義に sentinelPane (250) を追加
    // 背景地図(デフォルト)より手前、ベクトルタイル(300〜)より奥に配置します
    // --------------------------------------------------
    const paneDefinitions = {
      sentinelPane: 250, // COG画像用の最背面ペイン
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

    // --------------------------------------------------
    // 【非同期処理】Cloudflare R2 から Sentinel-2 COG をパース・ロード
    // --------------------------------------------------
    if (config.data.sentinel2025) {
      parseGeoraster(config.data.sentinel2025).then(function (georaster) {
        window.s2_2025_layer = new GeoRasterLayer({
          georaster: georaster,
          opacity: 1.0,
          resolution: 256,
          pane: "sentinelPane",
          // 定義した専用ペインを指定して境界線の裏に隠す
          // ==================================================
          // 【解決】4番目のアルファバンドを正確に透過情報として処理させる
          // ==================================================
          customDrawFunction: function(canvas, r, c, targetX, targetY, targetWidth, targetHeight, values) {
            const ctx = canvas.getContext('2d');
            const imgData = ctx.createImageData(targetWidth, targetHeight);
            const data = imgData.data;

            // values[0]=赤, values[1]=緑, values[2]=青, values[3]=アルファ(透過)
            for (let i = 0; i < targetWidth * targetHeight; i++) {
              const rVal = values[0][i];
              const gVal = values[1][i];
              const bVal = values[2][i];
              
              // 4番目のアルファバンドが存在する場合はそれを使用、ない場合は外枠の黒を透過
              const aVal = (values[3] && values[3][i] !== undefined) ? values[3][i] : 
                           (rVal <= 5 && gVal <= 5 && bVal <= 5 ? 0 : 255);

              const idx = i * 4;
              data[idx]     = rVal; // 赤
              data[idx + 1] = gVal; // 緑
              data[idx + 2] = bVal; // 青
              data[idx + 3] = aVal; // アルファ（0で完全透明、255で完全不透明）
            }

            ctx.putImageData(imgData, targetX, targetY);
          }
        });
        if (config.visibility.sentinel2025) {
          window.s2_2025_layer.addTo(map);
        }
        console.log("Sentinel-2 2025 COG successfully loaded.");
      }).catch(function (err) {
        console.error("Error loading Sentinel-2 2025 COG:", err);
      });
    }

    if (config.data.sentinel2026) {
      parseGeoraster(config.data.sentinel2026).then(function (georaster) {
        window.s2_2026_layer = new GeoRasterLayer({
          georaster: georaster,
          opacity: 1.0,
          resolution: 256,
          pane: "sentinelPane",

          // ==================================================
          // 【追記】2026年版にも同じフィルターを適用
          // ==================================================
          pixelFilter: function (values) {
            const isNoData = values[0] === 0 && values[1] === 0 && values[2] === 0;
            const isNull = values[0] === null || values[1] === null || values[2] === null;
            return !(isNoData || isNull);
          }
          
        });
        if (config.visibility.sentinel2026) {
          window.s2_2026_layer.addTo(map);
        }
        console.log("Sentinel-2 2026 COG successfully loaded.");
      }).catch(function (err) {
        console.error("Error loading Sentinel-2 2026 COG:", err);
      });
    }

    const layers = {
      boliviaBasemap: createBoliviaBasemapLayer(),
      protectedAreas: createProtectedAreasLayer(),
      adminBoundaries: createAdministrativeBoundaryLayers(),
      adminNames: createAdministrativeNameLayers()
    };

    const visibility = {
      ...config.visibility // config.visible から config.visibility に修正（map-config.jsの定義に準拠）
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
