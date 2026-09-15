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

    container.innerHTML = `
      <div class="gesat-title">Map layers</div>

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
          Administartive name
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

    return container;
  };

  control.addTo(map);
  return control;
}
