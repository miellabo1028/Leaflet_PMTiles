// =========================================================================
// GESAT FlatGeobuf & Planetary Computer + STAC
// Interactive functions (dedicated panel window & logic): インタラクティブ機能（専用パネルウィンドウ ＆ ロジック） 
// 2026/9/22 Separate from layer-control.js
// =========================================================================
window.selectedMunicipios = []; 

(function prepareFgbModule() {
  let isSelectMode = false;
  let fgbGeojsonLayer = null;
  const allMunicipiosData = [];

  // [Color Definition] Set to a somewhat conspicuous color for verification purposes (unselected items appear in a distinct orange).
  //【カラー定義】検証用に少し目立つ色（未選択はハッキリしたオレンジ）に設定しています
  const STYLES = {
    hidden: { color: "#ff3b30", weight: 0, fillOpacity: 0, opacity: 0, interactive: true }, 
    baseModeOn: { color: "#ff6d00", weight: 2.0, fillColor: "#ff6d00", fillOpacity: 0.1, opacity: 0.8, interactive: true }, 
    selected: { color: "#00e676", weight: 3.5, fillColor: "#00e676", fillOpacity: 0.5, opacity: 1.0, interactive: true }  
  };

  // Defined as a global initialization control function so that it can be called from map-main.js.
  // map-main.js から呼び出せるように初期化コントロール関数としてグローバル定義
  window.addGesatInteractiveControl = function(map) {
  console.log("[GESAT FGB] Creating Interactive Control Panel...");

  // Define the second control panel.
  // 2つ目のコントロールパネルを定義
  // Location setting. "Topright":  Below the layer controls.  "Bottomright" or "Topleft" are available. 
  // 配置場所。レイヤ管理の下に並べたい場合は"topright"、別荘にしたい場合は"bottomright"や"topleft"など自由に調整可能です
  const interactiveControl = L.control({
    position: "topright" 
  });

  interactiveControl.onAdd = function() {
  // To ensure visual consistency, the class name "gesat-control"—the same as that used for layer management—is employed.
  // 見た目の統一感を出すため、レイヤ管理と同じクラス名「gesat-control」を使用
  const container = L.DomUtil.create("div", "gesat-control gesat-interactive-panel");
      
  L.DomEvent.disableClickPropagation(container);
  L.DomEvent.disableScrollPropagation(container);
  L.DomEvent.on(container, 'click dblclick keydown keypress', L.DomEvent.stopPropagation);
      
  // 2026/9/22 updated: 
  // Added a style to allow the dropdown to extend beyond the panel itself and display it in the foreground.
  // パネル自体からドロップダウンがはみ出るのを許可し、最前面に表示するスタイルを追加
  container.style.pointerEvents = "auto";
  container.style.overflow = "visible"; // 👈 The candidate list will no longer be hidden behind the panel. これにより、候補枠がパネルの下に隠れなくなります
  container.style.position = "relative";

  // HTML dedicated to the function window
  // 機能ウィンドウ専用のHTML
  container.innerHTML = `
    <div class="gesat-title">Interactive Analysis</div>
    <div class="gesat-children" style="margin-left: 0; padding: 0 4px;">
    <div style="display: flex; gap: 4px; margin-bottom: 6px; width: 100%;">
      <button id="btn-select-mode" class="gesat-btn btn-inactive" style="flex: 3; font-size: 11px; padding: 4px 4px; white-space: nowrap;">Select Municipios: OFF</button>
      <button id="btn-clear-selection" class="gesat-btn" style="flex: 1; background-color: #757575; color: white; border: none; padding: 4px 6px; border-radius: 4px; cursor: pointer; font-size: 11px; text-align: center;">Clear</button>
    </div>
          
    <div class="gesat-search-container">
      <input type="text" id="txt-municipio-search" class="gesat-search-input" placeholder="Search Municipality..." autocomplete="off">
      <div id="search-results-dropdown" class="search-dropdown hidden"></div>
    </div>

    <!-- ================================================== -->
    <!-- 2026/9/22 added: Section on Satellite imagries throug STAC + TiTiler:【新規追加】衛星画像取得（STAC + TiTiler）セクション -->
    <!-- ================================================== -->
    <div style="border-top: 1px solid #ddd; margin-top: 10px; padding-top: 10px;">
      <div style="font-weight: bold; font-size: 11px; margin-bottom: 6px; color: #333;">Satellite Imagery Fetcher</div>
            
      <!-- Select satellite platform: 衛星（プラットフォーム）の種類選択 -->
      <div style="margin-bottom: 6px;">
        <label style="font-size: 10px; display: block; color: #666;">Satellite Platform</label>
        <select id="sel-satellite-type" style="width: 100%; font-size: 11px; padding: 2px;">
          <option value="sentinel-2">Sentinel-2 (Copernicus)</option>
          <option value="landsat">Landsat 8/9 (USGS)</option>
        </select>
      </div>

      <!-- Select image type (RGB, etc.,): 画像タイプ選択（RGB / 各種インデックス） -->
      <div style="margin-bottom: 6px;">
        <label style="font-size: 10px; display: block; color: #666;">Visualization Style</label>
        <select id="sel-img-type" style="width: 100%; font-size: 11px; padding: 2px;">
          <option value="rgb">True Color (RGB)</option>
          <option value="ndvi">NDVI (Vegetation)</option>
          <option value="ndwi">NDWI (Water)</option>
          <option value="ndmi">NDMI (Moisture)</option>
          <option value="savi">SAVI (Solid-Adjusted Vegetation)</option>
          <option value="nbri">NBRI (Burn Ratio)</option>
        </select>
      </div>

      <!-- Set period: 期間設定（年または特定月範囲などの簡易指定） -->
      <div style="margin-bottom: 6px; display: flex; gap: 4px;">
        <div style="flex: 1;">
          <label style="font-size: 10px; display: block; color: #666;">Start Date</label>
          <input type="date" id="date-start" value="2026-01-01" style="width: 100%; font-size: 10px; padding: 2px;">
        </div>
        <div style="flex: 1;">
          <label style="font-size: 10px; display: block; color: #666;">End Date</label>
          <input type="date" id="date-end" value="2026-09-22" style="width: 100%; font-size: 10px; padding: 2px;">
        </div>
      </div>

      <!-- Set Cloud ratio: 雲量制限の設定 -->
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #666;">
          <span>Max Cloud Cover</span>
          <span id="lbl-cloud-value">20%</span>
        </div>
        <input type="range" id="sld-cloud-limit" min="0" max="100" value="20" style="width: 100%; margin: 2px 0;">
      </div>

      <!-- Add button of get imagery: 画像取得アクションボタン -->
      <button id="btn-fetch-satellite" class="gesat-btn" style="width: 100%; background-color: #0288d1; color: white; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">Fetch Satellite Image</button>
    </div>
         
  </div>
`;

// The process of setting up events for elements within the panel (this must be performed immediately after the HTML is generated).
// パネル内の要素に対してイベントを設定する処理（HTML生成の直後に行う必要があります）
setTimeout(() => {
  setupPanelEvents(map);
}, 10);

return container;
};

interactiveControl.addTo(map);

// Trigger the background process for reading FlatGeobuf data.
// バックグラウンドでのFlatGeobufデータ読み込み処理をキック
initFgbLayer(map);
};

// // Internal function: Register events for buttons and search boxes within the panel
// 内部関数: パネル内のボタンや検索窓のイベント登録
function setupPanelEvents(map) {
  const btnSelectMode = document.getElementById("btn-select-mode");
  const txtSearch = document.getElementById("txt-municipio-search");
  const dropdown = document.getElementById("search-results-dropdown");
  const btnClearSelection = document.getElementById("btn-clear-selection");

  // Retrieving UI elements for parameters
  // パラメータ用UI要素の取得
  const sldCloud = document.getElementById("sld-cloud-limit");
  const lblCloud = document.getElementById("lbl-cloud-value");
  const btnFetchSatellite = document.getElementById("btn-fetch-satellite");

  if (!btnSelectMode || !txtSearch || !dropdown || !btnClearSelection) {
    console.error("[GESAT FGB] UI Elements missing inside interactive panel!");
    return;
  }

  // ★ Event to synchronize the cloud cover slider value with the label in real-time
  // ★ 雲量スライダーの数値をリアルタイムにラベルへ連動させるイベント
  if (sldCloud && lblCloud) {
    sldCloud.addEventListener("input", function() {
      lblCloud.textContent = sldCloud.value + "%";
    });
  }

  // A variable that holds the satellite image layer currently displayed on the map (to prevent duplication).
  // 💡 現在マップ上に表示している衛星画像レイヤーを保持する変数（重複防止用）
  let currentSatelliteLayer = null;
  
  // Scene actually used for the mosaic display
  // 実際にモザイク表示へ使用されたシーン
  let usedMosaicScenes = new Map();
  
  // Prevent duplicate requests for the same tile coordinates
  // 同じタイル座標への重複照会を防止
  let inspectedMosaicTiles = new Set();

  // =====================================================================
  // Satellite image acquisition: 衛星画像取得
  // BBox Search + Planetary Computer Mosaic + BBox Clipping Version
  // BBox検索 + Planetary Computer Mosaic + BBoxクリッピング版
  // =====================================================================
  if (btnFetchSatellite) {
    // Current clipping update function
    // 現在のクリッピング更新関数
    let currentClipUpdateHandler = null;

    // -------------------------------------------------------------------
    // Get the BBox encompassing all selected Municipios.
    // 選択中の全Municipioを包含するBBoxを取得
    // -------------------------------------------------------------------
    function getSelectedMunicipioBbox() {
      if (!window.selectedMunicipios || window.selectedMunicipios.length === 0) {
        throw new Error("No municipality has been selected.");
      }

      const features = window.selectedMunicipios.map(
        function(selectedItem) {
          // Standard GeoJSON Feature: 通常のGeoJSON Feature
          if (selectedItem && selectedItem.type === "Feature" && selectedItem.geometry) {
            return selectedItem;
          }
          // A feature stored in a Leaflet layer.: Leaflet Layerなどに格納されたFeature
          if (selectedItem && selectedItem.feature && selectedItem.feature.type === "Feature" && selectedItem.feature.geometry) {
            return selectedItem.feature;
          }
          // When it contains only geometry: geometryだけを持つ場合
          if (selectedItem && selectedItem.geometry) {
            return {
              type: "Feature",
              properties: selectedItem.properties || {},
              geometry: selectedItem.geometry
            };
          }

          throw new Error("The selected Municipio does not have a valid GeoJSON geometry.");
        }
      );

      const featureCollection = {
        type: "FeatureCollection",
        features: features
      };
      const temporaryLayer = L.geoJSON(featureCollection);
      const bounds = temporaryLayer.getBounds();
      
      if (!bounds.isValid()) {
        throw new Error("Could not calculate the BBox from the selected Municipio.");
      }
      
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
      
      return {
        bbox: bbox,
        leafletBounds: L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]])
      };
    }
  
    // -------------------------------------------------------------------
    // Clip the TileLayer on screen to the BBox.
    // BBoxに合わせてTileLayerを画面上でクリップ
    //
    // Relying solely on Leaflet's bounds may result in the display of tiles that intersect the BBox (bounding box), 
    // including portions that extend outside the BBox's range.
    // Leafletのboundsだけでは、BBoxと交差する端のタイルがBBox外へ
    // はみ出して表示されることがあります。
    //
    // Use `clip-path` to visually clip the element to a rectangular area.
    // clip-pathを使って、表示上も矩形範囲へ切り抜きます。
    // -------------------------------------------------------------------
    
    function applyBboxClipToLayer(map, tileLayer, leafletBounds) {
      // Release the previously registered event
      // 前回登録したイベントを解除
      if (currentClipUpdateHandler) {
        map.off("move zoom viewreset resize", currentClipUpdateHandler);
        currentClipUpdateHandler = null;
      }
      
      function updateClip() {
        if (!tileLayer || !map.hasLayer(tileLayer)) {
          return;
        }
        const container = tileLayer.getContainer();
        if (!container) {
          return;
        }
        const mapSize = map.getSize();
        const northwest = map.latLngToContainerPoint(leafletBounds.getNorthWest());
        const southeast = map.latLngToContainerPoint(leafletBounds.getSouthEast());
        const left = Math.max(0, Math.min(mapSize.x, northwest.x));
        const top = Math.max(0, Math.min(mapSize.y, northwest.y));
        const right = Math.max(0,Math.min(mapSize.x, southeast.x));
        const bottom = Math.max(0, Math.min(mapSize.y, southeast.y));
        const insetTop = Math.max(0, top);
        const insetRight = Math.max(0, mapSize.x - right);
        const insetBottom = Math.max(0, mapSize.y - bottom);
        const insetLeft = Math.max(0, left);
        
        container.style.clipPath = `inset(${insetTop}px ` + `${insetRight}px ` + `${insetBottom}px ` + `${insetLeft}px)`;
        container.style.webkitClipPath = container.style.clipPath;
      }
      
      currentClipUpdateHandler = updateClip;
      map.on("move zoom viewreset resize", currentClipUpdateHandler);
      tileLayer.on("load", updateClip);
      
      requestAnimationFrame(updateClip);
    }
        
    
    // -------------------------------------------------------------------
    // Get the searchid from the mosaic registration response.
    // モザイク登録レスポンスからsearchidを取得
    // -------------------------------------------------------------------
    function getMosaicSearchId(
      registrationResult
    ) {
      if (!registrationResult) {
        return null;
      }
      return (registrationResult.searchid || registrationResult.search_id || registrationResult.id || null);
    }
    
    // -------------------------------------------------------------------
    // Get the TileJSON link from the mosaic registration response.
    // モザイク登録レスポンスからTileJSONリンクを取得
    // -------------------------------------------------------------------
    function getMosaicTileJsonLink(registrationResult) {
      if (!registrationResult || !Array.isArray(registrationResult.links)) {
        return null;
      }
      const tileJsonLink = registrationResult.links.find(function(link) {
        return link.rel === "tilejson";
        }
      );
      return tileJsonLink ? tileJsonLink.href : null;
    }

    // -------------------------------------------------------------------
    // Recursively extract STAC Item information from the mosaic's assets response
    // モザイクのassetsレスポンスからSTAC Item情報を再帰的に抽出
    // -------------------------------------------------------------------
    function extractSceneRecords(value, records, collectionId) {
      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(function(item) {
          extractSceneRecords(item, records, collectionId);
        });
        return;
      }

      if (typeof value !== "object") {
        return;
      }

      /*
       * Check multiple candidate fields to ensure a certain level of adaptability should the Planetary Computer's response format change.
       * Planetary Computerのレスポンス形式が変わっても
       * ある程度対応できるよう、複数の候補フィールドを確認。
       */
      const sceneId = value.id || value.item || value.item_id || value.itemId || value.scene || value.scene_id || value.sceneId || null;
      const sceneCollection = value.collection || value.collection_id || value.collectionId || collectionId || null;

      /*
       * When it can be determined to be a STAC Item or an object representing an Item.
       * Ensure that a simple asset name is not mistaken for a scene ID.
       * STAC Item、またはItemを表すオブジェクトと判断できる場合。
       * 単なるasset名をシーンIDとして誤認しないようにする。
       */
      const looksLikeScene =
        Boolean(sceneId) &&
        (
          Boolean(value.collection) ||
          Boolean(value.properties) ||
          Boolean(value.datetime) ||
          Boolean(value.assets) ||
          Boolean(value.item) ||
          Boolean(value.item_id) ||
          Boolean(value.itemId) ||
          String(sceneId).startsWith("S2") ||
          String(sceneId).startsWith("LC") ||
          String(sceneId).startsWith("LE") ||
          String(sceneId).startsWith("LT")
        );
      
      if (looksLikeScene) {
        const properties = value.properties || {};
        const datetime = properties.datetime || value.datetime || null;
        const cloudCover = properties["eo:cloud_cover"] ?? value["eo:cloud_cover"] ?? value.cloud_cover ?? null;
        const sceneKey = `${sceneCollection || "unknown"}:${sceneId}`;
        
        if (!records.has(sceneKey)) {
          records.set(sceneKey, {
            id: String(sceneId),
            collection: sceneCollection || collectionId,
            datetime: datetime,
            cloudCover: cloudCover,
            tileCount: 0,
            tileCoordinates: new Set()
          });
        }
      }
      
      // Recursively check the entire response
      // レスポンス全体を再帰的に確認
      Object.values(value).forEach(function(childValue) {
        extractSceneRecords(childValue, records, collectionId);
      });
    }

    // -------------------------------------------------------------------
    // モザイクタイルで実際に使用されたシーンを取得
    // -------------------------------------------------------------------
    async function inspectMosaicTileScenes({
      searchId,
      collectionId,
      coords
    }) {
      if (!searchId || !collectionId || !coords) {
        return;
      }
      const tileKey = `${coords.z}/${coords.x}/${coords.y}`;
        
      // 同じタイルを再照会しない
      if (inspectedMosaicTiles.has(tileKey)) {
        return;
      }

      inspectedMosaicTiles.add(tileKey);
        
      const assetParams = new URLSearchParams();
      assetParams.set("collection", collectionId);
        
      const assetsUrl =
        "https://planetarycomputer.microsoft.com/"
        + "api/data/v1/mosaic/"
        + `${encodeURIComponent(searchId)}/`
        + "tiles/WebMercatorQuad/"
        + `${coords.z}/${coords.x}/${coords.y}/assets?`
        + assetParams.toString();
      console.log("[Mosaic Tile Assets Request]", tileKey, assetsUrl);
        
    try {
      const response = await fetch(assetsUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("[Mosaic Tile Assets Error]", {
          tile: tileKey,
          status: response.status,
          response: errorText,
          url: assetsUrl
          }
        );
        return;
      }

      const assetResult = await response.json();
      console.log("[Mosaic Tile Assets Result]", tileKey, assetResult);

      const tileSceneRecords = new Map();
        
      extractSceneRecords(assetResult, tileSceneRecords, collectionId);
        
      tileSceneRecords.forEach(
        function(sceneRecord, sceneKey) {
          if (!usedMosaicScenes.has(sceneKey)) {
            usedMosaicScenes.set(
              sceneKey,
              {
                id: sceneRecord.id,
                collection: sceneRecord.collection,
                datetime: sceneRecord.datetime,
                cloudCover: sceneRecord.cloudCover,
                tileCount: 0,
                tileCoordinates: new Set()
              }
            );
          }
            
          const savedScene = usedMosaicScenes.get(sceneKey);
            
          if (!savedScene.tileCoordinates.has(tileKey)) {
            savedScene.tileCoordinates.add(tileKey);
            savedScene.tileCount += 1;
          }

          if (savedScene.datetime === null && sceneRecord.datetime !== null) {
            savedScene.datetime = sceneRecord.datetime;
          }

          if (savedScene.cloudCover === null && sceneRecord.cloudCover !== null) {
             savedScene.cloudCover = sceneRecord.cloudCover;
          }
        }
      );
        
      printUsedMosaicScenes();

    } catch (error) {
      console.warn("[Mosaic Tile Assets Fetch Failed]",
        {
          tile: tileKey,
          error: error,
          url: assetsUrl
        }
      );
    }
  }
      
    // -------------------------------------------------------------------
    // 使用シーン一覧をConsoleへ表示
    // -------------------------------------------------------------------
    function getUsedMosaicSceneArray() {
      return Array.from(
        usedMosaicScenes.values()
      )
        .map(function(scene) {
          const stacItem = window.debugStacItemLookup instanceof Map ? window.debugStacItemLookup.get(scene.id) : null;
          const properties = stacItem && stacItem.properties ? stacItem.properties: {};
          const datetime = scene.datetime || properties.datetime || null;
          const cloudCover = scene.cloudCover ?? properties["eo:cloud_cover"] ?? null;
          return {
            sceneId: scene.id,
            collection: scene.collection,
            datetime: datetime,
            date: datetime ? datetime.slice(0, 10) : null,
            cloudCover: cloudCover,
            renderedTileCount: scene.tileCount,
            renderedTiles: Array.from(scene.tileCoordinates).join(", ")
          };
        })
        .sort(function(a, b) {
          return (a.datetime || "").localeCompare(b.datetime || "");
        });
    }
    
    function printUsedMosaicScenes() {
      const sceneList = getUsedMosaicSceneArray();
      console.group(`[Mosaic Used Scenes] ${sceneList.length} scene(s)`);
      console.table(sceneList);
      console.groupEnd();
      // Consoleから確認できるようグローバル公開
      window.debugUsedMosaicScenes = sceneList;
    }
    
    // -------------------------------------------------------------------
    // 使用シーン一覧をCSVでダウンロード
    // -------------------------------------------------------------------
    function downloadUsedMosaicScenesCsv() {
      const sceneList = getUsedMosaicSceneArray();
      if (sceneList.length === 0) {
        alert("使用シーンの記録がありません。\n" + "モザイク画像を表示してから実行してください。");
        return;
      }
      const csvRows = [
        [
          "scene_id",
          "collection",
          "datetime",
          "date",
          "cloud_cover",
          "rendered_tile_count",
          "rendered_tiles"
        ]
      ];
      
      sceneList.forEach(function(scene) {
        csvRows.push([
          scene.sceneId,
          scene.collection,
          scene.datetime || "",
          scene.date || "",
          scene.cloudCover ?? "",
          scene.renderedTileCount,
          scene.renderedTiles
        ]);
      });
      
      function escapeCsvValue(value) {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      }
      
      const csvText = "\uFEFF" + csvRows
        .map(function(row) {
          return row
            .map(escapeCsvValue)
            .join(",");
        })
        .join("\r\n");
      
      const blob =
        new Blob(
          [csvText],
          {
            type: "text/csv;charset=utf-8"
          }
        );
      
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-");
      link.href = blobUrl;
      link.download = `gesat-mosaic-scenes-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setTimeout(function() {
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    }
    
    // Consoleから実行できるように公開
    window.downloadUsedMosaicScenesCsv = downloadUsedMosaicScenesCsv;
    
    // ===================================================================
    // Fetch Satellite Image
    // ===================================================================
    btnFetchSatellite.addEventListener("click", async function(e) {
      L.DomEvent.stopPropagation(e);
      
      if (!window.selectedMunicipios || window.selectedMunicipios.length === 0) {
        alert("No municipality has been selected.\n" + "Please select at least one Municipio before proceeding.");
        return;
      }
      
      const satelliteElement = document.getElementById("sel-satellite-type");
      const imageTypeElement = document.getElementById("sel-img-type");
      const startDateElement = document.getElementById("date-start");
      const endDateElement = document.getElementById("date-end");
      
      if (!satelliteElement || !imageTypeElement || !startDateElement || !endDateElement || !sldCloud) {
        alert("Could not get the UI elements for satellite image acquisition.");
        return;
      }
      
      const satellite = satelliteElement.value;
      const imgType = imageTypeElement.value;
      const startDate = startDateElement.value;
      const endDate = endDateElement.value;
      const cloudLimit = Number.parseFloat(sldCloud.value);
      
      if (!startDate || !endDate) {
        alert("Please specify the start date and end date.");
       return;
      }
      
      if (startDate > endDate) {
        alert("Please specify a start date that is on or before the end date.");
        return;
      }
      
      if (!Number.isFinite(cloudLimit)) {
        alert("The cloud cover setting value is invalid.");
        return;
      }

      btnFetchSatellite.disabled = true;
      btnFetchSatellite.textContent = "Preparing BBox...";
      
      try {
        // =============================================================
        // 1. Bounding box encompassing the entire selected municipality
        // 1. 選択Municipio全体を包含するBBox
        // =============================================================
        const selectedExtent = getSelectedMunicipioBbox();
        const bbox = selectedExtent.bbox;
        const leafletBboxBounds = selectedExtent.leafletBounds;
        
        console.log("[Selected Municipio Count]", window.selectedMunicipios.length);
        console.log("[Selected BBox]", bbox);
        
        // =============================================================
        // 2. Collection
        // =============================================================
        const collectionId = satellite === "sentinel-2" ? "sentinel-2-l2a" : "landsat-c2-l2";
        const datetimeRange = `${startDate}T00:00:00Z/` + `${endDate}T23:59:59Z`;
        
        console.log("[Collection]", collectionId);
        console.log("[Datetime]", datetimeRange);
        
        // =============================================================
        // 3. Pre-check for image existence using a STAC search.
        // 3. 画像が存在するかSTAC検索で事前確認
        //
        // Before mosaic registration, clearly determine whether there are zero search results.
        // モザイク登録の前に、検索結果0件を分かりやすく判定する。
        // =============================================================
        btnFetchSatellite.textContent = "Checking STAC...";
        
        const stacSearchUrl = "https://planetarycomputer.microsoft.com/api/stac/v1/search";
        const stacParams = new URLSearchParams();
        
        stacParams.set("collections", collectionId);
        stacParams.set("bbox", bbox.join(","));
        stacParams.set("datetime", datetimeRange);
        stacParams.set("limit", "10");
        stacParams.set("query", JSON.stringify({
          "eo:cloud_cover": {
            lte: cloudLimit
            }
          })
        );
        
        const finalStacSearchUrl = stacSearchUrl + "?" + stacParams.toString();
        
        console.log("[STAC Preview GET URL]", finalStacSearchUrl);
        
        const stacResponse = await fetch(finalStacSearchUrl, {
          method: "GET",
          headers: {
            "Accept": "application/geo+json, application/json"
            }
          }
        );
        
        if (!stacResponse.ok) {
          const errorText = await stacResponse.text();
          console.error("[STAC Search Error]", {
            status: stacResponse.status,
            statusText: stacResponse.statusText,
            body: errorText,
            url: finalStacSearchUrl
            }
          );
          throw new Error("STAC search failed." + ` HTTP ${stacResponse.status}`);
        }
        
        const stacResult = await stacResponse.json();
        const previewItems = Array.isArray(stacResult.features) ? stacResult.features : [];
        console.log("[STAC Preview Result]", stacResult);
        console.log("[STAC Preview Item Count]", previewItems.length);
        
        if (previewItems.length === 0) {
          throw new Error("No satellite images are found matching the specified period, cloud cover, and bounding box.");
        }
        
        // For debugging
        window.debugStacItems = previewItems;
        
        const previewItemLookup = new Map();
        previewItems.forEach(function(item) {
          previewItemLookup.set(item.id, item);
        });
        
        window.debugStacItemLookup = previewItemLookup;

        // =============================================================
        // 4. Mosaic Search Registration
        // 4. モザイク検索登録
        //
        // Get the searchid and create a virtual mosaic from multiple scenes.
        // searchidを取得し、複数シーンを仮想モザイク化する。
        // =============================================================
        btnFetchSatellite.textContent = "Registering Mosaic...";
        const mosaicRegisterUrl = "https://solitary-frog-6558.huh-fujita.workers.dev/";
        //const mosaicRegisterUrl = "https://planetarycomputer.microsoft.com/" + "api/data/v1/mosaic/register";
        
        const mosaicSearchBody = {
          collections: [collectionId],
          bbox: bbox,
          datetime: datetimeRange,
          query: {
            "eo:cloud_cover": {
              lte: cloudLimit
              }
            },
          
          /*
           * Prioritize images with low cloud cover.: 雲量の少ない画像を優先。
           * If the quality is comparable, prioritize the new image.: 同程度なら新しい画像を優先。
           */
          sortby: [
            {
              field: "properties.eo:cloud_cover",
              direction: "asc"
            },
            {
              field: "properties.datetime",
              direction: "desc"
            }
          ]
        };
        
        console.log("[Mosaic Register URL]", mosaicRegisterUrl);
        console.log("[Mosaic Register Body]", mosaicSearchBody);
        
        const mosaicRegisterResponse =
          await fetch(
            mosaicRegisterUrl,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
              },
              body: JSON.stringify(mosaicSearchBody)
            }
        );
        
        if (!mosaicRegisterResponse.ok) {
          const errorText = await mosaicRegisterResponse.text();
          console.error("[Mosaic Register Error]",
            {
              url: mosaicRegisterUrl,
              status: mosaicRegisterResponse.status,
              statusText: mosaicRegisterResponse.statusText,
              response: errorText
            }
          );
          throw new Error("Mosaic search registration failed." + ` HTTP ${mosaicRegisterResponse.status}` + `\n${errorText.slice(0, 500)}`);
        }
        
        const mosaicRegistration = await mosaicRegisterResponse.json();
        console.log("[Mosaic Registration]", mosaicRegistration);
        
        const searchId = getMosaicSearchId(mosaicRegistration);
        if (!searchId) {
          throw new Error("Mosaic registration was completed, but the search ID could not be retrieved.");
        }
        
        console.log("[Mosaic Search ID]", searchId);
        
        // 新しいモザイクの使用シーン記録を初期化
        usedMosaicScenes.clear();
        inspectedMosaicTiles.clear();
        
        window.debugUsedMosaicScenes = [];
        
        // Save so that it can be checked from the console.
        // Consoleから確認できるように保存
        window.debugMosaicRegistration = mosaicRegistration;
        window.debugMosaicSearchId = searchId;
        
        // =============================================================
        // 5. Mosaic Display Parameters
        // 5. モザイク表示パラメータ
        // =============================================================
        btnFetchSatellite.textContent = "Generating Mosaic Tiles...";
        const mosaicParams = new URLSearchParams();
        
        // Specifying a collection is mandatory for the Mosaic Tile API.
        // モザイクタイルAPIではcollection指定が必須
        mosaicParams.set("collection", collectionId);

        // PNG tile
        mosaicParams.set("tile_format", "png");
        
        // -------------------------------------------------------------
        // RGB
        // -------------------------------------------------------------
         if (imgType === "rgb") {
           if (satellite === "sentinel-2") {
             mosaicParams.append("assets", "B04");
             mosaicParams.append("assets", "B03");
             mosaicParams.append("assets", "B02");
             mosaicParams.append("rescale", "0,4000");
             mosaicParams.append("rescale", "0,4000");
             mosaicParams.append("rescale", "0,4000");
           } else {
             mosaicParams.append("assets", "red");
             mosaicParams.append("assets", "green");
             mosaicParams.append("assets", "blue");
             mosaicParams.append("rescale", "7000,18000");
             mosaicParams.append("rescale", "7000,18000");
             mosaicParams.append("rescale", "7000,18000");
             mosaicParams.set("color_formula", "Gamma RGB 1.5 Saturation 1.1");
           }
        // -------------------------------------------------------------
        // NDVI、NDWI、NDMI、SAVI、NBRI
        // -------------------------------------------------------------
        } else {
           let indexAssets = [];
           let expression = "";
           if (satellite === "sentinel-2") {
             switch (imgType) {
               case "ndvi":
                 indexAssets = ["B08", "B04"];
                 expression = "(B08-B04)/(B08+B04)";
                 break;
               case "ndwi":
                 indexAssets = ["B03", "B08"];
                 expression = "(B03-B08)/(B03+B08)";
                 break;
               case "ndmi":
                 indexAssets = ["B08", "B11"];
                 expression = "(B08-B11)/(B08+B11)";
                 break;
               case "savi":
                 indexAssets = ["B08", "B04"];
                 expression = "1.5*(B08-B04)" + "/(B08+B04+5000)";
                 break;
               case "nbri":
                 indexAssets = ["B08", "B12"];
                 expression = "(B08-B12)/(B08+B12)";
                 break;
               default:
                 throw new Error("Unsupported Sentinel-2 image type: " + imgType);
           }
        } else {
             switch (imgType) {
               case "ndvi":
                 indexAssets = ["nir08", "red"];
                 expression = "(nir08-red)/(nir08+red)"; 
                 break;
               case "ndwi":
                 indexAssets = ["green", "nir08"];
                 expression = "(green-nir08)/(green+nir08)";
                 break;
               case "ndmi":
                 indexAssets = ["nir08", "swir16"];
                 expression = "(nir08-swir16)" + "/(nir08+swir16)";
                 break;
               case "savi":
                 indexAssets = ["nir08", "red"];
                 expression = "1.5*(nir08-red)" + "/(nir08+red+0.5)";
                 break;
               case "nbri":
                 indexAssets = ["nir08", "swir22"];
                 expression = "(nir08-swir22)" + "/(nir08+swir22)";
                 break;
               default:
                 throw new Error("Unsupported Landsat image type: " + imgType);
             }
           }

           indexAssets.forEach(function(assetName) {
              mosaicParams.append("assets",assetName);
           });

           mosaicParams.set("asset_as_band", "true");
           mosaicParams.set("expression", expression);
           mosaicParams.set("colormap_name", "viridis");
           mosaicParams.set("rescale", "-1,1");
           
           console.log("[Mosaic Index Assets]",indexAssets);
           console.log("[Mosaic Expression]", expression);
        }
        
        // =============================================================
        // 6. Mosaic TileJSON URL
        // 6. モザイクTileJSON URL
        // =============================================================
        /*
         * Even if the registration response contains a TileJSON link, 
         * the URL is constructed from the `searchid` in order to append display parameters.
         * 登録レスポンスにTileJSONリンクがある場合でも、
         * 表示パラメータを付加するため、searchidからURLを構築する。
         */
        const responseTileJsonLink = getMosaicTileJsonLink(mosaicRegistration);
        console.log("[Mosaic Response TileJSON Link]", responseTileJsonLink);
        const mosaicTileJsonUrl =
          "https://planetarycomputer.microsoft.com/"
          + "api/data/v1/mosaic/"
          + `${encodeURIComponent(searchId)}/`
          + "WebMercatorQuad/tilejson.json?"
          + mosaicParams.toString();
        console.log("[Mosaic TileJSON URL]", mosaicTileJsonUrl);
        
        window.debugMosaicTileJsonUrl = mosaicTileJsonUrl;
        const mosaicTileJsonResponse = await fetch(mosaicTileJsonUrl,
          {
            method: "GET",
            headers: {
              "Accept":"application/json"
            }
        });
        
        if (!mosaicTileJsonResponse.ok) {
          const errorText = await mosaicTileJsonResponse.text();
          console.error("[Mosaic TileJSON Error]",
            {
              status: mosaicTileJsonResponse.status,
              statusText: mosaicTileJsonResponse.statusText,
              response: errorText,
              url: mosaicTileJsonUrl
            }
          );
         throw new Error("Failed to retrieve the mosaic TileJSON." + ` HTTP ${mosaicTileJsonResponse.status}`);
        }
        
        const mosaicTileJson = await mosaicTileJsonResponse.json();
        console.log("[Mosaic TileJSON]", mosaicTileJson);
        if (!Array.isArray(mosaicTileJson.tiles) || mosaicTileJson.tiles.length === 0) {
          throw new Error("The mosaic TileJSON is missing the `tiles` array.");
        }
        
        const mosaicTileUrl = mosaicTileJson.tiles[0].replace(/&amp;/g, "&");
        console.log("[Mosaic Raw Tile URL]", mosaicTileJson.tiles[0]);
        console.log("[Mosaic Normalized Tile URL]", mosaicTileUrl);
        window.debugMosaicTileUrl = mosaicTileUrl;
        
        // =============================================================
        // 7. Remove old satellite layer
        // 7. 古い衛星レイヤーを削除
        // =============================================================
        if (currentSatelliteLayer && map.hasLayer(currentSatelliteLayer)) {
          map.removeLayer(currentSatelliteLayer);
        }
        currentSatelliteLayer = null;
        
        // Clear the previous clipping event.
        // 前のクリッピングイベントを解除
        if (currentClipUpdateHandler) {
          map.off("move zoom viewreset resize", currentClipUpdateHandler);
          currentClipUpdateHandler = null;
        }
        
        // =============================================================
        // 8. Satellite Image Pane
        // 8. 衛星画像Pane
        // =============================================================
        if (!map.getPane("sentinelPane")) {
          map.createPane("sentinelPane");
          map.getPane("sentinelPane").style.zIndex = "450";
        }
        
        // =============================================================
        // 9. Leaflet Mosaic Layer
        // 9. Leafletモザイクレイヤー
        // =============================================================
        btnFetchSatellite.textContent = "Rendering Mosaic...";
        currentSatelliteLayer = L.tileLayer(mosaicTileUrl,
          {
            pane: "sentinelPane",
            minZoom: mosaicTileJson.minzoom || 1,
            maxZoom: mosaicTileJson.maxzoom || 22,
            opacity: 1.0,
 
            /*
             * Do not request tiles that do not intersect the BBox.
             * The portions of the edge tiles extending outside the BBox are removed using the subsequent CSS `clip-path`.
             * BBoxと交差しないタイルを要求しない。
             * 端のタイルがBBox外へはみ出す部分は、後段のCSS clip-pathで除去する。
             */
            bounds: leafletBboxBounds,
            noWrap: true,
            keepBuffer: 2,
            updateWhenIdle: false,
            updateWhenZooming: false,
            attribution: "© Microsoft Planetary Computer"
          }
        );
        
        let loadedTileCount = 0;
        let failedTileCount = 0;
        let successMessageShown = false;
        
        currentSatelliteLayer.on("tileload", function(tileEvent) {
          loadedTileCount += 1;
          if (loadedTileCount === 1) {
            console.log("[Mosaic First Tile Loaded]", tileEvent.coords);
          }
          
          // 実際にこのタイルで使用されたシーンを取得
          inspectMosaicTileScenes({
            searchId: searchId,
            collectionId: collectionId,
            coords: tileEvent.coords
          });
 
        /*
         * It is considered successful only when at least one actual image tile has been loaded, 
         * not simply when the TileJSON has been retrieved.
         * TileJSON取得だけではなく、
         * 実際の画像タイルが1枚以上読み込まれてから成功と表示する。
         */
          if (!successMessageShown) {
            successMessageShown = true;
            btnFetchSatellite.textContent = "Fetch Satellite Image";
            alert("Displayed the BBox mosaic image.\n\n" + `Platform: ${satellite}\n` + `Display type: ${imgType}\n` + `Search range BBox\n` + `Number of selected municipalities: ` + window.selectedMunicipios.length);
          }
        });
        
        currentSatelliteLayer.on("tileerror", function(tileEvent) {
          failedTileCount += 1;
          console.error("[Mosaic Tile Error]", {
            coords: tileEvent.coords,
            error: tileEvent.error,
            tile: tileEvent.tile,
            failedTileCount: failedTileCount,
            url: mosaicTileUrl
          });
        });
        
        currentSatelliteLayer.on("loading", function() {
          console.log("[Mosaic Layer Loading]");
        });
        
        currentSatelliteLayer.on("load", function() {
          console.log("[Mosaic Layer Load Complete]",
          {
            loadedTileCount: loadedTileCount,
            failedTileCount: failedTileCount
          });
        });
        
        currentSatelliteLayer.addTo(map);
        
        //一時的？
        const satelliteContainer = currentSatelliteLayer.getContainer();
        if (satelliteContainer) {
          satelliteContainer.style.clipPath = "none";
          satelliteContainer.style.webkitClipPath = "none";
          satelliteContainer.style.display = "";
          satelliteContainer.style.visibility = "visible";
          satelliteContainer.style.opacity = "1";
        }
        
        // =============================================================
        // 10. Crip on-screen tiles using a BBox
        // 10. BBoxで画面上のタイルを切り抜く
        // =============================================================
        // Temporarily disable to verify the display.
        // 一時的に無効化して表示確認
        //applyBboxClipToLayer(map, currentSatelliteLayer, leafletBboxBounds);
        
        // =============================================================
        // 11. Move to BBox
        // 11. BBoxへ移動
        // =============================================================
        map.fitBounds(leafletBboxBounds, { padding: [20, 20], animate: true, duration: 1.2 });

        // =============================================================
        // 12. Recalculate Size
        // 12. サイズ再計算
        // =============================================================
        setTimeout(function() {
          map.invalidateSize();
          if (currentClipUpdateHandler) {
            currentClipUpdateHandler();
          }},
          500
        );
        
        console.log("[Mosaic Rendering Initiated]", {
          bbox: bbox,
          searchId: searchId,
          collection: collectionId,
          satellite: satellite,
          imageType: imgType
        });
        
      } catch (error) {
        console.error("[BBox Mosaic Error]", error);
        alert("An error occurred during BBox mosaic processing.\n\n" + error.message);
      
      } finally {
        btnFetchSatellite.disabled = false;
        if (btnFetchSatellite.textContent !== "Fetch Satellite Image") {
          btnFetchSatellite.textContent ="Fetch Satellite Image";
        }
      }
    }
  );
}
    
    // 選択解除（Clear）
    btnClearSelection.addEventListener("click", function(e) {
      L.DomEvent.stopPropagation(e);
      if (window.selectedMunicipios.length === 0) return;

      window.selectedMunicipios = [];
      if (fgbGeojsonLayer) {
        fgbGeojsonLayer.eachLayer(function(layer) {
          layer.setStyle(isSelectMode ? STYLES.baseModeOn : STYLES.hidden);
        });
      }
    });

    // モード切り替え（Select）
    btnSelectMode.addEventListener("click", function() {
      isSelectMode = !isSelectMode;
      if (isSelectMode) {
        btnSelectMode.textContent = "Select Municipios: ON";
        btnSelectMode.className = "gesat-btn btn-active";
      } else {
        btnSelectMode.textContent = "Select Municipios: OFF";
        btnSelectMode.className = "gesat-btn btn-inactive";
      }

      if (fgbGeojsonLayer) {
        fgbGeojsonLayer.eachLayer(function(layer) {
          const isSelected = window.selectedMunicipios.some(function(f) {
            return f.properties.MUN_CODE === layer.feature.properties.MUN_CODE;
          });
          if (isSelected) {
            layer.setStyle(STYLES.selected);
          } else {
            layer.setStyle(isSelectMode ? STYLES.baseModeOn : STYLES.hidden);
          }
        });
      }
    });

    // Search input processing
    // 検索入力処理
    txtSearch.addEventListener("input", function() {
      const query = txtSearch.value.trim().toLowerCase();
      dropdown.innerHTML = "";

      if (!query) { dropdown.classList.add("hidden"); return; }

      const matches = allMunicipiosData.filter(function(item) {
        const mName = (item.feature.properties.MUN_NAME || "").toLowerCase();
        const dName = (item.feature.properties.DEP_NAME || "").toLowerCase();
        return mName.includes(query) || dName.includes(query);
      }).slice(0, 10);

      if (matches.length === 0) { dropdown.classList.add("hidden"); return; }

      matches.forEach(function(item) {
        const props = item.feature.properties;
        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `<strong>${props.MUN_NAME}</strong> <span style="font-size:10px; color:#666;">(${props.DEP_NAME})</span>`;
        
        div.addEventListener("click", function(e) {
          L.DomEvent.stopPropagation(e);
          txtSearch.value = props.MUN_NAME;
          dropdown.classList.add("hidden");

          const bounds = item.layer.getBounds();
          map.flyToBounds(bounds, { padding:[20, 20], duration: 1.2 });

          item.layer.setStyle({ color: "#ffd400", weight: 5.0, opacity: 1.0, fillOpacity: 0.4 });
          
          setTimeout(function() {
            const isSelected = window.selectedMunicipios.some(function(f) {
              return f.properties.MUN_CODE === props.MUN_CODE;
            });
            if (isSelected) {
              item.layer.setStyle(STYLES.selected);
            } else {
              item.layer.setStyle(isSelectMode ? STYLES.baseModeOn : STYLES.hidden);
            }
          }, 2500);
        });
        dropdown.appendChild(div);
      });
      dropdown.classList.remove("hidden");
    });

    document.addEventListener("click", function(e) {
      if (e.target !== txtSearch) dropdown.classList.add("hidden");
    });
  }

  // Internal function: Map layer allocation and FGB data fetching
  // 内部関数: 地図レイヤーの確保とFGBデータフェッチ
  function initFgbLayer(map) {
    if (!map.getPane("fgbSelectionPane")) {
      map.createPane("fgbSelectionPane");
    }
    map.getPane("fgbSelectionPane").style.zIndex = "800";
    map.getPane("fgbSelectionPane").style.pointerEvents = "auto";

    fgbGeojsonLayer = L.geoJSON(null, {
      pane: "fgbSelectionPane",
      style: function(feature) {
        const isSelected = window.selectedMunicipios.some(function(f) {
          return f.properties.MUN_CODE === feature.properties.MUN_CODE;
        });
        if (isSelected) return STYLES.selected;
        return isSelectMode ? STYLES.baseModeOn : STYLES.hidden;
      },
      onEachFeature: function(feature, layer) {
        allMunicipiosData.push({ feature: feature, layer: layer });

        layer.bindTooltip(function() {
          if (!isSelectMode) return null; 
          return `<strong>${feature.properties.MUN_NAME}</strong><br><small>${feature.properties.DEP_NAME}</small>`;
        }, { sticky: true, direction: "auto" });

        layer.on("click", function(e) {
          if (!isSelectMode) return; 
          L.DomEvent.stopPropagation(e);

          const props = feature.properties;
          const index = window.selectedMunicipios.findIndex(function(f) {
            return f.properties.MUN_CODE === props.MUN_CODE;
          });

          if (index > -1) {
            window.selectedMunicipios.splice(index, 1);
            layer.setStyle(STYLES.baseModeOn);
          } else {
            window.selectedMunicipios.push(feature);
            layer.setStyle(STYLES.selected);
          }
        });
      }
    }).addTo(map);

    // // Asynchronously fetch data from Cloudflare R2
    // Cloudflare R2からデータを非同期フェッチ
    (async function fetchFgbData() {
      try {
        const fgbUrl = GESAT_CONFIG.data.boliviaMunicipiosFgb;
        if (!fgbUrl) return;

        const response = await fetch(fgbUrl);
        if (!response.ok) return;

        let deserializeFn = null;
        if (typeof flatgeobuf !== "undefined" && flatgeobuf.geojson) {
          deserializeFn = flatgeobuf.geojson.deserialize;
        } else if (typeof flatgeobuf !== "undefined") {
          deserializeFn = flatgeobuf.deserialize;
        }
        if (!deserializeFn) return;

        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        const iterator = deserializeFn(uint8Array);
        
        for await (const feature of iterator) {
          fgbGeojsonLayer.addData(feature);
        }
        console.log("[GESAT FGB] Total polygons loaded inside new window.");
      } catch (error) {
        console.error("[GESAT FGB] Fetch error:", error);
      }
    })();
  }
})();

