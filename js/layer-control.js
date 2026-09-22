function addGesatLayerControl(map, layers, visibility) {
  const control = L.control({
    position: "topright"
  });

  control.onAdd = function () {
    const container = L.DomUtil.create("div", "gesat-control");

    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    // 【重要：追加】 コントロールパネル内でのあらゆるマウス・キーボード操作が、地図側に奪われるのを100%防ぐ
    L.DomEvent.on(container, 'click dblclick keydown keypress', L.DomEvent.stopPropagation);
    container.style.pointerEvents = "auto"; 
    
    container.innerHTML = `
      <div class="gesat-title">Map layers</div>
     
      <!-- ================================================== -->
      <!-- Sentinel-2 Control UI -->
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
          Municipios boundary
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
          Municipios name
        </label>
      </div>
    `;

    const overlayInputs = container.querySelectorAll("[data-overlay]");
    const boundaryInputs = container.querySelectorAll("[data-admin-boundary]");
    const nameInputs = container.querySelectorAll("[data-admin-name]");
    const boundaryGroupInput = container.querySelector("#admin-boundaries-all");
    const nameGroupInput = container.querySelector("#admin-names-all");

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

    function updateGroupState(inputs, groupInput, groupVisibilityKey) {
      const checkedCount = Array.from(inputs).filter(function (input) { return input.checked; }).length;
      groupInput.checked = checkedCount === inputs.length;
      groupInput.indeterminate = checkedCount > 0 && checkedCount < inputs.length;
      visibility[groupVisibilityKey] = checkedCount > 0;
    }

    boundaryInputs.forEach(function (input) {
      const layerName = input.dataset.adminBoundary;
      input.checked = Boolean(visibility[layerName]);

      input.addEventListener("change", function () {
        visibility[layerName] = input.checked;
        updateGroupState(boundaryInputs, boundaryGroupInput, "administrativeBoundaries");
        refreshAdministrativeLayers(map, layers.adminBoundaries, visibility);
      });
    });

    nameInputs.forEach(function (input) {
      const layerName = input.dataset.adminName;
      input.checked = Boolean(visibility[layerName]);

      input.addEventListener("change", function () {
        visibility[layerName] = input.checked;
        updateGroupState(nameInputs, nameGroupInput, "administrativeNames");
        refreshAdministrativeNameLayers(map, layers.adminNames, visibility);
      });
    });

    boundaryGroupInput.addEventListener("change", function () {
        const isVisible = boundaryGroupInput.checked;

        boundaryInputs.forEach(function (input) {
          input.checked = isVisible;
          visibility[input.dataset.adminBoundary] = isVisible;
        });

        visibility.administrativeBoundaries = isVisible;
        updateGroupState(boundaryInputs, boundaryGroupInput, "administrativeBoundaries");
        refreshAdministrativeLayers(map, layers.adminBoundaries, visibility);
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
        updateGroupState(nameInputs, nameGroupInput, "administrativeNames");
        refreshAdministrativeNameLayers(map, layers.adminNames, visibility);
      }
    );

    updateGroupState(boundaryInputs, boundaryGroupInput, "administrativeBoundaries");
    updateGroupState(nameInputs, nameGroupInput, "administrativeNames");

    return container;
  };

  control.addTo(map);
  return control;
}

