function addGesatLayerControl(map, layers, visibility) {
  const control = L.control({
    position: "topright"
  });

  control.onAdd = function () {
    const container = L.DomUtil.create(
      "div",
      "gesat-control"
    );

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    // 【重要：追加】 コントロールパネル内でのあらゆるマウス・キーボード操作が、地図側に奪われるのを100%防ぐ
    L.DomEvent.on(container, 'click dblclick keydown keypress', L.DomEvent.stopPropagation);
    container.style.pointerEvents = "auto"; 
    
    container.innerHTML = `
      <div class="gesat-title">Map layers</div>

      <!-- ================================================== -->
      <!-- 【新規追加】Municipio選択・検索用セクション -->
      <!-- ================================================== -->
      <div class="gesat-section" style="margin-top: 5px;">Interactive Analysis</div>
      <div class="gesat-children" style="margin-left: 0; padding: 0 4px;">
        <button id="btn-select-mode" class="gesat-btn btn-inactive">Select Municipios: OFF</button>
        
        <div class="gesat-search-container">
          <input type="text" id="txt-municipio-search" class="gesat-search-input" placeholder="Search Municipality..." autocomplete="off">
          <div id="search-results-dropdown" class="search-dropdown hidden"></div>
        </div>
      </div>
      
      <!-- ================================================== -->
      <!-- Sentinel-2 コントロールUI -->
      <!-- ================================================== -->
      <div class="gesat-section">Sentinel-2 Imagery (COG)</div>

      <div class="gesat-children">
        <div style="margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <label style="cursor: pointer; flex-grow: 1; display: flex; align-items: center; margin: 0;">
            <input type="checkbox" id="chk-s2-2025" style="margin-right: 6px;">
            Sentinel-2 (2025)
          </label>
          <input type="range" id="sld-s2-2025" min="0" max="100" value="100" style="width: 70px; margin-left: 10px;">
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between;">
          <label style="cursor: pointer; flex-grow: 1; display: flex; align-items: center; margin: 0;">
            <input type="checkbox" id="chk-s2-2026" style="margin-right: 6px;">
            Sentinel-2 (2026)
          </label>
          <input type="range" id="sld-s2-2026" min="0" max="100" value="100" style="width: 70px; margin-left: 10px;">
        </div>
      </div>

      <div class="gesat-section">Reference overlays</div>

      <label>
        <input type="checkbox" data-overlay="boliviaBasemap">
        <span class="swatch base"></span>
        Bolivia basemap
      </label>

      <label>
        <input type="checkbox" data-overlay="protectedAreas">
        <span class="swatch pa"></span>
        Protected areas
      </label>

      <div class="gesat-section">
        <label>
          <input type="checkbox" id="admin-boundaries-all">
          Administrative boundaries
        </label>
      </div>

      <div class="gesat-children">
        <label>
          <input type="checkbox" data-admin-boundary="international">
          <span class="swatch intl"></span>
          International boundary
        </label>

        <label>
          <input type="checkbox" data-admin-boundary="departamento">
          <span class="swatch dept"></span>
          Departamento boundary
        </label>

        <label>
          <input type="checkbox" data-admin-boundary="provincia">
          <span class="swatch prov"></span>
          Provincia boundary
        </label>

        <label>
          <input type="checkbox" data-admin-boundary="distrito">
          <span class="swatch dist"></span>
          Distrito boundary
        </label>
      </div>

      <div class="gesat-section">
        <label>
          <input type="checkbox" id="admin-names-all">
          Administrative name
        </label>
      </div>

      <div class="gesat-children">
        <label>
          <input type="checkbox" data-admin-name="departamentoName">
          <span class="name-swatch">Aa</span>
          Departamento name
        </label>

        <label>
          <input type="checkbox" data-admin-name="provinciaName">
          <span class="name-swatch">Aa</span>
          Provicia name
        </label>

        <label>
          <input type="checkbox" data-admin-name="distritoName">
          <span class="name-swatch">Aa</span>
          Distrito name
        </label>
      </div>
    `;

    const overlayInputs = container.querySelectorAll(
      "[data-overlay]"
    );
    const boundaryInputs = container.querySelectorAll(
      "[data-admin-boundary]"
    );
    const nameInputs = container.querySelectorAll(
      "[data-admin-name]"
    );
    const boundaryGroupInput = container.querySelector(
      "#admin-boundaries-all"
    );
    const nameGroupInput = container.querySelector(
      "#admin-names-all"
    );

    // Sentinel-2 UI要素の取得
    const s2_2025_check = container.querySelector("#chk-s2-2025");
    const s2_2025_slide = container.querySelector("#sld-s2-2025");
    const s2_2026_check = container.querySelector("#chk-s2-2026");
    const s2_2026_slide = container.querySelector("#sld-s2-2026");

    // ==================================================
    // Sentinel-2 (2025) 連動イベント
    // ==================================================
    if (s2_2025_check) {
      s2_2025_check.checked = Boolean(visibility.sentinel2025);
      s2_2025_check.addEventListener("change", function () {
        visibility.sentinel2025 = s2_2025_check.checked;
        if (window.s2_2025_layer) {
          if (s2_2025_check.checked) {
            map.addLayer(window.s2_2025_layer);
          } else if (map.hasLayer(window.s2_2025_layer)) {
            map.removeLayer(window.s2_2025_layer);
          }
        }
      });
    }
    if (s2_2025_slide) {
      s2_2025_slide.addEventListener("input", function () {
        if (window.s2_2025_layer) {
          window.s2_2025_layer.setOpacity(parseFloat(s2_2025_slide.value) / 100);
        }
      });
    }

    // ==================================================
    // Sentinel-2 (2026) 連動イベント
    // ==================================================
    if (s2_2026_check) {
      s2_2026_check.checked = Boolean(visibility.sentinel2026);
      s2_2026_check.addEventListener("change", function () {
        visibility.sentinel2026 = s2_2026_check.checked;
        if (window.s2_2026_layer) {
          if (s2_2026_check.checked) {
            map.addLayer(window.s2_2026_layer);
          } else if (map.hasLayer(window.s2_2026_layer)) {
            map.removeLayer(window.s2_2026_layer);
          }
        }
      });
    }
    if (s2_2026_slide) {
      s2_2026_slide.addEventListener("input", function () {
        if (window.s2_2026_layer) {
          window.s2_2026_layer.setOpacity(parseFloat(s2_2026_slide.value) / 100);
        }
      });
    }

    overlayInputs.forEach(function (input) {
      const layerName = input.dataset.overlay;
      input.checked = Boolean(visibility[layerName]);

      input.addEventListener("change", function () {
        visibility[layerName] = input.checked;
        const layer = layers[layerName];

        if (!layer) {
          console.warn("Overlay layer not found:", layerName);
          return;
        }

        if (input.checked) {
          map.addLayer(layer);
        } else if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
    });

    function updateGroupState(
      inputs,
      groupInput,
      groupVisibilityKey
    ) {
      const checkedCount = Array.from(inputs).filter(
        function (input) {
          return input.checked;
        }
      ).length;

      groupInput.checked = checkedCount === inputs.length;
      groupInput.indeterminate =
        checkedCount > 0 && checkedCount < inputs.length;
      visibility[groupVisibilityKey] = checkedCount > 0;
    }

    boundaryInputs.forEach(function (input) {
      const layerName = input.dataset.adminBoundary;
      input.checked = Boolean(visibility[layerName]);

      input.addEventListener("change", function () {
        visibility[layerName] = input.checked;
        updateGroupState(
          boundaryInputs,
          boundaryGroupInput,
          "administrativeBoundaries"
        );
        refreshAdministrativeLayers(
          map,
          layers.adminBoundaries,
          visibility
        );
      });
    });

    nameInputs.forEach(function (input) {
      const layerName = input.dataset.adminName;
      input.checked = Boolean(visibility[layerName]);

      input.addEventListener("change", function () {
        visibility[layerName] = input.checked;
        updateGroupState(
          nameInputs,
          nameGroupInput,
          "administrativeNames"
        );
        refreshAdministrativeNameLayers(
          map,
          layers.adminNames,
          visibility
        );
      });
    });

    boundaryGroupInput.addEventListener(
      "change",
      function () {
        const isVisible = boundaryGroupInput.checked;

        boundaryInputs.forEach(function (input) {
          input.checked = isVisible;
          visibility[input.dataset.adminBoundary] = isVisible;
        });

        visibility.administrativeBoundaries = isVisible;
        updateGroupState(
          boundaryInputs,
          boundaryGroupInput,
          "administrativeBoundaries"
        );
        refreshAdministrativeLayers(
          map,
          layers.adminBoundaries,
          visibility
        );
      }
    );

    nameGroupInput.addEventListener(
      "change",
      function () {
        const isVisible = nameGroupInput.checked;

        nameInputs.forEach(function (input) {
          input.checked = isVisible;
          visibility[input.dataset.adminName] = isVisible;
        });

        visibility.administrativeNames = isVisible;
        updateGroupState(
          nameInputs,
          nameGroupInput,
          "administrativeNames"
        );
        refreshAdministrativeNameLayers(
          map,
          layers.adminNames,
          visibility
        );
      }
    );

    updateGroupState(
      boundaryInputs,
      boundaryGroupInput,
      "administrativeBoundaries"
    );
    updateGroupState(
      nameInputs,
      nameGroupInput,
      "administrativeNames"
    );

    // ==================================================
    // 【新規追加】UI要素初期化後に、ロジック制御関数をキック
    // ==================================================
    setTimeout(function() {
      if (window.linkGesatInteractiveLogic) {
        window.linkGesatInteractiveLogic(map);
      }
    }, 50);
    
    return container;
  };

  control.addTo(map);
  return control;
}

// === layer-control.js の一番最後（ } のすぐ下）に追記する完全コード ===

// =========================================================================
// 後から追記したFGB用拡張ロジック（境界表示連動 ＆ カラーカスタム版）
// =========================================================================
window.selectedMunicipios = []; 

(function prepareFgbModule() {
  let isSelectMode = false;
  let fgbGeojsonLayer = null;
  const allMunicipiosData = [];

  // 💡【カラーカスタマイズ設定】ここで境界線の色や太さを自由に変更できます
  const STYLES = {
    hidden: { color: "#ff3b30", weight: 1.5, fillOpacity: 0, opacity: 0 }, // モードOFF（完全透明）
    baseModeOn: { color: "#ff3b30", weight: 1.5, fillColor: "#ff3b30", fillOpacity: 0.05, opacity: 0.6 }, // モードON（未選択：薄い赤）
    selected: { color: "#00e676", weight: 3.0, fillColor: "#00e676", fillOpacity: 0.4, opacity: 1.0 }  // 選択中（太い鮮やかな緑）
  };

  console.log("[GESAT FGB] Interactive Module Embedded in Layer Control.");

  window.linkGesatInteractiveLogic = async function(map) {
    console.log("[GESAT FGB] linkGesatInteractiveLogic execute!");

    const btnSelectMode = document.getElementById("btn-select-mode");
    const txtSearch = document.getElementById("txt-municipio-search");
    const dropdown = document.getElementById("search-results-dropdown");

    if (!btnSelectMode || !txtSearch || !dropdown) {
      console.error("[GESAT FGB] UI Elements missing inside control panel!");
      return;
    }

    // 専用ペインの確保
    if (!map.getPane("fgbSelectionPane")) {
      map.createPane("fgbSelectionPane");
      map.getPane("fgbSelectionPane").style.zIndex = "550";
      // 💡【重要】pointerEventsを"auto"にするか、レイヤー側で制御するためnoneを解除します
      map.getPane("fgbSelectionPane").style.pointerEvents = "auto";
    }

    // -----------------------------------------------------------------
    // 処理1: トグルボタンのイベント登録（ONになった瞬間に境界を表示）
    // -----------------------------------------------------------------
    btnSelectMode.addEventListener("click", function() {
      isSelectMode = !isSelectMode;
      console.log("[GESAT FGB] Select Mode:", isSelectMode);
      
      if (isSelectMode) {
        btnSelectMode.textContent = "Select Municipios: ON";
        btnSelectMode.className = "gesat-btn btn-active";
        
        // 💡【新機能】ONになった瞬間に、全ポリゴンを「クリック可能な薄い赤の境界」として表示
        if (fgbGeojsonLayer) {
          fgbGeojsonLayer.eachLayer(function(layer) {
            const isSelected = window.selectedMunicipios.some(function(f) {
              return f.properties.MUN_CODE === layer.feature.properties.MUN_CODE;
            });
            // すでに選択済みのものは緑、それ以外は薄い赤の枠線を表示
            layer.setStyle(isSelected ? STYLES.selected : STYLES.baseModeOn);
          });
        }
      } else {
        btnSelectMode.textContent = "Select Municipios: OFF";
        btnSelectMode.className = "gesat-btn btn-inactive";
        
        // モードOFFの時は、選択されていないポリゴンを完全に非表示（透明）にする
        if (fgbGeojsonLayer) {
          fgbGeojsonLayer.eachLayer(function(layer) {
            const isSelected = window.selectedMunicipios.some(function(f) {
              return f.properties.MUN_CODE === layer.feature.properties.MUN_CODE;
            });
            // 選択済みのものは地図上に残し、未選択のものは見えなくする
            layer.setStyle(isSelected ? STYLES.selected : STYLES.hidden);
          });
        }
      }
    });

    // -----------------------------------------------------------------
    // 処理2: レイヤーの初期化
    // -----------------------------------------------------------------
    fgbGeojsonLayer = L.geoJSON(null, {
      pane: "fgbSelectionPane",
      interactive: true, // クリック可能にする
      style: function() {
        return STYLES.hidden; // 初期状態はすべて非表示
      },
      onEachFeature: function(feature, layer) {
        allMunicipiosData.push({ feature: feature, layer: layer });

        layer.bindTooltip(`<strong>${feature.properties.MUN_NAME}</strong><br><small>${feature.properties.DEP_NAME} / ${feature.properties.PRV_NAME}</small>`, {
          sticky: true, direction: "auto"
        });

        // 💡【重要】ポリゴンクリック時の選択・解除と色変更
        layer.on("click", function(e) {
          if (!isSelectMode) return; // モードOFFなら無視
          
          // Leafletのイベントが背後の地図クリックへ連鎖するのを防ぐ
          L.DomEvent.stopPropagation(e);

          const props = feature.properties;
          const index = window.selectedMunicipios.findIndex(function(f) {
            return f.properties.MUN_CODE === props.MUN_CODE;
          });

          if (index > -1) {
            // 選択解除：配列から消して、通常の「モードON時の薄赤」に戻す
            window.selectedMunicipios.splice(index, 1);
            layer.setStyle(STYLES.baseModeOn);
          } else {
            // 新規選択：配列に追加して、「太い緑」に変更
            window.selectedMunicipios.push(feature);
            layer.setStyle(STYLES.selected);
          }
          console.log("Selected Array Status:", window.selectedMunicipios);
        });
      }
    }).addTo(map);

    // -----------------------------------------------------------------
    // 処理3: 検索入力窓のイベント登録
    // -----------------------------------------------------------------
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

          // 検索ヒット時は一時的に「黄色」に発光させる
          item.layer.setStyle({ color: "#ffd400", weight: 5.0, opacity: 1.0, fillOpacity: 0.3 });
          
          setTimeout(function() {
            // 発光終了後、現在の状態（選択中か、単なるモードONか、モードOFFか）に合わせてスタイル復元
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

    // -----------------------------------------------------------------
    // 処理4: Cloudflare R2からデータを非同期フェッチ
    // -----------------------------------------------------------------
    console.log("[GESAT FGB] Starting FlatGeobuf fetch sequence...");
    (async function fetchFgbData() {
      try {
        const fgbUrl = "https://r2.dev";
        const response = await fetch(fgbUrl);
        if (!response.ok) throw new Error("R2 storage HTTP error: " + response.status);

        const iterator = flatgeobuf.deserialize(response.body);
        for await (const feature of iterator) {
          fgbGeojsonLayer.addData(feature);
        }
        console.log(`[GESAT FGB] Success! Total polygons loaded: ${allMunicipiosData.length}`);
      } catch (error) {
        console.error("[GESAT FGB] Fetch error:", error);
      }
    })();

  };
})();
