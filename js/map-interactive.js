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

    if (!btnSelectMode || !txtSearch || !dropdown || !btnClearSelection) {
      console.error("[GESAT FGB] UI Elements missing inside interactive panel!");
      return;
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

