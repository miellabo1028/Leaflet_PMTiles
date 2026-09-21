// =========================================================================
// グローバル変数定義とデータ管理空間の初期化
// =========================================================================
window.selectedMunicipios = []; // 複数選択された市町村のGeoJSONオブジェクトがここに蓄積されます

(function prepareFgbModule() {
  // モジュール内部のスコープで状態を管理（グローバル汚染を防ぐため）
  let isSelectMode = false;
  let fgbGeojsonLayer = null;
  const allMunicipiosData = []; // 検索ドロップダウンのインデックス用

  /**
   * layer-control.js からコントロールパネル生成直後に自動キックされるバインディング関数
   * @param {L.Map} map - Leafletのマップインスタンス
   */
  window.linkGesatInteractiveLogic = async function(map) {
    const btnSelectMode = document.getElementById("btn-select-mode");
    const txtSearch = document.getElementById("txt-municipio-search");
    const dropdown = document.getElementById("search-results-dropdown");

    // 対象のUIパーツがDOM上に存在しない場合は処理をスキップ
    if (!btnSelectMode || !txtSearch || !dropdown) {
      console.warn("Interactive UI elements not found. Check HTML control string.");
      return;
    }

    // 1. レイヤー重ね合わせ順序（Pane）の動的確保
    if (!map.getPane("fgbSelectionPane")) {
      map.createPane("fgbSelectionPane");
      // タイル境界（500〜530）の少し上で、名称ラベル（600〜）の下に差し込む
      map.getPane("fgbSelectionPane").style.zIndex = "550";
    }

    // 2. 「Select Municipios」トグルボタンのイベントリスナー
    btnSelectMode.addEventListener("click", function() {
      isSelectMode = !isSelectMode;
      
      if (isSelectMode) {
        btnSelectMode.textContent = "Select Municipios: ON";
        btnSelectMode.className = "gesat-btn btn-active";
        // モードONのときは、クリックできる領域であることを明示するために全体の枠線をうっすら表示
        if (fgbGeojsonLayer) {
          fgbGeojsonLayer.setStyle({ fillOpacity: 0.12, opacity: 0.5 });
        }
      } else {
        btnSelectMode.textContent = "Select Municipios: OFF";
        btnSelectMode.className = "gesat-btn btn-inactive";
        // モードOFFのときは、選択されていないポリゴンを「完全透明」にして背景を邪魔しないようにする
        if (fgbGeojsonLayer) {
          fgbGeojsonLayer.eachLayer(function(layer) {
            const isSelected = window.selectedMunicipios.some(function(f) {
              return f.properties.MUN_CODE === layer.feature.properties.MUN_CODE;
            });
            if (!isSelected) {
              layer.setStyle({ fillOpacity: 0, opacity: 0 });
            }
          });
        }
      }
    });

    // 3. FlatGeobuf展開用の空GeoJSONレイヤーを初期化
    fgbGeojsonLayer = L.geoJSON(null, {
      pane: "fgbSelectionPane",
      style: function() {
        // 初期状態では「完全透明」にしてプロトマップスの綺麗な境界をそのまま魅せる
        return { color: "#ff3b30", weight: 1.5, fillInverse: false, fillOpacity: 0, opacity: 0, fillColor: "#ff3b30" };
      },
      onEachFeature: function(feature, layer) {
        // 検索用にメモリ内の配列（インデックス）へキャッシュ登録
        allMunicipiosData.push({ feature: feature, layer: layer });

        // ツールチップの設定（最低限に絞った軽量属性をホバー表示）
        layer.bindTooltip(`<strong>${feature.properties.MUN_NAME}</strong><br><small>${feature.properties.DEP_NAME} / ${feature.properties.PRV_NAME}</small>`, {
          sticky: true,
          direction: "auto"
        });

        // ポリゴンクリック時の複数選択（トグル）ロジック
        layer.on("click", function() {
          if (!isSelectMode) return; // 選択モードがOFFなら何も反応させない

          const props = feature.properties;
          const index = window.selectedMunicipios.findIndex(function(f) {
            return f.properties.MUN_CODE === props.MUN_CODE;
          });

          if (index > -1) {
            // すでに選択済み配列に存在すれば「選択解除」
            window.selectedMunicipios.splice(index, 1);
            layer.setStyle({ fillOpacity: 0.12, opacity: 0.5, fillColor: "#ff3b30" }); // 選択前の赤透過に戻す
          } else {
            // 未選択状態なら「配列へ新規追加」
            window.selectedMunicipios.push(feature);
            layer.setStyle({ fillOpacity: 0.55, opacity: 0.9, fillColor: "#00e676" }); // 選択中の緑ハイライト
          }
          
          // 検証用ログ：現在の選択数をリアルタイムで出力
          console.log("Current Selected Municipios Count:", window.selectedMunicipios.length);
        });
      }
    }).addTo(map);

    // 4. Cloudflare R2 バケットから FlatGeobuf ファイルをストリーミングダウンロード
    try {
      const fgbUrl = "https://r2.dev";
      const response = await fetch(fgbUrl);
      
      if (!response.ok) {
        throw new Error(`R2 Storage network error: ${response.status}`);
      }

      // FlatGeobufライブラリのデサライザを回し、パースできたポリゴンから順次地図へ流し込む
      for await (const feature of flatgeobuf.deserialize(response.body)) {
        fgbGeojsonLayer.addData(feature);
      }
      console.log(`FlatGeobuf successfully loaded from R2. Indexed ${allMunicipiosData.length} features.`);
    } catch (error) {
      console.error("Failed to stream and parse FlatGeobuf data:", error);
    }

    // 5. 文字列インクリメンタル検索（サジェストドロップダウン）の処理
    txtSearch.addEventListener("input", function() {
      const query = txtSearch.value.trim().toLowerCase();
      dropdown.innerHTML = ""; // 既存の候補を一度クリア

      if (!query) {
        dropdown.classList.add("hidden");
        return;
      }

      // 市町村名（MUN_NAME）または属する県名（DEP_NAME）から部分一致でフィルタ
      const matches = allMunicipiosData.filter(function(item) {
        const mName = (item.feature.properties.MUN_NAME || "").toLowerCase();
        const dName = (item.feature.properties.DEP_NAME || "").toLowerCase();
        return mName.includes(query) || dName.includes(query);
      }).slice(0, 10); // 一度に表示するサジェストは最大10件に制限（負荷軽減）

      if (matches.length === 0) {
        dropdown.classList.add("hidden");
        return;
      }

      // マッチした候補のHTML要素を動的に生成して追加
      matches.forEach(function(item) {
        const props = item.feature.properties;
        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `<strong>${props.MUN_NAME}</strong> <span style="font-size:10px; color:#666;">(${props.DEP_NAME})</span>`;
        
        // サジェスト項目が選択された場合のカメラ移動とフラッシュ強調
        div.addEventListener("click", function() {
          txtSearch.value = props.MUN_NAME;
          dropdown.classList.add("hidden");

          // 対象ポリゴンのバウンディングボックスを取得し、滑らかにズーム・移動（flyToBounds）
          const bounds = item.layer.getBounds();
          map.flyToBounds(bounds, { padding:, duration: 1.2 });

          // 見失わないように該当ポリゴンを2.5秒間「黄色」に激しく明滅・フラッシュさせる
          item.layer.setStyle({ color: "#ffd400", weight: 4.5, opacity: 1.0 });
          
          setTimeout(function() {
            // 2.5秒経過後、現在の「選択モード」の状態に合わせて正しい透過スタイルへ安全に復元する
            if (isSelectMode) {
              const isSelected = window.selectedMunicipios.some(function(f) {
                return f.properties.MUN_CODE === props.MUN_CODE;
              });
              item.layer.setStyle(isSelected ? 
                { color: "#ff3b30", fillColor: "#00e676", fillOpacity: 0.55, opacity: 0.9, weight: 1.5 } : 
                { color: "#ff3b30", fillColor: "#ff3b30", fillOpacity: 0.12, opacity: 0.5, weight: 1.5 }
              );
            } else {
              // 選択モードOFFなら再度完全に見えなくする
              item.layer.setStyle({ color: "#ff3b30", fillOpacity: 0, opacity: 0, weight: 1.5 });
            }
          }, 2500);
        });
        
        dropdown.appendChild(div);
      });

      dropdown.classList.remove("hidden");
    });

    // 検索入力ボックス以外をクリックした場合はサジェストドロップダウンを自動で隠す
    document.addEventListener("click", function(e) {
      if (e.target !== txtSearch) {
        dropdown.classList.add("hidden");
      }
    });
  };
})();

