// =========================================================================
// グローバル変数定義とデータ管理空間の初期化
// =========================================================================
window.selectedMunicipios = []; // 複数選択された市町村のGeoJSON

(function prepareFgbModule() {
  let isSelectMode = false;
  let fgbGeojsonLayer = null;
  const allMunicipiosData = []; // 検索インデックス用

  console.log("[GESAT FGB] Module script loaded. Waiting for Map UI...");

  /**
   * インタラクティブロジックのコア結合関数
   */
  window.linkGesatInteractiveLogic = async function(map) {
    console.log("[GESAT FGB] linkGesatInteractiveLogic successfully called!");

    const btnSelectMode = document.getElementById("btn-select-mode");
    const txtSearch = document.getElementById("txt-municipio-search");
    const dropdown = document.getElementById("search-results-dropdown");

    // 【原因特定デバッグ】もし要素がなければコンソールに警告を出す
    if (!btnSelectMode || !txtSearch || !dropdown) {
      console.error("[GESAT FGB] ERROR: UI elements missing!", {
        btn: !!btnSelectMode,
        search: !!txtSearch,
        dropdown: !!dropdown
      });
      return;
    }

    console.log("[GESAT FGB] UI Elements found. Initializing events and fetching FGB...");

    // 1. レイヤー重ね合わせ順序（Pane）の確保
    if (!map.getPane("fgbSelectionPane")) {
      map.createPane("fgbSelectionPane");
      map.getPane("fgbSelectionPane").style.zIndex = "550";
    }

    // 2. 「Select Municipios」トグルボタンのイベントリスナー
    btnSelectMode.addEventListener("click", function() {
      isSelectMode = !isSelectMode;
      console.log("[GESAT FGB] Select Mode Toggled:", isSelectMode);
      
      if (isSelectMode) {
        btnSelectMode.textContent = "Select Municipios: ON";
        btnSelectMode.className = "gesat-btn btn-active";
        if (fgbGeojsonLayer) fgbGeojsonLayer.setStyle({ fillOpacity: 0.12, opacity: 0.5 });
      } else {
        btnSelectMode.textContent = "Select Municipios: OFF";
        btnSelectMode.className = "gesat-btn btn-inactive";
        if (fgbGeojsonLayer) {
          fgbGeojsonLayer.eachLayer(function(layer) {
            const isSelected = window.selectedMunicipios.some(function(f) {
              return f.properties.MUN_CODE === layer.feature.properties.MUN_CODE;
            });
            if (!isSelected) layer.setStyle({ fillOpacity: 0, opacity: 0 });
          });
        }
      }
    });

    // 3. FlatGeobuf展開用の空GeoJSONレイヤーを初期化
    fgbGeojsonLayer = L.geoJSON(null, {
      pane: "fgbSelectionPane",
      style: function() {
        return { color: "#ff3b30", weight: 1.5, fillInverse: false, fillOpacity: 0, opacity: 0, fillColor: "#ff3b30" };
      },
      onEachFeature: function(feature, layer) {
        allMunicipiosData.push({ feature: feature, layer: layer });

        layer.bindTooltip(`<strong>${feature.properties.MUN_NAME}</strong><br><small>${feature.properties.DEP_NAME} / ${feature.properties.PRV_NAME}</small>`, {
          sticky: true, direction: "auto"
        });

        layer.on("click", function() {
          if (!isSelectMode) return;
          const props = feature.properties;
          const index = window.selectedMunicipios.findIndex(function(f) {
            return f.properties.MUN_CODE === props.MUN_CODE;
          });

          if (index > -1) {
            window.selectedMunicipios.splice(index, 1);
            layer.setStyle({ fillOpacity: 0.12, opacity: 0.5, fillColor: "#ff3b30" });
          } else {
            window.selectedMunicipios.push(feature);
            layer.setStyle({ fillOpacity: 0.55, opacity: 0.9, fillColor: "#00e676" });
          }
          console.log("Selected Array Status:", window.selectedMunicipios);
        });
      }
    }).addTo(map);

    // 4. Cloudflare R2 から FlatGeobuf データの部分ダウンロード
    try {
      const fgbUrl = "https://r2.dev";
      console.log("[GESAT FGB] Starting fetch to R2:", fgbUrl);
      const response = await fetch(fgbUrl);
      
      if (!response.ok) throw new Error(`R2 Storage network error: ${response.status}`);

      for await (const feature of flatgeobuf.deserialize(response.body)) {
        fgbGeojsonLayer.addData(feature);
      }
      console.log(`[GESAT FGB] FlatGeobuf completely loaded. Total polygons: ${allMunicipiosData.length}`);
    } catch (error) {
      console.error("[GESAT FGB] Failed to download/parse FlatGeobuf:", error);
    }

    // 5. 文字列インクリメンタル検索（サジェストドロップダウン）
    txtSearch.addEventListener("input", function() {
      const query = txtSearch.value.trim().toLowerCase();
      dropdown.innerHTML = "";

      if (!query) {
        dropdown.classList.add("hidden");
        return;
      }

      const matches = allMunicipiosData.filter(function(item) {
        const mName = (item.feature.properties.MUN_NAME || "").toLowerCase();
        const dName = (item.feature.properties.DEP_NAME || "").toLowerCase();
        return mName.includes(query) || dName.includes(query);
      }).slice(0, 10);

      console.log(`[GESAT FGB] Search query: "${query}", Matches found: ${matches.length}`);

      if (matches.length === 0) {
        dropdown.classList.add("hidden");
        return;
      }

      matches.forEach(function(item) {
        const props = item.feature.properties;
        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `<strong>${props.MUN_NAME}</strong> <span style="font-size:10px; color:#666;">(${props.DEP_NAME})</span>`;
        
        div.addEventListener("click", function() {
          txtSearch.value = props.MUN_NAME;
          dropdown.classList.add("hidden");

          const bounds = item.layer.getBounds();
          map.flyToBounds(bounds, { padding:, duration: 1.2 });

          item.layer.setStyle({ color: "#ffd400", weight: 4.5, opacity: 1.0 });
          
          setTimeout(function() {
            if (isSelectMode) {
              const isSelected = window.selectedMunicipios.some(function(f) {
                return f.properties.MUN_CODE === props.MUN_CODE;
              });
              item.layer.setStyle(isSelected ? 
                { color: "#ff3b30", fillColor: "#00e676", fillOpacity: 0.55, opacity: 0.9, weight: 1.5 } : 
                { color: "#ff3b30", fillColor: "#ff3b30", fillOpacity: 0.12, opacity: 0.5, weight: 1.5 }
              );
            } else {
              item.layer.setStyle({ color: "#ff3b30", fillOpacity: 0, opacity: 0, weight: 1.5 });
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
  };

  // =========================================================================
  // 【最重要】UIの生成タイミングのズレを完全にカバーする自動監視処理（ポリング）
  // =========================================================================
  const checkInterval = setInterval(function() {
    const mapInstance = window.gesatDebug ? window.gesatDebug.map : null;
    const btnExists = document.getElementById("btn-select-mode");
    
    // マップオブジェクトとUIボタンが両方画面上に揃ったら結合ロジックを実行
    if (mapInstance && btnExists) {
      clearInterval(checkInterval);
      window.linkGesatInteractiveLogic(mapInstance);
    }
  }, 200); // 0.2秒ごとに画面をチェック
  
})();
