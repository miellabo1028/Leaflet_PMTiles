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

    let initialBaseLayer = osm;

    if (config.googleSatelliteUrl) {
      const googleSatellite = L.tileLayer(
        config.googleSatelliteUrl,
        {
          maxZoom: 19,
          attribution: "Imagery © Google"
        }
      );

      baseLayers["Google Satellite"] = googleSatellite;
      // initialBaseLayer = googleSatellite;
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
          pane: "sentinelPane",

          // ==================================================
          // 【超重要】Leaflet版を限界まで高速化する3つのオプション
          // ==================================================
          resolution: 64,        // 256から64に下げます（計算量を16分の1に激減させます）
          updateWhenIdle: true,   // 地図のドラッグ中ではなく、指を離した(静止した)時に描画
          updateWhenZooming: false, // ズームアニメーション中の余計な再計算をストップ

          // 定義した専用ペインを指定して境界線の裏に隠す
          // ==================================================
          // 【公式推奨】黒いフチ（ノイズ含む）を完全に透過する関数
          // ==================================================
          pixelValuesToColorFn: function (values) {
            const r = values[0];
            const g = values[1];
            const b = values[2];

            // データが欠損している、またはRGBすべてが 5 以下のほぼ真っ黒な余白領域の場合
            // null を返すことで、ライブラリが自動的にそのピクセルを100%完全透明にしてくれます
            if (r === null || g === null || b === null || (r <= 5 && g <= 5 && b <= 5)) {
              return null; 
            }

            // 正常なデータ領域は、元のRGBの色をそのままブラウザに返します
            return "rgb(" + r + "," + g + "," + b + ")";
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
          pane: "sentinelPane",

          // ==================================================
          // 【超重要】Leaflet版を限界まで高速化する3つのオプション
          // ==================================================
          resolution: 64,        // 256から64に下げます（計算量を16分の1に激減させます）
          updateWhenIdle: true,   // 地図のドラッグ中ではなく、指を離した(静止した)時に描画
          updateWhenZooming: false, // ズームアニメーション中の余計な再計算をストップ

          pixelValuesToColorFn: function (values) {
            const r = values[0];
            const g = values[1];
            const b = values[2];

            // データが欠損している、またはRGBすべてが 5 以下のほぼ真っ黒な余白領域の場合
            // null を返すことで、ライブラリが自動的にそのピクセルを100%完全透明にしてくれます
            if (r === null || g === null || b === null || (r <= 5 && g <= 5 && b <= 5)) {
              return null; 
            }

            // 正常なデータ領域は、元のRGBの色をそのままブラウザに返します
            return "rgb(" + r + "," + g + "," + b + ")";
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

    // ★2026/9/22 updated:【新設】機能（Interactive Analysis）の独立パネルをマップに追加
    if (window.addGesatInteractiveControl) {
      window.addGesatInteractiveControl(map);
    }
    
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
