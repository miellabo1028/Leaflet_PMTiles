// =========================================================================
// GESAT FlatGeobuf インタラクティブ機能（専用パネルウィンドウ ＆ ロジック） 2026/9/22 Separate from layer-control.js
// =========================================================================
window.selectedMunicipios = []; 

(function prepareFgbModule() {
  let isSelectMode = false;
  let fgbGeojsonLayer = null;
  const allMunicipiosData = [];

  // 【カラー定義】検証用に少し目立つ色（未選択はハッキリしたオレンジ）に設定しています
  const STYLES = {
    hidden: { color: "#ff3b30", weight: 0, fillOpacity: 0, opacity: 0, interactive: true }, 
    baseModeOn: { color: "#ff6d00", weight: 2.0, fillColor: "#ff6d00", fillOpacity: 0.1, opacity: 0.8, interactive: true }, 
    selected: { color: "#00e676", weight: 3.5, fillColor: "#00e676", fillOpacity: 0.5, opacity: 1.0, interactive: true }  
  };

  // 💡【新設計】map-main.js から呼び出せるように初期化コントロール関数としてグローバル定義
  window.addGesatInteractiveControl = function(map) {
    console.log("[GESAT FGB] Creating Interactive Control Panel...");

    // 2つ目のコントロールパネルを定義
    const interactiveControl = L.control({
      position: "topright" // 👈 配置場所。レイヤ管理の下に並べたい場合は"topright"、別荘にしたい場合は"bottomright"や"topleft"など自由に調整可能です
    });

    interactiveControl.onAdd = function() {
      // 見た目の統一感を出すため、レイヤ管理と同じクラス名「gesat-control」を使用
      const container = L.DomUtil.create("div", "gesat-control gesat-interactive-panel");
      
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      L.DomEvent.on(container, 'click dblclick keydown keypress', L.DomEvent.stopPropagation);
      
      // 2026/9/22 updated: パネル自体からドロップダウンがはみ出るのを許可し、最前面に表示するスタイルを追加
      container.style.pointerEvents = "auto";
      container.style.overflow = "visible"; // 👈 これにより、候補枠がパネルの下に隠れなくなります
      container.style.position = "relative";

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

            <!-- Select image type: 画像タイプ選択（RGB / 各種インデックス） -->
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

      // パネル内の要素に対してイベントを設定する処理（HTML生成の直後に行う必要があります）
      setTimeout(() => {
        setupPanelEvents(map);
      }, 10);

      return container;
    };

    interactiveControl.addTo(map);

    // バックグラウンドでのFlatGeobufデータ読み込み処理をキック
    initFgbLayer(map);
  };

  // 内部関数: パネル内のボタンや検索窓のイベント登録
  function setupPanelEvents(map) {
    const btnSelectMode = document.getElementById("btn-select-mode");
    const txtSearch = document.getElementById("txt-municipio-search");
    const dropdown = document.getElementById("search-results-dropdown");
    const btnClearSelection = document.getElementById("btn-clear-selection");

    // パラメータ用UI要素の取得
    const sldCloud = document.getElementById("sld-cloud-limit");
    const lblCloud = document.getElementById("lbl-cloud-value");
    const btnFetchSatellite = document.getElementById("btn-fetch-satellite");

    if (!btnSelectMode || !txtSearch || !dropdown || !btnClearSelection) {
      console.error("[GESAT FGB] UI Elements missing inside interactive panel!");
      return;
    }

    // ★ 雲量スライダーの数値をリアルタイムにラベルへ連動させるイベント
    if (sldCloud && lblCloud) {
      sldCloud.addEventListener("input", function() {
        lblCloud.textContent = sldCloud.value + "%";
      });
    }

    // 💡【追加】現在マップ上に表示している衛星画像レイヤーを保持する変数（重複防止用）
    let currentSatelliteLayer = null;

    // ★ 画像取得ボタンがクリックされた時のイベント（STAC検索 + TiTiler描画の実装）
    if (btnFetchSatellite) {
      btnFetchSatellite.addEventListener("click", async function(e) {
        L.DomEvent.stopPropagation(e);
        
        // 1. 選択されたポリゴンがあるかチェック
        if (window.selectedMunicipios.length === 0) {
          alert("ポリゴンが選択されていません。市町村を1つ以上選択するか、検索してから実行してください。");
          return;
        }

        // 2. パラメータの取得
        const satellite = document.getElementById("sel-satellite-type").value;
        const imgType = document.getElementById("sel-img-type").value;
        const startDate = document.getElementById("date-start").value;
        const endDate = document.getElementById("date-end").value;
        const cloudLimit = parseFloat(sldCloud.value);

        // ボタンをローディング状態にする
        btnFetchSatellite.disabled = true;
        btnFetchSatellite.textContent = "Searching STAC...";

        try {
          // 3. 選択されたポリゴン（複数対応）からGeoJSONの幾何形状（Geometry）を合成
          // 簡易的に、選択された最初の市町村のGeometry（あるいはBBox）を利用します
          const targetFeature = window.selectedMunicipios[0];
          const geometry = targetFeature.geometry;

          // 4. Microsoft Planetary Computer STAC API への検索リクエスト作成
          const stacUrl = "https://microsoft.com";
          
          // 衛星の種類に応じてSTACのコレクションIDを切り替える
          const collectionId = (satellite === "sentinel-2") ? "sentinel-2-l2a" : "landsat-c2-l2";

          const searchBody = {
            "filter-lang": "cql2-json",
            "filter": {
              "op": "and",
              "args": [
                { "op": "==", "args": [{ "property": "collection" }, collectionId] },
                { "op": "s_intersects", "args": [{ "property": "geometry" }, geometry] },
                { "op": "anyinteracts", "args": [{ "property": "datetime" }, `${startDate}T00:00:00Z/${endDate}T23:59:59Z`] },
                { "op": "<=", "args": [{ "property": "eo:cloud_cover" }, cloudLimit] }
              ]
            },
            "sortby": [
              { "field": "properties.eo:cloud_cover", "direction": "asc" } // 雲が少ない順にソート
            ],
            "limit": 1
          };

          console.log("[STAC] Fetching from Planetary Computer...", searchBody);

          const response = await fetch(stacUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(searchBody)
          });

          if (!response.ok) throw new Error("STAC API server error: " + response.status);
          const stacResult = await response.json();

          if (!stacResult.features || stacResult.features.length === 0) {
            alert("指定された条件（期間・雲量）に一致する衛星画像が Planetary Computer 上に見つかりませんでした。条件を緩めて再試行してください。");
            return;
          }

          // 最も雲が少ない1件を取得
          const bestItem = stacResult.features[0];
          console.log("[STAC] Best Scene Found:", bestItem);

          // 5. ローカルの TiTiler (Docker) 用のタイルURLを組み立てる
          // 💡 TiTilerのSTACエンドポイント（/stac/tiles/...）を利用して動的レンダリングを行います
          const titilerBase = "http://localhost:8000/stac/tiles/{z}/{x}/{y}.png";
          
          let tileUrl = "";
          
          if (imgType === "rgb") {
            // True Color (RGB) のアセット割り当て (Sentinel-2なら B04,B03,B02)
            const assets = (satellite === "sentinel-2") ? "assets=B04&assets=B03&assets=B02" : "assets=red&assets=green&assets=blue";
            // データの輝度値をブラウザで見やすくするための自動ストレッチパラメータ (min/max rescale)
            const rescale = (satellite === "sentinel-2") ? "rescale=0,3000" : "rescale=0,0.3";
            
            tileUrl = `${titilerBase}?url=${encodeURIComponent(bestItem.links.find(l => l.rel === "self").href)}&${assets}&${rescale}`;
          } else {
            // NDVI などのインデックス計算（TiTilerの expression 機能を利用）
            // Sentinel-2: NIR=B08, Red=B04 / Landsat: NIR=nir08, Red=red
            const nirBand = (satellite === "sentinel-2") ? "B08" : "nir08";
            const redBand = (satellite === "sentinel-2") ? "B04" : "red";
            const expr = `(typecast(${nirBand},'float32')-typecast(${redBand},'float32'))/(typecast(${nirBand},'float32')+typecast(${redBand},'float32'))`;
            
            // カラーマップに「viridis」を指定して、植物の濃淡を鮮やかに色分け
            tileUrl = `${titilerBase}?url=${encodeURIComponent(bestItem.links.find(l => l.rel === "self").href)}&expression=${encodeURIComponent(expr)}&colormap_name=viridis&rescale=-1,1`;
          }

          // 6. すでに表示されている古い衛星レイヤーがあれば地図から削除
          if (currentSatelliteLayer && map.hasLayer(currentSatelliteLayer)) {
            map.removeLayer(currentSatelliteLayer);
          }

          // 7. 新しい衛星タイルレイヤーをLeaflet地図に追加
          // 💡 ベクトル境界の裏、背景地図の上に滑り込ませるため、事前に定義されている sentinelPane を指定します
          currentSatelliteLayer = L.tileLayer(tileUrl, {
            pane: "sentinelPane",
            maxZoom: 19,
            attribution: "Planetary Computer | TiTiler"
          }).addTo(map);

          console.log("[TiTiler] Dynamic Tile Layer successfully added to map.");

        } catch (error) {
          console.error("[STAC/TiTiler Error] Details:", error);
          alert("衛星画像の取得・描画中にエラーが発生しました。\nローカルのDocker(TiTiler)が起動しているか確認してください。");
        } finally {
          // ボタンの状態を元に戻す
          btnFetchSatellite.disabled = false;
          btnFetchSatellite.textContent = "Fetch Satellite Image";
        }
      });
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

